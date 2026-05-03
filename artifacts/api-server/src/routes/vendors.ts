import { Router, type IRouter } from "express";
import { eq, ilike, desc, and } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import {
  ListVendorsQueryParams,
  ListVendorsResponse,
  VendorSchema,
  CreateVendorBody,
  UpdateVendorParams,
  UpdateVendorBody,
  GetVendorParams,
  DeleteVendorParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/vendors", requireAuth, async (req, res): Promise<void> => {
  const query = ListVendorsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;

  let vendors;
  if (search) {
    vendors = await db
      .select()
      .from(vendorsTable)
      .where(and(eq(vendorsTable.userId, req.userId), ilike(vendorsTable.name, `%${search}%`)))
      .orderBy(desc(vendorsTable.createdAt));
  } else {
    vendors = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, req.userId))
      .orderBy(desc(vendorsTable.createdAt));
  }

  res.json(ListVendorsResponse.parse(vendors));
});

router.get("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(and(eq(vendorsTable.id, params.data.id), eq(vendorsTable.userId, req.userId)));

  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(VendorSchema.parse(vendor));
});

router.post("/vendors", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [vendor] = await db
    .insert(vendorsTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();

  res.status(201).json(VendorSchema.parse(vendor));
});

router.patch("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [vendor] = await db
    .update(vendorsTable)
    .set(parsed.data)
    .where(and(eq(vendorsTable.id, params.data.id), eq(vendorsTable.userId, req.userId)))
    .returning();

  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(VendorSchema.parse(vendor));
});

router.delete("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [vendor] = await db
    .delete(vendorsTable)
    .where(and(eq(vendorsTable.id, params.data.id), eq(vendorsTable.userId, req.userId)))
    .returning();

  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.sendStatus(204);
});

export default router;
