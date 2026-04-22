# تصميم الوكلاء وسير الأعمال

## Director Copilot Arabic

## 1. مبادئ عامة

كل وكيل في النظام وحدة تنفيذية محددة، وليس chatbot عامًا.  
لكل وكيل:

- اسم واضح
- مهمة محددة
- مدخلات بنيوية
- مخرجات بنيوية
- أدوات مسموحة
- سياسة اعتماد
- سياسة إعادة محاولة
- مؤشرات نجاح

## 2. المعمارية العليا للوكلاء

```text
Director Orchestrator
  ├── Script Ingestion Agent
  ├── Scene Parser Agent
  ├── Breakdown Agent
  ├── Character & Arc Analyst
  ├── Visual Bible Agent
  ├── Storyboard Agent
  ├── Shot Planner Agent
  ├── Previs Video Agent
  ├── Scheduling Agent
  ├── Call Sheet Agent
  ├── Live Voice Copilot
  ├── Transcription Agent
  ├── Continuity Agent
  ├── Dailies QA Agent
  ├── Editorial Handoff Agent
  ├── Search Librarian Agent
  └── Provenance & Approval Agent
```

## 3. الوكلاء واحدًا واحدًا

## A00 — Director Orchestrator Agent

**المهمة:** تنسيق الخطة التنفيذية وتشغيل الوكلاء المناسبين.  
**المدخلات:** طلب عالي المستوى + سياق المشروع + سياسات الوصول.  
**المخرجات:** workflow plan + dependency graph + approval gates.  
**الأدوات:** policy engine / registry / search / approvals / workflow launcher.  
**لا يعتمد مخرجات فنية نهائية بنفسه.**

## A01 — Script Ingestion Agent

**المهمة:** استقبال النص، استخراج محتواه، إنشاء asset وscript_version.  
**المدخلات:** ملف + metadata.  
**المخرجات:** script_id / script_version_id / source_asset_id / extraction quality.  
**سياسة الفشل:** إذا كانت جودة الاستخراج منخفضة، يرفع warning ويطلب مراجعة.

## A02 — Scene Parser Agent

**المهمة:** تحويل script_version إلى scenes منظمة.  
**المدخلات:** normalized_text + project type + language hints.  
**المخرجات:** scenes[] + unresolved_segments[] + parse warnings.  
**قيد:** أي scene غير مؤكدة تُعلَّم بوضوح.

## A03 — Breakdown Agent

**المهمة:** تحليل المشهد تشغيليًا وإنتاج scene_breakdown.  
**المدخلات:** scene + neighboring context + known entities.  
**المخرجات:** cast / props / wardrobe / risks / VFX / SFX / notes.  
**الاعتماد:** مطلوب قبل schedule generation.

## A04 — Character & Arc Analyst

**المهمة:** نمذجة الحالة النفسية والمسار الدرامي للشخصيات عبر المشاهد.  
**المدخلات:** scenes over horizon + character references + notes.  
**المخرجات:** per-scene character state + contradiction markers.  
**الاستخدام:** support continuity, direction notes, scene transitions.

## A05 — Visual Bible Agent

**المهمة:** تحويل الرؤية النصية إلى style manifest بصري.  
**المدخلات:** synopsis + references + selected scenes + director notes.  
**المخرجات:** palette / texture descriptors / light language / prompt pack.  
**الاعتماد:** إلزامي قبل storyboard واسع.

## A06 — Storyboard Agent

**المهمة:** توليد frames للمشاهد بناءً على visual bible.  
**المدخلات:** scene + visual_bible + shot hints.  
**المخرجات:** storyboard + frames + consistency score + provenance links.  
**الاعتماد:** مطلوب عند اعتماد المرجع التنفيذي.

## A07 — Shot Planner Agent

**المهمة:** تحويل scene/storyboard إلى shot list قابلة للتنفيذ.  
**المدخلات:** scene + storyboard + coverage goals + production constraints.  
**المخرجات:** shots[] + coverage matrix + missing coverage + blocking hints.  
**الاعتماد:** مطلوب قبل الجدولة.

## A08 — Previs Video Agent

**المهمة:** توليد previs clip قصير من storyboard وshot list.  
**المدخلات:** approved storyboard + approved shotlist + duration + aspect ratio.  
**المخرجات:** previs assets + mapping + generation notes.  
**قيد:** prompt to video provider يُبنى داخليًا من بنية عربية موحدة.

## A09 — Scheduling Agent

**المهمة:** إنشاء schedule versions منطقية من breakdown والقيود.  
**المدخلات:** scenes + shotlists + cast/location constraints.  
**المخرجات:** schedule version + conflicts + optimization explanation.  
**الاعتماد:** إلزامي قبل call sheet.

## A10 — Call Sheet Agent

**المهمة:** إنشاء call sheet يومية.  
**المدخلات:** shooting day + approved schedule + template + logistics.  
**المخرجات:** call sheet + crew calls + cast calls + notes + risks.  
**الاعتماد:** إلزامي قبل النشر.

## A11 — Live Voice Copilot

**المهمة:** دعم المخرج أو الفريق بالصوت الحي وجمع الملاحظات.  
**المدخلات:** live audio/text + current scene context.  
**المخرجات:** live responses + structured notes + action items + linkages.  
**خصائص:** low latency / interruption support / context retrieval.

