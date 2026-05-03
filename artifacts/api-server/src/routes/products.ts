import { Router, type IRouter } from "express";
import { eq, ilike, desc, and, sql } from "drizzle-orm";
import { db, productsTable, warehouseStockTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
  ListProductsResponse,
  ListProductsResponseItem,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function withCurrentStock(products: Array<typeof productsTable.$inferSelect>) {
  if (products.length === 0) return products.map((p) => ({ ...p, currentStock: 0 }));
  const ids = products.map((p) => p.id);
  const stockRows = await db
    .select({
      productId: warehouseStockTable.productId,
      qty: sql<number>`coalesce(sum(quantity), 0)::real`,
    })
    .from(warehouseStockTable)
    .where(sql`product_id = ANY(${ids})`)
    .groupBy(warehouseStockTable.productId);
  const stockMap = new Map(stockRows.map((s) => [s.productId, s.qty]));
  return products.map((p) => ({ ...p, currentStock: stockMap.get(p.id) ?? 0 }));
}

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let products;
  if (search) {
    products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.userId, req.userId), ilike(productsTable.name, `%${search}%`)))
      .orderBy(desc(productsTable.createdAt));
  } else {
    products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.userId, req.userId))
      .orderBy(desc(productsTable.createdAt));
  }

  const enriched = await withCurrentStock(products);
  res.json(ListProductsResponse.parse(enriched));
});

router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({ ...parsed.data, userId: req.userId, taxRate: parsed.data.taxRate ?? 0 })
    .returning();
  res.status(201).json(ListProductsResponseItem.parse({ ...product, currentStock: 0 }));
});

router.patch("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [product] = await db
    .update(productsTable)
    .set(parsed.data)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.userId, req.userId)))
    .returning();

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [enriched] = await withCurrentStock([product]);
  res.json(UpdateProductResponse.parse(enriched));
});

router.delete("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [product] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.userId, req.userId)))
    .returning();

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.sendStatus(204);
});

export default router;
