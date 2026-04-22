# دليل قاعدة البيانات — Database Guide

**آخر تحديث:** 2026-03-30
**المشروع:** The Copy — منصة تحليل السيناريوهات السينمائية

---

## نظرة عامة

يستخدم المشروع ثلاث قواعد بيانات مختلفة لأغراض متباينة، إضافة إلى قاعدة بيانات متجهات (Vector DB) لنظام الذاكرة الدلالية.

| قاعدة البيانات | الدور | ORM / مكتبة الوصول | الإصدار |
|---|---|---|---|
| PostgreSQL (Neon Serverless) | قاعدة البيانات الرئيسية — المستخدمون، المشاريع، المشاهد | Drizzle ORM `^0.45.1` | PostgreSQL 15+ |
| Redis | الكاش، قوائم المهام (BullMQ)، الجلسات | `redis` `^5.10.0` | Redis >= 5.0.0 |
| Weaviate | قاعدة بيانات المتجهات — نظام الذاكرة الدلالية | `weaviate-client` `^3.5.0` | Weaviate v3 |
| MongoDB | مُثبَّت في `package.json` (`^7.0.0`)، لا يُستخدم حالياً في الكود | — | — |

> **ملاحظة بشأن MongoDB:** الحزمة موجودة في `package.json` وتشمل الـ instrumentation في OpenTelemetry، لكن لا يوجد كود استخدام فعلي في `src/`. يُحتمل أنها محجوزة لاستخدام مستقبلي أو أثر من تبعية غير مباشرة.

---

## PostgreSQL (Neon Serverless)

### إعداد الاتصال

**الملف:** `apps/backend/src/db/index.ts`

- **المكتبة:** `@neondatabase/serverless` مع `drizzle-orm/neon-serverless`
- **WebSocket:** يستخدم `ws` لدعم بروتوكول WebSocket في بيئة Node.js (مطلوب لـ Neon)
- **Connection Pool:**
  - الحد الأقصى للاتصالات: **20**
  - مهلة الخمول: **30 ثانية**
  - مهلة الاتصال: **60 ثانية** (لاستيعاب Cold Start في Neon)

متغيرات البيئة المطلوبة:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

---

