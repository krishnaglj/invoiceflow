import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetPurchaseOrder, useReceivePurchaseOrder, useUpdatePurchaseOrder, useListWarehouses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, PackageCheck, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PurchaseOrderDetail() {
  const params = useParams<{ id: string }>();
  const poId = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: po, refetch } = useGetPurchaseOrder(poId);
  const { data: warehouses = [] } = useListWarehouses();
  const receiveMutation = useReceivePurchaseOrder({
    mutation: {
      onSuccess: () => { toast({ title: "Stock received successfully" }); refetch(); setReceiveOpen(false); },
      onError: (e: any) => toast({ title: e?.message ?? "Failed to receive stock", variant: "destructive" }),
    },
  });
  const updateMutation = useUpdatePurchaseOrder({
    mutation: { onSuccess: () => { refetch(); toast({ title: "Status updated" }); } },
  });

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});
  const [receiveWarehouse, setReceiveWarehouse] = useState<string>("");
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split("T")[0]);

  const openReceive = () => {
    const init: Record<number, number> = {};
    po?.items.forEach((item) => { init[item.id] = Math.max(0, item.quantity - (item.receivedQty ?? 0)); });
    setReceiveQtys(init);
    setReceiveDate(new Date().toISOString().split("T")[0]);
    setReceiveWarehouse(po?.warehouseId ? String(po.warehouseId) : (warehouses.find((w) => w.isDefault)?.id ? String(warehouses.find((w) => w.isDefault)!.id) : ""));
    setReceiveOpen(true);
  };

  const handleReceive = () => {
    const items = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, receivedQty]) => ({ itemId: parseInt(id), receivedQty }));
    if (items.length === 0) { toast({ title: "Enter at least one quantity to receive", variant: "destructive" }); return; }
    receiveMutation.mutate({ id: poId, data: { warehouseId: receiveWarehouse ? parseInt(receiveWarehouse) : undefined, receivedDate: receiveDate, items } });
  };

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

  if (!po) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const canReceive = po.status !== "received" && po.status !== "cancelled";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setLocation("/purchase-orders")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setLocation(`/purchase-orders/${poId}/edit`)}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
        </Button>
        {canReceive && (
          <Button size="sm" onClick={openReceive}>
            <PackageCheck className="w-3.5 h-3.5 mr-1.5" />Receive Goods
          </Button>
        )}
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{po.poNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
              {po.status}
            </span>
          </div>
          {po.vendorName && <p className="text-muted-foreground mt-1">{po.vendorName}{po.vendorGstin ? ` • GST: ${po.vendorGstin}` : ""}</p>}
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>PO Date: <span className="text-foreground font-medium">{po.poDate}</span></p>
          {po.expectedDate && <p>Expected: <span className="text-foreground font-medium">{po.expectedDate}</span></p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="border rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ordered</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Received</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pending</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rate</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {po.items.map((item) => {
              const pending = item.quantity - (item.receivedQty ?? 0);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.name}</p>
                    {item.hsnCode && <p className="text-xs text-muted-foreground">HSN: {item.hsnCode}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{item.receivedQty ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={pending > 0 ? "text-yellow-600 font-medium" : "text-muted-foreground"}>{pending}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{fmt.format(item.rate)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt.format(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="space-y-1.5 text-sm min-w-[220px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt.format(po.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({po.taxPercent ?? 0}%)</span><span>{fmt.format(po.taxAmount)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{fmt.format(po.total)}</span></div>
        </div>
      </div>

      {po.notes && (
        <div className="p-4 bg-muted/30 rounded-xl text-sm">
          <p className="font-medium mb-1">Notes</p>
          <p className="text-muted-foreground">{po.notes}</p>
        </div>
      )}

      {/* Quick status change */}
      {po.status === "draft" && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: poId, data: { status: "sent" } })}>
            Mark as Sent to Vendor
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => updateMutation.mutate({ id: poId, data: { status: "cancelled" } })}>
            Cancel PO
          </Button>
        </div>
      )}

      {/* Receive Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Receive Goods</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Receive Date</Label>
                <Input type="date" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select value={receiveWarehouse} onValueChange={setReceiveWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}{w.isDefault ? " (default)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Pending</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Receive Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {po.items.map((item) => {
                    const pending = item.quantity - (item.receivedQty ?? 0);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{pending} {item.unit}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={pending}
                            value={receiveQtys[item.id] ?? 0}
                            onChange={(e) => setReceiveQtys({ ...receiveQtys, [item.id]: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-center w-24 mx-auto block"
                            disabled={pending <= 0}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Receive & Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
