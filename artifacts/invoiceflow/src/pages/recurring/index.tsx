import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecurringInvoices,
  useCreateRecurringInvoice,
  useUpdateRecurringInvoice,
  useDeleteRecurringInvoice,
  useRunRecurringInvoice,
  RecurringInvoice,
  CreateRecurringInvoiceBody,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Trash2, Edit, Play, Pause, CalendarClock, FileX } from "lucide-react";
import { Link } from "wouter";

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const FREQ_COLORS: Record<string, string> = {
  weekly: "bg-violet-100 text-violet-700",
  monthly: "bg-blue-100 text-blue-700",
  quarterly: "bg-amber-100 text-amber-700",
  yearly: "bg-emerald-100 text-emerald-700",
};

const EMPTY_FORM: CreateRecurringInvoiceBody = {
  name: "",
  frequency: "monthly",
  nextRunDate: new Date().toISOString().split("T")[0],
  items: [{ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 }],
  discountType: "flat",
  discountValue: 0,
  taxPercent: 0,
  supplyType: "intra",
  showBankDetails: true,
};

export default function RecurringInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: list = [], isLoading } = useListRecurringInvoices();
  const createMut = useCreateRecurringInvoice();
  const updateMut = useUpdateRecurringInvoice();
  const deleteMut = useDeleteRecurringInvoice();
  const runMut = useRunRecurringInvoice();

  const [open, setOpen] = useState(false);
  const [editRec, setEditRec] = useState<RecurringInvoice | null>(null);
  const [form, setForm] = useState<CreateRecurringInvoiceBody>(EMPTY_FORM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/recurring-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  };

  const openCreate = () => {
    setEditRec(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (rec: RecurringInvoice) => {
    setEditRec(rec);
    setForm({
      name: rec.name,
      frequency: rec.frequency,
      nextRunDate: rec.nextRunDate,
      endDate: rec.endDate ?? undefined,
      customerId: rec.customerId ?? undefined,
      customerName: rec.customerName ?? undefined,
      customerEmail: rec.customerEmail ?? undefined,
      customerPhone: rec.customerPhone ?? undefined,
      customerAddress: rec.customerAddress ?? undefined,
      customerGstin: rec.customerGstin ?? undefined,
      placeOfSupply: rec.placeOfSupply ?? undefined,
      supplyType: rec.supplyType,
      items: rec.items.length > 0 ? rec.items : [{ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 }],
      discountType: rec.discountType,
      discountValue: rec.discountValue,
      taxPercent: rec.taxPercent,
      notes: rec.notes ?? undefined,
      paymentTerms: rec.paymentTerms ?? undefined,
      showBankDetails: rec.showBankDetails,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.nextRunDate) { toast({ title: "Start date is required", variant: "destructive" }); return; }
    if (editRec) {
      updateMut.mutate({ id: editRec.id, data: form }, {
        onSuccess: () => { toast({ title: "Updated!" }); invalidate(); setOpen(false); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    } else {
      createMut.mutate(form, {
        onSuccess: () => { toast({ title: "Recurring invoice created!" }); invalidate(); setOpen(false); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  const handleToggleStatus = (rec: RecurringInvoice) => {
    const newStatus = rec.status === "active" ? "paused" : "active";
    updateMut.mutate({ id: rec.id, data: { status: newStatus } }, {
      onSuccess: () => { toast({ title: `${newStatus === "active" ? "Resumed" : "Paused"}` }); invalidate(); },
    });
  };

  const handleDelete = (rec: RecurringInvoice) => {
    if (!confirm(`Delete recurring invoice "${rec.name}"?`)) return;
    deleteMut.mutate(rec.id, {
      onSuccess: () => { toast({ title: "Deleted" }); invalidate(); },
    });
  };

  const handleRun = (rec: RecurringInvoice) => {
    runMut.mutate(rec.id, {
      onSuccess: (data: any) => {
        toast({ title: `Invoice ${data.invoiceNumber} generated!` });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const setItem = (idx: number, field: string, value: any) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 }] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = form.items.reduce((s, i) => s + (i.quantity * i.rate), 0);
  const tax = (subtotal * (form.taxPercent ?? 0)) / 100;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Recurring Invoices</h1>
          <p className="text-muted-foreground mt-1">Auto-generate invoices on a schedule.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate h-11 px-6" onClick={openCreate}>
          <Plus className="w-5 h-5 mr-2" /> New Recurring
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-muted/30 animate-pulse rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CalendarClock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold font-display">No recurring invoices yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Set up auto-billing for retainer clients or subscription services.</p>
          <Button className="mt-6 rounded-xl" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Create First</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((rec) => {
            const itemTotal = rec.items.reduce((s: number, i: any) => s + (i.quantity * i.rate), 0);
            return (
              <Card key={rec.id} className={`rounded-2xl p-5 flex flex-col gap-3 border transition-all ${rec.status === "paused" ? "opacity-60" : "hover:border-primary/50 hover:shadow-md"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{rec.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{rec.customerName || "No customer"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FREQ_COLORS[rec.frequency] ?? "bg-muted text-muted-foreground"}`}>
                      {FREQ_LABELS[rec.frequency] ?? rec.frequency}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rec.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {rec.status === "active" ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Est. amount</p>
                    <p className="text-lg font-display font-bold text-primary">{formatCurrency(itemTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Next run</p>
                    <p className="text-sm font-medium">{formatDate(rec.nextRunDate)}</p>
                  </div>
                </div>
                {rec.lastGeneratedAt && (
                  <p className="text-xs text-muted-foreground -mt-1">Last: {formatDate(rec.lastGeneratedAt)}</p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2 border-t">
                  <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs flex-1" onClick={() => handleRun(rec)} disabled={runMut.isPending}>
                    <Play className="w-3 h-3 mr-1" /> Run Now
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs" onClick={() => handleToggleStatus(rec)}>
                    {rec.status === "active" ? <Pause className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs" onClick={() => openEdit(rec)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(rec)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRec ? "Edit Recurring Invoice" : "New Recurring Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>Name / Label *</Label>
                <Input placeholder="e.g. Monthly Retainer – Acme Corp" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as any }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>First / Next Run Date *</Label>
                <Input type="date" value={form.nextRunDate} onChange={(e) => setForm((f) => ({ ...f, nextRunDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || undefined }))} />
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input placeholder="Customer name" value={form.customerName ?? ""} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input placeholder="+91 ..." value={form.customerPhone ?? ""} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.customerEmail ?? ""} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input placeholder="Customer GSTIN" value={form.customerGstin ?? ""} onChange={(e) => setForm((f) => ({ ...f, customerGstin: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 text-xs" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-muted/30">
                  <div className="col-span-12 sm:col-span-4">
                    <Input placeholder="Item name" className="h-8 text-sm" value={item.name} onChange={(e) => setItem(idx, "name", e.target.value)} />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input type="number" placeholder="Qty" className="h-8 text-sm" value={item.quantity} onChange={(e) => setItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input placeholder="Unit" className="h-8 text-sm" value={item.unit} onChange={(e) => setItem(idx, "unit", e.target.value)} />
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <Input type="number" placeholder="Rate (₹)" className="h-8 text-sm" value={item.rate} onChange={(e) => setItem(idx, "rate", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    {form.items.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-4 text-sm pt-1">
                <span className="text-muted-foreground">Subtotal: <strong>{formatCurrency(subtotal)}</strong></span>
                {(form.taxPercent ?? 0) > 0 && <span className="text-muted-foreground">Tax: <strong>{formatCurrency(tax)}</strong></span>}
                <span className="font-bold">Total: {formatCurrency(subtotal + tax)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax %</Label>
                <Input type="number" step="0.01" value={form.taxPercent ?? 0} onChange={(e) => setForm((f) => ({ ...f, taxPercent: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {editRec ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
