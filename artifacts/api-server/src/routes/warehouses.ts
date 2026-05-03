import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, warehousesTable } from "@workspace/db";
import {
  ListWarehousesResponse,
  WarehouseSchema,
  CreateWarehouseBody,
  UpdateWarehouseParams,
  UpdateWarehouseBody,
  DeleteWarehouseParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/warehouses", requireAuth, async (req, res): Promise<void> => {
  const warehouses = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.userId, req.userId));

  res.json(ListWarehousesResponse.parse(warehouses));
});

router.post("/warehouses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.isDefault) {
    await db
      .update(warehousesTable)
      .set({ isDefault: false })
      .where(eq(warehousesTable.userId, req.userId));
  }

  const existingCount = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.userId, req.userId));

  const isFirst = existingCount.length === 0;

  const [warehouse] = await db
    .insert(warehousesTable)
    .values({ ...parsed.data, userId: req.userId, isDefault: parsed.data.isDefault ?? isFirst })
    .returning();

  res.status(201).json(WarehouseSchema.parse(warehouse));
});

router.patch("/warehouses/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.isDefault) {
    await db
      .update(warehousesTable)
      .set({ isDefault: false })
      .where(eq(warehousesTable.userId, req.userId));
  }

  const [warehouse] = await db
    .update(warehousesTable)
    .set(parsed.data)
    .where(and(eq(warehousesTable.id, id), eq(warehousesTable.userId, req.userId)))
    .returning();

  if (!warehouse) { res.status(404).json({ error: "Warehouse not found" }); return; }
  res.json(WarehouseSchema.parse(warehouse));
});

router.delete("/warehouses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWarehouseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [warehouse] = await db
    .delete(warehousesTable)
    .where(and(eq(warehousesTable.id, params.data.id), eq(warehousesTable.userId, req.userId)))
    .returning();

  if (!warehouse) { res.status(404).json({ error: "Warehouse not found" }); return; }
  res.sendStatus(204);
});

export default router;
