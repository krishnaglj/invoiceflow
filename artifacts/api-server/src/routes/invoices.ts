import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, inArray, sql } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, businessProfilesTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  UpdateInvoiceBody,
  UpdateInvoiceParams,
  GetInvoiceParams,
  DeleteInvoiceParams,
  MarkInvoicePaidParams,
  ListInvoicesQueryParams,
  ListInvoicesResponse,
  GetInvoiceResponse,
  UpdateInvoiceResponse,
  MarkInvoicePaidResponse,
  GetNextInvoiceNumberResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper to compute totals from items
function computeTotals(
  items: Array<{ quantity: number; rate: number }>,
  discountType: string,
  discountValue: number,
  taxPercent: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = (discountedSubtotal * taxPercent) / 100;
  const total = discountedSubtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

// Helper to enrich invoice with items
async function getInvoiceWithItems(id: number) {
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id));
  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, id));

  return { ...invoice, items };
}

router.get("/invoices/next-number", async (req, res): Promise<void> => {
  const [profile] = await db.select().from(businessProfilesTable).limit(1);
  const prefix = profile?.invoicePrefix ?? "INV";
  const startNum = profile?.invoiceStartNumber ?? 1;

  const [maxResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable);

  const count = maxResult?.count ?? 0;
  const nextNum = startNum + count;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  res.json(GetNextInvoiceNumberResponse.parse({ invoiceNumber, prefix, number: nextNum }));
});

router.get("/invoices", async (req, res): Promise<void> => {
  const queryParams = ListInvoicesQueryParams.safeParse(req.query);
  const { status, search, startDate, endDate } = queryParams.success
    ? queryParams.data
    : { status: undefined, search: undefined, startDate: undefined, endDate: undefined };

  let query = db.select().from(invoicesTable).$dynamic();

  const conditions = [];
  if (status) {
    conditions.push(eq(invoicesTable.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(invoicesTable.invoiceNumber, `%${search}%`),
        ilike(invoicesTable.customerName, `%${search}%`)
      )
    );
  }

  const invoices = await db
    .select({
      id: invoicesTable.id,
      customerId: invoicesTable.customerId,
      customerName: invoicesTable.customerName,
      invoiceNumber: invoicesTable.invoiceNumber,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      total: invoicesTable.total,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .orderBy(desc(invoicesTable.createdAt));

  // Filter in-memory for simplicity
  let filtered = invoices;
  if (status) filtered = filtered.filter((i) => i.status === status);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(s) ||
        (i.customerName ?? "").toLowerCase().includes(s)
    );
  }
  if (startDate) filtered = filtered.filter((i) => i.invoiceDate >= startDate);
  if (endDate) filtered = filtered.filter((i) => i.invoiceDate <= endDate);

  res.json(ListInvoicesResponse.parse(filtered));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...invoiceData } = parsed.data;
  const safeItems = items ?? [];

  const { subtotal, taxAmount, total } = computeTotals(
    safeItems,
    invoiceData.discountType ?? "percent",
    invoiceData.discountValue ?? 0,
    invoiceData.taxPercent ?? 0
  );

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      ...invoiceData,
      subtotal,
      taxAmount,
      total,
      discountType: invoiceData.discountType ?? "percent",
      discountValue: invoiceData.discountValue ?? 0,
      taxPercent: invoiceData.taxPercent ?? 0,
      showBankDetails: invoiceData.showBankDetails ?? false,
    })
    .returning();

  if (safeItems.length > 0) {
    await db.insert(invoiceItemsTable).values(
      safeItems.map((item) => ({
        invoiceId: invoice.id,
        productId: item.productId ?? null,
        name: item.name,
        description: item.description ?? null,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.quantity * item.rate,
      }))
    );
  }

  const result = await getInvoiceWithItems(invoice.id);
  res.status(201).json(GetInvoiceResponse.parse(result));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getInvoiceWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(GetInvoiceResponse.parse(result));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...invoiceData } = parsed.data;

  // Get existing invoice to use current values as defaults
  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (items !== undefined) {
    // Recompute totals
    const { subtotal, taxAmount, total } = computeTotals(
      items,
      invoiceData.discountType ?? existing.discountType,
      invoiceData.discountValue ?? existing.discountValue,
      invoiceData.taxPercent ?? existing.taxPercent
    );

    await db
      .update(invoicesTable)
      .set({ ...invoiceData, subtotal, taxAmount, total })
      .where(eq(invoicesTable.id, params.data.id));

    // Replace items
    await db
      .delete(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, params.data.id));

    if (items.length > 0) {
      await db.insert(invoiceItemsTable).values(
        items.map((item) => ({
          invoiceId: params.data.id,
          productId: item.productId ?? null,
          name: item.name,
          description: item.description ?? null,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.quantity * item.rate,
        }))
      );
    }
  } else {
    await db
      .update(invoicesTable)
      .set(invoiceData)
      .where(eq(invoicesTable.id, params.data.id));
  }

  const result = await getInvoiceWithItems(params.data.id);
  res.json(UpdateInvoiceResponse.parse(result));
});

router.patch("/invoices/:id/mark-paid", async (req, res): Promise<void> => {
  const params = MarkInvoicePaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .update(invoicesTable)
    .set({ status: "paid" })
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const result = await getInvoiceWithItems(params.data.id);
  res.json(MarkInvoicePaidResponse.parse(result));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Delete items first
  await db
    .delete(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, params.data.id));

  const [invoice] = await db
    .delete(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
