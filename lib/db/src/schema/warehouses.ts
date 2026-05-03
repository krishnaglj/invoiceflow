import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  location: text("location"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;
