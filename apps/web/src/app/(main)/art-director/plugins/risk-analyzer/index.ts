// CineArchitect AI - AI Risk Analyzer
// محلل المخاطر الذكي

import {
  Plugin,
  PluginInput,
  PluginOutput,
  RiskAnalysis,
  Risk,
  Mitigation,
  ContingencyPlan,
} from "../../types";

interface RiskAnalysisInput {
  project: {
    name: string;
    budget: number;
    duration: number; // in days
    locations: {
      name: string;
      type: "indoor" | "outdoor" | "studio";
      country?: string;
    }[];
    crew: {
      size: number;
      departments: string[];
    };
    specialRequirements?: string[];
  };
  production?: {
    hasStunts: boolean;
    hasSpecialEffects: boolean;
    hasAnimals: boolean;
    hasChildren: boolean;
    hasWaterScenes: boolean;
    hasNightShoots: boolean;
  };
}

const RISK_TEMPLATES = {
  budget_overrun: {
    type: "financial",
    description: "Budget overrun due to unexpected costs",
    descriptionAr: "تجاوز الميزانية بسبب تكاليف غير متوقعة",
    probability: 0.4,
    impact: 0.7,
  },
  weather_delay: {
    type: "weather",
    description: "Production delays due to adverse weather conditions",
    descriptionAr: "تأخيرات الإنتاج بسبب الظروف الجوية السيئة",
    probability: 0.3,
    impact: 0.6,
  },
  equipment_failure: {
    type: "technical",
    description: "Critical equipment malfunction or failure",
    descriptionAr: "عطل أو فشل في المعدات الحيوية",
    probability: 0.2,
    impact: 0.5,
  },
  location_access: {
    type: "logistical",
    description: "Loss of location access or permit issues",
    descriptionAr: "فقدان الوصول للموقع أو مشاكل التصاريح",
    probability: 0.25,
    impact: 0.8,
  },
  crew_illness: {
    type: "safety",
    description: "Key crew member illness or unavailability",
    descriptionAr: "مرض أو عدم توفر أحد أفراد الطاقم الرئيسيين",
    probability: 0.3,
    impact: 0.5,
  },
  stunt_injury: {
    type: "safety",
    description: "Injury during stunt performance",
    descriptionAr: "إصابة أثناء أداء المشاهد الخطرة",
    probability: 0.15,
    impact: 0.9,
  },
  data_loss: {
    type: "technical",
    description: "Loss of footage or production data",
    descriptionAr: "فقدان اللقطات أو بيانات الإنتاج",
    probability: 0.1,
    impact: 0.95,
  },
  legal_issues: {
    type: "legal",
    description: "Legal disputes or copyright issues",
    descriptionAr: "نزاعات قانونية أو مشاكل حقوق الملكية",
    probability: 0.15,
    impact: 0.7,
  },
} satisfies Record<string, Omit<Risk, "id" | "score">>;

