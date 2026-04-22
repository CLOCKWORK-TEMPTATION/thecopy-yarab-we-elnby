import {
  hasVisibleProgressiveVersion,
  shouldClearProgressiveStateOnRunEnd,
  shouldKeepSurfaceEditableAfterFailure,
} from "./progressive-surface-guards";

describe("progressive-surface-guards", () => {
  it("ينظف الحالة عند انتهاء التشغيل بلا نسخة مرئية", () => {
    const state = {
      activeRun: {
        runId: "run-1",
        intakeKind: "file-open",
        sourceType: "docx",
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

    expect(hasVisibleProgressiveVersion(state)).toBe(false);
    expect(shouldClearProgressiveStateOnRunEnd(state)).toBe(true);
    expect(shouldKeepSurfaceEditableAfterFailure(state)).toBe(false);
  });

  it("يبقي المحرر قابلاً للتحرير عندما توجد نسخة مرئية بعد الفشل", () => {
    const state = {
      activeRun: {
        runId: "run-2",
        intakeKind: "file-open",
        sourceType: "pdf",
        startedAt: new Date().toISOString(),
        status: "failed-after-visible",
        currentVisibleVersionId: "visible-1",
        finalSettledVersionId: null,
        surfaceLocked: true,
        latestFailureStage: "final-review",
        latestFailureCode: "E_FINAL",
        latestFailureMessage: "network failed",
        failureRecoveryRequired: true,
        firstVisibleSourceKind: "ocr",
      },
      visibleVersion: {
        visibleVersionId: "visible-1",
        runId: "run-2",
        stage: "local-classified",
        text: "داخلي - بيت - ليل",
        elements: [],
        elementCount: 1,
        createdAt: new Date().toISOString(),
        replacesVersionId: null,
        isVisible: true,
        isSettled: false,
        approvalEligible: false,
        approvalToken: null,
      },
      visibleElements: [],
      failureRecoveryAction: null,
    };

    expect(hasVisibleProgressiveVersion(state)).toBe(true);
    expect(shouldClearProgressiveStateOnRunEnd(state)).toBe(false);
    expect(shouldKeepSurfaceEditableAfterFailure(state)).toBe(true);
  });
});
