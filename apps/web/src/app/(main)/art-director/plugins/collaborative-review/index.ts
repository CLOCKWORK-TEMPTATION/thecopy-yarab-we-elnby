import { v4 as uuidv4 } from "uuid";

import { definedProps } from "@/lib/defined-props";
import { logger } from "@/lib/logger";

import { Plugin, PluginInput, PluginOutput } from "../../types";

interface Review {
  id: string;
  projectId: string;
  sceneId: string;
  author: string;
  authorRole: string;
  content: string;
  contentAr?: string;
  timestamp: Date;
  status: "pending" | "addressed" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  category:
    | "visual"
    | "lighting"
    | "costume"
    | "prop"
    | "set"
    | "continuity"
    | "general";
  replies: Reply[];
  attachments: string[];
}

interface Reply {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface CreateReviewInput {
  projectId: string;
  sceneId: string;
  author: string;
  authorRole: string;
  content: string;
  contentAr?: string;
  priority?: "low" | "medium" | "high" | "critical";
  category?:
    | "visual"
    | "lighting"
    | "costume"
    | "prop"
    | "set"
    | "continuity"
    | "general";
  attachments?: string[];
}

interface AddReplyInput {
  reviewId: string;
  author: string;
  content: string;
}

interface GetReviewsInput {
  projectId?: string;
  sceneId?: string;
  status?: "pending" | "addressed" | "resolved";
  category?: string;
}

export class CollaborativeReviewPlatform implements Plugin {
  id = "collaborative-review";
  name = "Collaborative Review & Comments Platform";
  nameAr = "منصة المراجعة والتعليقات التعاونية";
  version = "1.0.0";
  description =
    "Real-time collaborative review and feedback system for production teams";
  descriptionAr = "نظام مراجعة وملاحظات تعاونية في الوقت الفعلي لفرق الإنتاج";
  category = "collaboration" as const;

  private reviews = new Map<string, Review>();

  initialize(): void {
    logger.info(`[${this.name}] Initialized`);
  }

  execute(input: PluginInput): PluginOutput {
    switch (input.type) {
      case "create":
        return this.createReview(input.data as unknown as CreateReviewInput);
      case "reply":
        return this.addReply(input.data as unknown as AddReplyInput);
      case "list":
        return this.getReviews(input.data);
      case "update-status":
        return this.updateStatus(
          input.data as { reviewId: string; status: Review["status"] }
        );
      case "summary":
        return this.getReviewSummary(input.data as { projectId: string });
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private createReview(data: CreateReviewInput): PluginOutput {
    if (!data.projectId || !data.sceneId || !data.author || !data.content) {
      return {
        success: false,
        error: "Missing required fields: projectId, sceneId, author, content",
      };
    }

    const review: Review = {
      id: uuidv4(),
      projectId: data.projectId,
      sceneId: data.sceneId,
      author: data.author,
      authorRole: data.authorRole,
      content: data.content,
      timestamp: new Date(),
      status: "pending",
      priority: data.priority ?? "medium",
      category: data.category ?? "general",
      replies: [],
      attachments: data.attachments ?? [],
      ...definedProps({
        contentAr: data.contentAr,
      }),
    };

    this.reviews.set(review.id, review);

    return {
      success: true,
      data: {
        message: "Review created successfully",
        messageAr: "تم إنشاء المراجعة بنجاح",
        review: review as unknown as Record<string, unknown>,
      },
    };
  }

  private addReply(data: AddReplyInput): PluginOutput {
    const review = this.reviews.get(data.reviewId);
    if (!review) {
      return {
        success: false,
        error: `Review with ID "${data.reviewId}" not found`,
      };
    }

    const reply: Reply = {
      id: uuidv4(),
      author: data.author,
      content: data.content,
      timestamp: new Date(),
    };

    review.replies.push(reply);

    return {
      success: true,
      data: {
        message: "Reply added successfully",
        messageAr: "تمت إضافة الرد بنجاح",
        reply: reply as unknown as Record<string, unknown>,
      },
    };
  }

  private getReviews(data: GetReviewsInput): PluginOutput {
    let reviews = Array.from(this.reviews.values());

    if (data.projectId) {
      reviews = reviews.filter((r) => r.projectId === data.projectId);
    }
    if (data.sceneId) {
      reviews = reviews.filter((r) => r.sceneId === data.sceneId);
    }
    if (data.status) {
      reviews = reviews.filter((r) => r.status === data.status);
    }
    if (data.category) {
      reviews = reviews.filter((r) => r.category === data.category);
    }

    reviews.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      success: true,
      data: {
        count: reviews.length,
        reviews: reviews as unknown as Record<string, unknown>[],
      },
    };
  }

  private updateStatus(data: {
    reviewId: string;
    status: Review["status"];
  }): PluginOutput {
    const review = this.reviews.get(data.reviewId);
    if (!review) {
      return {
        success: false,
        error: `Review with ID "${data.reviewId}" not found`,
      };
    }

    review.status = data.status;

    return {
      success: true,
      data: {
        message: "Status updated successfully",
        messageAr: "تم تحديث الحالة بنجاح",
        review: review as unknown as Record<string, unknown>,
      },
    };
  }

  private getReviewSummary(data: {
    projectId: string;
  }): PluginOutput {
    const reviews = Array.from(this.reviews.values()).filter(
      (r) => r.projectId === data.projectId
    );

    const summary = {
      total: reviews.length,
      byStatus: {
        pending: reviews.filter((r) => r.status === "pending").length,
        addressed: reviews.filter((r) => r.status === "addressed").length,
        resolved: reviews.filter((r) => r.status === "resolved").length,
      },
      byPriority: {
        critical: reviews.filter((r) => r.priority === "critical").length,
        high: reviews.filter((r) => r.priority === "high").length,
        medium: reviews.filter((r) => r.priority === "medium").length,
        low: reviews.filter((r) => r.priority === "low").length,
      },
      byCategory: {
        visual: reviews.filter((r) => r.category === "visual").length,
        lighting: reviews.filter((r) => r.category === "lighting").length,
        costume: reviews.filter((r) => r.category === "costume").length,
        prop: reviews.filter((r) => r.category === "prop").length,
        set: reviews.filter((r) => r.category === "set").length,
        continuity: reviews.filter((r) => r.category === "continuity").length,
        general: reviews.filter((r) => r.category === "general").length,
      },
      recentActivity: reviews
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          author: r.author,
          content: r.content.substring(0, 100),
          timestamp: r.timestamp,
        })),
    };

    return {
      success: true,
      data: summary,
    };
  }

  shutdown(): void {
    logger.info(`[${this.name}] Shut down`);
  }
}

export const collaborativeReview = new CollaborativeReviewPlatform();