export class RiskAnalyzer implements Plugin {
  id = "risk-analyzer";
  name = "AI Risk Analyzer";
  nameAr = "محلل المخاطر الذكي";
  version = "1.0.0";
  description = "Analyzes production plans and identifies potential risks";
  descriptionAr = "تحليل خطط الإنتاج وتحديد المخاطر المحتملة";
  category = "safety" as const;

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initialized`);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "analyze":
        return this.analyzeRisks(input.data as unknown as RiskAnalysisInput);
      case "assess":
        return this.assessSpecificRisk(input.data as any);
      case "mitigate":
        return this.generateMitigation(input.data as any);
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private isRiskTemplateKey(
    value: string
  ): value is keyof typeof RISK_TEMPLATES {
    return value in RISK_TEMPLATES;
  }

  private async analyzeRisks(data: RiskAnalysisInput): Promise<PluginOutput> {
    const risks: Risk[] = [];
    const mitigations: Mitigation[] = [];
    const contingencyPlans: ContingencyPlan[] = [];

    // Always include base risks
    risks.push(this.createRisk("budget_overrun", data));
    risks.push(this.createRisk("equipment_failure", data));
    risks.push(this.createRisk("crew_illness", data));
    risks.push(this.createRisk("data_loss", data));

    // Add location-based risks
    const hasOutdoorLocations = data.project.locations.some(
      (l) => l.type === "outdoor"
    );
    if (hasOutdoorLocations) {
      const weatherRisk = this.createRisk("weather_delay", data);
      weatherRisk.probability = 0.5; // Higher for outdoor
      risks.push(weatherRisk);
    }

    if (data.project.locations.length > 1) {
      risks.push(this.createRisk("location_access", data));
    }

    // Add production-specific risks
    if (data.production?.hasStunts) {
      risks.push(this.createRisk("stunt_injury", data));
    }

    if (data.production?.hasAnimals || data.production?.hasChildren) {
      risks.push({
        id: "special_handling",
        type: "safety",
        description: "Special care requirements for animals/children",
        descriptionAr: "متطلبات رعاية خاصة للحيوانات/الأطفال",
        probability: 0.3,
        impact: 0.6,
        score: 0.3 * 0.6,
      });
    }

    if (data.production?.hasWaterScenes) {
      risks.push({
        id: "water_safety",
        type: "safety",
        description: "Water-related safety hazards",
        descriptionAr: "مخاطر السلامة المتعلقة بالمياه",
        probability: 0.25,
        impact: 0.8,
        score: 0.25 * 0.8,
      });
    }

    if (data.production?.hasNightShoots) {
      risks.push({
        id: "night_shoot_fatigue",
        type: "safety",
        description: "Crew fatigue and safety issues during night shoots",
        descriptionAr: "إرهاق الطاقم ومشاكل السلامة أثناء التصوير الليلي",
        probability: 0.4,
        impact: 0.5,
        score: 0.4 * 0.5,
      });
    }

    // Budget-based risk adjustment
    const budgetPerDay = data.project.budget / data.project.duration;
    if (budgetPerDay < 10000) {
      // Low budget increases risk
      risks.forEach((r) => {
        if (r.type === "financial") r.probability *= 1.3;
      });
    }

    // Generate mitigations for each risk
    for (const risk of risks) {
      const mitigation = this.generateMitigationForRisk(risk);
      mitigations.push(mitigation);

      if (risk.score > 0.4) {
        // High-risk items get contingency plans
        contingencyPlans.push(this.generateContingencyForRisk(risk));
      }
    }

    // Calculate overall risk
    const avgScore = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
    const maxScore = Math.max(...risks.map((r) => r.score));

    let overallRisk: "low" | "medium" | "high";
    if (maxScore > 0.6 || avgScore > 0.4) {
      overallRisk = "high";
    } else if (maxScore > 0.3 || avgScore > 0.25) {
      overallRisk = "medium";
    } else {
      overallRisk = "low";
    }

    // Sort risks by score
    risks.sort((a, b) => b.score - a.score);

    const analysis: RiskAnalysis = {
      overallRisk,
      risks,
      mitigations,
      contingencyPlans,
    };

    return {
      success: true,
      data: {
        ...analysis,
        summary: {
          totalRisks: risks.length,
          highRisks: risks.filter((r) => r.score > 0.5).length,
          mediumRisks: risks.filter((r) => r.score > 0.25 && r.score <= 0.5)
            .length,
          lowRisks: risks.filter((r) => r.score <= 0.25).length,
          averageRiskScore: avgScore,
          maxRiskScore: maxScore,
        },
        recommendations: this.generateRecommendations(risks, data),
      } as unknown as Record<string, unknown>,
    };
  }

  private createRisk(
    templateKey: keyof typeof RISK_TEMPLATES,
    _data: RiskAnalysisInput
  ): Risk {
    const template = RISK_TEMPLATES[templateKey];
    const id = `${templateKey}_${Date.now()}`;

    return {
      id,
      ...template,
      score: template.probability * template.impact,
    };
  }

  private generateMitigationForRisk(risk: Risk): Mitigation {
    const mitigations: Record<
      Risk["type"],
      { action: string; actionAr: string; responsible: string }
    > = {
      financial: {
        action: "Maintain 10-15% contingency budget reserve",
        actionAr: "الحفاظ على احتياطي ميزانية طوارئ 10-15%",
        responsible: "Line Producer",
      },
      weather: {
        action: "Monitor weather forecasts and prepare cover sets",
        actionAr: "مراقبة توقعات الطقس وإعداد مواقع بديلة",
        responsible: "Production Manager",
      },
      technical: {
        action: "Maintain backup equipment and regular maintenance",
        actionAr: "الاحتفاظ بمعدات احتياطية وإجراء صيانة دورية",
        responsible: "Equipment Manager",
      },
      logistical: {
        action:
          "Secure all permits in advance and maintain location relationships",
        actionAr: "تأمين جميع التصاريح مسبقاً والحفاظ على علاقات المواقع",
        responsible: "Location Manager",
      },
      safety: {
        action: "Implement comprehensive safety protocols and insurance",
        actionAr: "تنفيذ بروتوكولات السلامة الشاملة والتأمين",
        responsible: "Safety Coordinator",
      },
      legal: {
        action: "Review all contracts and obtain proper clearances",
        actionAr: "مراجعة جميع العقود والحصول على التصاريح المناسبة",
        responsible: "Legal Counsel",
      },
    };

    const mitInfo = mitigations[risk.type];

    return {
      riskId: risk.id,
      action: mitInfo.action,
      actionAr: mitInfo.actionAr,
      responsible: mitInfo.responsible,
    };
  }

  private generateContingencyForRisk(risk: Risk): ContingencyPlan {
    const contingencies: Record<
      Risk["type"],
      { trigger: string; actions: string[]; resources: string[] }
    > = {
      financial: {
        trigger: "Budget exceeds 90% with significant work remaining",
        actions: [
          "Activate contingency fund",
          "Review remaining scope",
          "Negotiate with vendors",
        ],
        resources: ["Contingency budget", "Financial analyst", "Producer"],
      },
      weather: {
        trigger: "Severe weather forecast or current conditions",
        actions: [
          "Switch to cover set",
          "Reschedule outdoor scenes",
          "Adjust call times",
        ],
        resources: ["Cover set", "Updated schedule", "Transportation"],
      },
      technical: {
        trigger: "Primary equipment failure",
        actions: [
          "Deploy backup equipment",
          "Contact rental house",
          "Adjust shooting order",
        ],
        resources: ["Backup equipment", "Rental contacts", "Technical support"],
      },
      safety: {
        trigger: "Safety incident or high-risk situation identified",
        actions: [
          "Stop production immediately",
          "Assess and document",
          "Implement safety measures",
        ],
        resources: ["First aid kit", "Emergency contacts", "Safety officer"],
      },
      logistical: {
        trigger: "Location access or permit issue blocks production",
        actions: [
          "Switch to backup location",
          "Engage permit liaison",
          "Reorder schedule",
        ],
        resources: [
          "Backup location list",
          "Permit contacts",
          "Updated call sheet",
        ],
      },
      legal: {
        trigger: "Contract dispute or clearance issue emerges",
        actions: [
          "Pause affected workstream",
          "Escalate to legal counsel",
          "Document claim and evidence",
        ],
        resources: ["Legal counsel", "Contract archive", "Rights tracker"],
      },
    };

    const contInfo = contingencies[risk.type];

    return {
      riskId: risk.id,
      trigger: contInfo.trigger,
      actions: contInfo.actions,
      resources: contInfo.resources,
    };
  }

  private generateRecommendations(
    risks: Risk[],
    data: RiskAnalysisInput
  ): string[] {
    const recommendations: string[] = [];

    const highRisks = risks.filter((r) => r.score > 0.5);
    if (highRisks.length > 0) {
      recommendations.push(
        `Address ${highRisks.length} high-priority risks before production begins`
      );
    }

    if (data.project.locations.some((l) => l.type === "outdoor")) {
      recommendations.push(
        "Prepare weather contingency plans for all outdoor locations"
      );
    }

    if (data.production?.hasStunts) {
      recommendations.push(
        "Ensure stunt coordinator and safety team are present for all stunt sequences"
      );
    }

    if (data.project.duration > 30) {
      recommendations.push(
        "Schedule regular risk assessment reviews throughout production"
      );
    }

    recommendations.push("Maintain comprehensive production insurance");
    recommendations.push(
      "Implement daily backup procedures for all footage and data"
    );

    return recommendations;
  }

  private async assessSpecificRisk(data: {
    riskType: string;
    context: any;
  }): Promise<PluginOutput> {
    if (!this.isRiskTemplateKey(data.riskType)) {
      return {
        success: false,
        error: `Unknown risk type: ${data.riskType}`,
      };
    }

    const template = RISK_TEMPLATES[data.riskType];

    return {
      success: true,
      data: {
        riskType: data.riskType,
        ...template,
        score: template.probability * template.impact,
      },
    };
  }

  private async generateMitigation(data: {
    risk: Risk;
  }): Promise<PluginOutput> {
    const mitigation = this.generateMitigationForRisk(data.risk);
    const contingency =
      data.risk.score > 0.4 ? this.generateContingencyForRisk(data.risk) : null;

    return {
      success: true,
      data: {
        mitigation,
        contingency,
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const riskAnalyzer = new RiskAnalyzer();
