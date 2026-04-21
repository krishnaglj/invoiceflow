import { Router, type IRouter } from "express";
import { eq, ilike, desc, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
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

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const query = ListProductsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let products;
  if (search) {
    products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.userId, req.user.id), ilike(productsTable.name, `%${search}%`)))
      .orderBy(desc(productsTable.createdAt));
  } else {
    products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.userId, req.user.id))
      .orderBy(desc(productsTable.createdAt));
  }

  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({ ...parsed.data, userId: req.user.id })
    .returning();
  res.status(201).json(ListProductsResponseItem.parse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set(parsed.data)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.userId, req.user.id)))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.userId, req.user.id)))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
