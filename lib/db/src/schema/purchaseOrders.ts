import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  vendorId: integer("vendor_id"),
  vendorName: text("vendor_name"),
  vendorGstin: text("vendor_gstin"),
  poNumber: text("po_number").notNull(),
  poDate: text("po_date").notNull(),
  expectedDate: text("expected_date"),
  status: text("status").notNull().default("draft"),
  warehouseId: integer("warehouse_id"),
  notes: text("notes"),
  subtotal: real("subtotal").notNull().default(0),
  taxPercent: real("tax_percent").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  productId: integer("product_id"),
  name: text("name").notNull(),
  description: text("description"),
  hsnCode: text("hsn_code"),
  quantity: real("quantity").notNull().default(1),
  receivedQty: real("received_qty").notNull().default(0),
  unit: text("unit").notNull().default("piece"),
  rate: real("rate").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  amount: real("amount").notNull().default(0),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true });
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
