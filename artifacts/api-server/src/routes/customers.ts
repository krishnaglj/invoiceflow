import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, sql, and } from "drizzle-orm";
import { db, customersTable, invoicesTable } from "@workspace/db";
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

export default router;
