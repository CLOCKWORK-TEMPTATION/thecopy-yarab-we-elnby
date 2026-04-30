import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { critiqueIdeas } from "@/agents/brainstorm/critique-agent";
import { generateIdeasByTechnique } from "@/agents/brainstorm/idea-generator";
import { scoreIdeas } from "@/agents/brainstorm/idea-scorer";
import { synthesizeDossier } from "@/agents/brainstorm/synthesis-agent";
import { db } from "@/db";
import {
  brainstormBriefs,
  brainstormConcepts,
  brainstormCritiques,
  brainstormIdeas,
  brainstormSessions,
} from "@/db/schema";
import { logger } from "@/lib/logger";

export const createBriefSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(10).max(5000),
  audienceProfile: z.string().max(500).optional(),
  constraints: z.string().max(500).optional(),
  creativeSeed: z.string().max(500).optional(),
});

export type CreateBriefInput = z.infer<typeof createBriefSchema>;

export class BrainstormSessionService {
  async createBrief(input: CreateBriefInput, userId: string) {
    const [brief] = await db
      .insert(brainstormBriefs)
      .values({ ...input, createdBy: userId })
      .returning();

    if (!brief) {
      throw new Error("فشل إنشاء الـ brief");
    }

    logger.info("Created brainstorm brief", { briefId: brief.id, userId });
    return brief;
  }

  async listBriefs(userId: string) {
    return db
      .select()
      .from(brainstormBriefs)
      .where(eq(brainstormBriefs.createdBy, userId))
      .orderBy(desc(brainstormBriefs.createdAt))
      .limit(50);
  }

