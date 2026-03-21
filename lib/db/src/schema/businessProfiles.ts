import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessProfilesTable = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  gstin: text("gstin"),
  website: text("website"),
  logoUrl: text("logo_url"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  accountHolder: text("account_holder"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  invoiceStartNumber: integer("invoice_start_number").notNull().default(1),
  defaultTaxPercent: real("default_tax_percent").notNull().default(0),
  defaultNotes: text("default_notes"),
  defaultPaymentTerms: text("default_payment_terms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBusinessProfileSchema = createInsertSchema(businessProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type BusinessProfile = typeof businessProfilesTable.$inferSelect;
