import { useState } from "react";
import { useLocation } from "wouter";
import { useListStockMovements, useListWarehouses, useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowLeftRight } from "lucide-react";

const TYPE_CONFIG = {
  in: { label: "Stock In", icon: ArrowUpCircle, color: "text-green-600" },
  out: { label: "Stock Out", icon: ArrowDownCircle, color: "text-red-600" },
  adjustment: { label: "Adjustment", icon: RefreshCw, color: "text-blue-600" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, color: "text-purple-600" },
};

const REF_LABELS: Record<string, string> = {
  purchase_order: "PO",
  invoice: "INV",
  manual: "Manual",
  transfer: "Transfer",
};

export default function StockMovementsPage() {
  const [, setLocation] = useLocation();
  const [productFilter, setProductFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: warehouses = [] } = useListWarehouses();
  const { data: products = [] } = useListProducts();
  const { data: movements = [], isLoading } = useListStockMovements({
    productId: productFilter !== "all" ? parseInt(productFilter) : undefined,
    warehouseId: warehouseFilter !== "all" ? parseInt(warehouseFilter) : undefined,
    type: typeFilter !== "all" ? typeFilter as any : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const fmtNum = (n: number) => {
    const s = new Intl.NumberFormat("en-IN").format(Math.abs(n));
    return n < 0 ? `−${s}` : `+${s}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back to Inventory
        </Button>
        <div className="flex-1" />
        <h1 className="text-2xl font-bold">Stock Movements</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All warehouses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" placeholder="From" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" placeholder="To" />
        </div>
        {(productFilter !== "all" || warehouseFilter !== "all" || typeFilter !== "all" || startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setProductFilter("all"); setWarehouseFilter("all"); setTypeFilter("all"); setStartDate(""); setEndDate(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading movements...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold mb-1">No stock movements found</p>
          <p className="text-sm text-muted-foreground">Movements are created when you receive POs, create invoices, or adjust stock manually</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b bg-muted/30 text-sm text-muted-foreground">
            {movements.length} movement{movements.length !== 1 ? "s" : ""}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Warehouse</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Before</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">After</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movements.map((m) => {
                const cfg = TYPE_CONFIG[m.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.adjustment;
                const TypeIcon = cfg.icon;
                return (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{m.date}</td>
                    <td className="px-4 py-3 font-medium">{m.productName ?? `#${m.productId}`}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.warehouseName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.quantity < 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmtNum(m.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{new Intl.NumberFormat("en-IN").format(m.beforeQty)}</td>
                    <td className="px-4 py-3 text-right font-medium">{new Intl.NumberFormat("en-IN").format(m.afterQty)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.refType ? `${REF_LABELS[m.refType] ?? m.refType}${m.refId ? ` #${m.refId}` : ""}` : "—"}
                      {m.notes && <p className="text-muted-foreground/70 mt-0.5 truncate max-w-[120px]">{m.notes}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