  async startSession(briefId: string, userId: string) {
    const [brief] = await db
      .select()
      .from(brainstormBriefs)
      .where(
        and(
          eq(brainstormBriefs.id, briefId),
          eq(brainstormBriefs.createdBy, userId),
        ),
      )
      .limit(1);

    if (!brief) {
      throw new Error("الـ brief غير موجود أو لا تملك صلاحية الوصول");
    }

    const [session] = await db
      .insert(brainstormSessions)
      .values({
        briefId,
        status: "planning",
        startedAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new Error("فشل إنشاء الجلسة");
    }

    logger.info("Started brainstorm session", {
      sessionId: session.id,
      briefId,
    });
    return { session, brief };
  }

  async getSession(sessionId: string, userId: string) {
    const [session] = await db
      .select()
      .from(brainstormSessions)
      .where(eq(brainstormSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("الجلسة غير موجودة");
    }

    const [brief] = await db
      .select()
      .from(brainstormBriefs)
      .where(
        and(
          eq(brainstormBriefs.id, session.briefId),
          eq(brainstormBriefs.createdBy, userId),
        ),
      )
      .limit(1);

    if (!brief) {
      throw new Error("لا تملك صلاحية الوصول لهذه الجلسة");
    }

    const ideas = await db
      .select()
      .from(brainstormIdeas)
      .where(eq(brainstormIdeas.sessionId, sessionId))
      .orderBy(brainstormIdeas.createdAt);

    const concepts = await db
      .select()
      .from(brainstormConcepts)
      .where(eq(brainstormConcepts.sessionId, sessionId));

    return { session, brief, ideas, concepts };
  }

  async runDivergent(sessionId: string, userId: string) {
    const { session, brief } = await this.getSession(sessionId, userId);

    if (session.status !== "planning" && session.status !== "divergent") {
      throw new Error(
        `الجلسة في مرحلة ${session.status} — لا يمكن تشغيل Divergent`,
      );
    }

    await db
      .update(brainstormSessions)
      .set({ status: "divergent" })
      .where(eq(brainstormSessions.id, sessionId));

    const techniques = ["scamper", "whatif", "reversal", "mashup"] as const;

    let allIdeas: {
      ideaStrId: string;
      headline: string;
      premise: string;
      technique: string;
    }[] = [];

    for (const technique of techniques) {
      const startIndex = allIdeas.length;
      const ideas = await generateIdeasByTechnique({
        briefTitle: brief.title,
        briefBody: brief.body,
        ...(brief.audienceProfile
          ? { audienceProfile: brief.audienceProfile }
          : {}),
        ...(brief.constraints ? { constraints: brief.constraints } : {}),
        technique,
        count: 8,
        startIndex,
      });
      allIdeas = [...allIdeas, ...ideas];
    }

    if (allIdeas.length === 0) {
      throw new Error("فشل توليد الأفكار — الـ LLM لم يرجع أفكاراً");
    }

    const inserted = await db
      .insert(brainstormIdeas)
      .values(
        allIdeas.map((idea) => ({
          sessionId,
          ideaStrId: idea.ideaStrId,
          technique: idea.technique,
          headline: idea.headline,
          premise: idea.premise,
          status: "alive" as const,
        })),
      )
      .returning();

    logger.info("Divergent phase complete", {
      sessionId,
      ideasCount: inserted.length,
    });

    return { ideasCount: inserted.length, ideas: inserted };
  }

  async runConvergent(sessionId: string, userId: string) {
    const { session, brief, ideas } = await this.getSession(sessionId, userId);

    if (session.status !== "divergent") {
      throw new Error(
        `الجلسة في مرحلة ${session.status} — لا يمكن تشغيل Convergent قبل Divergent`,
      );
    }

    const aliveIdeas = ideas.filter((idea) => idea.status === "alive");

    if (aliveIdeas.length === 0) {
      throw new Error("لا توجد أفكار في مرحلة alive لتقييمها");
    }

    await db
      .update(brainstormSessions)
      .set({ status: "convergent" })
      .where(eq(brainstormSessions.id, sessionId));

    const scoredIdeas = await scoreIdeas({
      ideas: aliveIdeas.map((idea) => ({
        ideaStrId: idea.ideaStrId,
        headline: idea.headline,
        premise: idea.premise,
      })),
      briefContext: {
        title: brief.title,
        body: brief.body,
        ...(brief.audienceProfile
          ? { audienceProfile: brief.audienceProfile }
          : {}),
      },
    });

    const THRESHOLD = 60;
    let survivorsCount = 0;
    let eliminatedCount = 0;

    for (const scored of scoredIdeas) {
      const dbIdea = aliveIdeas.find((i) => i.ideaStrId === scored.ideaStrId);
      if (!dbIdea) continue;

      const survived = scored.scores.composite >= THRESHOLD;

      await db
        .update(brainstormIdeas)
        .set({
          scores: scored.scores,
          status: survived ? "alive" : "eliminated",
        })
        .where(eq(brainstormIdeas.id, dbIdea.id));

      if (survived) survivorsCount++;
      else eliminatedCount++;
    }

    if (survivorsCount === 0 && aliveIdeas.length > 0) {
      const topIdea = [...scoredIdeas].sort(
        (a, b) => b.scores.composite - a.scores.composite,
      )[0];
      if (topIdea) {
        const dbIdea = aliveIdeas.find(
          (i) => i.ideaStrId === topIdea.ideaStrId,
        );
        if (dbIdea) {
          await db
            .update(brainstormIdeas)
            .set({ status: "alive" })
            .where(eq(brainstormIdeas.id, dbIdea.id));
          survivorsCount = 1;
          eliminatedCount--;
        }
      }
    }

    logger.info("Convergent phase complete", {
      sessionId,
      survivorsCount,
      eliminatedCount,
    });

    return { survivorsCount, eliminatedCount };
  }

  async runCritique(sessionId: string, userId: string) {
    const { session, brief, ideas } = await this.getSession(sessionId, userId);

    if (session.status !== "convergent") {
      throw new Error(
        `الجلسة في مرحلة ${session.status} — لا يمكن تشغيل Critique قبل Convergent`,
      );
    }

    const survivors = ideas.filter((idea) => idea.status === "alive");

    if (survivors.length === 0) {
      throw new Error("لا توجد أفكار ناجية في مرحلة Convergent");
    }

    await db
      .update(brainstormSessions)
      .set({ status: "critique" })
      .where(eq(brainstormSessions.id, sessionId));

    const critiques = await critiqueIdeas({
      ideas: survivors.map((idea) => ({
        ideaStrId: idea.ideaStrId,
        headline: idea.headline,
        premise: idea.premise,
        scores: idea.scores as {
          originality: number;
          thematicDepth: number;
          audienceFit: number;
          conflictComplexity: number;
          producibility: number;
          culturalResonance: number;
          composite: number;
        },
      })),
      briefContext: {
        title: brief.title,
        body: brief.body,
      },
    });

    for (const critique of critiques) {
      const dbIdea = survivors.find((i) => i.ideaStrId === critique.ideaStrId);
      if (!dbIdea) continue;

      await db.insert(brainstormCritiques).values({
        ideaId: dbIdea.id,
        attackVectors: critique.attackVectors,
        recommendation: critique.recommendation,
      });

      const newStatus =
        critique.recommendation === "abandon" ? "eliminated" : "critiqued";

      await db
        .update(brainstormIdeas)
        .set({ status: newStatus })
        .where(eq(brainstormIdeas.id, dbIdea.id));
    }

    logger.info("Critique phase complete", {
      sessionId,
      critiquesCount: critiques.length,
    });

    return { critiquesCount: critiques.length };
  }

  async runSynthesis(sessionId: string, userId: string) {
    const { session, brief, ideas } = await this.getSession(sessionId, userId);

    if (session.status !== "critique") {
      throw new Error(
        `الجلسة في مرحلة ${session.status} — لا يمكن تشغيل Synthesis قبل Critique`,
      );
    }

    const critiqued = ideas.filter((idea) => idea.status === "critiqued");

    if (critiqued.length === 0) {
      throw new Error("لا توجد أفكار critiqued لإنتاج الـ concepts منها");
    }

    await db
      .update(brainstormSessions)
      .set({ status: "synthesis" })
      .where(eq(brainstormSessions.id, sessionId));

    const dossiersCreated: string[] = [];

    for (const idea of critiqued) {
      const [critiqueRecord] = await db
        .select()
        .from(brainstormCritiques)
        .where(eq(brainstormCritiques.ideaId, idea.id))
        .limit(1);

      if (!critiqueRecord) continue;

      if (critiqueRecord.recommendation === "abandon") continue;

      const dossier = await synthesizeDossier({
        idea: {
          ideaStrId: idea.ideaStrId,
          headline: idea.headline,
          premise: idea.premise,
          scores: idea.scores as {
            originality: number;
            thematicDepth: number;
            audienceFit: number;
            conflictComplexity: number;
            producibility: number;
            culturalResonance: number;
            composite: number;
          },
        },
        critique: {
          attackVectors: critiqueRecord.attackVectors as {
            category: string;
            attack: string;
            severity: string;
          }[],
          recommendation: critiqueRecord.recommendation,
        },
        briefContext: {
          title: brief.title,
          body: brief.body,
          ...(brief.audienceProfile
            ? { audienceProfile: brief.audienceProfile }
            : {}),
          ...(brief.constraints ? { constraints: brief.constraints } : {}),
        },
      });

      await db.insert(brainstormConcepts).values({
        sessionId,
        ideaId: idea.id,
        dossierMd: dossier.dossierMd,
        dossierJson: dossier.dossierJson,
      });

      await db
        .update(brainstormIdeas)
        .set({ status: "promoted" })
        .where(eq(brainstormIdeas.id, idea.id));

      dossiersCreated.push(idea.ideaStrId);
    }

    await db
      .update(brainstormSessions)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(brainstormSessions.id, sessionId));

    logger.info("Synthesis phase complete", {
      sessionId,
      conceptsCreated: dossiersCreated.length,
    });

    return { conceptsCreated: dossiersCreated.length, ideas: dossiersCreated };
  }

  async getConcepts(sessionId: string, userId: string) {
    const { session, brief } = await this.getSession(sessionId, userId);

    if (session.status !== "done") {
      return { concepts: [], message: "الجلسة لم تكتمل بعد" };
    }

    const concepts = await db
      .select({
        concept: brainstormConcepts,
        idea: brainstormIdeas,
      })
      .from(brainstormConcepts)
      .innerJoin(
        brainstormIdeas,
        eq(brainstormConcepts.ideaId, brainstormIdeas.id),
      )
      .where(eq(brainstormConcepts.sessionId, sessionId));

    return { concepts, brief };
  }
}

export const brainstormSessionService = new BrainstormSessionService();
