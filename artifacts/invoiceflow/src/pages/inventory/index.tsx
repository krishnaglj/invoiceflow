import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetInventoryOverview, useGetInventoryValuation, useGetReorderSuggestions,
  useListWarehouses, useListProducts, useCreateStockAdjustment, useListWarehouses as useWarehouses,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle, Boxes, TrendingUp, History, Plus, Loader2, PackageX } from "lucide-react";

export default function InventoryOverviewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjProduct, setAdjProduct] = useState<string>("");
  const [adjWarehouse, setAdjWarehouse] = useState<string>("");
  const [adjType, setAdjType] = useState<"in" | "out" | "adjustment">("in");
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjDate, setAdjDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjNotes, setAdjNotes] = useState("");

  const { data: warehouses = [] } = useListWarehouses();
  const { data: products = [] } = useListProducts();
  const { data: overview, isLoading, refetch } = useGetInventoryOverview({
    warehouseId: warehouseFilter !== "all" ? parseInt(warehouseFilter) : undefined,
    lowStockOnly: lowOnly || undefined,
    search: search || undefined,
  });
  const { data: valuation } = useGetInventoryValuation();
  const { data: reorder = [] } = useGetReorderSuggestions();

  const adjustMutation = useCreateStockAdjustment({
    mutation: {
      onSuccess: () => { toast({ title: "Stock adjusted" }); refetch(); setAdjustOpen(false); resetAdj(); },
      onError: (e: any) => toast({ title: e?.message ?? "Failed to adjust stock", variant: "destructive" }),
    },
  });

  const resetAdj = () => { setAdjProduct(""); setAdjQty(0); setAdjNotes(""); };

  const handleAdjust = () => {
    if (!adjProduct || adjQty <= 0) { toast({ title: "Select product and enter quantity", variant: "destructive" }); return; }
    adjustMutation.mutate({ productId: parseInt(adjProduct), warehouseId: adjWarehouse ? parseInt(adjWarehouse) : undefined, type: adjType, quantity: adjQty, date: adjDate, notes: adjNotes || undefined });
  };

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const fmtNum = (n: number) => new Intl.NumberFormat("en-IN").format(n);

  const summaryCards = [
    { label: "Total SKUs", value: fmtNum(overview?.totalProducts ?? 0), icon: Boxes, color: "text-primary" },
    { label: "Stock Value", value: fmt.format(overview?.totalValue ?? 0), icon: TrendingUp, color: "text-green-600" },
    { label: "Low Stock", value: fmtNum(overview?.lowStockCount ?? 0), icon: AlertTriangle, color: "text-yellow-600" },
    { label: "Out of Stock", value: fmtNum(overview?.outOfStockCount ?? 0), icon: PackageX, color: "text-red-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your inventory across all warehouses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/inventory/movements")}>
            <History className="w-4 h-4 mr-2" />Movements
          </Button>
          <Button onClick={() => setAdjustOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Adjust Stock
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="p-4 border rounded-xl bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="stock">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="reorder">Reorder ({reorder.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={lowOnly ? "default" : "outline"} size="sm" onClick={() => setLowOnly(!lowOnly)}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Low Stock
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : !overview?.items.length ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <Boxes className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tracked products found. Enable inventory tracking on your products.</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reorder At</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Cost</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock Value</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview.items.map((item) => (
                    <tr key={item.productId} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.hsnCode && <p className="text-xs text-muted-foreground">HSN: {item.hsnCode}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {fmtNum(item.totalQty)} <span className="text-muted-foreground font-normal text-xs">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmtNum(item.reorderLevel)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmt.format(item.avgCost)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt.format(item.totalValue)}</td>
                      <td className="px-4 py-3 text-right">
                        {item.totalQty === 0 ? (
                          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                        ) : item.isLowStock ? (
                          <Badge className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">In Stock</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="valuation">
          {!valuation?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">No stock data available</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-muted-foreground text-sm">{valuation.items.length} products with stock</p>
                <p className="font-bold text-lg">Total: {fmt.format(valuation.totalValue)}</p>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Cost</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {valuation.items.map((item) => (
                      <tr key={item.productId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmtNum(item.totalQty)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmt.format(item.avgCost)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt.format(item.totalValue)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {valuation.totalValue > 0 ? ((item.totalValue / valuation.totalValue) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reorder">
          {reorder.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">All products are stocked above reorder levels</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reorder.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: <span className="font-medium text-red-600">{fmtNum(item.currentQty)}</span> · Reorder at: {fmtNum(item.reorderLevel)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Suggested order</p>
                    <p className="text-lg font-bold">{fmtNum(item.suggestedQty)} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={adjProduct} onValueChange={setAdjProduct}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.filter((p) => p.trackInventory).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select value={adjWarehouse} onValueChange={setAdjWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={adjType} onValueChange={(v) => setAdjType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In (+)</SelectItem>
                    <SelectItem value="out">Stock Out (−)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min={0} value={adjQty} onChange={(e) => setAdjQty(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Reason for adjustment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdjustOpen(false); resetAdj(); }}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
