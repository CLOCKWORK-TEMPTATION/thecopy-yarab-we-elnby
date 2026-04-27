import { v4 as uuidv4 } from "uuid";

import { logger } from "@/lib/logger";

import { Plugin, PluginInput, PluginOutput } from "../../types";

interface ProductionBook {
  id: string;
  title: string;
  titleAr: string;
  productionId: string;
  createdAt: Date;
  updatedAt: Date;
  sections: BookSection[];
  metadata: Record<string, unknown>;
}

interface BookSection {
  id: string;
  title: string;
  titleAr: string;
  type:
    | "overview"
    | "scenes"
    | "locations"
    | "characters"
    | "costumes"
    | "props"
    | "schedule"
    | "budget"
    | "crew"
    | "technical";
  content: string;
  contentAr: string;
  images: string[];
  order: number;
}

interface StyleGuide {
  id: string;
  productionId: string;
  title: string;
  titleAr: string;
  colorPalettes: ColorPaletteSection[];
  typography: TypographySection;
  visualReferences: VisualReference[];
  moodDescriptions: MoodDescription[];
  createdAt: Date;
}

interface ColorPaletteSection {
  name: string;
  nameAr: string;
  colors: { hex: string; name: string; usage: string }[];
  mood: string;
}

interface TypographySection {
  primaryFont: string;
  secondaryFont: string;
  titleStyle: string;
  bodyStyle: string;
}

interface VisualReference {
  id: string;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  category: string;
  tags: string[];
}

interface MoodDescription {
  sceneName: string;
  mood: string;
  moodAr: string;
  visualNotes: string;
  visualNotesAr: string;
}

interface DecisionLog {
  id: string;
  productionId: string;
  decision: string;
  decisionAr: string;
  rationale: string;
  rationaleAr: string;
  madeBy: string;
  madeAt: Date;
  category:
    | "creative"
    | "technical"
    | "budget"
    | "schedule"
    | "casting"
    | "location";
  status: "proposed" | "approved" | "rejected" | "superseded";
  relatedDecisions: string[];
}

interface GenerateBookInput {
  productionId: string;
  title: string;
  titleAr?: string;
  includeSections: string[];
  projectData: Record<string, unknown>;
}

interface GenerateStyleGuideInput {
  productionId: string;
  title: string;
  colorPalettes: ColorPaletteSection[];
  visualReferences?: VisualReference[];
  moodDescriptions?: MoodDescription[];
}

export class AutomaticDocumentationGenerator implements Plugin {
  id = "documentation-generator";
  name = "Automatic Documentation Generator";
  nameAr = "مولد التوثيق التلقائي";
  version = "1.0.0";
  description =
    "Automatically generates comprehensive production documentation including production books, style guides, and decision logs";
  descriptionAr =
    "إنشاء وثائق شاملة للمشروع تلقائياً بما في ذلك كتب الإنتاج وأدلة الأسلوب وسجلات القرارات";
  category = "documentation" as const;

  private productionBooks = new Map<string, ProductionBook>();
  private styleGuides = new Map<string, StyleGuide>();
  private decisionLogs = new Map<string, DecisionLog>();

  initialize(): void {
    logger.info(`[${this.name}] Initialized`);
  }

