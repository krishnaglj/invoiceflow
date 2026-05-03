import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id"),
  type: text("type").notNull(),
  quantity: real("quantity").notNull(),
  beforeQty: real("before_qty").notNull().default(0),
  afterQty: real("after_qty").notNull().default(0),
  refType: text("ref_type"),
  refId: integer("ref_id"),
  notes: text("notes"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const warehouseStockTable = pgTable("warehouse_stock", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  quantity: real("quantity").notNull().default(0),
  avgCost: real("avg_cost").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;

export const insertWarehouseStockSchema = createInsertSchema(warehouseStockTable).omit({ id: true });
export type InsertWarehouseStock = z.infer<typeof insertWarehouseStockSchema>;
export type WarehouseStock = typeof warehouseStockTable.$inferSelect;
