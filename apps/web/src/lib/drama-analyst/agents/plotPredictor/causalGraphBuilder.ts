/**
 * بناء الرسم البياني السببي للحبكة
 * Causal Plot Graph Builder
 *
 * يبني رسماً بيانياً يوضح الأحداث والعلاقات السببية بينها
 */

import {
  CausalPlotGraph,
  PlotNode,
  PlotEdge,
  CausalRelation,
} from "../../core/types";
import { platformGenAIService } from "../../services/platformGenAIService";

interface CausalRelationAssessment {
  hasRelation?: boolean;
  type?: "direct" | "indirect" | "consequence";
  strength?: number;
}

export class CausalGraphBuilder {
  /**
   * بناء الرسم البياني السببي الكامل
   * Build complete causal plot graph
   */
  async buildCausalGraph(text: string): Promise<CausalPlotGraph> {
    // Step 1: استخراج الأحداث
    const events = await this.extractEvents(text);

    // Step 2: بناء العقد (Nodes)
    const nodes = await this.buildNodes(events);

    // Step 3: تحديد العلاقات السببية (Edges)
    const edges = await this.buildEdges(nodes, text);

    // Step 4: بناء الخط الزمني
    const timeline = nodes.map((n) => n.event);

    // Step 5: تحليل السببية
    const causality = await this.analyzeCausality(nodes, edges);

    return {
      nodes,
      edges,
      timeline,
      causality,
    };
  }

  /**
   * استخراج الأحداث من النص
   * Extract events from text
   */
  private async extractEvents(text: string): Promise<string[]> {
    const prompt = `
استخرج جميع الأحداث الدرامية المهمة من النص التالي بالترتيب الزمني:

النص:
"""
${text}
"""

أجب بصيغة JSON كمصفوفة من الأحداث (حد أقصى 20 حدث):
["حدث 1", "حدث 2", "حدث 3", ...]

أمثلة على الأحداث:
- "البطل يكتشف الحقيقة"
- "المواجهة بين الشخصيتين"
- "الخيانة تُكشف"
`;

    try {
      const events = await platformGenAIService.generateJson<unknown>(prompt);
      return Array.isArray(events)
        ? events
            .filter((event): event is string => typeof event === "string")
            .slice(0, 20)
        : [];
    } catch {
      return [];
    }
  }

  /**
   * بناء العقد من الأحداث
   * Build nodes from events
   */
  private async buildNodes(events: string[]): Promise<PlotNode[]> {
    const nodes: PlotNode[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) continue;

      const importance = await this.assessEventImportance(event);

      nodes.push({
        id: `event_${i + 1}`,
        event,
        timestamp: i,
        importance,
      });
    }

    return nodes;
  }

  /**
   * تقييم أهمية الحدث
   * Assess event importance
   */
  private async assessEventImportance(event: string): Promise<number> {
    const prompt = `
قيّم أهمية الحدث التالي للحبكة الدرامية على مقياس من 0 إلى 1:

الحدث: ${event}

المعايير:
- 0.9-1.0: حدث محوري جداً (نقطة تحول رئيسية)
- 0.7-0.8: حدث مهم جداً
- 0.5-0.6: حدث مهم
- 0.3-0.4: حدث ثانوي
- 0-0.2: حدث طفيف

أجب برقم فقط (مثال: 0.8):
`;

    try {
      const result = await platformGenAIService.generateText(prompt);
      const score = parseFloat(result.trim());
      return isNaN(score) ? 0.5 : Math.min(Math.max(score, 0), 1);
    } catch {
      return 0.5;
    }
  }

  /**
   * بناء الحواف (العلاقات السببية)
   * Build edges (causal relations)
   */
  private async buildEdges(
    nodes: PlotNode[],
    text: string
  ): Promise<PlotEdge[]> {
    const edges: PlotEdge[] = [];

    // فحص العلاقات السببية بين الأحداث المتتالية والقريبة
    for (let i = 0; i < nodes.length; i++) {
      const nodeI = nodes[i];
      if (!nodeI) continue;

      // فحص الأحداث اللاحقة (حد أقصى 5 أحداث للأمام)
      const endIndex = Math.min(i + 6, nodes.length);

      for (let j = i + 1; j < endIndex; j++) {
        const nodeJ = nodes[j];
        if (!nodeJ) continue;

        const relation = await this.detectCausalRelation(
          nodeI.event,
          nodeJ.event,
          text
        );

        if (relation) {
          edges.push({
            from: nodeI.id,
            to: nodeJ.id,
            causationType: relation.type,
            strength: relation.strength,
          });
        }
      }
    }

    return edges;
  }

  /**
   * كشف العلاقة السببية بين حدثين
   * Detect causal relation between two events
   */
  private async detectCausalRelation(
    event1: string,
    event2: string,
    context: string
  ): Promise<{
    type: "direct" | "indirect" | "consequence";
    strength: number;
  } | null> {
    const prompt = `
هل يوجد علاقة سببية بين الحدثين التاليين؟

الحدث الأول: ${event1}
الحدث الثاني: ${event2}

السياق: """${context.substring(0, 1000)}..."""

أنواع العلاقات:
- direct: علاقة مباشرة (الحدث 1 يسبب الحدث 2 مباشرة)
- indirect: علاقة غير مباشرة (يؤثر عليه بطريقة غير مباشرة)
- consequence: نتيجة (الحدث 2 نتيجة للحدث 1)

أجب بصيغة JSON:
{
  "hasRelation": true/false,
  "type": "direct" | "indirect" | "consequence",
  "strength": 0.8,
  "explanation": "شرح مختصر للعلاقة"
}

إذا لم توجد علاقة سببية، أجب:
{"hasRelation": false}
`;

    try {
      const parsed =
        await platformGenAIService.generateJson<CausalRelationAssessment>(
          prompt
        );

      if (!parsed.hasRelation) return null;

      return {
        type: parsed.type ?? "indirect",
        strength: typeof parsed.strength === "number" ? parsed.strength : 0.5,
      };
    } catch {
      return null;
    }
  }

  /**
   * تحليل السببية
   * Analyze causality
   */
  private async analyzeCausality(
    nodes: PlotNode[],
    edges: PlotEdge[]
  ): Promise<CausalRelation[]> {
    const causality: CausalRelation[] = [];

    for (const edge of edges) {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (fromNode && toNode) {
        const explanation = await this.explainCausality(
          fromNode.event,
          toNode.event,
          edge.causationType
        );

        causality.push({
          cause: fromNode.event,
          effect: toNode.event,
          explanation,
        });
      }
    }

    return causality;
  }

  /**
   * شرح العلاقة السببية
   * Explain causal relation
   */
  private async explainCausality(
    cause: string,
    effect: string,
    type: string
  ): Promise<string> {
    const prompt = `
اشرح العلاقة السببية التالية بجملة أو جملتين:

السبب: ${cause}
النتيجة: ${effect}
نوع العلاقة: ${type}

قدم شرحاً موجزاً واضحاً:
`;

    try {
      return await platformGenAIService.generateText(prompt);
    } catch {
      return "علاقة سببية غير محددة";
    }
  }
}

// Export singleton instance
export const causalGraphBuilder = new CausalGraphBuilder();
