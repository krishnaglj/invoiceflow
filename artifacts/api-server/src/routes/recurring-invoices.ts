import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, recurringInvoicesTable, invoicesTable, invoiceItemsTable, businessProfilesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function addFrequency(dateStr: string, frequency: string): string {
  const d = new Date(dateStr);
  switch (frequency) {
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly":    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

function parseRec(r: typeof recurringInvoicesTable.$inferSelect) {
  let items: any[] = [];
  try { items = JSON.parse(r.itemsJson); } catch {}
  return { ...r, items };
}

router.get("/recurring-invoices", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(recurringInvoicesTable)
    .where(eq(recurringInvoicesTable.userId, req.userId))
    .orderBy(desc(recurringInvoicesTable.createdAt));
  res.json(rows.map(parseRec));
});

router.post("/recurring-invoices", requireAuth, async (req, res): Promise<void> => {
  const { items, ...rest } = req.body;
  const [row] = await db
    .insert(recurringInvoicesTable)
    .values({
      userId: req.userId,
      name: rest.name,
      frequency: rest.frequency,
      dayOfMonth: rest.dayOfMonth ?? 1,
      nextRunDate: rest.nextRunDate,
      endDate: rest.endDate ?? null,
      customerId: rest.customerId ?? null,
      customerName: rest.customerName ?? null,
      customerEmail: rest.customerEmail ?? null,
      customerPhone: rest.customerPhone ?? null,
      customerAddress: rest.customerAddress ?? null,
      customerGstin: rest.customerGstin ?? null,
      placeOfSupply: rest.placeOfSupply ?? null,
      supplyType: rest.supplyType ?? "intra",
      itemsJson: JSON.stringify(items ?? []),
      discountType: rest.discountType ?? "flat",
      discountValue: rest.discountValue ?? 0,
      taxPercent: rest.taxPercent ?? 0,
      notes: rest.notes ?? null,
      paymentTerms: rest.paymentTerms ?? null,
      showBankDetails: rest.showBankDetails ?? true,
    })
    .returning();
  res.status(201).json(parseRec(row));
});

router.patch("/recurring-invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { items, ...rest } = req.body;
  const updateData: Record<string, any> = { ...rest };
  if (items !== undefined) updateData.itemsJson = JSON.stringify(items);
  const [row] = await db
    .update(recurringInvoicesTable)
    .set(updateData)
    .where(and(eq(recurringInvoicesTable.id, id), eq(recurringInvoicesTable.userId, req.userId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(parseRec(row));
});

router.delete("/recurring-invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db
    .delete(recurringInvoicesTable)
    .where(and(eq(recurringInvoicesTable.id, id), eq(recurringInvoicesTable.userId, req.userId)));
  res.sendStatus(204);
});

router.post("/recurring-invoices/:id/run", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [rec] = await db
    .select()
    .from(recurringInvoicesTable)
    .where(and(eq(recurringInvoicesTable.id, id), eq(recurringInvoicesTable.userId, req.userId)));
  if (!rec) { res.status(404).json({ error: "Not found" }); return; }

  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.userId));

  const prefix = profile?.invoicePrefix ?? "INV";
  const startNum = profile?.invoiceStartNumber ?? 1;
  const [countResult] = await db
    .select({ count: invoicesTable.id })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, req.userId));
  const count = (countResult as any)?.count ?? 0;
  const invoiceNumber = `${prefix}-${String(startNum + (typeof count === "number" ? count : 0)).padStart(4, "0")}`;

  let items: any[] = [];
  try { items = JSON.parse(rec.itemsJson); } catch {}

  const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.rate), 0);
  const taxAmount = (subtotal * (rec.taxPercent ?? 0)) / 100;
  const total = subtotal + taxAmount;
  const today = new Date().toISOString().split("T")[0];

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      userId: req.userId,
      customerId: rec.customerId,
      customerName: rec.customerName,
      customerEmail: rec.customerEmail,
      customerPhone: rec.customerPhone,
      customerAddress: rec.customerAddress,
      customerGstin: rec.customerGstin,
      invoiceNumber,
      invoiceDate: today,
      placeOfSupply: rec.placeOfSupply,
      supplyType: rec.supplyType,
      subtotal,
      discountType: rec.discountType,
      discountValue: rec.discountValue,
      taxPercent: rec.taxPercent,
      taxAmount,
      total,
      paidAmount: 0,
      notes: rec.notes,
      paymentTerms: rec.paymentTerms,
      showBankDetails: rec.showBankDetails,
      status: "sent",
    })
    .returning();

  if (items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      items.map((item: any) => ({
        invoiceId: invoice.id,
        name: item.name,
        description: item.description ?? null,
        hsnCode: item.hsnCode ?? null,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate ?? 0,
        amount: item.quantity * item.rate,
      }))
    );
  }

  const nextRunDate = addFrequency(rec.nextRunDate, rec.frequency);
  await db
    .update(recurringInvoicesTable)
    .set({ lastGeneratedAt: today, nextRunDate })
    .where(eq(recurringInvoicesTable.id, id));

  res.status(201).json({ invoiceId: invoice.id, invoiceNumber });
});

export default router;
