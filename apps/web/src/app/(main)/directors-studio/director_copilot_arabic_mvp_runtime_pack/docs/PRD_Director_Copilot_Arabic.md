# وثيقة PRD تفصيلية

## Director Copilot Arabic

### تاريخ المرجع: 28 مارس 2026

### الإصدار: 1.0

## 1. تعريف المنتج

**اسم العمل:** Director Copilot Arabic  
**نوع المنتج:** منصة ويب احترافية لإدارة العمل الإخراجي والفني للأفلام والمسلسلات العربية  
**المنصات:** Web Desktop-first مع دعم ميداني responsive  
**المستخدمون الأساسيون:** المخرج، المساعد الأول، الـScript Supervisor، المنتج الإبداعي، مدير الفن، المونتير، مدير اللوكيشن، فريق الإنتاج

المنصة ليست “مخرجًا آليًا” بل **مساعدًا إخراجيًا ذكيًا** يربط النص والرؤية البصرية والتنفيذ اليومي والتسليم التحريري في منظومة واحدة قابلة للتتبع والاعتماد.

## 2. الرؤية

تحويل النصوص والملاحظات والتسجيلات والأصول البصرية من ملفات متفرقة إلى **نظام معرفة حي** حول المشروع، بحيث يصبح القرار الإخراجي:

- قابلاً للصياغة البنيوية
- قابلاً للمراجعة البشرية
- قابلاً للتتبع زمنيًا
- قابلاً للبحث والاسترجاع
- قابلاً للتحويل إلى إجراءات تنفيذية مباشرة

## 3. المشكلة

داخل الإنتاج العربي، تتوزع المعرفة عادة بين:

- نسخ سيناريو متعددة
- تسجيلات صوتية وملاحظات واتساب
- جداول منفصلة عن الرؤية البصرية
- ملاحظات استمرارية غير موحّدة
- أوراق نداء تُكتب يدويًا وتتكرر أخطاؤها
- صعوبة في استرجاع: أين ظهر هذا الزي؟ ما آخر تعليمات المخرج؟ هل غطينا المشهد كفاية؟

## 4. الأهداف

### 4.1 أهداف المنتج

1. تسريع تفكيك السيناريو وبناء الـscene breakdown.
2. تقليل أخطاء الاستمرارية ونقص الـcoverage.
3. تسريع إعداد الـshot list والجدول وورقة النداء.
4. جعل الرؤية البصرية قابلة للتوليد والمراجعة والاعتماد.
5. توفير طبقة بحث موحّدة عبر النصوص والتسجيلات والأصول.

### 4.2 أهداف العمل

1. تقليل زمن التحضير قبل التصوير.
2. تقليل تكلفة إعادة التصوير الناتجة عن النقص أو الالتباس.
3. زيادة وضوح التواصل بين المخرج والفريق الإبداعي والتنفيذي.

## 5. مؤشرات النجاح

- خفض زمن الـscript breakdown الأولي بنسبة 60–80%.
- توليد shot list أولية خلال أقل من 20 دقيقة من اعتماد نسخة النص.
- توليد call sheet أولية خلال أقل من 10 دقائق من اعتماد schedule version.
- استرجاع نتائج البحث داخل المشروع خلال أقل من 5 ثوانٍ.
- تقليل عدد مشاكل الاستمرارية المكتشفة بعد التصوير مقارنة بخط الأساس.
- وصول نسبة اعتماد المخرجات المولدة يدويًا إلى أكثر من 70% بعد فترة التهيئة.

## 6. ما ليس ضمن النطاق

1. استبدال المخرج أو اتخاذ القرار الإبداعي النهائي بدلاً منه.
2. إدارة الرواتب والحسابات والميزانيات.
3. إدارة Pipeline VFX كاملة.
4. المونتاج النهائي الآلي.
5. تدريب نموذج تأسيسي من الصفر.
6. استبدال أنظمة MAM أو DAM الاحترافية بالكامل.

## 7. المستخدمون

### 7.1 المخرج

يحتاج:

- تحليلًا سريعًا للمشهد
- اقتراحات shot list
- مساعدًا صوتيًا حيًا
- تتبعًا للرؤية عبر المشروع

### 7.2 المساعد الأول

يحتاج:

- schedule منطقيًا
- call sheet يومية
- كشف التعارضات
- صورة واضحة للقيود اليومية

### 7.3 Script Supervisor

يحتاج:

