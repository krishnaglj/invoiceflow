import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessProfilesTable } from "@workspace/db";
import {
  GetBusinessProfileResponse,
  CreateBusinessProfileBody,
  UpdateBusinessProfileBody,
  UpdateBusinessProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/business-profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.user.id));
  if (!profile) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }
  res.json(GetBusinessProfileResponse.parse(profile));
});

router.post("/business-profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db
    .insert(businessProfilesTable)
    .values({ ...parsed.data, userId: req.user.id })
    .onConflictDoUpdate({
      target: businessProfilesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.status(201).json(GetBusinessProfileResponse.parse(profile));
});

router.patch("/business-profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.userId, req.user.id));
  if (!existing) {
    res.status(404).json({ error: "Business profile not found" });
    return;
  }
  const [profile] = await db
    .update(businessProfilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(businessProfilesTable.userId, req.user.id))
    .returning();
  res.json(UpdateBusinessProfileResponse.parse(profile));
});

export default router;
