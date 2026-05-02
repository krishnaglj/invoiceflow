import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, estimatesTable, estimateItemsTable, invoicesTable, invoiceItemsTable, businessProfilesTable } from "@workspace/db";
import {
  CreateEstimateBody,
  UpdateEstimateBody,
  UpdateEstimateParams,
  GetEstimateParams,
  DeleteEstimateParams,
  ConvertEstimateParams,
  ListEstimatesQueryParams,
  ListEstimatesResponse,
  GetEstimateResponse,
  UpdateEstimateResponse,
  ConvertEstimateResponse,
  GetNextEstimateNumberResponse,
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

async function getEstimateWithItems(id: number, userId: string) {
  const [estimate] = await db
    .select()
    .from(estimatesTable)
    .where(and(eq(estimatesTable.id, id), eq(estimatesTable.userId, userId)));
  if (!estimate) return null;

  const items = await db
    .select()
    .from(estimateItemsTable)
    .where(eq(estimateItemsTable.estimateId, id));

  return { ...estimate, items };
}

router.get("/estimates/next-number", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.userId));
  const prefix = (profile?.invoicePrefix ?? "INV").replace("INV", "EST");

  const [maxResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(estimatesTable)
    .where(eq(estimatesTable.userId, req.userId));

  const count = maxResult?.count ?? 0;
  const nextNum = 1 + count;
  const estimateNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  res.json(GetNextEstimateNumberResponse.parse({ estimateNumber, prefix, number: nextNum }));
});

router.get("/estimates", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListEstimatesQueryParams.safeParse(req.query);
  const { status, search } = queryParams.success
    ? queryParams.data
    : { status: undefined, search: undefined };

  let estimates = await db
    .select({
      id: estimatesTable.id,
      customerId: estimatesTable.customerId,
      customerName: estimatesTable.customerName,
      estimateNumber: estimatesTable.estimateNumber,
      estimateDate: estimatesTable.estimateDate,
      validUntil: estimatesTable.validUntil,
      status: estimatesTable.status,
      total: estimatesTable.total,
      convertedToInvoiceId: estimatesTable.convertedToInvoiceId,
      createdAt: estimatesTable.createdAt,
    })
    .from(estimatesTable)
    .where(eq(estimatesTable.userId, req.userId))
    .orderBy(desc(estimatesTable.createdAt));

  if (status) estimates = estimates.filter((e) => e.status === status);
  if (search) {
    const s = search.toLowerCase();
    estimates = estimates.filter(
      (e) =>
        e.estimateNumber.toLowerCase().includes(s) ||
        (e.customerName ?? "").toLowerCase().includes(s)
    );
  }

  res.json(ListEstimatesResponse.parse(estimates));
});

router.post("/estimates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEstimateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...estimateData } = parsed.data;
  const safeItems = items ?? [];

  const { subtotal, taxAmount, total } = computeTotals(
    safeItems,
    estimateData.discountType ?? "percent",
    estimateData.discountValue ?? 0,
    estimateData.taxPercent ?? 0
  );

  const [estimate] = await db
    .insert(estimatesTable)
    .values({
      ...estimateData,
      userId: req.userId,
      subtotal,
      taxAmount,
      total,
      discountType: estimateData.discountType ?? "percent",
      discountValue: estimateData.discountValue ?? 0,
      taxPercent: estimateData.taxPercent ?? 0,
      showBankDetails: estimateData.showBankDetails ?? false,
      supplyType: estimateData.supplyType ?? "intra",
    })
    .returning();

  if (safeItems.length > 0) {
    await db.insert(estimateItemsTable).values(
      safeItems.map((item) => ({
        estimateId: estimate.id,
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

  const result = await getEstimateWithItems(estimate.id, req.userId);
  res.status(201).json(GetEstimateResponse.parse(result));
});

router.get("/estimates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getEstimateWithItems(params.data.id, req.userId);
  if (!result) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  res.json(GetEstimateResponse.parse(result));
});

router.patch("/estimates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEstimateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...estimateData } = parsed.data;

  const [existing] = await db
    .select()
    .from(estimatesTable)
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, req.userId)));

  if (!existing) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  if (items !== undefined) {
    const { subtotal, taxAmount, total } = computeTotals(
      items,
      estimateData.discountType ?? existing.discountType,
      estimateData.discountValue ?? existing.discountValue,
      estimateData.taxPercent ?? existing.taxPercent
    );

    await db
      .update(estimatesTable)
      .set({ ...estimateData, subtotal, taxAmount, total })
      .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, req.userId)));

    await db
      .delete(estimateItemsTable)
      .where(eq(estimateItemsTable.estimateId, params.data.id));

    if (items.length > 0) {
      await db.insert(estimateItemsTable).values(
        items.map((item) => ({
          estimateId: params.data.id,
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
      .update(estimatesTable)
      .set(estimateData)
      .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, req.userId)));
  }

  const result = await getEstimateWithItems(params.data.id, req.userId);
  res.json(UpdateEstimateResponse.parse(result));
});

router.post("/estimates/:id/convert", requireAuth, async (req, res): Promise<void> => {
  const params = ConvertEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const estimate = await getEstimateWithItems(params.data.id, req.userId);
  if (!estimate) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

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

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      userId: req.userId,
      customerId: estimate.customerId,
      customerName: estimate.customerName,
      customerEmail: estimate.customerEmail,
      customerPhone: estimate.customerPhone,
      customerAddress: estimate.customerAddress,
      customerCity: estimate.customerCity,
      customerState: estimate.customerState,
      customerGstin: estimate.customerGstin,
      invoiceNumber,
      invoiceDate: new Date().toISOString().split("T")[0],
      status: "draft",
      placeOfSupply: estimate.placeOfSupply,
      supplyType: estimate.supplyType,
      subtotal: estimate.subtotal,
      discountType: estimate.discountType,
      discountValue: estimate.discountValue,
      taxPercent: estimate.taxPercent,
      taxAmount: estimate.taxAmount,
      total: estimate.total,
      paidAmount: 0,
      notes: estimate.notes,
      showBankDetails: estimate.showBankDetails,
    })
    .returning();

  if (estimate.items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      estimate.items.map((item) => ({
        invoiceId: invoice.id,
        productId: item.productId ?? null,
        name: item.name,
        description: item.description ?? null,
        hsnCode: item.hsnCode ?? null,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate,
        amount: item.amount,
      }))
    );
  }

  await db
    .update(estimatesTable)
    .set({ status: "converted", convertedToInvoiceId: invoice.id })
    .where(eq(estimatesTable.id, params.data.id));

  res.json(ConvertEstimateResponse.parse({ invoiceId: invoice.id, invoiceNumber }));
});

router.delete("/estimates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(estimateItemsTable)
    .where(eq(estimateItemsTable.estimateId, params.data.id));

  const [estimate] = await db
    .delete(estimatesTable)
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, req.userId)))
    .returning();

  if (!estimate) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
