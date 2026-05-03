import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, productsTable, warehouseStockTable, warehousesTable } from "@workspace/db";
import {
  GetInventoryOverviewQueryParams,
  GetInventoryOverviewResponse,
  GetInventoryValuationResponse,
  GetReorderSuggestionsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/inventory/overview", requireAuth, async (req, res): Promise<void> => {
  const query = GetInventoryOverviewQueryParams.safeParse(req.query);
  const { warehouseId, lowStockOnly, search } = query.success
    ? query.data
    : { warehouseId: undefined, lowStockOnly: undefined, search: undefined };

  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.userId, req.userId), eq(productsTable.trackInventory, true)));

  const allStock = await db
    .select()
    .from(warehouseStockTable)
    .where(eq(warehouseStockTable.userId, req.userId));

  const warehouses = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.userId, req.userId));

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const stockByProduct = new Map<number, typeof allStock>();
  for (const s of allStock) {
    if (!stockByProduct.has(s.productId)) stockByProduct.set(s.productId, []);
    stockByProduct.get(s.productId)!.push(s);
  }

  let items = products.map((p) => {
    const stockRows = (stockByProduct.get(p.id) ?? []).filter(
      (s) => !warehouseId || s.warehouseId === warehouseId,
    );
    const totalQty = stockRows.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = stockRows.reduce((sum, s) => sum + s.quantity * s.avgCost, 0);
    const avgCost = totalQty > 0 ? totalValue / totalQty : (p.costPrice ?? 0);
    const warehouseBreakdown = stockRows.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: warehouseMap.get(s.warehouseId) ?? "Unknown",
      quantity: s.quantity,
      avgCost: s.avgCost,
    }));
    return {
      productId: p.id,
      name: p.name,
      hsnCode: p.hsnCode ?? null,
      unit: p.unit,
      reorderLevel: p.reorderLevel,
      costPrice: p.costPrice ?? null,
      totalQty,
      avgCost,
      totalValue,
      isLowStock: totalQty <= p.reorderLevel,
      warehouseBreakdown,
    };
  });

  if (search) {
    const s = search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(s) || (i.hsnCode ?? "").includes(s));
  }
  if (lowStockOnly) {
    items = items.filter((i) => i.isLowStock);
  }

  const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);
  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const outOfStockCount = items.filter((i) => i.totalQty === 0).length;

  res.json(
    GetInventoryOverviewResponse.parse({
      totalProducts: items.length,
      totalValue,
      lowStockCount,
      outOfStockCount,
      items,
    }),
  );
});

router.get("/inventory/valuation", requireAuth, async (req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.userId, req.userId), eq(productsTable.trackInventory, true)));

  const allStock = await db
    .select()
    .from(warehouseStockTable)
    .where(eq(warehouseStockTable.userId, req.userId));

  const stockByProduct = new Map<number, typeof allStock>();
  for (const s of allStock) {
    if (!stockByProduct.has(s.productId)) stockByProduct.set(s.productId, []);
    stockByProduct.get(s.productId)!.push(s);
  }

  const items = products
    .map((p) => {
      const stockRows = stockByProduct.get(p.id) ?? [];
      const totalQty = stockRows.reduce((sum, s) => sum + s.quantity, 0);
      const totalValue = stockRows.reduce((sum, s) => sum + s.quantity * s.avgCost, 0);
      const avgCost = totalQty > 0 ? totalValue / totalQty : (p.costPrice ?? 0);
      return { productId: p.id, name: p.name, totalQty, avgCost, totalValue };
    })
    .filter((i) => i.totalQty > 0)
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);

  res.json(GetInventoryValuationResponse.parse({ totalValue, items }));
});

router.get("/inventory/reorder-suggestions", requireAuth, async (req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.userId, req.userId), eq(productsTable.trackInventory, true)));

  const allStock = await db
    .select()
    .from(warehouseStockTable)
    .where(eq(warehouseStockTable.userId, req.userId));

  const stockByProduct = new Map<number, number>();
  for (const s of allStock) {
    stockByProduct.set(s.productId, (stockByProduct.get(s.productId) ?? 0) + s.quantity);
  }

  const suggestions = products
    .filter((p) => {
      const qty = stockByProduct.get(p.id) ?? 0;
      return qty <= p.reorderLevel;
    })
    .map((p) => {
      const currentQty = stockByProduct.get(p.id) ?? 0;
      return {
        productId: p.id,
        name: p.name,
        currentQty,
        reorderLevel: p.reorderLevel,
        suggestedQty: Math.max(p.reorderLevel * 2 - currentQty, 10),
      };
    });

  res.json(GetReorderSuggestionsResponse.parse(suggestions));
});

export default router;