  execute(input: PluginInput): PluginOutput {
    switch (input.type) {
      case "generate-book":
        return this.generateProductionBook(
          input.data as unknown as GenerateBookInput
        );
      case "generate-style-guide":
        return this.generateStyleGuide(
          input.data as unknown as GenerateStyleGuideInput
        );
      case "log-decision":
        return this.logDecision(input.data);
      case "get-book":
        return this.getProductionBook(input.data as { bookId: string });
      case "get-style-guide":
        return this.getStyleGuide(input.data as { guideId: string });
      case "get-decisions":
        return this.getDecisions(
          input.data as { productionId: string; category?: string }
        );
      case "export-book":
        return this.exportBook(
          input.data as { bookId: string; format: string }
        );
      case "update-section":
        return this.updateBookSection(
          input.data as {
            bookId: string;
            sectionId: string;
            content: Partial<BookSection>;
          }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private generateProductionBook(
    data: GenerateBookInput
  ): PluginOutput {
    if (!data.productionId || !data.title || !data.includeSections) {
      return {
        success: false,
        error: "Production ID, title, and sections to include are required",
      };
    }

    const sections: BookSection[] = [];
    let order = 1;

    for (const sectionType of data.includeSections) {
      const section = this.generateSection(
        sectionType,
        data.projectData,
        order
      );
      if (section) {
        sections.push(section);
        order++;
      }
    }

    const book: ProductionBook = {
      id: uuidv4(),
      title: data.title,
      titleAr: data.titleAr ?? data.title,
      productionId: data.productionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      sections,
      metadata: {
        generatedBy: "CineArchitect AI",
        version: "1.0",
        sectionsCount: sections.length,
      },
    };

    this.productionBooks.set(book.id, book);

    return {
      success: true,
      data: {
        message: "Production book generated successfully",
        messageAr: "تم إنشاء كتاب الإنتاج بنجاح",
        book: book as unknown as Record<string, unknown>,
      },
    };
  }

  private generateSection(
    type: string,
    projectData: Record<string, unknown>,
    order: number
  ): BookSection | null {
    const sectionTemplates: Record<string, { title: string; titleAr: string }> =
      {
        overview: {
          title: "Production Overview",
          titleAr: "نظرة عامة على الإنتاج",
        },
        scenes: { title: "Scene Breakdown", titleAr: "تفصيل المشاهد" },
        locations: { title: "Location Guide", titleAr: "دليل المواقع" },
        characters: { title: "Character Reference", titleAr: "مرجع الشخصيات" },
        costumes: { title: "Costume Design", titleAr: "تصميم الأزياء" },
        props: { title: "Props Inventory", titleAr: "جرد الدعائم" },
        schedule: { title: "Production Schedule", titleAr: "جدول الإنتاج" },
        budget: { title: "Budget Breakdown", titleAr: "تفصيل الميزانية" },
        crew: { title: "Crew Directory", titleAr: "دليل الطاقم" },
        technical: {
          title: "Technical Specifications",
          titleAr: "المواصفات الفنية",
        },
      };

    const template = sectionTemplates[type];
    if (!template) return null;

    const content = this.generateSectionContent(type, projectData);

    return {
      id: uuidv4(),
      title: template.title,
      titleAr: template.titleAr,
      type: type as BookSection["type"],
      content: content.en,
      contentAr: content.ar,
      images: [],
      order,
    };
  }

  private generateSectionContent(
    type: string,
    projectData: Record<string, unknown>
  ): { en: string; ar: string } {
    switch (type) {
      case "overview":
        return {
          en: `# Production Overview\n\nThis document provides a comprehensive overview of the production.\n\n## Project Details\n- Production Name: ${projectData.name ?? "TBD"}\n- Director: ${projectData.director ?? "TBD"}\n- Art Director: ${projectData.artDirector ?? "TBD"}\n- Status: ${projectData.status ?? "In Development"}`,
          ar: `# نظرة عامة على الإنتاج\n\nيقدم هذا المستند نظرة شاملة على الإنتاج.\n\n## تفاصيل المشروع\n- اسم الإنتاج: ${projectData.name ?? "سيُحدد"}\n- المخرج: ${projectData.director ?? "سيُحدد"}\n- مدير الفن: ${projectData.artDirector ?? "سيُحدد"}\n- الحالة: ${projectData.status ?? "قيد التطوير"}`,
        };
      case "scenes":
        return {
          en: "# Scene Breakdown\n\nDetailed breakdown of all scenes in the production.\n\n## Scene List\n[Scene data will be populated from project information]",
          ar: "# تفصيل المشاهد\n\nتفصيل مفصل لجميع المشاهد في الإنتاج.\n\n## قائمة المشاهد\n[سيتم ملء بيانات المشاهد من معلومات المشروع]",
        };
      case "locations":
        return {
          en: "# Location Guide\n\nComprehensive guide to all filming locations.\n\n## Location List\n[Location data will be populated from project information]",
          ar: "# دليل المواقع\n\nدليل شامل لجميع مواقع التصوير.\n\n## قائمة المواقع\n[سيتم ملء بيانات المواقع من معلومات المشروع]",
        };
      case "characters":
        return {
          en: "# Character Reference\n\nVisual and descriptive reference for all characters.\n\n## Character List\n[Character data will be populated from project information]",
          ar: "# مرجع الشخصيات\n\nمرجع بصري ووصفي لجميع الشخصيات.\n\n## قائمة الشخصيات\n[سيتم ملء بيانات الشخصيات من معلومات المشروع]",
        };
      case "costumes":
        return {
          en: "# Costume Design\n\nComplete costume design documentation.\n\n## Costume Breakdown\n[Costume data will be populated from project information]",
          ar: "# تصميم الأزياء\n\nتوثيق كامل لتصميم الأزياء.\n\n## تفصيل الأزياء\n[سيتم ملء بيانات الأزياء من معلومات المشروع]",
        };
      case "props":
        return {
          en: "# Props Inventory\n\nComplete inventory of all props.\n\n## Props List\n[Props data will be populated from project information]",
          ar: "# جرد الدعائم\n\nجرد كامل لجميع الدعائم.\n\n## قائمة الدعائم\n[سيتم ملء بيانات الدعائم من معلومات المشروع]",
        };
      case "schedule":
        return {
          en: "# Production Schedule\n\nDetailed production timeline.\n\n## Schedule Overview\n[Schedule data will be populated from project information]",
          ar: "# جدول الإنتاج\n\nجدول زمني مفصل للإنتاج.\n\n## نظرة عامة على الجدول\n[سيتم ملء بيانات الجدول من معلومات المشروع]",
        };
      case "budget":
        return {
          en: "# Budget Breakdown\n\nDetailed budget allocation.\n\n## Budget Overview\n[Budget data will be populated from project information]",
          ar: "# تفصيل الميزانية\n\nتوزيع الميزانية المفصل.\n\n## نظرة عامة على الميزانية\n[سيتم ملء بيانات الميزانية من معلومات المشروع]",
        };
      case "crew":
        return {
          en: "# Crew Directory\n\nComplete crew contact information.\n\n## Department Heads\n[Crew data will be populated from project information]",
          ar: "# دليل الطاقم\n\nمعلومات الاتصال الكاملة للطاقم.\n\n## رؤساء الأقسام\n[سيتم ملء بيانات الطاقم من معلومات المشروع]",
        };
      case "technical":
        return {
          en: "# Technical Specifications\n\nTechnical requirements and specifications.\n\n## Equipment\n[Technical data will be populated from project information]",
          ar: "# المواصفات الفنية\n\nالمتطلبات والمواصفات الفنية.\n\n## المعدات\n[سيتم ملء البيانات الفنية من معلومات المشروع]",
        };
      default:
        return { en: "", ar: "" };
    }
  }

  private generateStyleGuide(
    data: GenerateStyleGuideInput
  ): PluginOutput {
    if (!data.productionId || !data.title) {
      return {
        success: false,
        error: "Production ID and title are required",
      };
    }

    const styleGuide: StyleGuide = {
      id: uuidv4(),
      productionId: data.productionId,
      title: data.title,
      titleAr: data.title,
      colorPalettes: data.colorPalettes || [],
      typography: {
        primaryFont: "Arial",
        secondaryFont: "Georgia",
        titleStyle: "Bold, 24pt",
        bodyStyle: "Regular, 12pt",
      },
      visualReferences: data.visualReferences ?? [],
      moodDescriptions: data.moodDescriptions ?? [],
      createdAt: new Date(),
    };

    this.styleGuides.set(styleGuide.id, styleGuide);

    return {
      success: true,
      data: {
        message: "Style guide generated successfully",
        messageAr: "تم إنشاء دليل الأسلوب بنجاح",
        styleGuide: styleGuide as unknown as Record<string, unknown>,
      },
    };
  }

  private logDecision(data: Partial<DecisionLog>): PluginOutput {
    if (!data.productionId || !data.decision || !data.madeBy) {
      return {
        success: false,
        error: "Production ID, decision, and madeBy are required",
      };
    }

    const decision: DecisionLog = {
      id: uuidv4(),
      productionId: data.productionId,
      decision: data.decision,
      decisionAr: data.decisionAr ?? data.decision,
      rationale: data.rationale ?? "",
      rationaleAr: data.rationaleAr ?? data.rationale ?? "",
      madeBy: data.madeBy,
      madeAt: new Date(),
      category: data.category ?? "creative",
      status: data.status ?? "proposed",
      relatedDecisions: data.relatedDecisions ?? [],
    };

    this.decisionLogs.set(decision.id, decision);

    return {
      success: true,
      data: {
        message: "Decision logged successfully",
        messageAr: "تم تسجيل القرار بنجاح",
        decision: decision as unknown as Record<string, unknown>,
      },
    };
  }

  private getProductionBook(data: {
    bookId: string;
  }): PluginOutput {
    const book = this.productionBooks.get(data.bookId);

    if (!book) {
      return {
        success: false,
        error: `Production book with ID "${data.bookId}" not found`,
      };
    }

    return {
      success: true,
      data: book as unknown as Record<string, unknown>,
    };
  }

  private getStyleGuide(data: {
    guideId: string;
  }): PluginOutput {
    const guide = this.styleGuides.get(data.guideId);

    if (!guide) {
      return {
        success: false,
        error: `Style guide with ID "${data.guideId}" not found`,
      };
    }

    return {
      success: true,
      data: guide as unknown as Record<string, unknown>,
    };
  }

  private getDecisions(data: {
    productionId: string;
    category?: string;
  }): PluginOutput {
    let decisions = Array.from(this.decisionLogs.values()).filter(
      (d) => d.productionId === data.productionId
    );

    if (data.category) {
      decisions = decisions.filter((d) => d.category === data.category);
    }

    decisions.sort((a, b) => b.madeAt.getTime() - a.madeAt.getTime());

    return {
      success: true,
      data: {
        count: decisions.length,
        decisions: decisions as unknown as Record<string, unknown>[],
      },
    };
  }

  private exportBook(data: {
    bookId: string;
    format: string;
  }): PluginOutput {
    const book = this.productionBooks.get(data.bookId);

    if (!book) {
      return {
        success: false,
        error: `Production book with ID "${data.bookId}" not found`,
      };
    }

    let exportContent = "";

    if (data.format === "markdown" || data.format === "md") {
      exportContent = `# ${book.title}\n\n`;
      exportContent += `*Generated by CineArchitect AI on ${book.createdAt.toISOString()}*\n\n`;
      exportContent += "---\n\n";

      for (const section of book.sections.sort((a, b) => a.order - b.order)) {
        exportContent += `## ${section.title}\n\n`;
        exportContent += section.content + "\n\n";
      }
    } else if (data.format === "json") {
      exportContent = JSON.stringify(book, null, 2);
    } else {
      return {
        success: false,
        error: `Unsupported format: ${data.format}. Supported formats: markdown, json`,
      };
    }

    return {
      success: true,
      data: {
        format: data.format,
        content: exportContent,
        filename: `${book.title.replace(/\s+/g, "_")}.${data.format === "markdown" ? "md" : data.format}`,
      },
    };
  }

  private updateBookSection(data: {
    bookId: string;
    sectionId: string;
    content: Partial<BookSection>;
  }): PluginOutput {
    const book = this.productionBooks.get(data.bookId);

    if (!book) {
      return {
        success: false,
        error: `Production book with ID "${data.bookId}" not found`,
      };
    }

    const section = book.sections.find((s) => s.id === data.sectionId);
    if (!section) {
      return {
        success: false,
        error: `Section with ID "${data.sectionId}" not found`,
      };
    }

    Object.assign(section, data.content);
    book.updatedAt = new Date();

    return {
      success: true,
      data: {
        message: "Section updated successfully",
        messageAr: "تم تحديث القسم بنجاح",
        section: section as unknown as Record<string, unknown>,
      },
    };
  }

  shutdown(): void {
    logger.info(`[${this.name}] Shut down`);
  }
}

export const documentationGenerator = new AutomaticDocumentationGenerator();
