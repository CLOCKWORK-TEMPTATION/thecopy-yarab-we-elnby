1.  **Phase 1: Explore and Refactor Target 1 (breakdown-gemini-server.ts)**
    *   Create `apps/web/src/app/api/breakdown/_lib/utils.ts` and extract the following functions confirmed to be in `breakdown-gemini-server.ts`: `getGeminiApiKey`, `isValidApiKey`, `parseSceneHeader`, `buildElements`, `buildStats`, `normalizeSceneBreakdown`, `normalizeScenarioAnalysis`, `extractJsonFromText`, `buildFallbackAnalysis`, `buildShootingSchedule`, `buildReportSummary`, `buildElementsByCategory`.
    *   Modify `apps/web/src/app/api/breakdown/_lib/breakdown-gemini-server.ts` to import these utils.
    *   Verify: Ensure file is <= 500 lines using `wc -l`.

2.  **Phase 2: Explore and Refactor Target 2 (ProductionTools.tsx)**
    *   Create a new directory `apps/web/src/app/(main)/cinematography-studio/components/tools/production-tools`.
    *   Extract the following components confirmed to be in `ProductionTools.tsx` into their own files within the new directory: `ModeButton.tsx`, `ActionButton.tsx`, `Banner.tsx`, `ScopePanel.tsx`, `ToggleRow.tsx`.
    *   Modify `ProductionTools.tsx` to import these extracted components.
    *   Verify: Ensure file is <= 500 lines.

3.  **Phase 3: Explore and Refactor Target 3 (repo-state.ts)**
    *   Create a new file `scripts/agent/lib/repo-state-types.ts` and extract the interfaces confirmed to be in `scripts/agent/lib/repo-state.ts`: `GitState`, `WorkspaceApp`, `IdeTarget`, `RepoFacts`, `ReferenceStatus`, `FingerprintState`, `DriftResult`.
    *   Create a new file `scripts/agent/lib/repo-state-utils.ts` and extract the utility functions confirmed to be in `scripts/agent/lib/repo-state.ts`: `computeInputHashes`, `computeOutputHashes`, `computeIdeHashes`, `createKnowledgeHash`, `collectRepoFacts`, `createFactsHash`, `createStructuralHash`, `collectStructuralFiles`, `determineDrift`, `readFingerprint`, `readPreviousSessionState`, `verifyManualContractsExist`.
    *   Update `scripts/agent/lib/repo-state.ts` to re-export the public APIs to preserve backward compatibility.
    *   Verify: Ensure file is <= 500 lines.

4.  **Phase 4: Explore and Refactor Target 4 (llm-guardrails.service.ts)**
    *   Create a `apps/backend/src/services/llm-guardrails` directory.
    *   Extract the interfaces confirmed to be in `apps/backend/src/services/llm-guardrails.service.ts`: `GuardrailViolation`, `PIIDetection`, `GuardrailResult`, `GuardrailMetrics` into `apps/backend/src/services/llm-guardrails/types.ts`.
    *   Extract the constants confirmed to be in `apps/backend/src/services/llm-guardrails.service.ts`: `PROMPT_INJECTION_METRIC_PATTERN`, `BANNED_PATTERNS`, `MAX_PATTERN_CHECK_LENGTH`, `SUSPICIOUS_PATTERNS`, `PII_PATTERNS`, `HARMFUL_CONTENT_PATTERNS`, `HALLUCINATION_INDICATORS`, `FACTUAL_CLAIM_PATTERNS`, `EXTERNAL_REFERENCE_PATTERN`, `REPEATED_SUSPICIOUS_TOKENS` into `apps/backend/src/services/llm-guardrails/patterns.ts`.
    *   Verify: Ensure file is <= 500 lines.

5.  **Phase 5: Explore and Refactor Target 5 (standardAgentPattern.ts)**
    *   Extract the interfaces confirmed to be there: `StandardAgentInput`, `StandardAgentOptions`, `StandardAgentOutput`, `RAGContext`, `SelfCritiqueResult`, `ConstitutionalCheckResult`, `UncertaintyMetrics`, `HallucinationCheckResult` into `apps/web/src/lib/drama-analyst/agents/shared/types.ts`.
    *   Extract the functions confirmed to be there: `performRAG`, `buildPromptWithRAG`, `performSelfCritique`, `performConstitutionalCheck`, `measureUncertainty`, `detectHallucinations`, `createExecutionMetadata`, `createPromptWithOptionalRag`, `applySelfCritiqueStep`, `applyConstitutionalStep`, `applyUncertaintyStep`, `applyHallucinationStep`, `addDebateNoteIfNeeded`, `normalizeContext`, `normalizeExecutionArgs` into `apps/web/src/lib/drama-analyst/agents/shared/utils.ts`.
    *   Verify: Ensure file is <= 500 lines.

6.  **Phase 6: Explore and Refactor Target 6 (suspicion-review-probe.mjs)**
    *   Create `apps/backend/editor-runtime/services/suspicion-review-probe-constants.mjs` and extract the confirmed constants: `EXPECTED_SUSPICION_CASES` and `EXPECTED_FINAL_REVIEW_CANDIDATES`.
    *   Create `apps/backend/editor-runtime/services/suspicion-review-probe-utils.mjs` and extract the confirmed helper functions: `runKarankPipeline`, `countSuspicionCases`, `calculateSuspicionScoreFromElement`, `attemptSuspicionReview`, `attemptFinalReview`, `resolveSuspicionReviewEndpoint`, `resolveFinalReviewEndpoint`, `determineFailureStage`, `determineFailureCode`, `determineFailureMessage`.
    *   Leave `probeOperationalReadiness` and `probeSuspicionReviewReadinessSync` in the main file.
    *   Verify: Ensure file is <= 500 lines.

7.  **Phase 7: Explore and Refactor Target 7 (websocket.service.ts)**
    *   Create `apps/backend/src/services/websocket` directory.
    *   Extract `AuthenticatedSocket` interface into `apps/backend/src/services/websocket/types.ts`.
    *   Extract the private handlers (`handleConnection`, `handleAuthentication`, `handleTokenRefresh`, `scheduleSessionExpiry`, `clearSessionExpiry`, `handleDisconnection`, `handleRoomSubscription`, `handleRoomUnsubscription`) into `apps/backend/src/services/websocket/handlers.ts` and modify `WebSocketService` to use them.
    *   Verify: Ensure file is <= 500 lines.

8.  **Phase 8: Explore and Refactor Targets 8 & 9 (usePostProduction.ts, useProduction.ts)**
    *   Extract the functions confirmed to be in `usePostProduction.ts`: `getExportSettingsForPlatform`, `normalizeFootageSummary`, `clampScore` into `apps/web/src/app/(main)/cinematography-studio/hooks/postProductionUtils.ts`.
    *   Extract the functions confirmed to be in `useProduction.ts`: `normalizeShotAnalysis`, `clampScore` into `apps/web/src/app/(main)/cinematography-studio/hooks/productionUtils.ts`.
    *   Verify: Ensure files are <= 500 lines.

9.  **Phase 9: Budget Checker Script**
    *   Modify `scripts/check-file-line-budget.mjs` to target only the 9 specified files and their newly created helper files to ensure the budget constraint is strictly enforced for the scope of this refactor. Update `package.json` to map `"check:line-budget"` correctly.
    *   Run `pnpm check:line-budget`.

10. **Phase 10: Pre-commit Instructions**
    *   Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

11. **Phase 11: Final Verification & Submit**
    *   Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` on web and backend.
    *   Submit the code.