### مخطط ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    users {
        varchar id PK "gen_random_uuid()"
        varchar email UK "NOT NULL, max 255"
        text password_hash "NOT NULL"
        varchar first_name "max 100"
        varchar last_name "max 100"
        varchar profile_image_url "max 500"
        boolean mfa_enabled "DEFAULT false"
        text mfa_secret
        text auth_verifier_hash "للمصادقة ZK"
        text kdf_salt "ملح اشتقاق المفتاح"
        text public_key "المفتاح العام (اختياري)"
        timestamp created_at "DEFAULT NOW()"
        timestamp updated_at "DEFAULT NOW()"
        timestamp last_login
        varchar account_status "DEFAULT active, max 50"
    }

    refresh_tokens {
        varchar id PK "gen_random_uuid()"
        varchar user_id FK "NOT NULL → users.id CASCADE"
        text token UK "NOT NULL"
        timestamp expires_at "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
    }

    sessions {
        varchar sid PK
        jsonb sess "NOT NULL"
        timestamp expire "NOT NULL"
    }

    projects {
        varchar id PK "gen_random_uuid()"
        text title "NOT NULL"
        text script_content
        varchar user_id FK "→ users.id CASCADE"
        timestamp created_at "DEFAULT NOW()"
        timestamp updated_at "DEFAULT NOW()"
    }

    scenes {
        varchar id PK "gen_random_uuid()"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        integer scene_number "NOT NULL"
        text title "NOT NULL"
        text location "NOT NULL"
        text time_of_day "NOT NULL"
        jsonb characters "NOT NULL, string[]"
        text description
        integer shot_count "DEFAULT 0"
        text status "DEFAULT planned"
    }

    characters {
        varchar id PK "gen_random_uuid()"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        text name "NOT NULL"
        integer appearances "DEFAULT 0"
        text consistency_status "DEFAULT good"
        text last_seen
        text notes
    }

    shots {
        varchar id PK "gen_random_uuid()"
        varchar scene_id FK "NOT NULL → scenes.id CASCADE"
        integer shot_number "NOT NULL"
        text shot_type "NOT NULL"
        text camera_angle "NOT NULL"
        text camera_movement "NOT NULL"
        text lighting "NOT NULL"
        text ai_suggestion
    }

    breakdown_reports {
        varchar id PK "gen_random_uuid()"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        text title "NOT NULL"
        text summary "DEFAULT ''"
        jsonb warnings "string[], DEFAULT []"
        integer total_scenes "DEFAULT 0"
        integer total_pages "DEFAULT 0"
        integer total_estimated_shoot_days "DEFAULT 0"
        jsonb report_data "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
        timestamp updated_at "DEFAULT NOW()"
    }

    scene_breakdowns {
        varchar id PK "gen_random_uuid()"
        varchar report_id FK "NOT NULL → breakdown_reports.id CASCADE"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        varchar scene_id FK "NOT NULL → scenes.id CASCADE"
        integer scene_number "NOT NULL"
        text header "NOT NULL"
        text content "NOT NULL"
        jsonb header_data "NOT NULL"
        jsonb analysis "NOT NULL"
        jsonb scenarios "NOT NULL"
        varchar source "DEFAULT ai, max 20"
        varchar status "DEFAULT completed, max 50"
        jsonb warnings "string[], DEFAULT []"
        timestamp created_at "DEFAULT NOW()"
        timestamp updated_at "DEFAULT NOW()"
    }

    scene_header_metadata {
        varchar id PK "gen_random_uuid()"
        varchar report_id FK "NOT NULL → breakdown_reports.id CASCADE"
        varchar scene_breakdown_id FK "NOT NULL → scene_breakdowns.id CASCADE"
        varchar scene_id FK "NOT NULL → scenes.id CASCADE"
        text raw_header "NOT NULL"
        varchar scene_type "NOT NULL, max 20"
        text location "NOT NULL"
        varchar time_of_day "NOT NULL, max 20"
        integer page_count "DEFAULT 1"
        integer story_day "DEFAULT 1"
        timestamp created_at "DEFAULT NOW()"
    }

    shooting_schedules {
        varchar id PK "gen_random_uuid()"
        varchar report_id FK "NOT NULL → breakdown_reports.id CASCADE"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        integer day_number "NOT NULL"
        text location "NOT NULL"
        varchar time_of_day "NOT NULL, max 20"
        jsonb scene_ids "NOT NULL, string[]"
        integer estimated_hours "DEFAULT 0"
        integer total_pages "DEFAULT 0"
        jsonb payload "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
    }

    breakdown_exports {
        varchar id PK "gen_random_uuid()"
        varchar report_id FK "NOT NULL → breakdown_reports.id CASCADE"
        varchar format "NOT NULL, max 20"
        text payload "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
    }

    breakdown_jobs {
        varchar id PK "gen_random_uuid()"
        varchar project_id FK "NOT NULL → projects.id CASCADE"
        varchar scene_id FK "→ scenes.id CASCADE"
        varchar report_id FK "→ breakdown_reports.id SET NULL"
        varchar job_type "NOT NULL, max 50"
        varchar status "DEFAULT running, max 50"
        text error_message
        timestamp started_at "DEFAULT NOW()"
        timestamp finished_at
    }

    recovery_artifacts {
        varchar id PK "gen_random_uuid()"
        varchar user_id FK "NOT NULL → users.id CASCADE"
        text encrypted_recovery_artifact "NOT NULL"
        text iv "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
        timestamp updated_at "DEFAULT NOW()"
    }

    encrypted_documents {
        varchar id PK "gen_random_uuid()"
        varchar user_id FK "NOT NULL → users.id CASCADE"
        text ciphertext "NOT NULL"
        text iv "NOT NULL"
        text auth_tag "NOT NULL"
        text wrapped_dek "NOT NULL"
        text wrapped_dek_iv "NOT NULL"
        integer version "DEFAULT 1"
        integer ciphertext_size "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
        timestamp last_modified "DEFAULT NOW()"
    }

    users ||--o{ refresh_tokens : "يملك"
    users ||--o{ projects : "يملك"
    users ||--o{ recovery_artifacts : "يملك"
    users ||--o{ encrypted_documents : "يملك"
    projects ||--o{ scenes : "يحتوي"
    projects ||--o{ characters : "يحتوي"
    projects ||--o{ breakdown_reports : "يحتوي"
    projects ||--o{ shooting_schedules : "يحتوي"
    projects ||--o{ breakdown_jobs : "يحتوي"
    scenes ||--o{ shots : "يحتوي"
    scenes ||--o{ scene_breakdowns : "يُحلَّل في"
    scenes ||--o{ scene_header_metadata : "يُفصَّل في"
    breakdown_reports ||--o{ scene_breakdowns : "يحتوي"
    breakdown_reports ||--o{ scene_header_metadata : "يحتوي"
    breakdown_reports ||--o{ shooting_schedules : "يولِّد"
    breakdown_reports ||--o{ breakdown_exports : "يُصدَّر في"
    breakdown_reports ||--|o breakdown_jobs : "يُنشئ"
    scene_breakdowns ||--o{ scene_header_metadata : "يُفصَّل في"
```

---

### تفاصيل الجداول

#### جدول `users`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تخزين بيانات المستخدمين مع دعم MFA والمصادقة Zero-Knowledge.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | البريد الإلكتروني |
| `password_hash` | `text` | NOT NULL | كلمة المرور المشفرة |
| `first_name` | `varchar(100)` | — | الاسم الأول |
| `last_name` | `varchar(100)` | — | الاسم الأخير |
| `profile_image_url` | `varchar(500)` | — | رابط الصورة الشخصية |
| `mfa_enabled` | `boolean` | DEFAULT `false`, NOT NULL | تفعيل المصادقة الثنائية |
| `mfa_secret` | `text` | — | سر TOTP لـ MFA |
| `auth_verifier_hash` | `text` | — | هاش المُحقق لمصادقة ZK |
| `kdf_salt` | `text` | — | ملح اشتقاق المفتاح (Key Derivation) |
| `public_key` | `text` | — | المفتاح العام للمشاركة |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `updated_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |
| `last_login` | `timestamp` | — | آخر تسجيل دخول |
| `account_status` | `varchar(50)` | DEFAULT `'active'`, NOT NULL | حالة الحساب |

**الفهارس:** لا توجد فهارس إضافية (البريد الإلكتروني يحمل فهرس UNIQUE ضمني).

---

#### جدول `refresh_tokens`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تخزين Refresh Tokens لنظام تدوير JWT.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `user_id` | `varchar` | FK → `users.id` CASCADE, NOT NULL | معرف المستخدم |
| `token` | `text` | UNIQUE, NOT NULL | قيمة الـ Token |
| `expires_at` | `timestamp` | NOT NULL | تاريخ انتهاء الصلاحية |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |

**الفهارس:**
- `idx_refresh_tokens_user_id` على `user_id`
- `idx_refresh_tokens_token` على `token`
- `idx_refresh_tokens_expires_at` على `expires_at`

---

#### جدول `sessions`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تخزين جلسات Express (connect-pg-simple أو ما يعادله).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `sid` | `varchar` | PK | معرف الجلسة |
| `sess` | `jsonb` | NOT NULL | بيانات الجلسة كـ JSON |
| `expire` | `timestamp` | NOT NULL | تاريخ انتهاء الجلسة |

**الفهارس:**
- `IDX_session_expire` على `expire`

---

#### جدول `projects`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** مشاريع Directors Studio — كل مشروع يمثل سيناريو سينمائياً.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `title` | `text` | NOT NULL | عنوان المشروع |
| `script_content` | `text` | — | محتوى السيناريو |
| `user_id` | `varchar` | FK → `users.id` CASCADE | معرف المالك |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `updated_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |

**الفهارس:**
- `idx_projects_user_id` على `user_id`
- `idx_projects_created_at` على `created_at`
- `idx_projects_user_created` (مركّب) على `(user_id, created_at)` — الاستعلام الأكثر شيوعاً
- `idx_projects_id_user` (مركّب) على `(id, user_id)` — للتحقق من الملكية

---

#### جدول `scenes`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** مشاهد السيناريو داخل المشروع.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع الأب |
| `scene_number` | `integer` | NOT NULL | رقم المشهد |
| `title` | `text` | NOT NULL | عنوان المشهد |
| `location` | `text` | NOT NULL | الموقع |
| `time_of_day` | `text` | NOT NULL | وقت اليوم (DAY/NIGHT...) |
| `characters` | `jsonb` | NOT NULL, `string[]` | قائمة أسماء الشخصيات |
| `description` | `text` | — | وصف المشهد |
| `shot_count` | `integer` | DEFAULT `0`, NOT NULL | عدد اللقطات |
| `status` | `text` | DEFAULT `'planned'`, NOT NULL | حالة المشهد |

**الفهارس:**
- `idx_scenes_project_id` على `project_id`
- `idx_scenes_project_number` (مركّب) على `(project_id, scene_number)`
- `idx_scenes_id_project` (مركّب) على `(id, project_id)` — للتحقق من الملكية
- `idx_scenes_project_status` (مركّب) على `(project_id, status)`

---

#### جدول `characters`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** الشخصيات في المشروع مع تتبع الاتساق.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع الأب |
| `name` | `text` | NOT NULL | اسم الشخصية |
| `appearances` | `integer` | DEFAULT `0`, NOT NULL | عدد مرات الظهور |
| `consistency_status` | `text` | DEFAULT `'good'`, NOT NULL | حالة الاتساق |
| `last_seen` | `text` | — | آخر مشهد ظهرت فيه |
| `notes` | `text` | — | ملاحظات على الشخصية |

**الفهارس:**
- `idx_characters_project_id` على `project_id`
- `idx_characters_id_project` (مركّب) على `(id, project_id)` — للتحقق من الملكية
- `idx_characters_project_name` (مركّب) على `(project_id, name)` — للبحث بالاسم
- `idx_characters_project_consistency` (مركّب) على `(project_id, consistency_status)`

---

#### جدول `shots`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** اللقطات (Shots) داخل كل مشهد مع خصائص الكاميرا.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `scene_id` | `varchar` | FK → `scenes.id` CASCADE, NOT NULL | المشهد الأب |
| `shot_number` | `integer` | NOT NULL | رقم اللقطة |
| `shot_type` | `text` | NOT NULL | نوع اللقطة (CU, WS...) |
| `camera_angle` | `text` | NOT NULL | زاوية الكاميرا |
| `camera_movement` | `text` | NOT NULL | حركة الكاميرا |
| `lighting` | `text` | NOT NULL | الإضاءة |
| `ai_suggestion` | `text` | — | اقتراح الذكاء الاصطناعي |

**الفهارس:**
- `idx_shots_scene_id` على `scene_id`
- `idx_shots_scene_number` (مركّب) على `(scene_id, shot_number)`
- `idx_shots_id_scene` (مركّب) على `(id, scene_id)` — للتحقق من الملكية
- `idx_shots_scene_type` (مركّب) على `(scene_id, shot_type)`

---

#### جدول `breakdown_reports`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تقارير تحليل السيناريو الشاملة (Breakdown Reports).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع |
| `title` | `text` | NOT NULL | عنوان التقرير |
| `summary` | `text` | DEFAULT `''`, NOT NULL | ملخص التقرير |
| `warnings` | `jsonb` | `string[]`, DEFAULT `[]` | قائمة التحذيرات |
| `total_scenes` | `integer` | DEFAULT `0`, NOT NULL | إجمالي المشاهد |
| `total_pages` | `integer` | DEFAULT `0`, NOT NULL | إجمالي الصفحات |
| `total_estimated_shoot_days` | `integer` | DEFAULT `0`, NOT NULL | أيام التصوير المقدرة |
| `report_data` | `jsonb` | NOT NULL | بيانات التقرير الكاملة |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `updated_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |

**الفهارس:**
- `idx_breakdown_reports_project_id` على `project_id`
- `idx_breakdown_reports_project_updated` (مركّب) على `(project_id, updated_at)`

---

#### جدول `scene_breakdowns`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تحليل مفصّل لكل مشهد داخل تقرير الـ Breakdown.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `report_id` | `varchar` | FK → `breakdown_reports.id` CASCADE, NOT NULL | التقرير الأب |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع |
| `scene_id` | `varchar` | FK → `scenes.id` CASCADE, NOT NULL | المشهد |
| `scene_number` | `integer` | NOT NULL | رقم المشهد |
| `header` | `text` | NOT NULL | رأس المشهد الخام |
| `content` | `text` | NOT NULL | محتوى التحليل |
| `header_data` | `jsonb` | NOT NULL | بيانات رأس المشهد المحللة |
| `analysis` | `jsonb` | NOT NULL | نتائج التحليل |
| `scenarios` | `jsonb` | NOT NULL | السيناريوهات المقترحة |
| `source` | `varchar(20)` | DEFAULT `'ai'`, NOT NULL | المصدر (ai/manual) |
| `status` | `varchar(50)` | DEFAULT `'completed'`, NOT NULL | حالة التحليل |
| `warnings` | `jsonb` | `string[]`, DEFAULT `[]` | تحذيرات التحليل |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `updated_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |

**الفهارس:**
- `idx_scene_breakdowns_report_id` على `report_id`
- `idx_scene_breakdowns_scene_id` على `scene_id`
- `idx_scene_breakdowns_project_scene` (مركّب) على `(project_id, scene_id)`

---

#### جدول `scene_header_metadata`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** البيانات الوصفية لرؤوس المشاهد المحللة (الموقع، نوع المشهد، وقت اليوم).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `report_id` | `varchar` | FK → `breakdown_reports.id` CASCADE, NOT NULL | التقرير الأب |
| `scene_breakdown_id` | `varchar` | FK → `scene_breakdowns.id` CASCADE, NOT NULL | تحليل المشهد الأب |
| `scene_id` | `varchar` | FK → `scenes.id` CASCADE, NOT NULL | المشهد |
| `raw_header` | `text` | NOT NULL | رأس المشهد الخام |
| `scene_type` | `varchar(20)` | NOT NULL | نوع المشهد (INT/EXT) |
| `location` | `text` | NOT NULL | الموقع |
| `time_of_day` | `varchar(20)` | NOT NULL | وقت اليوم |
| `page_count` | `integer` | DEFAULT `1`, NOT NULL | عدد صفحات المشهد |
| `story_day` | `integer` | DEFAULT `1`, NOT NULL | اليوم القصصي |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |

**الفهارس:**
- `idx_scene_header_metadata_report_id` على `report_id`
- `idx_scene_header_metadata_scene_id` على `scene_id`

---

#### جدول `shooting_schedules`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** جداول التصوير المُولَّدة من تقارير الـ Breakdown.

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `report_id` | `varchar` | FK → `breakdown_reports.id` CASCADE, NOT NULL | التقرير الأب |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع |
| `day_number` | `integer` | NOT NULL | رقم يوم التصوير |
| `location` | `text` | NOT NULL | موقع التصوير |
| `time_of_day` | `varchar(20)` | NOT NULL | وقت التصوير |
| `scene_ids` | `jsonb` | NOT NULL, `string[]` | معرفات المشاهد المجدولة |
| `estimated_hours` | `integer` | DEFAULT `0`, NOT NULL | الساعات المقدرة |
| `total_pages` | `integer` | DEFAULT `0`, NOT NULL | إجمالي الصفحات |
| `payload` | `jsonb` | NOT NULL | بيانات الجدول الكاملة |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |

**الفهارس:**
- `idx_shooting_schedules_report_id` على `report_id`
- `idx_shooting_schedules_project_day` (مركّب) على `(project_id, day_number)`

---

#### جدول `breakdown_exports`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** ملفات التصدير المُنشأة من التقارير (PDF، CSV، إلخ).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `report_id` | `varchar` | FK → `breakdown_reports.id` CASCADE, NOT NULL | التقرير الأب |
| `format` | `varchar(20)` | NOT NULL | صيغة التصدير (pdf/csv/json) |
| `payload` | `text` | NOT NULL | محتوى الملف المُصدَّر |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |

**الفهارس:**
- `idx_breakdown_exports_report_id` على `report_id`

---

#### جدول `breakdown_jobs`

**الملف:** `apps/backend/src/db/schema.ts`
**الغرض:** تتبع مهام التحليل في الخلفية (مرتبطة بـ BullMQ Redis).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `project_id` | `varchar` | FK → `projects.id` CASCADE, NOT NULL | المشروع |
| `scene_id` | `varchar` | FK → `scenes.id` CASCADE | المشهد (اختياري) |
| `report_id` | `varchar` | FK → `breakdown_reports.id` SET NULL | التقرير (اختياري) |
| `job_type` | `varchar(50)` | NOT NULL | نوع المهمة |
| `status` | `varchar(50)` | DEFAULT `'running'`, NOT NULL | حالة المهمة |
| `error_message` | `text` | — | رسالة الخطأ عند الفشل |
| `started_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | وقت بدء المهمة |
| `finished_at` | `timestamp` | — | وقت انتهاء المهمة |

**الفهارس:**
- `idx_breakdown_jobs_project_id` على `project_id`
- `idx_breakdown_jobs_scene_id` على `scene_id`
- `idx_breakdown_jobs_status` على `status`

---

#### جدول `recovery_artifacts`

**الملف:** `apps/backend/src/db/zkSchema.ts`
**الغرض:** تخزين Artifacts المشفرة لاستعادة الحساب (نظام Zero-Knowledge).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `user_id` | `varchar` | FK → `users.id` CASCADE, NOT NULL | المستخدم |
| `encrypted_recovery_artifact` | `text` | NOT NULL | الـ Artifact المشفر |
| `iv` | `text` | NOT NULL | متجه التهيئة للتشفير |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `updated_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |

**الفهارس:**
- `idx_recovery_artifacts_user_id` على `user_id`

---

#### جدول `encrypted_documents`

**الملف:** `apps/backend/src/db/zkSchema.ts`
**الغرض:** تخزين المستندات المشفرة من جانب العميل (Client-Side Encryption).

| العمود | النوع | القيود | الوصف |
|---|---|---|---|
| `id` | `varchar` | PK, DEFAULT `gen_random_uuid()` | المعرف الفريد |
| `user_id` | `varchar` | FK → `users.id` CASCADE, NOT NULL | المستخدم |
| `ciphertext` | `text` | NOT NULL | النص المشفر |
| `iv` | `text` | NOT NULL | متجه التهيئة |
| `auth_tag` | `text` | NOT NULL | وسم المصادقة (AES-GCM) |
| `wrapped_dek` | `text` | NOT NULL | مفتاح التشفير الملفوف (DEK) |
| `wrapped_dek_iv` | `text` | NOT NULL | متجه تهيئة مفتاح DEK |
| `version` | `integer` | DEFAULT `1`, NOT NULL | إصدار بروتوكول التشفير |
| `ciphertext_size` | `integer` | NOT NULL | حجم النص المشفر بالبايت |
| `created_at` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ الإنشاء |
| `last_modified` | `timestamp` | DEFAULT `NOW()`, NOT NULL | تاريخ آخر تعديل |

**الفهارس:**
- `idx_encrypted_documents_user_id` على `user_id`
- `idx_encrypted_documents_last_modified` على `last_modified`

---

## Redis

### إعداد الاتصال

**الملف:** `apps/backend/src/config/redis.config.ts`
**المكتبة:** `redis` `^5.10.0`

Redis يدعم ثلاثة أوضاع اتصال:

**1. Redis Sentinel (للإنتاج عالي التوفر):**
```env
REDIS_SENTINEL_ENABLED=true
REDIS_SENTINELS=127.0.0.1:26379,127.0.0.1:26380,127.0.0.1:26381
REDIS_MASTER_NAME=mymaster
REDIS_PASSWORD=your-password
REDIS_SENTINEL_PASSWORD=sentinel-password
```

**2. Redis URL:**
```env
REDIS_URL=redis://:password@host:6379
```

**3. متغيرات فردية:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**الحد الأدنى للإصدار:** Redis >= 5.0.0 (مطلوب من BullMQ)

---

### أنماط استخدام Redis

| النمط | مثال المفتاح | نوع Redis | TTL الافتراضي | الغرض |
|---|---|---|---|---|
| **Cache — L2** | `{prefix}:{sha256_hash_16chars}` | String (JSON) | 1800 ثانية (30 دقيقة) | الكاش المتعدد الطبقات (L1=Memory, L2=Redis) |
| **BullMQ Queue — AI Analysis** | `bull:ai-analysis:{jobId}` | Hash/List (داخلي) | 24 ساعة (completed) / 7 أيام (failed) | مهام تحليل الذكاء الاصطناعي في الخلفية |
| **BullMQ Queue — Document Processing** | `bull:document-processing:{jobId}` | Hash/List (داخلي) | 24 ساعة (completed) / 7 أيام (failed) | معالجة مستندات PDF/DOCX/TXT في الخلفية |
| **BullMQ Queue — Notifications** | `bull:notifications:{jobId}` | Hash/List (داخلي) | 24 ساعة (completed) / 7 أيام (failed) | مهام الإشعارات |
| **BullMQ Queue — Export** | `bull:export:{jobId}` | Hash/List (داخلي) | 24 ساعة (completed) / 7 أيام (failed) | مهام التصدير |
| **BullMQ Queue — Cache Warming** | `bull:cache-warming:{jobId}` | Hash/List (داخلي) | 24 ساعة (completed) / 7 أيام (failed) | تسخين الكاش استباقياً |

#### ملاحظات حول كاش الخدمة (CacheService)

**الملف:** `apps/backend/src/services/cache.service.ts`

- **L1 (In-Memory LRU):** حد أقصى 100 عنصر، تنظيف دوري كل دقيقة
- **L2 (Redis):** أقصى حجم للقيمة 1 ميغابايت، أقصى TTL 24 ساعة
- **النمط:** عند Hit L2، يُخزَّن العنصر تلقائياً في L1 للوصول الأسرع لاحقاً
- **Fallback:** عند عدم توفر Redis، يعمل التطبيق بـ L1 فقط دون توقف

#### قوائم انتظار BullMQ

| الطابور | الاسم | التزامن | الحد | محاولات إعادة |
|---|---|---|---|---|
| `ai-analysis` | تحليل الذكاء الاصطناعي | 3 مهام متزامنة | 5 مهام/ثانية | 3 محاولات، exponential backoff 2ث |
| `document-processing` | معالجة المستندات | 2 مستند متزامن | 3 مهام/ثانية | 3 محاولات، exponential backoff 3ث |
| `notifications` | الإشعارات | 5 (الافتراضي) | 10/ثانية | 3 محاولات، exponential backoff 2ث |
| `export` | التصدير | 5 (الافتراضي) | 10/ثانية | 3 محاولات، exponential backoff 2ث |
| `cache-warming` | تسخين الكاش | 1 مهمة فقط | 1 مهمة/5 ثوانٍ | 2 محاولات، exponential backoff 5ث |

**لوحة مراقبة Bull Board:** متاحة على `/admin/queues` (تتطلب مصادقة).

---

## Weaviate (قاعدة بيانات المتجهات)

### نظرة عامة

**الملف:** `apps/backend/src/memory/vector-store/client.ts`
**المكتبة:** `weaviate-client` `^3.5.0`
**الغرض:** نظام الذاكرة الدلالية — تخزين التمثيلات المتجهية للكود والتوثيق لاسترداد السياق بالـ AI.

```env
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-api-key  # اختياري
```

**نموذج التضمين:** `gemini-embedding-2-preview` (أبعاد: 1536)
**دالة المسافة:** Cosine Similarity

---

### مجموعات Weaviate

#### مجموعة `CodeChunks`

**الملف:** `apps/backend/src/memory/vector-store/schema.ts`
**الغرض:** أجزاء (Chunks) من كود المستودع مع تضمينات متجهية للبحث الدلالي.

| الحقل | نوع البيانات | التوكينايزيشن | الوصف |
|---|---|---|---|
| `content` | `text` | `word` | محتوى الكود |
| `filePath` | `text` | `field` | المسار النسبي للملف |
| `language` | `text` | `field` | لغة البرمجة |
| `chunkIndex` | `int` | — | رقم الجزء في الملف |
| `totalChunks` | `int` | — | إجمالي الأجزاء في الملف |
| `startLine` | `int` | — | رقم السطر الأول |
| `endLine` | `int` | — | رقم السطر الأخير |
| `contentHash` | `text` | `field` | SHA256 للكشف عن التكرار |
| `lastModified` | `date` | — | تاريخ آخر تعديل |
| `gitCommit` | `text` | `field` | هاش commit عند الفهرسة |
| `imports` | `text[]` | — | قائمة الـ imports |
| `exports` | `text[]` | — | قائمة الـ exports |
| `functions` | `text[]` | — | أسماء الدوال |
| `classes` | `text[]` | — | أسماء الفئات (Classes) |
| `tags` | `text[]` | — | تصنيفات يدوية |

---

#### مجموعة `Documentation`

**الملف:** `apps/backend/src/memory/vector-store/schema.ts`
**الغرض:** ملفات التوثيق وملفات README والمحتوى النصي (Markdown).

| الحقل | نوع البيانات | التوكينايزيشن | الوصف |
|---|---|---|---|
| `content` | `text` | `word` | محتوى المستند |
| `filePath` | `text` | `field` | مسار الملف |
| `title` | `text` | `word` | عنوان المستند |
| `section` | `text` | `word` | القسم أو العنوان الفرعي |
| `docType` | `text` | `field` | النوع: README / API_DOC / ADR / GUIDE |
| `chunkIndex` | `int` | — | رقم الجزء |
| `contentHash` | `text` | `field` | هاش المحتوى |
| `lastModified` | `date` | — | تاريخ آخر تعديل |
| `tags` | `text[]` | — | تصنيفات |
| `relatedFiles` | `text[]` | — | ملفات مذكورة في المستند |

---

#### مجموعة `Decisions`

**الملف:** `apps/backend/src/memory/vector-store/schema.ts`
**الغرض:** سجلات قرارات المعمارية (Architecture Decision Records — ADRs).

| الحقل | نوع البيانات | التوكينايزيشن | الوصف |
|---|---|---|---|
| `content` | `text` | `word` | المحتوى الكامل للقرار |
| `title` | `text` | `word` | عنوان القرار |
| `decisionId` | `text` | `field` | المعرف الفريد (مثال: ADR-001) |
| `status` | `text` | `field` | proposed / accepted / deprecated / superseded |
| `date` | `date` | — | تاريخ القرار |
| `context` | `text` | `word` | سياق القرار |
| `decision` | `text` | `word` | القرار المُتخَّذ |
| `consequences` | `text` | `word` | التداعيات |
| `alternatives` | `text[]` | — | البدائل المدروسة |
| `relatedDecisions` | `text[]` | — | القرارات المرتبطة |
| `affectedFiles` | `text[]` | — | الملفات المتأثرة |
| `tags` | `text[]` | — | تصنيفات |
| `contentHash` | `text` | `field` | هاش المحتوى |

---

#### مجموعة `Architecture`

**الملف:** `apps/backend/src/memory/vector-store/schema.ts`
**الغرض:** مخططات المعمارية والرسوم البيانية والتوثيق المرئي.

| الحقل | نوع البيانات | التوكينايزيشن | الوصف |
|---|---|---|---|
| `description` | `text` | `word` | وصف نصي للمخطط |
| `filePath` | `text` | `field` | مسار الملف |
| `diagramType` | `text` | `field` | النوع: mermaid / plantuml / drawio / image |
| `imageUri` | `text` | `field` | رابط الصورة |
| `components` | `text[]` | — | المكونات المذكورة |
| `relationships` | `text[]` | — | العلاقات الموصوفة |
| `tags` | `text[]` | — | تصنيفات |
| `contentHash` | `text` | `field` | هاش المحتوى |

---

## أوامر الترحيلات (Drizzle Migrations)

### الأوامر الأساسية

```bash
# توليد ملفات الترحيل من ملفات Schema
pnpm --filter backend db:generate

# تطبيق الترحيلات على قاعدة البيانات
pnpm --filter backend db:push

# فتح واجهة Drizzle Studio (GUI لاستعراض البيانات)
pnpm --filter backend db:studio
```

**الأوامر المباشرة:**
```bash
cd apps/backend
npx drizzle-kit generate   # توليد ملفات SQL للترحيل
npx drizzle-kit push       # رفع Schema مباشرةً (للتطوير)
npx drizzle-kit studio     # واجهة رسومية على http://localhost:4983
```

### ملفات الترحيل الموجودة

| الملف | الإجراء |
|---|---|
| `drizzle/0000_boring_klaw.sql` | إضافة عمودَي `mfa_enabled` و `mfa_secret` إلى جدول `users` |
| `drizzle/0001_broad_korath.sql` | إنشاء جدول `refresh_tokens` مع فهارسه وقيد المفتاح الأجنبي |

### إعداد ملف الترحيل

**الملف:** `apps/backend/drizzle.config.ts`

```typescript
export default {
  schema: [
    'src/db/schema.ts',   // الجداول الرئيسية
    'src/db/zkSchema.ts', // جداول Zero-Knowledge
  ],
  out: './drizzle',       // مجلد الترحيلات
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
```

---

## بذر البيانات (Seed Scripts)

لا توجد سكريبتات بذر رسمية في المشروع حالياً. قاعدة البيانات تُهيَّأ من خلال:

1. **الترحيلات التلقائية** عبر `drizzle-kit push` عند الإعداد الأول.
2. **البيانات التجريبية** تُدار عبر اختبارات التكامل في `apps/backend/src/test/integration/`.
3. **بيانات الإنتاج** تُنشأ بشكل عضوي من خلال واجهات API.

---

## أنماط الوصول للبيانات

### من الباك اند (Backend)

| الطبقة | الأداة | الوصف |
|---|---|---|
| **Controllers** | Drizzle ORM | جلب وتحديث البيانات من PostgreSQL |
| **CacheService** | `redis` client | كاش ذو طبقتين: L1 Memory + L2 Redis |
| **QueueManager** | BullMQ + Redis | إدارة قوائم انتظار المهام الخلفية |
| **ContextBuilder** | Weaviate client | استرداد سياق دلالي للذكاء الاصطناعي |
| **AuthMiddleware** | Drizzle ORM | التحقق من المستخدم و Refresh Token |

**مثال على تسلسل وصول البيانات (استعلام مشروع):**

```
HTTP Request
    → AuthMiddleware (PostgreSQL: التحقق من users + refresh_tokens)
    → CacheService.get(key)
        → L1 Memory: لم يُعثر
        → L2 Redis: لم يُعثر
    → Drizzle ORM: SELECT من projects WHERE user_id = ? AND id = ?
        (يستخدم الفهرس: idx_projects_id_user)
    → CacheService.set(key, data, TTL=1800)
        → L1 Memory: حفظ
        → L2 Redis: حفظ
    → HTTP Response
```

### من الفرونت اند (Frontend)

لا يتصل الفرونت اند بقواعد البيانات مباشرةً. كل الوصول يتم عبر REST API:

| نوع البيانات | نقطة النهاية (Endpoint) | قاعدة البيانات المستخدمة |
|---|---|---|
| المصادقة | `POST /api/auth/login` | PostgreSQL (`users`, `refresh_tokens`) |
| مصادقة ZK | `POST /api/auth/zk-login-init` | PostgreSQL (`users`) |
| المستندات المشفرة | `GET/POST /api/docs` | PostgreSQL (`encrypted_documents`) |
| المشاريع | `GET/POST /api/projects` | PostgreSQL (`projects`) + Redis Cache |
| المشاهد | `GET/POST /api/scenes` | PostgreSQL (`scenes`, `shots`) + Redis Cache |
| الشخصيات | `GET/POST /api/characters` | PostgreSQL (`characters`) + Redis Cache |
| تقارير Breakdown | `GET /api/breakdown/projects/:id/report` | PostgreSQL (`breakdown_reports`, `scene_breakdowns`) |
| مهام الذكاء الاصطناعي | `POST /api/ai/chat` | Redis (BullMQ Queue) → PostgreSQL (عند الاكتمال) |
| الذاكرة الدلالية | `GET /api/memory/*` | Weaviate |

---

## اعتبارات أمنية لقواعد البيانات

- **PostgreSQL:** يُوصى باستخدام مستخدم قاعدة بيانات بصلاحيات محدودة (`SELECT, INSERT, UPDATE, DELETE` فقط) — توجيهات مفصلة في `apps/backend/src/db/index.ts`.
- **Redis:** تفعيل كلمة المرور في بيئة الإنتاج عبر `REDIS_PASSWORD`.
- **Weaviate:** دعم مصادقة API Key عبر `WEAVIATE_API_KEY`.
- **التشفير:** المستندات في `encrypted_documents` تُشفَّر من جانب العميل قبل الإرسال (AES-GCM)، لا يرى الخادم النص الصريح أبداً.
- **Zero-Knowledge:** `recovery_artifacts` وحقول `auth_verifier_hash`, `kdf_salt` في `users` تدعم نظام مصادقة ZK حيث لا تُخزَّن كلمة المرور بأي شكل قابل للاسترداد.
