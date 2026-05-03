import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInvoices,
  useBulkInvoiceAction,
  ListInvoicesStatus,
  InvoiceListItem,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Search, FileX, CheckSquare, Square, Trash2, CheckCircle, Send, X, MessageCircle, Download } from "lucide-react";

function downloadCSV(rows: (string | number | undefined | null)[][], filename: string) {
  const content = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useGetBusinessProfile } from "@workspace/api-client-react";

function buildWhatsAppReminder(inv: InvoiceListItem, businessName: string): string {
  const outstanding = inv.total - (inv.paidAmount ?? 0);
  const lines = [
    `*Payment Reminder* 🔔`,
    ``,
    `Hi ${inv.customerName || "there"},`,
    ``,
    `This is a friendly reminder for Invoice *${inv.invoiceNumber}*.`,
    ``,
    `💰 Amount: ₹${outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    inv.dueDate ? `📅 Due Date: ${formatDate(inv.dueDate)}` : null,
    ``,
    `Please make the payment at your earliest convenience. Thank you!`,
    ``,
    `— ${businessName}`,
  ].filter((l) => l !== null);
  return encodeURIComponent(lines.join("\n"));
}

export default function InvoicesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListInvoicesStatus | "all">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const { data: invoices = [], isLoading } = useListInvoices({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });
  const bulkMut = useBulkInvoiceAction();
  const { data: profile } = useGetBusinessProfile();

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((i) => i.id)));
    }
  };

  const clearBulk = () => { setSelected(new Set()); setBulkMode(false); };

  const handleBulkAction = (action: "mark_paid" | "mark_sent" | "delete") => {
    if (selected.size === 0) return;
    const label = action === "mark_paid" ? "Mark Paid" : action === "mark_sent" ? "Mark Sent" : "Delete";
    if (action === "delete" && !confirm(`Delete ${selected.size} invoice(s)?`)) return;
    bulkMut.mutate({ ids: Array.from(selected), action }, {
      onSuccess: (data) => {
        toast({ title: `${label}: ${data.affected} invoice(s) updated` });
        clearBulk();
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const businessName = profile?.shopName ?? "InvoiceFlow";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track your billing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" className="rounded-xl h-11"
            onClick={() => {
              const rows: (string | number | undefined | null)[][] = [
                ["Invoice #", "Customer", "Date", "Due Date", "Status", "Subtotal", "Tax", "Total", "Paid", "Outstanding"],
                ...(invoices ?? []).map((inv) => [
                  inv.invoiceNumber, inv.customerName, inv.invoiceDate, inv.dueDate,
                  inv.status, inv.subtotal, inv.taxAmount, inv.total, inv.paidAmount,
                  inv.total - (inv.paidAmount ?? 0),
                ]),
              ];
              downloadCSV(rows, `invoices-${new Date().toISOString().split("T")[0]}.csv`);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button
            variant={bulkMode ? "default" : "outline"}
            className="rounded-xl h-11"
            onClick={() => { setBulkMode((v) => !v); setSelected(new Set()); }}
          >
            <CheckSquare className="w-4 h-4 mr-2" /> {bulkMode ? "Cancel Select" : "Select"}
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate h-11 px-6" asChild>
            <Link href="/invoices/new"><Plus className="w-5 h-5 mr-2" /> Create Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-2 rounded-2xl border shadow-sm">
        <Tabs defaultValue="all" value={status} onValueChange={(v) => setStatus(v as any)} className="w-full md:w-auto overflow-x-auto">
          <TabsList className="bg-transparent h-11 p-1">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4">All</TabsTrigger>
            <TabsTrigger value="paid" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 px-4">Paid</TabsTrigger>
            <TabsTrigger value="sent" className="rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 px-4">Pending</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-600 px-4">Overdue</TabsTrigger>
            <TabsTrigger value="draft" className="rounded-lg data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-600 px-4">Draft</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-9 h-11 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="sticky top-16 z-30 flex items-center gap-2 bg-card border shadow-lg rounded-2xl px-4 py-2.5 flex-wrap">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {selected.size === invoices.length && invoices.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleBulkAction("mark_paid")} disabled={selected.size === 0 || bulkMut.isPending}>
            <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Paid
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleBulkAction("mark_sent")} disabled={selected.size === 0 || bulkMut.isPending}>
            <Send className="w-4 h-4 mr-1.5" /> Mark Sent
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleBulkAction("delete")} disabled={selected.size === 0 || bulkMut.isPending}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" className="rounded-lg" onClick={clearBulk}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 bg-muted/30 animate-pulse rounded-2xl" />)}
        </div>
      ) : invoices?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileX className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold font-display">No invoices found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            {search || status !== "all" ? "Try changing your search filters." : "Create your first invoice to get paid faster."}
          </p>
          {(search || status !== "all") && (
            <Button variant="outline" className="mt-6 rounded-xl" onClick={() => { setSearch(""); setStatus("all"); }}>
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices?.map((inv) => {
            const isSelected = selected.has(inv.id);
            const outstanding = inv.total - (inv.paidAmount ?? 0);
            const phone = (inv as any).customerPhone;
            const waMsg = buildWhatsAppReminder(inv, businessName);
            return (
              <div key={inv.id} className="relative group">
                {bulkMode && (
                  <button
                    className="absolute top-3 left-3 z-10"
                    onClick={() => toggleSelect(inv.id)}
                  >
                    {isSelected
                      ? <CheckSquare className="w-5 h-5 text-primary" />
                      : <Square className="w-5 h-5 text-muted-foreground group-hover:text-primary" />}
                  </button>
                )}
                <Card
                  className={`rounded-2xl hover:border-primary/50 hover:shadow-md transition-all p-5 flex flex-col h-full ${bulkMode ? "cursor-pointer pl-10" : ""} ${isSelected ? "border-primary/60 bg-primary/5 shadow-sm" : ""}`}
                  onClick={bulkMode ? () => toggleSelect(inv.id) : undefined}
                >
                  {!bulkMode && (
                    <Link href={`/invoices/${inv.id}`} className="absolute inset-0 rounded-2xl z-0" />
                  )}
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{inv.invoiceNumber}</span>
                      <h3 className="font-bold text-lg leading-tight mt-1 line-clamp-1">{inv.customerName || "Walk-in Customer"}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={inv.status} />
                      {inv.status !== "paid" && outstanding > 0 && (
                        <a
                          href={`https://wa.me/${(phone || "").replace(/\D/g, "")}?text=${waMsg}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors z-10 relative"
                          title="Send WhatsApp Reminder"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.638-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          Remind
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex items-end justify-between border-t border-border/50 relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Date: {formatDate(inv.invoiceDate)}</span>
                      {inv.dueDate && <span className="text-xs text-muted-foreground">Due: {formatDate(inv.dueDate)}</span>}
                    </div>
                    <span className="text-xl font-display font-bold text-primary">{formatCurrency(inv.total)}</span>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
