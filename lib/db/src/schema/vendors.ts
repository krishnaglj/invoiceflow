import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  gstin: text("gstin"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