## A12 — Transcription Agent

**المهمة:** تفريغ التسجيلات مع speaker diarization.  
**المدخلات:** audio recording + language hints + diarization flag.  
**المخرجات:** transcript + segments + speaker map + confidence summary.  
**سياسة التنفيذ:** chunking / streaming / normalization.

## A13 — Continuity Agent

**المهمة:** كشف انكسارات الاستمرارية بين النص والخطة والتنفيذ.  
**المدخلات:** baselines + storyboard + shotlist + takes + notes + transcripts.  
**المخرجات:** issues[] + impacted entities + severity + suggestions.  
**الاعتماد:** الوكيل يرفع flags فقط، والحسم بشري.

## A14 — Dailies QA Agent

**المهمة:** مراجعة اليوم المصور واكتشاف النواقص والمرشحين الأفضل.  
**المدخلات:** takes + transcripts + expected shots/scenes + notes.  
**المخرجات:** dailies report + missing items + best takes + editor notes.

## A15 — Editorial Handoff Agent

**المهمة:** إنتاج handoff منظم للمونتاج.  
**المدخلات:** selected takes + notes + transcripts + scene mappings.  
**المخرجات:** OTIO package + related assets + warnings.

## A16 — Search Librarian Agent

**المهمة:** إدارة الفهرسة والاسترجاع وإرجاع النتائج مع مراجع داخلية.  
**المدخلات:** query + filters + project scope.  
**المخرجات:** ranked hits + snippets + source refs.

## A17 — Provenance & Approval Agent

**المهمة:** إدارة الموافقات والتحقق من provenance للأصول الحساسة.  
**المدخلات:** object metadata + policy + provenance data.  
**المخرجات:** approval state + blockers + verification result.

## 4. سياسات مشتركة

### 4.1 سياسة المخرجات

كل وكيل ينتج:

- `result`
- `warnings`
- `citations/source_refs` متى كان ذلك منطقيًا داخل المشروع
- `approval_required`
- `next_actions`

### 4.2 سياسة السجل

كل تشغيل يسجل:

- workflow_run
- agent_run
- tool_invocations
- provider/model
- prompt_version
- schema_version
- latency
- cost
- final status

### 4.3 سياسة الاعتماد

- breakdown -> director/AD
- visual_bible -> director
- storyboard -> director
- shotlist -> director
- schedule -> director + AD/producer
- call_sheet -> AD + producer
- editorial export -> director/editor

## 5. مخطط الـworkflows

## WF-001 — Script Intake Workflow

1. ingest file
2. extract text
3. normalize
4. create script version
5. optional parse
6. notify user

## WF-002 — Script To Scenes Workflow

1. fetch script_version
2. scene parse
3. persist scenes
4. build cards
5. index knowledge
6. request review if needed

## WF-003 — Scene Breakdown Workflow

1. load scene
2. extract entities
3. classify risks
4. validate schema
5. save breakdown
6. raise approval request

## WF-004 — Visual Development Workflow

1. select scene set / project scope
2. create visual bible
3. request approval
4. generate storyboard
5. persist provenance
6. request approval

## WF-005 — Shot Planning Workflow

1. load scene + storyboard
2. generate shot list
3. run coverage checks
4. save result
5. request approval

## WF-006 — Scheduling Workflow

1. load approved artifacts
2. generate schedule version
3. detect conflicts
4. save schedule
5. request approval

## WF-007 — Daily Execution Workflow

1. create realtime session
2. capture recordings
3. transcribe/diarize
4. link notes/takes
5. continuity check
6. dailies QA

## WF-008 — Editorial Handoff Workflow

1. collect selected takes
2. attach notes/transcripts
3. create OTIO package
4. render proxies if needed
5. generate bundle
6. request final approval

## 6. جودة الوكلاء

### 6.1 مقاييس عامة

- schema validity rate
- human approval rate
- correction delta after approval
- latency by workflow
- retry frequency
- failure reasons by provider

### 6.2 مقاييس خاصة

- parser: scene segmentation accuracy
- breakdown: entity recall/precision
- shot planner: coverage completeness
- continuity: false positive / false negative rate
- search: click-through and citation usefulness
- transcription: word accuracy + speaker accuracy

## 7. سياسات الـprompt والـschema

1. كل وكيل يملك `prompt_version`.
2. كل schema لها `schema_version`.
3. أي تغيير في output structure يتطلب version bump.
4. prompts لا تكتب حرة داخل الكود؛ بل عبر registry.

## 8. سياسة الأدوات

كل وكيل يرى فقط الأدوات اللازمة له.
هذا يقلل:

- المخاطر
- التكاليف
- أخطاء الاستخدام
- التصرّف خارج النطاق

## 9. القرار التنفيذي

المنصة يجب أن تبنى كمنظومة **وكلاء تخصصيين منسقين**، لا كمساعد واحد عام.  
هذا يجعلها:

- أكثر قابلية للاختبار
- أكثر قابلية للحوكمة
- أكثر ملاءمة للإنتاج الفعلي
- أسهل في استبدال المزوّدات والنماذج
