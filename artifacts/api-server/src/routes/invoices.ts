import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, businessProfilesTable, paymentsTable } from "@workspace/db";
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
import { requireAuth } from "../middlewares/requireAuth";

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

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.invoiceId, id), eq(paymentsTable.userId, userId)))
    .orderBy(desc(paymentsTable.createdAt));

  return { ...invoice, items, payments };
}

async function recalcPaidAmount(invoiceId: number, userId: string) {
  const allPayments = await db
    .select({ amount: paymentsTable.amount })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.invoiceId, invoiceId), eq(paymentsTable.userId, userId)));

  const paidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);

  const [inv] = await db
    .select({ total: invoicesTable.total })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));

  const total = inv?.total ?? 0;
  let newStatus: string;
  if (paidAmount <= 0) {
    newStatus = "sent";
  } else if (paidAmount >= total) {
    newStatus = "paid";
  } else {
    newStatus = "partial";
  }

  await db
    .update(invoicesTable)
    .set({ paidAmount, status: newStatus })
    .where(eq(invoicesTable.id, invoiceId));

  return paidAmount;
}

router.get("/invoices/next-number", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.userId));
  const prefix = profile?.invoicePrefix ?? "INV";
  const startNum = profile?.invoiceStartNumber ?? 1;

  const [maxResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, req.userId));

  const count = maxResult?.count ?? 0;
  const nextNum = startNum + count;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  res.json(GetNextInvoiceNumberResponse.parse({ invoiceNumber, prefix, number: nextNum }));
});

router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
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
      paidAmount: invoicesTable.paidAmount,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, req.userId))
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

router.post("/invoices", requireAuth, async (req, res): Promise<void> => {
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
      userId: req.userId,
      subtotal,
      taxAmount,
      total,
      discountType: invoiceData.discountType ?? "percent",
      discountValue: invoiceData.discountValue ?? 0,
      taxPercent: invoiceData.taxPercent ?? 0,
      showBankDetails: invoiceData.showBankDetails ?? false,
      supplyType: invoiceData.supplyType ?? "intra",
      paidAmount: 0,
    })
    .returning();

  if (safeItems.length > 0) {
    await db.insert(invoiceItemsTable).values(
      safeItems.map((item) => ({
        invoiceId: invoice.id,
        productId: item.productId ?? null,
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

  const result = await getInvoiceWithItems(invoice.id, req.userId);
  res.status(201).json(GetInvoiceResponse.parse(result));
});

router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getInvoiceWithItems(params.data.id, req.userId);
  if (!result) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(GetInvoiceResponse.parse(result));
});

router.patch("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
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
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)));

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
      .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)));

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
          hsnCode: item.hsnCode ?? null,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          taxRate: item.taxRate ?? 0,
          amount: item.quantity * item.rate,
        }))
      );
    }
  } else {
    await db
      .update(invoicesTable)
      .set(invoiceData)
      .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)));
  }

  const result = await getInvoiceWithItems(params.data.id, req.userId);
  res.json(UpdateInvoiceResponse.parse(result));
});

router.patch("/invoices/:id/mark-paid", requireAuth, async (req, res): Promise<void> => {
  const params = MarkInvoicePaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)));

  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  await db
    .update(invoicesTable)
    .set({ status: "paid", paidAmount: inv.total })
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)));

  const result = await getInvoiceWithItems(params.data.id, req.userId);
  res.json(MarkInvoicePaidResponse.parse(result));
});

router.delete("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, params.data.id));

  await db
    .delete(paymentsTable)
    .where(eq(paymentsTable.invoiceId, params.data.id));

  const [invoice] = await db
    .delete(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.id), eq(invoicesTable.userId, req.userId)))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

// ─── Payments for an invoice ──────────────────────────────────────────────────

router.get("/invoices/:invoiceId/payments", requireAuth, async (req, res): Promise<void> => {
  const invoiceId = parseInt(req.params.invoiceId, 10);
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.invoiceId, invoiceId), eq(paymentsTable.userId, req.userId)))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(payments);
});

router.post("/invoices/:invoiceId/payments", requireAuth, async (req, res): Promise<void> => {
  const invoiceId = parseInt(req.params.invoiceId, 10);

  const [inv] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.userId, req.userId)));

  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const { amount, date, method, reference, notes } = req.body;
  if (!amount || !date || !method) {
    res.status(400).json({ error: "amount, date, method are required" });
    return;
  }

  await db.insert(paymentsTable).values({
    invoiceId,
    userId: req.userId,
    amount: parseFloat(amount),
    date,
    method,
    reference: reference ?? null,
    notes: notes ?? null,
  });

  await recalcPaidAmount(invoiceId, req.userId);
  const result = await getInvoiceWithItems(invoiceId, req.userId);
  res.status(201).json(GetInvoiceResponse.parse(result));
});

router.delete("/invoices/:invoiceId/payments/:paymentId", requireAuth, async (req, res): Promise<void> => {
  const invoiceId = parseInt(req.params.invoiceId, 10);
  const paymentId = parseInt(req.params.paymentId, 10);

  await db
    .delete(paymentsTable)
    .where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.userId, req.userId)));

  await recalcPaidAmount(invoiceId, req.userId);
  res.sendStatus(204);
});

export default router;
