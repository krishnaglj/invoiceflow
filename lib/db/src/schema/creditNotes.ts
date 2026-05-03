import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditNotesTable = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  invoiceId: integer("invoice_id"),
  creditNoteNumber: text("credit_note_number").notNull(),
  date: text("date").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerGstin: text("customer_gstin"),
  reason: text("reason"),
  status: text("status").notNull().default("draft"),
  subtotal: real("subtotal").notNull().default(0),
  taxPercent: real("tax_percent").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  supplyType: text("supply_type").notNull().default("intra"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const creditNoteItemsTable = pgTable("credit_note_items", {
  id: serial("id").primaryKey(),
  creditNoteId: integer("credit_note_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  hsnCode: text("hsn_code"),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("pcs"),
  rate: real("rate").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  amount: real("amount").notNull().default(0),
});

export const insertCreditNoteSchema = createInsertSchema(creditNotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;
export type CreditNote = typeof creditNotesTable.$inferSelect;

export const insertCreditNoteItemSchema = createInsertSchema(creditNoteItemsTable).omit({ id: true });
export type InsertCreditNoteItem = z.infer<typeof insertCreditNoteItemSchema>;
export type CreditNoteItem = typeof creditNoteItemsTable.$inferSelect;