- continuity tracking
- ربط الملاحظات بالتيكات
- بحثًا سريعًا عبر النسخ والتسجيلات

### 7.4 المنتج الإبداعي أو المنفذ

يحتاج:

- تقارير حالة العمل
- نظام موافقات
- traceability كامل

### 7.5 المونتير

يحتاج:

- handoff منظم
- ملاحظات مرتبطة بالشوتات والتيكات
- OTIO export
- تقارير dailies

## 8. رحلة المنتج

### 8.1 قبل التصوير

1. إنشاء المشروع
2. رفع النص
3. إنشاء نسخة نصية versioned
4. parsing للمشاهد
5. scene breakdown
6. visual bible
7. storyboard
8. shot list
9. schedule
10. call sheet

### 8.2 أثناء التصوير

1. تشغيل voice copilot
2. تسجيل البروفات والملاحظات
3. تفريغ التسجيلات وتمييز المتحدثين
4. ربط الملاحظات بالتيكات والشوتات
5. تتبع الاستمرارية

### 8.3 بعد التصوير

1. dailies QA
2. كشف النواقص
3. handoff للمونتاج
4. OTIO export
5. البحث في كل محتوى المشروع

## 9. الإصدارات

### الإصدار A — MVP

- projects / scripts / versions
- scene parsing
- scene breakdown
- entities extraction
- visual bible نصي وصوري
- shot list draft
- schedule draft
- call sheet draft
- approvals
- audit log
- unified search

### الإصدار B

- realtime voice copilot
- transcription + diarization
- continuity engine
- take linking
- dailies QA

### الإصدار C

- advanced storyboard generation
- previs clips
- OTIO export
- proxy rendering
- provenance verification UI

## 10. المتطلبات الوظيفية

## 10.1 النص والسيناريو

- FR-001 رفع نص بصيغ PDF / DOCX / TXT
- FR-002 إنشاء script_version مع hash وmetadata
- FR-003 parsing إلى scenes / episodes / beats
- FR-004 استخراج الكيانات التشغيلية: cast / props / wardrobe / VFX / SFX / minors / animals / vehicles
- FR-005 التصحيح اليدوي لأي مخرجات
- FR-006 stable_scene_key لتتبع المشهد عبر النسخ
- FR-007 scene cards قابلة للفرز والفلترة
- FR-008 dialect tags للمشهد والشخصية والحوار
- FR-009 project bible نصي

## 10.2 التطوير البصري

- FR-010 Visual Style Manifest
- FR-011 moodboards وlookbooks
- FR-012 character boards
- FR-013 storyboards
- FR-014 iterative edits على frames
- FR-015 provenance record للأصول المولدة

## 10.3 التخطيط الإخراجي

- FR-016 توليد shot list بنيوية
- FR-017 coverage matrix
- FR-018 blocking hints
- FR-019 camera/audio intent
- FR-020 تحرير واعتماد الـshot list

## 10.4 الجدولة والتنفيذ

- FR-021 schedule generation
- FR-022 مقارنة نسخ الجداول
- FR-023 shooting day entities
- FR-024 call sheet generation
- FR-025 manual overrides
- FR-026 conflict detection

## 10.5 الزمن الحقيقي والصوت

- FR-027 realtime session
- FR-028 التقاط الملاحظات الصوتية
- FR-029 rehearsal recording
- FR-030 transcription + diarization
- FR-031 take linking
- FR-032 action extraction

## 10.6 الاستمرارية والديلز

- FR-033 continuity baselines
- FR-034 continuity reports
- FR-035 dailies QA
- FR-036 missing coverage alerts

## 10.7 البحث والتسليم

- FR-037 search everything
- FR-038 OTIO export
- FR-039 proxy rendering
- FR-040 search citations داخل المشروع

## 10.8 الحوكمة

- FR-041 RBAC
- FR-042 approval workflows
- FR-043 audit log
- FR-044 provider policy
- FR-045 provenance verification
- FR-046 integrations layer

## 11. المتطلبات غير الوظيفية

- NFR-001 بنية متعددة المزوّدات للنماذج
- NFR-002 Schema-first لجميع المخرجات المؤثرة
- NFR-003 Durable async workflows
- NFR-004 فصل الوسائط الكبيرة عن قاعدة البيانات
- NFR-005 عزل المستأجرين
- NFR-006 عربية أولًا + RTL + dialect-aware
- NFR-007 p95 للعمليات العادية أقل من 400ms
- NFR-008 traceability كامل
- NFR-009 provenance by default للأصول المولدة
- NFR-010 hybrid search: FTS + vector

