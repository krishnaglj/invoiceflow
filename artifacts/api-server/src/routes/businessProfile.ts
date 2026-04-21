import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessProfilesTable } from "@workspace/db";
import {
  GetBusinessProfileResponse,
  CreateBusinessProfileBody,
  UpdateBusinessProfileBody,
  UpdateBusinessProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/business-profile", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.userId));
  if (!profile) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }
  res.json(GetBusinessProfileResponse.parse(profile));
});

router.post("/business-profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db
    .insert(businessProfilesTable)
    .values({ ...parsed.data, userId: req.userId })
    .onConflictDoUpdate({
      target: businessProfilesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.status(201).json(GetBusinessProfileResponse.parse(profile));
});

router.patch("/business-profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.userId));
  if (!existing) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }
  const [profile] = await db
    .update(businessProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(businessProfilesTable.userId, req.userId))
    .returning();
  res.json(UpdateBusinessProfileResponse.parse(profile));
});

export default router;
