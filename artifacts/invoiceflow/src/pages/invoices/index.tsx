import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices, ListInvoicesStatus } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Search, FileX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvoicesList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListInvoicesStatus | "all">("all");
  
  const { data: invoices, isLoading } = useListInvoices({ 
    search: search || undefined,
    status: status === "all" ? undefined : status
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track your billing.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate h-11 px-6" asChild>
          <Link href="/invoices/new"><Plus className="w-5 h-5 mr-2" /> Create Invoice</Link>
        </Button>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-muted/30 animate-pulse rounded-2xl" />)}
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
          {invoices?.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <Card className="rounded-2xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer hover-elevate p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{inv.invoiceNumber}</span>
                    <h3 className="font-bold text-lg leading-tight mt-1 line-clamp-1">{inv.customerName || 'Walk-in Customer'}</h3>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="mt-auto pt-4 flex items-end justify-between border-t border-border/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Date: {formatDate(inv.invoiceDate)}</span>
                    {inv.dueDate && <span className="text-xs text-muted-foreground">Due: {formatDate(inv.dueDate)}</span>}
                  </div>
                  <span className="text-xl font-display font-bold text-primary">{formatCurrency(inv.total)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
