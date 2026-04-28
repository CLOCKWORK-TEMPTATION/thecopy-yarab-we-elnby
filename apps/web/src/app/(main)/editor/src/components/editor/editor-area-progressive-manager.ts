import { definedProps } from "@/lib/defined-props";

import {
  pipelineRecorder,
  type PipelineEvent,
} from "../../extensions/pipeline-recorder";

import {
  captureVisibleElements,
  captureTopLevelNodes,
} from "./editor-area-element-capture";
import {
  mapSnapshotStageToRunStatus,
  mapSnapshotStageToVisibleStage,
  normalizeFailureStage,
  normalizeReceptionSourceType,
  resolveApprovalToken,
  resolveFirstVisibleSourceKind,
} from "./editor-area-stage-mappers";
import {
  shouldClearProgressiveStateOnRunEnd,
  shouldKeepSurfaceEditableAfterFailure,
} from "./progressive-surface-guards";

import type { ProgressiveSurfaceState } from "./editor-area.types";
import type {
  FailureRecoveryAction,
  ProgressiveReviewRun,
  ReceptionSourceType,
  VisibleVersion,
  VisibleVersionStage,
} from "../../types/unified-reception";
import type { Editor } from "@tiptap/core";

interface ProgressiveSurfaceManagerCallbacks {
  onProgressiveStateChange?: (state: ProgressiveSurfaceState | null) => void;
}

/**
 * @description يدير حالة السطح التدريجي لاستقبال الملفات وعمليات الاستيراد.
 * يُعزل كل منطق ProgressiveSurfaceState عن باقي EditorArea.
 */
export class ProgressiveSurfaceManager {
  private progressiveSurfaceState: ProgressiveSurfaceState | null = null;
  private visibleVersionSequence = 0;

  constructor(
    private readonly editor: Editor,
    private readonly body: HTMLDivElement,
    private readonly callbacks: ProgressiveSurfaceManagerCallbacks
  ) {}

  // — يعيد الحالة الحالية للسطح التدريجي (للقراءة فقط من الخارج)
  getState(): ProgressiveSurfaceState | null {
    return this.progressiveSurfaceState;
  }

  // — يعيد true إذا كان السطح مقفلاً ضد التحرير
  isSurfaceLocked(): boolean {
    return this.progressiveSurfaceState?.activeRun?.surfaceLocked ?? false;
  }

  // — يعيد تعيين الحالة إلى null ويُرسل إشعار التغيير
  resetState(): void {
    this.progressiveSurfaceState = null;
    this.emitProgressiveState();
  }

  // — يُرسل حالة السطح الحالية دون تعديل (للاستخدام الخارجي عند الحاجة)
  emitCurrentState(): void {
    this.emitProgressiveState();
  }

  // — يبدأ دورة استقبال جديدة في وضع الإعداد قبل وصول البيانات
  beginProgressivePreparation(params: {
    intakeKind: "file-open" | "paste";
    sourceType: ReceptionSourceType;
    fileName?: string | null;
  }): void {
    const runId = this.createClientId("preparing-run");

    this.progressiveSurfaceState = {
      activeRun: {
        runId,
        intakeKind: params.intakeKind,
        sourceType: params.sourceType,
        fileName: params.fileName ?? null,
        startedAt: new Date().toISOString(),
        status: "started",
        currentVisibleVersionId: null,
        finalSettledVersionId: null,
        surfaceLocked: true,
        latestFailureStage: null,
        latestFailureCode: null,
        latestFailureMessage: null,
        failureRecoveryRequired: false,
        firstVisibleSourceKind: null,
      },
      visibleVersion: null,
      visibleElements: [],
      failureRecoveryAction: null,
    };

    this.applySurfaceLock(true);
    this.emitProgressiveState();
  }

  // — يلغي دورة الإعداد إذا لم تصل أي نسخة ظاهرة بعد
  cancelProgressivePreparation(): void {
    const activeRun = this.progressiveSurfaceState?.activeRun;
    const visibleVersion = this.progressiveSurfaceState?.visibleVersion;

    if (!activeRun) return;
    if (activeRun.currentVisibleVersionId || visibleVersion) return;

    this.progressiveSurfaceState = null;
    this.applySurfaceLock(false);
    this.emitProgressiveState();
  }