## 12. قيود وسياسات

1. القرار النهائي للمخرج أو المخوّل البشري فقط.
2. أي artifact تشغيلي مهم يمر على approval.
3. أي أصل بصري أو صوتي مولد يُسجل مع model/provider/prompt/version.
4. أي workflow طويل ينفذ كـ async job.
5. لا تعتمد المنصة على مزود واحد للنماذج.

## 13. بنية المنتج

### 13.1 الواجهة

- Dashboard
- Workspace shell
- Project workspace
- Script navigator
- Scene board
- Storyboard wall
- Shot planner
- Schedule board
- Call sheet viewer
- Voice console
- Search panel
- Approval drawer
- Audit panel

### 13.2 الخدمات

- API gateway
- auth & RBAC
- project service
- script service
- asset service
- search service
- workflow service
- approvals service
- provenance service
- provider router
- media service

### 13.3 البنية الخلفية

- FastAPI
- PostgreSQL
- pgvector
- object storage
- Temporal
- FFmpeg
- OTIO
- provider adapters

## 14. بنية البيانات المنطقية

الكيانات الأساسية:

- workspace
- project
- episode
- script
- script_version
- scene
- scene_breakdown
- character / location / prop / wardrobe
- visual_bible
- storyboard / storyboard_frame
- shotlist / shot
- schedule_version / schedule_entry / shooting_day
- call_sheet / call_sheet_item
- recording / transcript / transcript_segment
- take
- continuity_track / continuity_event
- asset / asset_version / provenance_record
- workflow_run / agent_run / tool_invocation
- approval_request / approval_step
- knowledge_document / knowledge_chunk
- audit_log

## 15. الحوكمة

### 15.1 مستويات الاعتماد

- Draft
- In Review
- Approved
- Rejected
- Changes Requested

### 15.2 الكيانات التي تتطلب اعتمادًا

- visual bible
- storyboard النهائي
- shot list المعتمدة
- schedule version
- call sheet
- previs exports
- editorial exports

### 15.3 التتبع

يجب تخزين:

- من أنشأ
- متى
- بأي نموذج
- بأي نسخة prompt/schema
- من اعتمد
- ما التعديلات اللاحقة

## 16. المخاطر

### 16.1 هلوسة أو parsing غير دقيق

المعالجة:

- structured outputs
- validators
- manual review
- diff view

### 16.2 اختلافات اللغة واللهجة

المعالجة:

- custom lexicon
- dialect tags
- overrides بشرية
- hybrid search

### 16.3 الاعتماد على مزود واحد

المعالجة:

- provider adapters
- capability matrix
- routing policy

### 16.4 انقطاع الأعمال الطويلة

المعالجة:

- Temporal
- retries
- resume semantics

### 16.5 provenance غير واضح

المعالجة:

- provenance service
- signature verification
- human approvals

## 17. خارطة الطريق التقنية

### المرحلة 1

- data model
- auth
- projects
- scripts
- parsing
- breakdown
- search
- approvals

### المرحلة 2

- visual bible
- storyboard
- shot list
- schedule
- call sheets

### المرحلة 3

- realtime voice
- transcription
- continuity
- dailies

### المرحلة 4

- previs
- OTIO export
- proxy rendering
- provenance UI

## 18. معايير القبول العليا

1. يستطيع المستخدم رفع نص وإنشاء نسخة قابلة للتحليل.
2. يستطيع المستخدم رؤية المشاهد ككيانات مستقلة وتحريرها.
3. يستطيع النظام إنتاج breakdown ثم shot list ثم schedule ثم call sheet.
4. يستطيع الفريق البحث في المشروع كله من مكان واحد.
5. يستطيع النظام تشغيل workflows طويلة ومراجعة نتائجها لاحقًا.
6. لا تمر المخرجات الحساسة من دون approval.
7. كل أصل مولد يبقى traceable.

## 19. القرار التنفيذي

الأولوية التنفيذية ليست بناء chatbot، بل بناء **منصة عمليات إخراجية** قائمة على:

- عقود بنيوية
- workflows قابلة للاستئناف
- سجل اعتماد
- معرفة قابلة للبحث
- تعددية في مزودي الذكاء الاصطناعي

هذا هو الأساس الصحيح لكي يعمل المنتج داخل إنتاج عربي فعلي.
