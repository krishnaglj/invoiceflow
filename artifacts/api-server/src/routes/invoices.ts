import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, sql, and } from "drizzle-orm";
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

async function getInvoiceWithItems(id: number, userId: string) {
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.userId, userId)));
  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, id));

  return { ...invoice, items };
}

router.get("/invoices/next-number", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.user.id));
  const prefix = profile?.invoicePrefix ?? "INV";
  const startNum = profile?.invoiceStartNumber ?? 1;

  const [maxResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, req.user.id));

  const count = maxResult?.count ?? 0;
  const nextNum = startNum + count;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  res.json(GetNextInvoiceNumberResponse.parse({ invoiceNumber, prefix, number: nextNum }));
});

router.get("/invoices", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const queryParams = ListInvoicesQueryParams.safeParse(req.query);
  const { status, search, startDate, endDate } = queryParams.success
    ? queryParams.data
    : { status: undefined, search: undefined, startDate: undefined, endDate: undefined };

  let invoices = await db
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
    .where(eq(invoicesTable.userId, req.user.id))
    .orderBy(desc(invoicesTable.createdAt));

  if (status) invoices = invoices.filter((i) => i.status === status);
  if (search) {
    const s = search.toLowerCase();
    invoices = invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(s) ||
        (i.customerName ?? "").toLowerCase().includes(s)
    );
  }
  if (startDate) invoices = invoices.filter((i) => i.invoiceDate >= startDate);
  if (endDate) invoices = invoices.filter((i) => i.invoiceDate <= endDate);

  res.json(ListInvoicesResponse.parse(invoices));
});

router.post("/invoices", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
      userId: req.user.id,
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

  const result = await getInvoiceWithItems(invoice.id, req.user.id);
  res.status(201).json(GetInvoiceResponse.parse(result));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getInvoiceWithItems(params.data.id, req.user.id);
  if (!result) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(GetInvoiceResponse.parse(result));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.user.id)));

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (items !== undefined) {
    const { subtotal, taxAmount, total } = computeTotals(
      items,
      invoiceData.discountType ?? existing.discountType,
      invoiceData.discountValue ?? existing.discountValue,
      invoiceData.taxPercent ?? existing.taxPercent
    );

    await db
      .update(invoicesTable)
      .set({ ...invoiceData, subtotal, taxAmount, total })
      .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.user.id)));

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
      .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.user.id)));
  }

  const result = await getInvoiceWithItems(params.data.id, req.user.id);
  res.json(UpdateInvoiceResponse.parse(result));
});

router.patch("/invoices/:id/mark-paid", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = MarkInvoicePaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .update(invoicesTable)
    .set({ status: "paid" })
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.user.id)))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const result = await getInvoiceWithItems(params.data.id, req.user.id);
  res.json(MarkInvoicePaidResponse.parse(result));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, params.data.id));

  const [invoice] = await db
    .delete(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.user.id)))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
