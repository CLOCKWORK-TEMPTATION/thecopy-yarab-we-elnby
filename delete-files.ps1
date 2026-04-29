

╭──────────────────────────────────────────────────────────────────────────╮
│                                                                          │
│                     Update available v2.9.4 ≫ v2.9.6                     │
│    Changelog: https://github.com/vercel/turborepo/releases/tag/v2.9.6    │
│          Run "pnpm dlx @turbo/codemod@latest update" to update           │
│                                                                          │
│          Follow @turborepo for updates: https://x.com/turborepo          │
╰──────────────────────────────────────────────────────────────────────────╯
• turbo 2.9.4

   • Packages in scope: @the-copy/backend, @the-copy/breakapp, @the-copy/core-memory, @the-copy/prompt-engineering, @the-copy/tsconfig, @the-copy/web
   • Running type-check in 6 packages
   • Remote caching disabled

@the-copy/prompt-engineering:type-check: cache hit, replaying logs 532223c617a82272
@the-copy/prompt-engineering:type-check:
@the-copy/prompt-engineering:type-check: > @the-copy/prompt-engineering@1.0.0 type-check C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\prompt-engineering      
@the-copy/prompt-engineering:type-check: > tsc --noEmit
@the-copy/prompt-engineering:type-check:
@the-copy/breakapp:type-check: cache hit, replaying logs 5b9d3d094d3150b8
@the-copy/breakapp:type-check:
@the-copy/breakapp:type-check: > @the-copy/breakapp@1.0.0 type-check C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\breakapp
@the-copy/breakapp:type-check: > tsc --noEmit
@the-copy/breakapp:type-check:
@the-copy/core-memory:type-check: cache hit, replaying logs 6e6eba681b260c53
@the-copy/core-memory:type-check:
@the-copy/core-memory:type-check: > @the-copy/core-memory@1.0.0 type-check C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\core-memory
@the-copy/core-memory:type-check: > tsc --noEmit
@the-copy/core-memory:type-check:
@the-copy/core-memory:build: cache hit, replaying logs 314f8ec9a2be8425
@the-copy/core-memory:build: 
@the-copy/core-memory:build: > @the-copy/core-memory@1.0.0 build C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\core-memory
@the-copy/core-memory:build: > tsc
@the-copy/core-memory:build:
@the-copy/prompt-engineering:build: cache hit, replaying logs a405c4b6a98d1d75
@the-copy/breakapp:build: cache hit, replaying logs 0a29caccd1511938
@the-copy/prompt-engineering:build:
@the-copy/prompt-engineering:build: > @the-copy/prompt-engineering@1.0.0 build C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\prompt-engineering
@the-copy/breakapp:build:
@the-copy/breakapp:build: > @the-copy/breakapp@1.0.0 build C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\packages\breakapp
@the-copy/breakapp:build: > tsc
@the-copy/breakapp:build:
@the-copy/backend:type-check: cache miss, executing dbafd324ebdcde63
@the-copy/prompt-engineering:build: > tsc
@the-copy/prompt-engineering:build:
@the-copy/web:type-check: cache miss, executing ac6c2d022c5cd4ac
@the-copy/web:type-check: 
@the-copy/web:type-check: > @the-copy/web@1.2.0 type-check C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\apps\web
@the-copy/web:type-check: > node ../../scripts/quality/typecheck-contract.mjs --project=web 
@the-copy/web:type-check:
@the-copy/backend:type-check:
@the-copy/backend:type-check: > @the-copy/backend@1.0.0 type-check C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy\apps\backend
@the-copy/backend:type-check: > node ../../scripts/quality/typecheck-contract.mjs --project=backend
@the-copy/backend:type-check:
@the-copy/web:type-check: [typecheck] web: 34 TypeScript error(s).
@the-copy/web:type-check:   1× apps/web/scripts/cinematography/run-integration-tests.ts|TS2307|Cannot find module './test-suites' or its corresponding type declarations.
@the-copy/web:type-check:   1× apps/web/src/app/(main)/editor/src/constants/editor-format-styles.ts|TS4111|Property 'default' comes from an index signature, so it must be accessed with ['default'].
@the-copy/web:type-check:   1× apps/web/src/app/__regression__/01-launcher-card-mapping.test.ts|TS18048|'first' is possibly 'undefined'.
@the-copy/web:type-check:   1× apps/web/src/app/api/workflow/execute-custom/route.test.ts|TS2379|Argument of type '{ method: string; headers: { "Content-Type": string; }; body: string | undefined; }' is not assignable to parameter of type 'RequestInit' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.      
@the-copy/web:type-check:   1× apps/web/src/env.test.ts|TS2540|Cannot assign to 'NODE_ENV' because it is a read-only property.
@the-copy/web:type-check:   1× apps/web/src/env.test.ts|TS2704|The operand of a 'delete' operator cannot be a read-only property.
@the-copy/web:type-check:   1× apps/web/src/lib/__tests__/projectStore.test.ts|TS2739|Type '{ id: string; name: string; description: string; }' is missing the following properties from type 'Project': title, scriptContent, userId, createdAt, updatedAt
@the-copy/web:type-check:   1× apps/web/src/lib/analysis/seven-stations-fallback.test.ts|TS2769|No overload matches this call.
@the-copy/web:type-check:   1× apps/web/src/lib/animations.ts|TS2352|Conversion of type 'Window & typeof globalThis' to type 'Window & { ScrollTimeline?: ScrollTimelineCtor; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
@the-copy/web:type-check:   1× apps/web/src/lib/crypto/documentService.ts|TS2375|Type '{ success: true; documents: DocumentListEntry[] | undefined; }' is not assignable to type '{ success: boolean; documents?: { id: string; version: number; ciphertextSize: number; createdAt: string; lastModified: string; }[]; error?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/adaptiveRewriting/AdaptiveRewritingAgent.ts|TS2416|Property 'getFallbackResponse' in type 'AdaptiveRewritingAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/analysis/AnalysisAgent.test.ts|TS2353|Object literal may only specify known properties, and 'maxDebateRounds' does not exist in type 'StandardAgentOptions'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/analysis/AnalysisAgent.ts|TS2416|Property 'getFallbackResponse' in type 'AnalysisAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/audienceResonance/AudienceResonanceAgent.test.ts|TS2353|Object literal may only specify known properties, and 'maxDebateRounds' does not exist in type 'StandardAgentOptions'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/audienceResonance/AudienceResonanceAgent.ts|TS2416|Property 'getFallbackResponse' in type 'AudienceResonanceAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/characterDeepAnalyzer/CharacterDeepAnalyzerAgent.ts|TS2416|Property 'getFallbackResponse' in type 'CharacterDeepAnalyzerAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/characterNetwork/CharacterNetworkAgent.ts|TS2416|Property 'getFallbackResponse' in type 'CharacterNetworkAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/characterVoice/CharacterVoiceAgent.ts|TS2416|Property 'getFallbackResponse' in type 'CharacterVoiceAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/completion/CompletionAgent.ts|TS2416|Property 'getFallbackResponse' in type 'CompletionAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/conflictDynamics/ConflictDynamicsAgent.ts|TS2416|Property 'getFallbackResponse' in type 'ConflictDynamicsAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/dialogueAdvancedAnalyzer/DialogueAdvancedAnalyzerAgent.ts|TS2416|Property 'getFallbackResponse' in type 'DialogueAdvancedAnalyzerAgent' is not assignable to the same property in base type 'BaseAgent'.       
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/index.ts|TS2322|Type 'AIAgentConfig | undefined' is not assignable to type 'AIAgentConfig'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/integrated/IntegratedAgent.test.ts|TS2353|Object literal may only specify known properties, and 'maxDebateRounds' does not exist in type 'StandardAgentOptions'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/literaryQualityAnalyzer/LiteraryQualityAnalyzerAgent.ts|TS2416|Property 'getFallbackResponse' in type 'LiteraryQualityAnalyzerAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/recommendationsGenerator/RecommendationsGeneratorAgent.ts|TS2416|Property 'getFallbackResponse' in type 'RecommendationsGeneratorAgent' is not assignable to the same property in base type 'BaseAgent'.       
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/styleFingerprint/StyleFingerprintAgent.ts|TS2416|Property 'getFallbackResponse' in type 'StyleFingerprintAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/targetAudienceAnalyzer/TargetAudienceAnalyzerAgent.ts|TS2416|Property 'getFallbackResponse' in type 'TargetAudienceAnalyzerAgent' is not assignable to the same property in base type 'BaseAgent'.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/agents/upgradedAgents.ts|TS2769|No overload matches this call.
@the-copy/web:type-check:   1× apps/web/src/lib/drama-analyst/services/backendService.ts|TS2322|Type 'boolean' is not assignable to type 'Promise<boolean>'.
@the-copy/web:type-check:   1× apps/web/src/lib/projectStore.ts|TS2352|Conversion of type 'UnknownRecord' to type 'Project' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
@the-copy/web:type-check:   1× apps/web/src/lib/stores/projectStore.ts|TS2344|Type 'ProjectStore' does not satisfy the constraint 'Record<string, unknown>'.
@the-copy/web:type-check:   1× apps/web/src/lib/tracing.ts|TS2322|Type 'BatchSpanProcessor' is not assignable to type 'SpanProcessor'.
@the-copy/web:type-check:   1× apps/web/src/mcp/ocr-arabic-pdf-to-txt-pipeline-server/config-builder.ts|TS2375|Type '{ annotationSchemaPath: string | undefined; annotationPrompt: string | undefined; annotationOutputPath: string | undefined; }' is not assignable to type '{ annotationSchemaPath?: string; annotationPrompt?: string; annotationOutputPath?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
@the-copy/web:type-check:   1× apps/web/src/mcp/ocr-arabic-pdf-to-txt-pipeline-server/markdown-normalizer.ts|TS2322|Type 'string | boolean' is not assignable to type 'boolean'.        
@the-copy/backend:type-check: [typecheck] backend: 273 TypeScript error(s).
@the-copy/backend:type-check:   14× apps/backend/src/services/agents/workflow-system.test.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   12× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/llm-post-processor.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   9× apps/backend/src/types/ai/geminiTypes.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   6× apps/backend/src/modules/art-director/__tests__/handlers.test.ts|TS4111|Property 'data' comes from an index signature, so it must be accessed with ['data'].
@the-copy/backend:type-check:   6× apps/backend/src/services/llm-guardrails.service.test.ts|TS18048|'result.warnings' is possibly 'undefined'.
@the-copy/backend:type-check:   6× apps/backend/src/types/index.test.ts|TS2739|Type '{}' is missing the following properties from type 'StationOutput': stationId, stationName, executionTime, status, timestamp
@the-copy/backend:type-check:   5× apps/backend/src/modules/art-director/__tests__/handlers.test.ts|TS4111|Property 'success' comes from an index signature, so it must be accessed with ['success'].
@the-copy/backend:type-check:   5× apps/backend/src/services/agents/upgradedAgents.test.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   5× apps/backend/src/test/integration/api.integration.test.ts|TS7030|Not all code paths return a value.
@the-copy/backend:type-check:   4× apps/backend/src/config/env.test.ts|TS2322|Type '{ NODE_ENV: string; DATABASE_URL: string; }' is not assignable to type 'ProcessEnv'.
@the-copy/backend:type-check:   4× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/markdown-normalizer.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   4× apps/backend/src/services/agents/learning/ruleLearning.ts|TS4111|Property 'agentName' comes from an index signature, so it must be accessed with ['agentName'].
@the-copy/backend:type-check:   3× apps/backend/src/config/env.test.ts|TS2322|Type '{ NODE_ENV: string; PORT: string; DATABASE_URL: string; JWT_SECRET: string; CORS_ORIGIN: string; RATE_LIMIT_WINDOW_MS: string; RATE_LIMIT_MAX_REQUESTS: string; NEXT_PUBLIC_BACKEND_URL: string; }' is not assignable to type 'ProcessEnv'.
@the-copy/backend:type-check:   3× apps/backend/src/middleware/index.test.ts|TS6133|'req' is declared but its value is never read.
@the-copy/backend:type-check:   3× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/markdown-normalizer.ts|TS2345|Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
@the-copy/backend:type-check:   3× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/ocr-preprocessor.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   3× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/skill-scripts/ocr-mistral.ts|TS2322|Type 'string | undefined' is not assignable to type 'string'.    
@the-copy/backend:type-check:   3× apps/backend/src/services/agents/adaptiveRewriting/AdaptiveRewritingAgent.test.ts|TS4111|Property 'stats' comes from an index signature, so it must be accessed with ['stats'].
@the-copy/backend:type-check:   3× apps/backend/src/types/index.test.ts|TS2532|Object is possibly 'undefined'.
@the-copy/backend:type-check:   2× apps/backend/src/controllers/characters.controller.test.ts|TS7034|Variable 'mockProject' implicitly has type 'any[]' in some locations where its type cannot be determined.
@the-copy/backend:type-check:   2× apps/backend/src/controllers/characters.controller.test.ts|TS7005|Variable 'mockProject' implicitly has an 'any[]' type.
@the-copy/backend:type-check:   2× apps/backend/src/controllers/realtime.controller.ts|TS6133|'req' is declared but its value is never read.
@the-copy/backend:type-check:   2× apps/backend/src/controllers/realtime.controller.ts|TS2345|Argument of type '{ event: string; payload: { timestamp: string; eventType: string; message: string; }; }' is not assignable to parameter of type 'RealtimeEvent<RealtimePayload>'.   
@the-copy/backend:type-check:   2× apps/backend/src/controllers/realtime.controller.ts|TS4111|Property 'analysisId' comes from an index signature, so it must be accessed with ['analysisId'].
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/batch.ts|TS2345|Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/config-builder.ts|TS18048|'token' is possibly 'undefined'.
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/llm-post-processor.ts|TS2322|Type 'number | undefined' is not assignable to type 'number'.
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/mcp-server/markdown-normalizer.ts|TS18048|'prev' is possibly 'undefined'.
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/skill-scripts/enhance-image.ts|TS2322|Type 'string | undefined' is not assignable to type 'string'.  
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/skill-scripts/ocr-mistral.ts|TS2345|Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
@the-copy/backend:type-check:   2× apps/backend/src/ocr-arabic-pdf-to-txt-pipeline/skill-scripts/write-output.ts|TS2322|Type 'string | undefined' is not assignable to type 'string'.   
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/learning/ruleLearning.ts|TS4111|Property 'metrics' comes from an index signature, so it must be accessed with ['metrics'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/learning/ruleLearning.ts|TS4111|Property 'patterns' comes from an index signature, so it must be accessed with ['patterns'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/literaryQualityAnalyzer/LiteraryQualityAnalyzerAgent.test.ts|TS4111|Property 'literaryEvaluationQuality' comes from an index signature, so it must be accessed with ['literaryEvaluationQuality'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/rules/dialogueRules.ts|TS4111|Property 'language' comes from an index signature, so it must be accessed with ['language'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/shared/ruleApplicator.ts|TS4111|Property 'critical' comes from an index signature, so it must be accessed with ['critical'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/shared/ruleApplicator.ts|TS4111|Property 'major' comes from an index signature, so it must be accessed with ['major'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/shared/ruleApplicator.ts|TS4111|Property 'minor' comes from an index signature, so it must be accessed with ['minor'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/shared/ruleApplicator.ts|TS4111|Property 'warning' comes from an index signature, so it must be accessed with ['warning'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/shared/ruleApplicator.ts|TS4111|Property 'genre' comes from an index signature, so it must be accessed with ['genre'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/upgradedAgents.test.ts|TS4111|Property 'practicalityScore' comes from an index signature, so it must be accessed with ['practicalityScore'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/upgradedAgents.test.ts|TS4111|Property 'voiceConsistency' comes from an index signature, so it must be accessed with ['voiceConsistency'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/upgradedAgents.test.ts|TS4111|Property 'naturality' comes from an index signature, so it must be accessed with ['naturality'].
@the-copy/backend:type-check:   2× apps/backend/src/services/agents/upgradedAgents.test.ts|TS4111|Property 'dialogueType' comes from an index signature, so it must be accessed with ['dialogueType'].
@the-copy/backend:type-check:   2× apps/backend/src/services/llm-guardrails.service.test.ts|TS4111|Property 'prompt_injection' comes from an index signature, so it must be accessed with ['prompt_injection'].
@the-copy/backend:type-check:   2× apps/backend/src/__tests__/integration/controllers.integration.test.ts|TS4111|Property 'scriptContent' comes from an index signature, so it must be accessed with ['scriptContent'].
@the-copy/backend:type-check:   1× apps/backend/src/agents/analysis/analysisAgent.ts|TS4114|This member must have an 'override' modifier because it overrides a member in the base class 'IntegratedAgent'.
@the-copy/backend:type-check:   1× apps/backend/src/agents/analysis/characterDeepAnalyzerAgent.ts|TS4114|This member must have an 'override' modifier because it overrides a member in the base class 'IntegratedAgent'.
@the-copy/backend:type-check:   1× apps/backend/src/config/env.test.ts|TS2322|Type '{ GOOGLE_GENAI_API_KEY: string; NODE_ENV: string; DATABASE_URL: string; }' is not assignable to type 'ProcessEnv'.
@the-copy/backend:type-check:   1× apps/backend/src/config/env.test.ts|TS2322|Type '{ FRONTEND_URL: string; REDIS_ENABLED: string; REDIS_SENTINEL_ENABLED: "false"; REDIS_SENTINELS: string; REDIS_MASTER_NAME: string; SERVICE_NAME: string; TRACING_ENABLED: string; FILE_IMPORT_HOST: string; ... 5 more ...; DATABASE_URL: string; }' is not assignable to type 'ProcessEnv'.
@the-copy/backend:type-check:   ...and 114 more unique error(s).

 Tasks:    8 successful, 8 total
Cached:    6 cached, 8 total
  Time:    2m5.248s

PS C:\Users\Mohmed Aimen Raed\Documents\Claude\Projects\the copy>                           