---
name: triage-round-orchestrator
description: يؤتمت منهجية A-* triage rounds القائمة في المستودع، ينظّم الجولة في أربع مراحل (Discovery، Triage، Execute، Close)، يرقّم القضايا بنمط A-XXX و O-XXX، يربط كل قضية بـ commit واحد، ويولّد رسائل docs(triage) القياسية. فعّل عند بدء جولة عمل جديدة، أو عند رؤية كلمات "triage", "round", "جولة", "A-001", "A-XXX", "Discovery", "Execute", "كشف وتثليث"، أو عند طلب "ابدأ جولة جديدة" أو "اعمل triage للأخطاء". لا تفعّل لإصلاح خطأ منفرد بدون منهجية، ولا لكتابة release notes.
---

# Triage Round Orchestrator

## الأدلة المؤسِّسة من سجل المستودع

منهجية ثابتة موجودة لكنها يدوية:

```text
docs(triage): جولة 097 — Discovery + Triage report (commit مستقل قبل Execute)
docs(triage): جولة 097 — ملخص ختامي + إغلاق A-006 + إحصاءات نهائية
docs(triage): تحديث الجولة 097 — قياس O-* بـgrep حقيقي + سجل التنفيذ حتى A-002
docs(triage): تحديث الجولة 097 — إغلاق A-010, A-011, A-012{a,b,c}
docs(triage): جولة 096 — Discovery + Triage report (commit مستقل قبل Execute)
fix(backend): A-001 — تمرير heading مشروطاً في rtlPara لإصلاح TS2345
fix(backend): A-002 — تقسيم lint عبر runner لتفادي OOM في برنامج typed-lint
fix(infra): A-001 — rename src/proxy.ts → src/middleware.ts
test(backend): A-003-{1,2,3} — إضافة NEXT_PUBLIC_BACKEND_URL إلى createProductionEnv
test(web): A-008 — إعادة كتابة شبكة انحدار directors-studio
test(web): A-009 — إعادة كتابة اختبارات ScriptUploadZone
test(web): A-010 — استبدال vi.fn().mockImplementation بـ class حقيقية
test(web): A-011 — تبديل إلى real timers قبل waitFor
test(web): A-012a — CardSpotlight يُمَرِّر HTML attributes
test(web): A-012b/c — mock ProjectContext في scenes/page و shots/page tests
chore(main): update session-state and round-notes for round-116
chore(round-095): commit accumulated editor e2e/test infra work قبل بدء جولة 097
```

النمط الواضح:

أربع مراحل ثابتة، ترقيم A-XXX للقضايا، ترقيم O-XXX للملاحظات، commit مستقل بين كل مرحلتين، docs(triage) commits منفصلة عن fix و test commits.

## بنية الجولة الأربعية

### المرحلة 1 — Discovery

تشغيل:

```text
pnpm agent:bootstrap
pnpm agent:verify
node scripts/find-large-files.mjs
ripgrep -nP "TODO|FIXME|XXX|HACK" apps packages
git log --since="<آخر جولة>" --oneline
```

و توليد:

```text
output/round-notes.md
### Discovery — جولة <N>
- O-001: <ملاحظة قابلة للقياس بـ grep حقيقي>
- O-002: ...
- A-001: <قضية قابلة للإصلاح بـ commit واحد>
- A-002: ...
```

ثم commit مستقل:

```text
docs(triage): جولة <N> — Discovery + Triage report (commit مستقل قبل Execute)
```

### المرحلة 2 — Triage

ترتيب القضايا بأولوية:

```text
P0 — يكسر البناء أو الفحص الحاكم
P1 — يكسر اختباراً أو يخالف عقد
P2 — تحسين بنية أو deduplication
P3 — تنظيف
```

و ربط كل قضية بـ commit واحد فقط، و scope صحيح من:

```text
backend, web, infra, schema, security, breakapp, agent-guard
```

### المرحلة 3 — Execute

لكل قضية A-XXX:

```text
fix(<scope>): A-XXX — <وصف موجز للإصلاح>
test(<scope>): A-XXX — <وصف الاختبار>
refactor(<scope>): A-XXX — <وصف إعادة الهيكلة>
```

ممنوع دمج إصلاحين في commit واحد. ممنوع إصلاح A-005 قبل A-001 إن كان P0 يسبق P2.

### المرحلة 4 — Close

تشغيل:

```text
pnpm agent:verify
```

و تحديث:

```text
output/round-notes.md
### Close — جولة <N>
- A-001: closed
- A-002: closed
- O-001: re-measured
- إحصاءات نهائية
```

و commit ختامي:

```text
docs(triage): جولة <N> — ملخص ختامي + إغلاق A-XXX + إحصاءات نهائية
```

## السلوك المرفوض

دمج Discovery و Execute في commit واحد. تخطي Triage مباشرة من Discovery إلى Execute. إصلاح A-XXX بدون commit مرجعي يحمل نفس الرقم. نسيان تحديث session-state.md عند تغيّر بنية حقيقية. إغلاق جولة بدون تشغيل فعلي لـ pnpm agent:verify.

## فحوصات إلزامية

### T1 — كل commit يحمل رقم القضية

```text
git log --since="<بداية الجولة>" --pretty=format:"%h %s" \
  | ripgrep -v "^[a-f0-9]+ (chore|docs|merge)" \
  | ripgrep -vP "A-\d{3}"
```

أي نتيجة: commit بدون ربط بقضية. يُرفض.

### T2 — Discovery يسبق Execute زمنياً

```text
git log --grep="docs(triage).*Discovery" --pretty=format:"%H %ai" -1
git log --grep="^fix.*A-" --pretty=format:"%H %ai" -1
```

تاريخ الأول يجب أن يسبق الثاني.

### T3 — Close commit موجود

```text
git log --grep="docs(triage).*ملخص ختامي" --pretty=format:"%H" -1
```

يجب أن يوجد قبل اعتبار الجولة مغلقة.

### T4 — session-state و round-notes متزامنان

قراءة:

```text
output/session-state.md
output/round-notes.md
```

و مقارنة آخر مزامنة مرجعية مع تاريخ آخر commit في الجولة. الانحراف يستوجب تحديث.

## مخرجات المهارة

ملف هيكلي في:

```text
output/round-notes.md
```

يحتوي الأقسام الأربعة بالترتيب، و قائمة A-XXX مرقمة، و قائمة O-XXX مرقمة، و إحصاءات (عدد القضايا المغلقة، النسبة، الزمن المستغرق).

## معيار الإغلاق

كل قضية A-XXX إما مغلقة أو مرحَّلة بصراحة، Discovery و Triage و Execute و Close أربعة commits منفصلة، pnpm agent:verify نجح، session-state.md و round-notes.md متزامنان.
