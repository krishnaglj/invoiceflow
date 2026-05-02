import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const estimatesTable = pgTable("estimates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerState: text("customer_state"),
  customerGstin: text("customer_gstin"),
  estimateNumber: text("estimate_number").notNull(),
  estimateDate: text("estimate_date").notNull(),
  validUntil: text("valid_until"),
  status: text("status").notNull().default("draft"),
  placeOfSupply: text("place_of_supply"),
  supplyType: text("supply_type").notNull().default("intra"),
  subtotal: real("subtotal").notNull().default(0),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: real("discount_value").notNull().default(0),
  taxPercent: real("tax_percent").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  showBankDetails: boolean("show_bank_details").notNull().default(false),
  convertedToInvoiceId: integer("converted_to_invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const estimateItemsTable = pgTable("estimate_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").notNull(),
  productId: integer("product_id"),
  name: text("name").notNull(),
  description: text("description"),
  hsnCode: text("hsn_code"),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("piece"),
  rate: real("rate").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  amount: real("amount").notNull().default(0),
});

export const insertEstimateSchema = createInsertSchema(estimatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimatesTable.$inferSelect;

export const insertEstimateItemSchema = createInsertSchema(estimateItemsTable).omit({ id: true });
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type EstimateItem = typeof estimateItemsTable.$inferSelect;
