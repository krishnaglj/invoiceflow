import { Router, type IRouter } from "express";
import { eq, desc, and, gte, lte, ilike } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  UpdateExpenseParams,
  GetExpenseParams,
  DeleteExpenseParams,
  ListExpensesQueryParams,
  ListExpensesResponse,
  ExpenseSchema,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListExpensesQueryParams.safeParse(req.query);
  const { category, startDate, endDate, search } = queryParams.success
    ? queryParams.data
    : { category: undefined, startDate: undefined, endDate: undefined, search: undefined };

  let expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.userId, req.userId))
    .orderBy(desc(expensesTable.date));

  if (category) expenses = expenses.filter((e) => e.category === category);
  if (startDate) expenses = expenses.filter((e) => e.date >= startDate);
  if (endDate) expenses = expenses.filter((e) => e.date <= endDate);
  if (search) {
    const s = search.toLowerCase();
    expenses = expenses.filter(
      (e) =>
        (e.description ?? "").toLowerCase().includes(s) ||
        (e.vendor ?? "").toLowerCase().includes(s)
    );
  }

  res.json(ListExpensesResponse.parse(expenses));
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      ...parsed.data,
      userId: req.userId,
      paymentMethod: parsed.data.paymentMethod ?? "cash",
    })
    .returning();

  res.status(201).json(ExpenseSchema.parse(expense));
});

router.get("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, req.userId)));

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(ExpenseSchema.parse(expense));
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .update(expensesTable)
    .set(parsed.data)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, req.userId)))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(ExpenseSchema.parse(expense));
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, req.userId)))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
