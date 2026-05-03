import { Router, type IRouter } from "express";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import {
  db,
  stockMovementsTable,
  warehouseStockTable,
  productsTable,
  warehousesTable,
} from "@workspace/db";
import {
  ListStockMovementsQueryParams,
  ListStockMovementsResponse,
  StockMovementSchema,
  CreateStockAdjustmentBody,
  CreateStockTransferBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/stock-movements", requireAuth, async (req, res): Promise<void> => {
  const query = ListStockMovementsQueryParams.safeParse(req.query);
  const { productId, warehouseId, type, startDate, endDate } = query.success
    ? query.data
    : { productId: undefined, warehouseId: undefined, type: undefined, startDate: undefined, endDate: undefined };

  let movements = await db
    .select()
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.userId, req.userId))
    .orderBy(desc(stockMovementsTable.createdAt));

  if (productId) movements = movements.filter((m) => m.productId === productId);
  if (warehouseId) movements = movements.filter((m) => m.warehouseId === warehouseId);
  if (type) movements = movements.filter((m) => m.type === type);
  if (startDate) movements = movements.filter((m) => m.date >= startDate);
  if (endDate) movements = movements.filter((m) => m.date <= endDate);

  const products = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.userId, req.userId));

  const warehouses = await db
    .select({ id: warehousesTable.id, name: warehousesTable.name })
    .from(warehousesTable)
    .where(eq(warehousesTable.userId, req.userId));

  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const enriched = movements.map((m) => ({
    ...m,
    productName: productMap.get(m.productId) ?? null,
    warehouseName: m.warehouseId ? (warehouseMap.get(m.warehouseId) ?? null) : null,
  }));

  res.json(ListStockMovementsResponse.parse(enriched));
});

router.post("/stock-movements/adjustment", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStockAdjustmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { productId, warehouseId, type, quantity, date, notes } = parsed.data;

  let resolvedWarehouseId = warehouseId;
  if (!resolvedWarehouseId) {
    const [defWh] = await db
      .select()
      .from(warehousesTable)
      .where(and(eq(warehousesTable.userId, req.userId), eq(warehousesTable.isDefault, true)))
      .limit(1);
    if (defWh) resolvedWarehouseId = defWh.id;
  }

  if (!resolvedWarehouseId) {
    res.status(400).json({ error: "No warehouse specified and no default warehouse found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(warehouseStockTable)
    .where(
      and(
        eq(warehouseStockTable.productId, productId),
        eq(warehouseStockTable.warehouseId, resolvedWarehouseId),
        eq(warehouseStockTable.userId, req.userId),
      ),
    );

  const prevQty = existing?.quantity ?? 0;
  const delta = type === "out" ? -quantity : quantity;
  const newQty = Math.max(0, prevQty + delta);

  if (existing) {
    await db
      .update(warehouseStockTable)
      .set({ quantity: newQty })
      .where(eq(warehouseStockTable.id, existing.id));
  } else {
    await db.insert(warehouseStockTable).values({
      userId: req.userId,
      productId,
      warehouseId: resolvedWarehouseId,
      quantity: newQty,
      avgCost: 0,
    });
  }

  const [movement] = await db
    .insert(stockMovementsTable)
    .values({
      userId: req.userId,
      productId,
      warehouseId: resolvedWarehouseId,
      type,
      quantity,
      beforeQty: prevQty,
      afterQty: newQty,
      refType: "manual",
      refId: null,
      notes: notes ?? null,
      date,
    })
    .returning();

  const [product] = await db.select({ name: productsTable.name }).from(productsTable).where(eq(productsTable.id, productId));
  const [wh] = await db.select({ name: warehousesTable.name }).from(warehousesTable).where(eq(warehousesTable.id, resolvedWarehouseId));

  res.status(201).json(
    StockMovementSchema.parse({
      ...movement,
      productName: product?.name ?? null,
      warehouseName: wh?.name ?? null,
    }),
  );
});

router.post("/stock-movements/transfer", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStockTransferBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { productId, fromWarehouseId, toWarehouseId, quantity, date, notes } = parsed.data;

  if (fromWarehouseId === toWarehouseId) {
    res.status(400).json({ error: "Source and destination warehouses must be different" });
    return;
  }

  const [fromStock] = await db
    .select()
    .from(warehouseStockTable)
    .where(
      and(
        eq(warehouseStockTable.productId, productId),
        eq(warehouseStockTable.warehouseId, fromWarehouseId),
        eq(warehouseStockTable.userId, req.userId),
      ),
    );

  if (!fromStock || fromStock.quantity < quantity) {
    res.status(400).json({ error: "Insufficient stock in source warehouse" });
    return;
  }

  const [toStock] = await db
    .select()
    .from(warehouseStockTable)
    .where(
      and(
        eq(warehouseStockTable.productId, productId),
        eq(warehouseStockTable.warehouseId, toWarehouseId),
        eq(warehouseStockTable.userId, req.userId),
      ),
    );

  const fromBefore = fromStock.quantity;
  const toBefore = toStock?.quantity ?? 0;
  const fromAfter = fromBefore - quantity;
  const toAfter = toBefore + quantity;

  await db
    .update(warehouseStockTable)
    .set({ quantity: fromAfter })
    .where(eq(warehouseStockTable.id, fromStock.id));

  if (toStock) {
    await db
      .update(warehouseStockTable)
      .set({ quantity: toAfter, avgCost: (toBefore * (toStock.avgCost ?? 0) + quantity * (fromStock.avgCost ?? 0)) / toAfter })
      .where(eq(warehouseStockTable.id, toStock.id));
  } else {
    await db.insert(warehouseStockTable).values({
      userId: req.userId,
      productId,
      warehouseId: toWarehouseId,
      quantity: toAfter,
      avgCost: fromStock.avgCost ?? 0,
    });
  }

  await db.insert(stockMovementsTable).values([
    {
      userId: req.userId,
      productId,
      warehouseId: fromWarehouseId,
      type: "transfer",
      quantity: -quantity,
      beforeQty: fromBefore,
      afterQty: fromAfter,
      refType: "transfer",
      refId: toWarehouseId,
      notes: notes ?? null,
      date,
    },
    {
      userId: req.userId,
      productId,
      warehouseId: toWarehouseId,
      type: "transfer",
      quantity,
      beforeQty: toBefore,
      afterQty: toAfter,
      refType: "transfer",
      refId: fromWarehouseId,
      notes: notes ?? null,
      date,
    },
  ]);

  res.sendStatus(200);
});

export default router;
