import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, asc, sql, and, inArray } from "drizzle-orm";
import { db, customersTable, invoicesTable, paymentsTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
  GetCustomerParams,
  DeleteCustomerParams,
  ListCustomersQueryParams,
  ListCustomersResponse,
  ListCustomersResponseItem,
  GetCustomerResponse,
  UpdateCustomerResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let customers;
  if (search) {
    customers = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.userId, req.userId),
          or(
            ilike(customersTable.name, `%${search}%`),
            ilike(customersTable.phone, `%${search}%`),
            ilike(customersTable.email, `%${search}%`)
          )
        )
      )
      .orderBy(desc(customersTable.createdAt));
  } else {
    customers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, req.userId))
      .orderBy(desc(customersTable.createdAt));
  }

  res.json(ListCustomersResponse.parse(customers));
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db
    .insert(customersTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(ListCustomersResponseItem.parse(customer));
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.userId, req.userId)));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const invoiceStats = await db
    .select({
      totalInvoices: sql<number>`count(*)::int`,
      totalBilled: sql<number>`coalesce(sum(total), 0)::real`,
      totalPaid: sql<number>`coalesce(sum(case when status = 'paid' then total else 0 end), 0)::real`,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.customerId, customer.id), eq(invoicesTable.userId, req.userId)));

  const stats = invoiceStats[0] || { totalInvoices: 0, totalBilled: 0, totalPaid: 0 };
  const outstanding = stats.totalBilled - stats.totalPaid;

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.customerId, customer.id), eq(invoicesTable.userId, req.userId)))
    .orderBy(desc(invoicesTable.createdAt));

  const detail = {
    ...customer,
    totalInvoices: stats.totalInvoices,
    totalBilled: stats.totalBilled,
    totalPaid: stats.totalPaid,
    outstanding,
    invoices,
  };

  res.json(GetCustomerResponse.parse(detail));
});

router.patch("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .update(customersTable)
    .set(parsed.data)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.userId, req.userId)))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(UpdateCustomerResponse.parse(customer));
});

router.delete("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .delete(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.userId, req.userId)))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/customers/:id/statement", requireAuth, async (req, res): Promise<void> => {
  const customerId = parseInt(req.params.id, 10);
  const { from, to } = req.query as { from?: string; to?: string };

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.id, customerId), eq(customersTable.userId, req.userId)));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  let invoices = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.customerId, customerId), eq(invoicesTable.userId, req.userId)))
    .orderBy(asc(invoicesTable.invoiceDate));

  if (from) invoices = invoices.filter((i) => i.invoiceDate >= from!);
  if (to) invoices = invoices.filter((i) => i.invoiceDate <= to!);

  const invoiceIds = invoices.map((i) => i.id);
  const allPayments =
    invoiceIds.length > 0
      ? await db
          .select()
          .from(paymentsTable)
          .where(inArray(paymentsTable.invoiceId, invoiceIds))
          .orderBy(asc(paymentsTable.date))
      : [];

  const paymentsByInvoice = allPayments.reduce(
    (acc, p) => {
      if (!acc[p.invoiceId]) acc[p.invoiceId] = [];
      acc[p.invoiceId].push(p);
      return acc;
    },
    {} as Record<number, typeof allPayments>,
  );

  const statementInvoices = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.invoiceDate,
    dueDate: inv.dueDate,
    total: inv.total,
    paidAmount: inv.paidAmount,
    outstanding: Math.max(0, inv.total - inv.paidAmount),
    status: inv.status,
    payments: (paymentsByInvoice[inv.id] ?? []).map((p) => ({
      date: p.date,
      amount: p.amount,
      method: p.method,
    })),
  }));

  res.json({
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      gstin: customer.gstin,
    },
    fromDate: from ?? null,
    toDate: to ?? null,
    invoices: statementInvoices,
    summary: {
      totalInvoiced: statementInvoices.reduce((s, i) => s + i.total, 0),
      totalPaid: statementInvoices.reduce((s, i) => s + i.paidAmount, 0),
      totalOutstanding: statementInvoices.reduce((s, i) => s + i.outstanding, 0),
    },
  });
});

export default router;
