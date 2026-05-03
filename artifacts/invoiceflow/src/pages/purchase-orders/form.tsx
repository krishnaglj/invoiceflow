import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetNextPoNumber, useGetPurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrder, useListVendors, useListWarehouses } from "@workspace/api-client-react";
import type { PurchaseOrderItemInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

type ItemRow = PurchaseOrderItemInput & { key: string };

const emptyItem = (): ItemRow => ({ key: Math.random().toString(36).slice(2), name: "", quantity: 1, unit: "pcs", rate: 0, amount: 0, taxRate: 0 });

export default function PurchaseOrderForm() {
  const params = useParams<{ id: string }>();
  const poId = params.id && params.id !== "new" ? parseInt(params.id, 10) : undefined;
  const isEdit = !!poId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: nextPo } = useGetNextPoNumber({ query: { enabled: !isEdit } });
  const { data: po } = useGetPurchaseOrder(poId!, { query: { enabled: isEdit } });
  const { data: vendors = [] } = useListVendors();
  const { data: warehouses = [] } = useListWarehouses();

  const createMutation = useCreatePurchaseOrder({
    mutation: { onSuccess: (data) => { toast({ title: "Purchase order created" }); setLocation(`/purchase-orders/${data.id}`); }, onError: () => toast({ title: "Failed to create PO", variant: "destructive" }) },
  });
  const updateMutation = useUpdatePurchaseOrder({
    mutation: { onSuccess: () => { toast({ title: "Purchase order updated" }); setLocation(`/purchase-orders/${poId}`); }, onError: () => toast({ title: "Failed to update PO", variant: "destructive" }) },
  });

  const [poNumber, setPoNumber] = useState("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorName, setVendorName] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [taxPercent, setTaxPercent] = useState(18);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  useEffect(() => {
    if (!isEdit && nextPo) setPoNumber(nextPo.poNumber);
  }, [nextPo, isEdit]);

  useEffect(() => {
    if (po) {
      setPoNumber(po.poNumber);
      setVendorId(po.vendorId ? String(po.vendorId) : "");
      setVendorName(po.vendorName ?? "");
      setPoDate(po.poDate);
      setExpectedDate(po.expectedDate ?? "");
      setWarehouseId(po.warehouseId ? String(po.warehouseId) : "");
      setTaxPercent(po.taxPercent ?? 18);
      setNotes(po.notes ?? "");
      setStatus((po.status === "draft" || po.status === "sent") ? po.status : "draft");
      if (po.items.length > 0) {
        setItems(po.items.map((i) => ({ key: String(i.id), name: i.name, quantity: i.quantity, unit: i.unit, rate: i.rate, amount: i.amount, taxRate: i.taxRate, productId: i.productId ?? undefined, description: i.description ?? undefined, hsnCode: i.hsnCode ?? undefined })));
      }
    }
  }, [po]);

  const setItemField = (key: string, field: keyof PurchaseOrderItemInput, value: string | number) => {
    setItems((prev) => prev.map((row) => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };
      updated.amount = updated.quantity * updated.rate;
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;
  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

  const handleVendorSelect = (id: string) => {
    setVendorId(id);
    const v = vendors.find((v) => String(v.id) === id);
    if (v) setVendorName(v.name);
  };

  const handleSubmit = () => {
    if (!poNumber.trim()) { toast({ title: "PO Number is required", variant: "destructive" }); return; }
    if (!poDate) { toast({ title: "PO Date is required", variant: "destructive" }); return; }
    const cleanItems = items.filter((i) => i.name.trim()).map(({ key: _k, ...rest }) => ({ ...rest, amount: rest.quantity * rest.rate }));
    const payload = { poNumber, vendorId: vendorId ? parseInt(vendorId) : undefined, vendorName: vendorName || undefined, poDate, expectedDate: expectedDate || undefined, warehouseId: warehouseId ? parseInt(warehouseId) : undefined, taxPercent, notes: notes || undefined, status, items: cleanItems };
    if (isEdit) updateMutation.mutate({ id: poId!, data: payload });
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setLocation("/purchase-orders")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Purchase Orders
      </Button>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? "Edit Purchase Order" : "New Purchase Order"}</h1>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="space-y-1.5">
          <Label>PO Number *</Label>
          <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent to Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vendor</Label>
          {vendors.length > 0 ? (
            <Select value={vendorId} onValueChange={handleVendorSelect}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name (or add vendors first)" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Warehouse</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue placeholder="Default warehouse" /></SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}{w.isDefault ? " (default)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>PO Date *</Label>
          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Delivery</Label>
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Items</h2>
          <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}>
            <Plus className="w-3 h-3 mr-1" />Add Item
          </Button>
        </div>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item Name</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Qty</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Unit</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Rate (₹)</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((row) => (
                <tr key={row.key}>
                  <td className="px-2 py-1.5">
                    <Input value={row.name} onChange={(e) => setItemField(row.key, "name", e.target.value)} placeholder="Item name" className="h-8 border-0 shadow-none focus-visible:ring-0 px-1" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input type="number" value={row.quantity} onChange={(e) => setItemField(row.key, "quantity", parseFloat(e.target.value) || 0)} className="h-8 text-right border-0 shadow-none focus-visible:ring-0 px-1 w-20" min={0} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={row.unit} onChange={(e) => setItemField(row.key, "unit", e.target.value)} className="h-8 border-0 shadow-none focus-visible:ring-0 px-1 w-20" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input type="number" value={row.rate} onChange={(e) => setItemField(row.key, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-right border-0 shadow-none focus-visible:ring-0 px-1 w-28" min={0} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">{fmt.format(row.quantity * row.rate)}</td>
                  <td className="px-2 py-1.5">
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" onClick={() => setItems(items.filter((i) => i.key !== row.key))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3 pr-10">
          <div className="space-y-1 text-sm min-w-[200px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt.format(subtotal)}</span></div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-muted-foreground">Tax %</span>
              <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-right text-xs" min={0} max={100} />
            </div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{fmt.format(total)}</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mb-6">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, payment terms..." rows={2} />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update PO" : "Create PO"}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/purchase-orders")}>Cancel</Button>
      </div>
    </div>
  );
}
