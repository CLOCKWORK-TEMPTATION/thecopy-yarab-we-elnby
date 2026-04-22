# Director Copilot Arabic — MVP Backend Runtime Pack

هذه الحزمة لم تعد مجرد scaffold نظري؛ بل أصبحت تحتوي على **Backend MVP فعلي قابل للتشغيل محليًا** مع قاعدة بيانات تشغيلية افتراضية على SQLite، ويمكن لاحقًا توجيهها إلى PostgreSQL عبر متغير البيئة `DIRECTOR_COPILOT_DATABASE_URL`.

## ما الذي أصبح منفذًا الآن

داخل `backend/app/` تم تنفيذ ما يلي فعليًا:

- تهيئة FastAPI وتشغيل قاعدة البيانات تلقائيًا عند الإقلاع.
- bootstrap افتراضي لمنظمة وWorkspace.
- طبقة persistence فعلية عبر SQLAlchemy 2.
- نماذج تشغيلية لعدد كبير من الكيانات الأساسية.
- Action Endpoints حقيقية للخطوط الأولى من المنتج.
- Workflows محفوظة في قاعدة البيانات مع event log.
- حفظ الملفات محليًا داخل `backend/storage/`.
- parser أولي للنصوص العربية لاستخراج المشاهد.
- توليد breakdown تشغيلي أولي.
- توليد schedule version وcall sheet أولية.
- توليد visual bible وstoryboard placeholders وshot list وprevis plan.
- إنشاء جلسات realtime placeholder.
- إنشاء recording وربط transcript أولي.
- بحث موحد داخل المشروع.
- Editorial export بصيغة OTIO-like JSON.
- Approval flow أساسي.
- فحص provenance مبدئي.

## البنية الحالية

```text
director_copilot_arabic/
  README.md
  docs/
  db/
    001_init_director_copilot.sql
    002_mvp_runtime_support.sql
  api/
    openapi.yaml
  backend/
    requirements.txt
    director_copilot.db        # يُنشأ تلقائيًا عند التشغيل
    storage/                   # أصول مرفوعة ومولدة محليًا
    exports/                   # OTIO-like exports
    tests/
      smoke_test.py
    app/
      main.py
      schemas.py
      models.py
      core/
        config.py
        database.py
        deps.py
      routers/
        projects.py
        scripts.py
        scenes.py
        schedules.py
        realtime.py
        recordings.py
        continuity.py
        approvals.py
        search.py
        editorial.py
        workflows.py
      services/
        agent_registry.py
        storage.py
        workflow_service.py
        script_parser.py
        creative_service.py
        schedule_service.py
        continuity_service.py
        search_service.py
        editorial_service.py
```

## التشغيل السريع

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

ثم افتح:

```text
http://127.0.0.1:8000/api/v1/docs
```

## الإعدادات

أهم الإعدادات عبر متغيرات البيئة:

- `DIRECTOR_COPILOT_DATABASE_URL`
- `DIRECTOR_COPILOT_STORAGE_DIR`
- `DIRECTOR_COPILOT_EXPORT_DIR`
- `DIRECTOR_COPILOT_DEFAULT_WORKSPACE_SLUG`

إذا لم تُضبط هذه القيم، سيستخدم النظام إعدادات محلية افتراضية مناسبة للتجربة.

## اختبار دخاني سريع

```bash
cd backend
PYTHONPATH=. pytest tests/smoke_test.py
```

أو شغّل التطبيق وابدأ من `/api/v1/docs`.

## ما الذي ما زال Placeholder أو يحتاج ربطًا خارجيًا

هذه النسخة **MVP تشغيلية** لكنها ليست كاملة إنتاجيًا بعد. ما يزال يحتاج ربطًا فعليًا في المراحل التالية:

- PostgreSQL production configuration بدل SQLite المحلي.
- Alembic migrations كاملة.
- Object storage خارجي بدل التخزين المحلي.
- Temporal workers بدل background tasks داخل نفس العملية.
- مزودي النماذج الفعليين لـ OpenAI / Google.
- تفريغ صوتي حقيقي للملفات الصوتية بدل fallback النصي الحالي.
- FFmpeg / OTIO library integration الكامل.
- Auth / RBAC production-grade.
- C2PA verification فعلي بدل السجل الداخلي المبدئي.

## ملاحظات تنفيذية مهمة

- `scripts:upload` يدعم حاليًا قراءة TXT وPDF وDOCX.
- parser الحالي heuristic ومقصود به تشغيل الـMVP بسرعة، وليس محلل إنتاج نهائي.
- storyboards تُولد كملفات SVG placeholder محلية قابلة للاستبدال لاحقًا بمولد صور حقيقي.
- previs الحالية هي خطة JSON قابلة للتوسعة عند دمج Veo أو مزود فيديو فعلي.
- Workflows تُحفظ في قاعدة البيانات ويمكن تتبعها عبر:
  - `/api/v1/workflows/{id}`
  - `/api/v1/workflows/{id}/events`

## الخطوة المنطقية التالية

بعد هذه المرحلة، يصبح المسار التالي هو:

1. إدخال Alembic + PostgreSQL production profile.
2. فصل الـservices إلى repository + domain layer.
3. إضافة auth / users / memberships حقيقية.
4. استبدال background tasks بـ Temporal.
5. ربط مزودي الذكاء الاصطناعي واحدًا واحدًا.
6. بناء واجهة Frontend على Next.js فوق هذه الـAPI.
