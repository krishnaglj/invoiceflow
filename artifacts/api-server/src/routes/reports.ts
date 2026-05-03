import { Router, type IRouter } from "express";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, expensesTable } from "@workspace/db";
import {
  GetGstReportQueryParams,
  GetGstReportResponse,
  GetProfitLossQueryParams,
  GetProfitLossResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/reports/gst", requireAuth, async (req, res): Promise<void> => {
  const queryParams = GetGstReportQueryParams.safeParse(req.query);
  const now = new Date();
  const year = queryParams.success && queryParams.data.year ? queryParams.data.year : now.getFullYear();
  const month = queryParams.success && queryParams.data.month ? queryParams.data.month : String(now.getMonth() + 1).padStart(2, "0");

  const monthStr = `${year}-${month}`;

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.userId, req.userId),
        sql`to_char(invoice_date::date, 'YYYY-MM') = ${monthStr}`,
        sql`status IN ('sent', 'paid', 'partial')`
      )
    );

  const invoiceIds = invoices.map((i) => i.id);

  let items: Array<{ taxRate: number; amount: number; invoiceId: number; supplyType: string }> = [];

  if (invoiceIds.length > 0) {
    const rawItems = await db
      .select({
        taxRate: invoiceItemsTable.taxRate,
        amount: invoiceItemsTable.amount,
        invoiceId: invoiceItemsTable.invoiceId,
      })
      .from(invoiceItemsTable)
      .where(sql`invoice_id = ANY(${invoiceIds})`);

    const invoiceSupplyMap = new Map(invoices.map((i) => [i.id, i.supplyType]));
    items = rawItems.map((item) => ({
      ...item,
      supplyType: invoiceSupplyMap.get(item.invoiceId) ?? "intra",
    }));
  }

  const slabMap = new Map<number, { taxableAmount: number; cgst: number; sgst: number; igst: number; invoiceIds: Set<number> }>();

  for (const item of items) {
    const rate = item.taxRate ?? 0;
    if (!slabMap.has(rate)) {
      slabMap.set(rate, { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, invoiceIds: new Set() });
    }
    const slab = slabMap.get(rate)!;
    slab.taxableAmount += item.amount;
    slab.invoiceIds.add(item.invoiceId);

    const taxAmt = (item.amount * rate) / 100;
    if (item.supplyType === "inter") {
      slab.igst += taxAmt;
    } else {
      slab.cgst += taxAmt / 2;
      slab.sgst += taxAmt / 2;
    }
  }

  const slabs = Array.from(slabMap.entries())
    .map(([taxRate, data]) => ({
      taxRate,
      taxableAmount: Math.round(data.taxableAmount * 100) / 100,
      cgst: Math.round(data.cgst * 100) / 100,
      sgst: Math.round(data.sgst * 100) / 100,
      igst: Math.round(data.igst * 100) / 100,
      totalTax: Math.round((data.cgst + data.sgst + data.igst) * 100) / 100,
      invoiceCount: data.invoiceIds.size,
    }))
    .sort((a, b) => a.taxRate - b.taxRate);

  const totalTaxable = slabs.reduce((s, r) => s + r.taxableAmount, 0);
  const totalCgst = slabs.reduce((s, r) => s + r.cgst, 0);
  const totalSgst = slabs.reduce((s, r) => s + r.sgst, 0);
  const totalIgst = slabs.reduce((s, r) => s + r.igst, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);

  res.json(
    GetGstReportResponse.parse({
      month,
      year,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      slabs,
    })
  );
});

router.get("/reports/profit-loss", requireAuth, async (req, res): Promise<void> => {
  const queryParams = GetProfitLossQueryParams.safeParse(req.query);
  const { startDate, endDate } = queryParams.success ? queryParams.data : { startDate: undefined, endDate: undefined };

  const months: Array<{ year: number; month: number; monthStr: string; label: string }> = [];
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
      monthStr: sql<string>`to_char(invoice_date::date, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(total), 0)::real`,
    })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.userId, req.userId), sql`status IN ('paid', 'partial')`))
    .groupBy(sql`to_char(invoice_date::date, 'YYYY-MM')`);

  const expenseData = await db
    .select({
      monthStr: sql<string>`to_char(date::date, 'YYYY-MM')`,
      amount: sql<number>`coalesce(sum(amount), 0)::real`,
    })
    .from(expensesTable)
    .where(eq(expensesTable.userId, req.userId))
    .groupBy(sql`to_char(date::date, 'YYYY-MM')`);

  const revenueMap = new Map(revenueData.map((r) => [r.monthStr, r.revenue]));
  const expenseMap = new Map(expenseData.map((e) => [e.monthStr, e.amount]));

  const revenueByMonth = months.map((m) => {
    const revenue = revenueMap.get(m.monthStr) ?? 0;
    const expenses = expenseMap.get(m.monthStr) ?? 0;
    return { month: m.label, revenue, expenses, profit: revenue - expenses };
  });

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = revenueByMonth.reduce((s, m) => s + m.expenses, 0);

  const expByCat = await db
    .select({
      category: expensesTable.category,
      amount: sql<number>`coalesce(sum(amount), 0)::real`,
    })
    .from(expensesTable)
    .where(eq(expensesTable.userId, req.userId))
    .groupBy(expensesTable.category)
    .orderBy(sql`sum(amount) desc`);

  res.json(
    GetProfitLossResponse.parse({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      revenueByMonth,
      expensesByCategory: expByCat.map((e) => ({ category: e.category, amount: Math.round(e.amount * 100) / 100 })),
    })
  );
});

router.get("/reports/aging", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerName: invoicesTable.customerName,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      total: invoicesTable.total,
      paidAmount: invoicesTable.paidAmount,
      status: invoicesTable.status,
    })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.userId, req.userId),
        inArray(invoicesTable.status, ["sent", "partial", "overdue"]),
      )
    );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = [
    { label: "Current",    daysMin: -Infinity, daysMax: 0   },
    { label: "1–30 Days",  daysMin: 1,         daysMax: 30  },
    { label: "31–60 Days", daysMin: 31,        daysMax: 60  },
    { label: "61–90 Days", daysMin: 61,        daysMax: 90  },
    { label: "90+ Days",   daysMin: 91,        daysMax: Infinity },
  ].map((b) => ({ ...b, count: 0, total: 0, invoices: [] as any[] }));

  let totalOutstanding = 0;

  for (const row of rows) {
    const outstanding = Math.max(0, row.total - row.paidAmount);
    if (outstanding <= 0) continue;

    let daysOverdue = 0;
    if (row.dueDate) {
      const due = new Date(row.dueDate);
      due.setHours(0, 0, 0, 0);
      daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
    }

    const item = {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerName: row.customerName,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      total: row.total,
      paidAmount: row.paidAmount,
      outstanding,
      daysOverdue: Math.max(0, daysOverdue),
      status: row.status,
    };

    totalOutstanding += outstanding;

    const bucket = buckets.find((b) => daysOverdue >= b.daysMin && daysOverdue <= b.daysMax);
    if (bucket) {
      bucket.count++;
      bucket.total += outstanding;
      bucket.invoices.push(item);
    }
  }

  res.json({
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalInvoices: rows.length,
    buckets: buckets.map((b) => ({
      label: b.label,
      daysMin: b.daysMin === -Infinity ? 0 : b.daysMin,
      daysMax: b.daysMax === Infinity ? null : b.daysMax,
      count: b.count,
      total: Math.round(b.total * 100) / 100,
      invoices: b.invoices,
    })),
  });
});

export default router;
