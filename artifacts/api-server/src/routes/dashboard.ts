import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { db, invoicesTable, customersTable, expensesTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetMonthlyRevenueResponse,
  GetTopCustomersResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const uid = req.userId;

  const [stats] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(case when status = 'paid' then total else 0 end), 0)::real`,
      paidInvoices: sql<number>`count(case when status = 'paid' then 1 end)::int`,
      pendingAmount: sql<number>`coalesce(sum(case when status in ('sent', 'draft', 'partial') then (total - paid_amount) else 0 end), 0)::real`,
      overdueCount: sql<number>`count(case when status = 'overdue' then 1 end)::int`,
      totalInvoices: sql<number>`count(*)::int`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, uid));

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable)
    .where(eq(customersTable.userId, uid));

  const [expenseStats] = await db
    .select({
      totalExpenses: sql<number>`coalesce(sum(amount), 0)::real`,
    })
    .from(expensesTable)
    .where(eq(expensesTable.userId, uid));

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalExpenses = expenseStats?.totalExpenses ?? 0;

  const result = {
    totalRevenue,
    paidInvoices: stats?.paidInvoices ?? 0,
    pendingAmount: stats?.pendingAmount ?? 0,
    overdueCount: stats?.overdueCount ?? 0,
    totalInvoices: stats?.totalInvoices ?? 0,
    totalCustomers: customerCount?.count ?? 0,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };

  res.json(GetDashboardStatsResponse.parse(result));
});

router.get("/dashboard/monthly-revenue", requireAuth, async (req, res): Promise<void> => {
  const uid = req.userId;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    months.push({ year, month, monthStr, label: d.toLocaleString("default", { month: "short", year: "numeric" }) });
  }

  const revenueData = await db
    .select({
      monthStr: sql<string>`to_char(created_at, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(case when status = 'paid' then total else 0 end), 0)::real`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.userId, uid))
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

  const revenueMap = new Map(revenueData.map((r) => [r.monthStr, r]));

  const result = months.map((m) => {
    const data = revenueMap.get(m.monthStr);
    return {
      month: m.label,
      revenue: data?.revenue ?? 0,
      invoiceCount: data?.invoiceCount ?? 0,
    };
  });

  res.json(GetMonthlyRevenueResponse.parse(result));
});

router.get("/dashboard/top-customers", requireAuth, async (req, res): Promise<void> => {
  const uid = req.userId;

  const topCustomers = await db
    .select({
      id: invoicesTable.customerId,
      name: invoicesTable.customerName,
      totalBilled: sql<number>`coalesce(sum(total), 0)::real`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.userId, uid), sql`customer_id is not null`))
    .groupBy(invoicesTable.customerId, invoicesTable.customerName)
    .orderBy(desc(sql`sum(total)`))
    .limit(5);

  const result = topCustomers.map((c) => ({
    id: c.id ?? 0,
    name: c.name ?? "Unknown",
    totalBilled: c.totalBilled,
    invoiceCount: c.invoiceCount,
  }));

  res.json(GetTopCustomersResponse.parse(result));
});

export default router;
