import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  defaultRate: real("default_rate").notNull().default(0),
  unit: text("unit").notNull().default("piece"),
  hsnCode: text("hsn_code"),
  taxRate: real("tax_rate").notNull().default(0),
  trackInventory: boolean("track_inventory").notNull().default(false),
  reorderLevel: real("reorder_level").notNull().default(0),
  costPrice: real("cost_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
