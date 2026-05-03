import { useState } from "react";
import { useLocation } from "wouter";
import { useListPurchaseOrders, useDeletePurchaseOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  received: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function PurchaseOrdersPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: pos = [], isLoading, refetch } = useListPurchaseOrders({
    search: search || undefined,
    status: (statusFilter !== "all" ? statusFilter : undefined) as any,
  });

  const deleteMutation = useDeletePurchaseOrder({
    mutation: {
      onSuccess: () => { toast({ title: "Purchase order deleted" }); refetch(); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage purchases from vendors</p>
        </div>
        <Button onClick={() => setLocation("/purchase-orders/new")}>
          <Plus className="w-4 h-4 mr-2" /> New PO
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search PO number or vendor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading purchase orders...</div>
      ) : pos.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No purchase orders yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create a PO to start receiving stock from your vendors</p>
          <Button onClick={() => setLocation("/purchase-orders/new")}><Plus className="w-4 h-4 mr-2" />New PO</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">PO Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expected</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setLocation(`/purchase-orders/${po.id}`)}>
                  <td className="px-4 py-3 font-mono font-medium">{po.poNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{po.vendorName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{po.poDate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{po.expectedDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt.format(po.total)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/purchase-orders/${po.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(po.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Stock already received will not be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
