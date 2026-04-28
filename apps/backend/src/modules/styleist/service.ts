import { eq, and, desc } from "drizzle-orm";

import { db } from "@/db";
import { costumeDesigns, wardrobeItems, sceneCostumes } from "@/db/schema";
import { logger } from "@/lib/logger";

// ==========================================
// StyleIST Service — CRUD for Costume Designs, Wardrobe, Scene-Costumes
// ==========================================

export interface CreateDesignInput {
  projectId: string;
  userId: string;
  lookTitle: string;
  dramaticDescription?: string;
  breakdown?: Record<string, string>;
  rationale?: string[];
  productionNotes?: Record<string, string>;
  imagePrompt?: string;
  conceptArtUrl?: string;
  realWeather?: Record<string, unknown>;
  brief?: Record<string, string>;
}

export interface CreateWardrobeInput {
  projectId: string;
  userId: string;
  name: string;
  imageUrl: string;
  category?: string;
  fabric?: string;
  metadata?: Record<string, unknown>;
}

export interface AssignSceneCostumeInput {
  projectId: string;
  sceneId: string;
  costumeDesignId?: string;
  wardrobeItemId?: string;
  characterId?: string;
  isContinuous?: boolean;
  notes?: string;
}

class StyleistService {
  // ---------- Costume Designs ----------

  async createDesign(input: CreateDesignInput) {
    const [design] = await db
      .insert(costumeDesigns)
      .values({
        projectId: input.projectId,
        userId: input.userId,
        lookTitle: input.lookTitle,
        dramaticDescription: input.dramaticDescription ?? null,
        breakdown: input.breakdown ?? {},
        rationale: input.rationale ?? [],
        productionNotes: input.productionNotes ?? {},
        imagePrompt: input.imagePrompt ?? null,
        conceptArtUrl: input.conceptArtUrl ?? null,
        realWeather: input.realWeather ?? {},
        brief: input.brief ?? {},
      })
      .returning();
    logger.info(`Created costume design: ${design!.id}`);
    return design!;
  }

  async getDesignsByProject(projectId: string) {
    return db
      .select()
      .from(costumeDesigns)
      .where(eq(costumeDesigns.projectId, projectId))
      .orderBy(desc(costumeDesigns.createdAt));
  }

  async getDesignById(id: string) {
    const [design] = await db
      .select()
      .from(costumeDesigns)
      .where(eq(costumeDesigns.id, id));
    return design ?? null;
  }

  async deleteDesign(id: string) {
    await db.delete(costumeDesigns).where(eq(costumeDesigns.id, id));
  }

  // ---------- Wardrobe Items ----------

  async createWardrobeItem(input: CreateWardrobeInput) {
    const [item] = await db
      .insert(wardrobeItems)
      .values({
        projectId: input.projectId,
        userId: input.userId,
        name: input.name,
        imageUrl: input.imageUrl,
        category: input.category ?? null,
        fabric: input.fabric ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    logger.info(`Created wardrobe item: ${item!.id}`);
    return item!;
  }

  async getWardrobeByProject(projectId: string) {
    return db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.projectId, projectId))
      .orderBy(desc(wardrobeItems.createdAt));
  }

  async deleteWardrobeItem(id: string) {
    await db.delete(wardrobeItems).where(eq(wardrobeItems.id, id));
  }

  // ---------- Scene-Costume Assignments ----------

  async assignSceneCostume(input: AssignSceneCostumeInput) {
    const [assignment] = await db
      .insert(sceneCostumes)
      .values({
        projectId: input.projectId,
        sceneId: input.sceneId,
        costumeDesignId: input.costumeDesignId ?? null,
        wardrobeItemId: input.wardrobeItemId ?? null,
        characterId: input.characterId ?? null,
        isContinuous: input.isContinuous ?? false,
        notes: input.notes ?? null,
      })
      .returning();
    logger.info(`Assigned costume to scene: ${input.sceneId}`);
    return assignment!;
  }

  async getSceneCostumesByProject(projectId: string) {
    return db
      .select()
      .from(sceneCostumes)
      .where(eq(sceneCostumes.projectId, projectId))
      .orderBy(desc(sceneCostumes.createdAt));
  }

  async updateSceneCostume(
    sceneId: string,
    projectId: string,
    updates: Partial<AssignSceneCostumeInput>,
  ) {
    const [updated] = await db
      .update(sceneCostumes)
      .set({
        costumeDesignId: updates.costumeDesignId,
        wardrobeItemId: updates.wardrobeItemId,
        characterId: updates.characterId,
        isContinuous: updates.isContinuous,
        notes: updates.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sceneCostumes.sceneId, sceneId),
          eq(sceneCostumes.projectId, projectId),
        ),
      )
      .returning();
    return updated ?? null;
  }
}

export const styleistService = new StyleistService();