  // — يُسجّل موافقة المستخدم على النسخة المستقرة ويُعيّن حالة الموافقة على العناصر
  approveCurrentVersion(): void {
    const progressiveState = this.progressiveSurfaceState;
    const activeRun = progressiveState?.activeRun;
    const visibleVersion = progressiveState?.visibleVersion;

    if (!progressiveState || !activeRun || !visibleVersion) {
      throw new Error("لا توجد نسخة جاهزة للموافقة.");
    }

    if (activeRun.status !== "settled" || !visibleVersion.approvalEligible) {
      throw new Error(
        "لا تصبح الموافقة متاحة إلا بعد اكتمال المراجعة النهائية واستقرار النسخة."
      );
    }

    const approvalToken = visibleVersion.approvalToken;
    if (!approvalToken) {
      throw new Error("رمز الموافقة الحالي غير صالح أو صار قديماً.");
    }

    const approvedAt = new Date().toISOString();
    const approvedVersionId = this.createClientId("approved-version");
    const topLevelNodes = captureTopLevelNodes(this.editor);

    if (topLevelNodes.length === 0) {
      throw new Error("لا توجد عناصر ظاهرة لوضع علامة الموافقة عليها.");
    }

    let transaction = this.editor.state.tr;

    for (const nodeEntry of topLevelNodes) {
      transaction = transaction.setNodeMarkup(nodeEntry.pos, undefined, {
        ...nodeEntry.node.attrs,
        approvalState: "approved",
        approvedVersionId,
        approvedAt,
      });
    }

    this.editor.view.dispatch(transaction);

    const approvedElements = captureVisibleElements(
      this.editor,
      activeRun.runId,
      approvedVersionId
    ).map((element) => ({
      ...element,
      approvalState: "approved" as const,
      approvedVersionId,
    }));

    const approvedVersion: VisibleVersion = {
      visibleVersionId: approvedVersionId,
      runId: activeRun.runId,
      stage: "approved",
      text: this.editor.getText(),
      elements: approvedElements,
      elementCount: approvedElements.length,
      createdAt: approvedAt,
      replacesVersionId: visibleVersion.visibleVersionId,
      isVisible: true,
      isSettled: true,
      approvalEligible: false,
      approvalToken: null,
    };

    this.progressiveSurfaceState = {
      ...progressiveState,
      activeRun: {
        ...activeRun,
        status: "approved",
        currentVisibleVersionId: approvedVersion.visibleVersionId,
        finalSettledVersionId:
          activeRun.finalSettledVersionId ?? visibleVersion.visibleVersionId,
        surfaceLocked: false,
        failureRecoveryRequired: false,
      },
      visibleVersion: approvedVersion,
      visibleElements: approvedElements,
    };

    pipelineRecorder.logApproval({
      runId: activeRun.runId,
      approvedVersionId,
      replacesVersionId: visibleVersion.visibleVersionId,
      elementCount: approvedElements.length,
      approvedAt,
    });

    this.applySurfaceLock(false);
    this.emitProgressiveState();
  }

  // — يُلغي حالة الفشل بعد ظهور نسخة ويسمح للمستخدم بمتابعة التحرير
  dismissProgressiveFailure(): boolean {
    const progressiveState = this.progressiveSurfaceState;
    const activeRun = progressiveState?.activeRun;
    const visibleVersion = progressiveState?.visibleVersion;

    if (
      !progressiveState ||
      !activeRun ||
      !visibleVersion ||
      activeRun.status !== "failed-after-visible"
    ) {
      return false;
    }

    const recoveryAction: FailureRecoveryAction = {
      recoveryId: this.createClientId("recovery"),
      runId: activeRun.runId,
      visibleVersionId: visibleVersion.visibleVersionId,
      actionKind: "dismiss-failure",
      resolvedAt: new Date().toISOString(),
    };

    this.progressiveSurfaceState = {
      ...progressiveState,
      activeRun: {
        ...activeRun,
        surfaceLocked: false,
        failureRecoveryRequired: false,
      },
      failureRecoveryAction: recoveryAction,
    };

    this.applySurfaceLock(false);
    this.emitProgressiveState();
    return true;
  }

