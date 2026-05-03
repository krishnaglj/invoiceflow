import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
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
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("draft"),
  placeOfSupply: text("place_of_supply"),
  supplyType: text("supply_type").notNull().default("intra"),
  subtotal: real("subtotal").notNull().default(0),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: real("discount_value").notNull().default(0),
  taxPercent: real("tax_percent").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  tdsRate: real("tds_rate").notNull().default(0),
  tdsAmount: real("tds_amount").notNull().default(0),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  showBankDetails: boolean("show_bank_details").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
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

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const insertInvoiceItemSchema = createInsertSchema(invoiceItemsTable).omit({ id: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
