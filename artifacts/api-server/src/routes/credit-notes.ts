import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, creditNotesTable, creditNoteItemsTable, invoicesTable, invoiceItemsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateCreditNoteBody, UpdateCreditNoteBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function computeCNTotals(items: Array<{ quantity: number; rate: number }>, taxPercent: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

async function getCNWithItems(id: number, userId: string) {
  const [cn] = await db
    .select()
    .from(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.userId, userId)));
  if (!cn) return null;
  const items = await db
    .select()
    .from(creditNoteItemsTable)
    .where(eq(creditNoteItemsTable.creditNoteId, id));
  return { ...cn, items };
}

router.get("/credit-notes", requireAuth, async (req, res): Promise<void> => {
  const notes = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.userId, req.userId))
    .orderBy(desc(creditNotesTable.createdAt));
  res.json(notes);
});

router.post("/credit-notes/from-invoice/:invoiceId", requireAuth, async (req, res): Promise<void> => {
  const invoiceId = parseInt(req.params.invoiceId, 10);
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.userId, req.userId)));
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const invoiceItems = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));

  const existing = await db
    .select()
    .from(creditNotesTable)
    .where(eq(creditNotesTable.userId, req.userId));
  const nextNum = existing.length + 1;
  const creditNoteNumber = `CN-${String(nextNum).padStart(4, "0")}`;

  const [cn] = await db
    .insert(creditNotesTable)
    .values({
      userId: req.userId,
      invoiceId,
      creditNoteNumber,
      date: new Date().toISOString().split("T")[0],
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      customerGstin: invoice.customerGstin,
      subtotal: invoice.subtotal,
      taxPercent: invoice.taxPercent,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      supplyType: invoice.supplyType,
      status: "draft",
    })
    .returning();

  if (invoiceItems.length > 0) {
    await db.insert(creditNoteItemsTable).values(
      invoiceItems.map((item) => ({
        creditNoteId: cn.id,
        name: item.name,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate,
        amount: item.amount,
      }))
    );
  }

  const result = await getCNWithItems(cn.id, req.userId);
  res.status(201).json(result);
});

router.post("/credit-notes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCreditNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { items, ...cnData } = parsed.data;
  const { subtotal, taxAmount, total } = await computeCNTotals(items, cnData.taxPercent ?? 0);

  const [cn] = await db
    .insert(creditNotesTable)
    .values({ ...cnData, userId: req.userId, subtotal, taxAmount, total })
    .returning();

  if (items.length > 0) {
    await db.insert(creditNoteItemsTable).values(
      items.map((item) => ({
        creditNoteId: cn.id,
        name: item.name,
        description: item.description ?? null,
        hsnCode: item.hsnCode ?? null,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate ?? 0,
        amount: item.amount,
      }))
    );
  }

  const result = await getCNWithItems(cn.id, req.userId);
  res.status(201).json(result);
});

router.get("/credit-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const result = await getCNWithItems(id, req.userId);
  if (!result) {
    res.status(404).json({ error: "Credit note not found" });
    return;
  }
  res.json(result);
});

router.patch("/credit-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateCreditNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { items, taxPercent, ...cnData } = parsed.data;

  const [existing] = await db
    .select()
    .from(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.userId, req.userId)));
  if (!existing) {
    res.status(404).json({ error: "Credit note not found" });
    return;
  }

  if (items !== undefined) {
    const { subtotal, taxAmount, total } = await computeCNTotals(items, taxPercent ?? existing.taxPercent);
    await db
      .update(creditNotesTable)
      .set({ ...cnData, taxPercent: taxPercent ?? existing.taxPercent, subtotal, taxAmount, total })
      .where(eq(creditNotesTable.id, id));
    await db.delete(creditNoteItemsTable).where(eq(creditNoteItemsTable.creditNoteId, id));
    if (items.length > 0) {
      await db.insert(creditNoteItemsTable).values(
        items.map((item) => ({
          creditNoteId: id,
          name: item.name,
          description: item.description ?? null,
          hsnCode: item.hsnCode ?? null,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          taxRate: item.taxRate ?? 0,
          amount: item.amount,
        }))
      );
    }
  } else {
    await db
      .update(creditNotesTable)
      .set({ ...cnData, ...(taxPercent !== undefined ? { taxPercent } : {}) })
      .where(eq(creditNotesTable.id, id));
  }

  const result = await getCNWithItems(id, req.userId);
  res.json(result);
});

router.delete("/credit-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(creditNoteItemsTable).where(eq(creditNoteItemsTable.creditNoteId, id));
  const [deleted] = await db
    .delete(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.userId, req.userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Credit note not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
