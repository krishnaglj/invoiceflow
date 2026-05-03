import { Router, type IRouter } from "express";
import { eq, desc, sql, and, ilike } from "drizzle-orm";
import {
  db,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  warehouseStockTable,
  stockMovementsTable,
  productsTable,
  warehousesTable,
} from "@workspace/db";
import {
  ListPurchaseOrdersQueryParams,
  ListPurchaseOrdersResponse,
  GetPurchaseOrderParams,
  GetPurchaseOrderResponse,
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderParams,
  UpdatePurchaseOrderBody,
  UpdatePurchaseOrderResponse,
  DeletePurchaseOrderParams,
  GetNextPoNumberResponse,
  ReceivePurchaseOrderParams,
  ReceivePurchaseOrderBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getPoWithItems(poId: number, userId: string) {
  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, poId), eq(purchaseOrdersTable.userId, userId)));
  if (!po) return null;
  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.poId, poId));
  return { ...po, items };
}

function computePoTotals(items: Array<{ quantity: number; rate: number }>, taxPercent: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

router.get("/purchase-orders/next-number", requireAuth, async (req, res): Promise<void> => {
  const [last] = await db
    .select({ poNumber: purchaseOrdersTable.poNumber })
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.userId, req.userId))
    .orderBy(desc(purchaseOrdersTable.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (last) {
    const match = last.poNumber.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  const poNumber = `PO-${String(nextNumber).padStart(4, "0")}`;
  res.json(GetNextPoNumberResponse.parse({ poNumber, number: nextNumber }));
});

router.get("/purchase-orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListPurchaseOrdersQueryParams.safeParse(req.query);
  const { status, vendorId, search } = query.success
    ? query.data
    : { status: undefined, vendorId: undefined, search: undefined };

  let pos = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.userId, req.userId))
    .orderBy(desc(purchaseOrdersTable.createdAt));

  if (status) pos = pos.filter((p) => p.status === status);
  if (vendorId) pos = pos.filter((p) => p.vendorId === vendorId);
  if (search) {
    const s = search.toLowerCase();
    pos = pos.filter(
      (p) =>
        p.poNumber.toLowerCase().includes(s) ||
        (p.vendorName ?? "").toLowerCase().includes(s),
    );
  }

  res.json(ListPurchaseOrdersResponse.parse(pos));
});

router.get("/purchase-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPurchaseOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const po = await getPoWithItems(params.data.id, req.userId);
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(GetPurchaseOrderResponse.parse(po));
});

router.post("/purchase-orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { items, taxPercent = 0, ...header } = parsed.data;
  const totals = computePoTotals(items, taxPercent);

  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({ ...header, userId: req.userId, taxPercent, ...totals, status: header.status ?? "draft" })
    .returning();

  if (items.length > 0) {
    await db.insert(purchaseOrderItemsTable).values(
      items.map((item) => ({ ...item, poId: po.id, taxRate: item.taxRate ?? 0 })),
    );
  }

  const result = await getPoWithItems(po.id, req.userId);
  res.status(201).json(GetPurchaseOrderResponse.parse(result));
});

router.patch("/purchase-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePurchaseOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { items, taxPercent, ...header } = parsed.data;

  const updateData: Record<string, unknown> = { ...header };

  if (items !== undefined) {
    const existingItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.poId, params.data.id));

    const tp = taxPercent ?? 0;
    const totals = computePoTotals(items, tp);
    updateData.taxPercent = tp;
    updateData.subtotal = totals.subtotal;
    updateData.taxAmount = totals.taxAmount;
    updateData.total = totals.total;

    const existingIds = new Set(existingItems.map((i) => i.id));
    await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, params.data.id));
    if (items.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((item) => ({ ...item, poId: params.data.id, taxRate: item.taxRate ?? 0 })),
      );
    }
    existingIds; // suppress unused warning
  } else if (taxPercent !== undefined) {
    const currentItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.poId, params.data.id));
    const totals = computePoTotals(currentItems, taxPercent);
    updateData.taxPercent = taxPercent;
    updateData.subtotal = totals.subtotal;
    updateData.taxAmount = totals.taxAmount;
    updateData.total = totals.total;
  }

  await db
    .update(purchaseOrdersTable)
    .set(updateData)
    .where(and(eq(purchaseOrdersTable.id, params.data.id), eq(purchaseOrdersTable.userId, req.userId)));

  const result = await getPoWithItems(params.data.id, req.userId);
  if (!result) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(UpdatePurchaseOrderResponse.parse(result));
});