  // — يعالج أحداث pipeline الواردة ويحدث حالة السطح وفقاً للمرحلة
  readonly handlePipelineEvent = (event: PipelineEvent): void => {
    switch (event.kind) {
      case "run-start": {
        const sourceType = normalizeReceptionSourceType(event.sourceType);
        this.visibleVersionSequence = 0;
        this.progressiveSurfaceState = {
          activeRun: {
            runId: event.runId,
            intakeKind: event.intakeKind ?? "paste",
            sourceType,
            fileName: event.fileName ?? null,
            startedAt: new Date().toISOString(),
            status: "started",
            currentVisibleVersionId: null,
            finalSettledVersionId: null,
            surfaceLocked: true,
            latestFailureStage: null,
            latestFailureCode: null,
            latestFailureMessage: null,
            failureRecoveryRequired: false,
            firstVisibleSourceKind: null,
          },
          visibleVersion: null,
          visibleElements: [],
          failureRecoveryAction: null,
        };
        this.applySurfaceLock(true);
        this.emitProgressiveState();
        return;
      }

      case "snapshot": {
        const progressiveState = this.progressiveSurfaceState;
        const activeRun = progressiveState?.activeRun;
        if (!progressiveState || !activeRun) return;

        const mappedRunStatus = mapSnapshotStageToRunStatus(event.stage);
        const mappedVisibleStage = mapSnapshotStageToVisibleStage(
          event.stage,
          activeRun.sourceType
        );
        if (!mappedRunStatus || !mappedVisibleStage) return;

        const nextVisibleVersion = this.createVisibleVersion(
          activeRun,
          mappedVisibleStage,
          mappedRunStatus === "settled",
          event.stage === "settled",
          event.metadata
        );

        this.progressiveSurfaceState = {
          ...progressiveState,
          activeRun: {
            ...activeRun,
            status: mappedRunStatus,
            currentVisibleVersionId: nextVisibleVersion.visibleVersionId,
            finalSettledVersionId:
              mappedRunStatus === "settled"
                ? nextVisibleVersion.visibleVersionId
                : (activeRun.finalSettledVersionId ?? null),
            surfaceLocked: mappedRunStatus !== "settled",
            ...definedProps({
              firstVisibleSourceKind:
                activeRun.firstVisibleSourceKind ??
                resolveFirstVisibleSourceKind(
                  activeRun.sourceType,
                  event.metadata
                ),
            }),
          },
          visibleVersion: nextVisibleVersion,
          visibleElements: nextVisibleVersion.elements,
          failureRecoveryAction: progressiveState.failureRecoveryAction,
        };

        this.applySurfaceLock(mappedRunStatus !== "settled");
        this.emitProgressiveState();
        return;
      }

      case "run-failure": {
        const activeRun = this.progressiveSurfaceState?.activeRun;
        if (!activeRun) return;

        const nextState: ProgressiveSurfaceState = {
          ...this.progressiveSurfaceState!,
          activeRun: {
            ...activeRun,
            status: "failed-after-visible",
            surfaceLocked: !shouldKeepSurfaceEditableAfterFailure(
              this.progressiveSurfaceState
            ),
            latestFailureCode: event.code ?? null,
            latestFailureMessage: event.message,
            failureRecoveryRequired: true,
            ...definedProps({
              latestFailureStage: normalizeFailureStage(event.stage),
            }),
          },
        };
        this.progressiveSurfaceState = nextState;
        this.applySurfaceLock(nextState.activeRun?.surfaceLocked ?? false);
        this.emitProgressiveState();
        return;
      }

      case "run-end": {
        const activeRun = this.progressiveSurfaceState?.activeRun;
        const visibleVersion = this.progressiveSurfaceState?.visibleVersion;

        if (!activeRun || !visibleVersion) {
          if (
            shouldClearProgressiveStateOnRunEnd(this.progressiveSurfaceState)
          ) {
            this.progressiveSurfaceState = null;
            this.applySurfaceLock(false);
            this.emitProgressiveState();
          }
          return;
        }

        if (event.outcome === "failed-after-visible") {
          const keepEditable = shouldKeepSurfaceEditableAfterFailure(
            this.progressiveSurfaceState
          );
          this.progressiveSurfaceState = {
            ...this.progressiveSurfaceState!,
            activeRun: {
              ...activeRun,
              surfaceLocked: !keepEditable,
              failureRecoveryRequired: true,
            },
          };
          this.applySurfaceLock(!keepEditable);
          this.emitProgressiveState();
          return;
        }

        const settledVersion =
          visibleVersion.stage === "settled"
            ? visibleVersion
            : {
                ...visibleVersion,
                stage: "settled" as const,
                isSettled: true,
                approvalEligible: true,
                approvalToken:
                  visibleVersion.approvalToken ??
                  this.createClientId("approval"),
              };

        this.progressiveSurfaceState = {
          ...this.progressiveSurfaceState!,
          activeRun: {
            ...activeRun,
            status: "settled",
            currentVisibleVersionId: settledVersion.visibleVersionId,
            finalSettledVersionId: settledVersion.visibleVersionId,
            surfaceLocked: false,
            failureRecoveryRequired: false,
          },
          visibleVersion: settledVersion,
          visibleElements: settledVersion.elements,
        };
        this.applySurfaceLock(false);
        this.emitProgressiveState();
        return;
      }

      default:
        return;
    }
  };

  // — يضبط قابلية تحرير المحرر وحالة data attribute على body
  applySurfaceLock(locked: boolean): void {
    this.editor.setEditable(!locked);
    this.body.dataset["surfaceLocked"] = locked ? "true" : "false";
  }

  private emitProgressiveState(): void {
    this.callbacks.onProgressiveStateChange?.(this.progressiveSurfaceState);
  }

  private createVisibleVersion(
    run: ProgressiveReviewRun,
    stage: VisibleVersionStage,
    isSettled: boolean,
    approvalEligible: boolean,
    metadata?: Record<string, unknown>
  ): VisibleVersion {
    const previousVersionId =
      this.progressiveSurfaceState?.visibleVersion?.visibleVersionId ?? null;
    const visibleVersionId = this.createClientId("visible-version");
    const elements = captureVisibleElements(
      this.editor,
      run.runId,
      visibleVersionId
    );

    return {
      visibleVersionId,
      runId: run.runId,
      stage,
      text: this.editor.getText(),
      elements,
      elementCount: elements.length,
      createdAt: new Date().toISOString(),
      replacesVersionId: previousVersionId,
      isVisible: true,
      isSettled,
      approvalEligible,
      approvalToken: approvalEligible
        ? this.createClientId("approval")
        : resolveApprovalToken(metadata),
    };
  }

  private createClientId(prefix: string): string {
    this.visibleVersionSequence += 1;
    return `${prefix}-${Date.now()}-${this.visibleVersionSequence}`;
  }
}
