1. **Refactor Arabic Prompt Engineering Studio File** [COMPLETED]
2. **Refactor Actor AI VoiceCoach File** [COMPLETED]
3. **Refactor BREAKAPP director orders-live page.tsx** [COMPLETED]
4. **Refactor cinematography run-integration-tests.ts**:
    - **Step 4.1**: Create `apps/web/scripts/cinematography/utils/test-helpers.ts` to extract `runSuite`, `createFixtureImageFile`, `readBodyAsText`, `startFixtureServer`, and `installDomEnvironment`.
    - **Step 4.2**: Create `apps/web/scripts/cinematography/suites/config-suite.ts` to extract `runConfigSuite`.
    - **Step 4.3**: Create `apps/web/scripts/cinematography/suites/fallback-suite.ts` to extract `runLocalFallbackSuite`.
    - **Step 4.4**: Create `apps/web/scripts/cinematography/suites/route-suite.ts` to extract `runRouteSuite`.
    - **Step 4.5**: Create `apps/web/scripts/cinematography/suites/media-hook-suite.ts` to extract `runMediaHookSuite`.
    - **Step 4.6**: Create `apps/web/scripts/cinematography/suites/session-storage-suite.ts` to extract `runSessionStorageSuite`.
    - **Step 4.7**: Create `apps/web/scripts/cinematography/suites/camera-binding-suite.ts` to extract `runCameraBindingSuite`.
    - **Step 4.8**: Refactor `apps/web/scripts/cinematography/run-integration-tests.ts` to import these extracted files.
    - **Step 4.9**: Run `pnpm check:line-budget`.
    - **Step 4.10**: Run `pnpm --filter web typecheck` and `pnpm --filter web lint`.

5. **Final Comprehensive Checks**:
    - `pnpm install`
    - `pnpm check:line-budget`
    - `pnpm typecheck`
    - `pnpm lint`
    - `pnpm test`
    - `pnpm --filter web typecheck`
    - `pnpm --filter web lint`
    - `pnpm --filter web test`
    - `pnpm --filter backend typecheck`
    - `pnpm --filter backend lint`
    - `pnpm --filter backend test`

6. **Pre-commit Instructions**:
    - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