router.delete("/purchase-orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePurchaseOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, params.data.id));
  const [po] = await db
    .delete(purchaseOrdersTable)
    .where(and(eq(purchaseOrdersTable.id, params.data.id), eq(purchaseOrdersTable.userId, req.userId)))
    .returning();

  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.sendStatus(204);
});

// ─── Receive goods against a PO ──────────────────────────────────────────────

router.post("/purchase-orders/:id/receive", requireAuth, async (req, res): Promise<void> => {
  const params = ReceivePurchaseOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = ReceivePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const po = await getPoWithItems(params.data.id, req.userId);
  if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }
  if (po.status === "cancelled") { res.status(400).json({ error: "Cannot receive a cancelled PO" }); return; }

  const { warehouseId, receivedDate, items: receiveItems, notes } = parsed.data;
  const today = receivedDate ?? new Date().toISOString().split("T")[0];

  let defaultWarehouseId = warehouseId;
  if (!defaultWarehouseId) {
    const [defWh] = await db
      .select()
      .from(warehousesTable)
      .where(and(eq(warehousesTable.userId, req.userId), eq(warehousesTable.isDefault, true)))
      .limit(1);
    if (defWh) defaultWarehouseId = defWh.id;
  }

  for (const recv of receiveItems) {
    const poItem = po.items.find((i) => i.id === recv.itemId);
    if (!poItem || recv.receivedQty <= 0) continue;

    await db
      .update(purchaseOrderItemsTable)
      .set({ receivedQty: (poItem.receivedQty ?? 0) + recv.receivedQty })
      .where(eq(purchaseOrderItemsTable.id, recv.itemId));

    if (poItem.productId && defaultWarehouseId) {
      const [existing] = await db
        .select()
        .from(warehouseStockTable)
        .where(
          and(
            eq(warehouseStockTable.productId, poItem.productId),
            eq(warehouseStockTable.warehouseId, defaultWarehouseId),
            eq(warehouseStockTable.userId, req.userId),
          ),
        );

      const prevQty = existing?.quantity ?? 0;
      const prevAvgCost = existing?.avgCost ?? 0;
      const newQty = prevQty + recv.receivedQty;
      const newAvgCost =
        newQty > 0
          ? (prevQty * prevAvgCost + recv.receivedQty * poItem.rate) / newQty
          : poItem.rate;

      if (existing) {
        await db
          .update(warehouseStockTable)
          .set({ quantity: newQty, avgCost: newAvgCost })
          .where(eq(warehouseStockTable.id, existing.id));
      } else {
        await db.insert(warehouseStockTable).values({
          userId: req.userId,
          productId: poItem.productId,
          warehouseId: defaultWarehouseId,
          quantity: newQty,
          avgCost: newAvgCost,
        });
      }

      await db.insert(stockMovementsTable).values({
        userId: req.userId,
        productId: poItem.productId,
        warehouseId: defaultWarehouseId,
        type: "in",
        quantity: recv.receivedQty,
        beforeQty: prevQty,
        afterQty: newQty,
        refType: "purchase_order",
        refId: po.id,
        notes: notes ?? null,
        date: today,
      });
    }
  }

  const updatedItems = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.poId, po.id));

  const allReceived = updatedItems.every((i) => (i.receivedQty ?? 0) >= i.quantity);
  const anyReceived = updatedItems.some((i) => (i.receivedQty ?? 0) > 0);
  const newStatus = allReceived ? "received" : anyReceived ? "partial" : po.status;

  await db
    .update(purchaseOrdersTable)
    .set({ status: newStatus })
    .where(eq(purchaseOrdersTable.id, po.id));

  const result = await getPoWithItems(po.id, req.userId);
  res.json(GetPurchaseOrderResponse.parse(result));
});

export default router;
