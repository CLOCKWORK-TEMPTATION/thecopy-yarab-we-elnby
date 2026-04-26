# المخطط الاستراتيجي — STR-098 → STR-104

> **حالة الوثيقة:** عقد تنفيذي ملتزم في `STR-098`. أي تعديل لاحق يجب أن يكون عبر PR منفصل بمعرّف `STR-098.x` مع justification صريح.
>
> **الترقيم:** `STR-` (Strategic Round) لتمييز الجولات الاستراتيجية الست عن عداد `round-notes.md` التشغيلي العام (الذي يعدّ كل بدء جلسة).
>
> **النموذج التشغيلي:** كل جولة في `worktree` معزول شقيق + فرع مستقل بنمط `str-NNN-<slug>` + PR لمراجعة بشرية قبل الدمج.
>
> **الإلزام الميكانيكي:** `pre-commit hooks` + `commit-msg hook` + `quality-gate workflow` ترفض كل خرق آلياً. لا اعتماد على تأويل النموذج.
>
> **مرجعية الاستلام:** `commit c25fc9f` — Sentry instrumentation كامل + lint/type-check contract-based scripts + 7 GitHub Actions workflows فعّالة + Husky + lint-staged مُهيَّآن.

---

## 1. خريطة الديون المُجمَّدة في STR-098

القياس الحي وقت تجميد `tech-debt-baseline.json` (commit `c25fc9f`):

| المقياس | القيمة المُجمَّدة | الجولة المستهدِفة |
|---|---:|---|
| `console.*` web src | 332 | STR-101 |
| `console.*` backend src | 173 | STR-101 |
| `: any` web src | 217 | STR-101 |
| `: any` backend src | 59 | STR-101 |
| `@ts-ignore` total | 0 | (مغلقة) |
| `TODO/FIXME/HACK` total | 22 | STR-101 |
| ملفات > 1000 سطر | 21 | STR-102 |
| ملفات > 500 سطر | 138 | STR-102 |
| `test_failures_*` | null (يُلتقط في أول CI run) | STR-099 |
| `lint_errors_*` / `lint_warnings_*` | null (يُلتقط في أول CI run) | STR-100 |

ملاحظة: أرقام المخطط الأصلي (133 console / 267 any / 6 ts-ignore / 18 TODO / 6 ملفات > 1000) كانت تستند لـ Pre-Flight جولة 096. القياس الحي بعد commits Sentry الثلاثة كشف اختلافاً جوهرياً — `tech-debt-baseline.json` يعكس الواقع لا الأرقام التاريخية.

---

## 2. STR-098 — Foundation Completion Round

**الحالة عند الإنجاز:** هذا المستند نفسه + ملفات الحراسة الستة ملتزمة في `commit STR-098`.

ما بُني فعلاً في STR-098:

- `tech-debt-baseline.json` — خط أساس مُجمَّد بقياس حي (لا منقول).
- `scripts/audit-tech-debt.sh` — حارس ratchet أحادي الاتجاه. يدعم `--update-baseline` لتحديث القيم بعد تحسين فقط (لا زيادة).
- `scripts/audit-migration-budget.sh` — حارس ميزانية ترحيل P0=0% / P1=15% / P2=30% / P3=∞. يقرأ `triage-round-{NNN}.md` للجولة الحالية.
- `.github/workflows/quality-gate.yml` — workflow مستقل بثلاث jobs: tech-debt-ratchet + migration-budget + baseline-integrity (يرفض أي PR يضعف baseline في نفس التغيير).
- `.husky/commit-msg` — يفرض نمط `<type>(<scope>): STR-NNN[.M] — <وصف>` مع مسار صيانة عابر مسموح للأعمال خارج الجولات الاستراتيجية.
- `docs/strategic-plan-098-104.md` (هذا الملف) — العقد المُلتزَم.

ما لم يُبنَ في STR-098 لأنه موجود سلفاً (مكتشف في Pre-Flight):

- Sentry على web + backend (commits `3a0bf42` + `c752530`).
- Husky + lint-staged (تكوين موجود في الجذر + `apps/web` + `apps/backend`).
- 7 workflows (`ci.yml`, `codeql.yml`, `security-audit.yml`, `docker-build.yml`, `blue-green-deployment.yml`, `hybrid-production-audit.yml`, `neon_workflow.yml`).
- طبقة فحص أمني (`.semgrep/*` × 4 + `.gitleaks.toml` + `.gitsecrets`).

**معيار القبول:** quality-gate يمر على PR تجريبي + commit-msg hook يرفض رسالة بدون pattern + audit-tech-debt يفشل لو زيد console.log واحد.

---

## 3. STR-099 — إغلاق test_failures_*

**النطاق:** كل اختبار فاشل في `apps/web` + `apps/backend` يُعالَج فردياً. لا تجميع. لا `it.skip`. لا `timeout` مرفوع تعسُّفاً.

**التقسيم الإجباري:**

- المرحلة A: تصنيف الاختبارات الفاشلة حسب الجذر السببي (`mock` قديم / `assertion` تغيَّر / عطل runtime / `flaky` / سلوك لم يَعُد مطلوباً).
- المرحلة B: إصلاح كل فئة بدورها. كل إصلاح commit منفرد بمعرّف `STR-099.<rank>`.
- المرحلة C: أي `flaky` يُعالَج جذرياً (لا `retries`، لا `skip`).

**معيار القبول:** `pnpm --filter @the-copy/web test` + `pnpm --filter @the-copy/backend test` كلاهما `EXIT=0` + `tech-debt-baseline.json.runtime_metrics.test_failures_*` يُجمَّد بقيمة 0 + coverage لا يقل عن خط الأساس قبل الجولة.

---

## 4. STR-100 — إصلاح lint كاملاً

**النطاق:** كل `lint errors` + `lint warnings` في web + backend.

**النهج:**

- تصنيف حسب القاعدة المنتهَكة. إصلاح فئة بفئة.
- تحذيرات غير قابلة للإصلاح بشكل عام: تعطيل موضعي بـ `// eslint-disable-next-line ... -- reason: <سبب>`.
- بعد الإصلاح، ترقية القاعدة من `warn` إلى `error` حيث يصلح.

**معيار القبول:** `pnpm --filter @the-copy/web lint --max-warnings=0` + `pnpm --filter @the-copy/backend lint --max-warnings=0` كلاهما `EXIT=0` + `tech-debt-baseline.json.runtime_metrics.lint_*` كلها 0.

---

## 5. STR-101 — تنظيف الديون النوعية

**النطاق الإجمالي:** 332 + 173 + 217 + 59 + 22 = 803 موضع تعديل، متكتلة في commits صغيرة `STR-101.<rank>`.

**5.1 — `console.*` (505 web+backend)**

إنشاء أو توحيد `logger` معتمد:

- `apps/web/src/lib/logger.ts` — مبني على `pino` أو يصدّر إلى Axiom عبر Vercel Log Drain.
- `apps/backend/src/lib/logger.ts` — مبني على `pino` يصدّر إلى Railway Logs structured.

استبدال:

- `console.log` → `logger.info`
- `console.error` → `logger.error` مع `error context`
- `console.warn` → `logger.warn`
- `console.debug` → يُحذف نهائياً (لا يُستبدل)

**5.2 — `: any` (276)**

لكل `any`: تحقيق نوعي قصير. التحويل إلى نوع ضيق (`unknown` ثم `narrow`، أو `generic`). `any` غير قابل للتضييق (نادر) → توثيق `// reason: <لماذا any مطلوب>`.

**5.3 — `@ts-ignore` (0 — مغلقة)**

لا عمل. الفئة مُجمَّدة عند صفر، أي محاولة إعادة إدخال `@ts-ignore` يرفضها audit آلياً.

**5.4 — `TODO/FIXME/HACK` (22)**

كل واحد يُحوَّل إلى أحد ثلاثة:

- بند جديد في `triage-round-101.md` ويُنفَّذ.
- `issue` في GitHub ويُحذَف من الكود مع `// link: <issue-url>`.
- يُحذَف لو لم يَعُد مطلوباً.

**معيار القبول:** كل قيم `console_*` و `any_*` و `todo_fixme_hack_total` تساوي 0 في baseline.

---

## 6. STR-102 — تجزئة الملفات الكبرى

**النطاق:** 21 ملفاً > 1000 سطر، و 138 ملفاً > 500 سطر.

**النهج:**

- اكتشاف القائمة:
  ```bash
  find apps/web/src apps/backend/src packages -name "*.ts" -o -name "*.tsx" \
    | xargs wc -l | awk '$1 > 1000' | sort -rn
  ```
- لكل ملف، تحليل بنيوي: `extract custom hooks` / `extract sub-components` / `extract pure functions` إلى `utils` / `extract types` إلى `types.ts` مجاور.
- الهدف: لا ملف فوق 500 سطر.
- اختبارات الانحدار قبل وبعد كل تجزئة (`golden tests`).

**معيار القبول:** `files_over_500_lines = 0` + لا تراجع في coverage + كل اختبارات STR-099 تبقى خضراء.

---

## 7. STR-103 — إكمال الميزات المعلَنة

**حالة المرحلة:** نطاق غير محسوم. تحتاج Discovery منفصلة قبل البدء تُنتج `feature-completion-spec.md` يحدد:

- ما الصفحات المعلَنة في UI لكن منطقها مكسور؟
- ما الميزات المخطَّط لها في `session-state.md` تحت "خطط مستقبلية"؟
- ما Agentic RAG المطلوب فعلياً؟ (المعمارية الموثَّقة سابقاً: LangGraph + BullMQ + Weaviate + 20+ Arabic drama agents)

**معيار القبول المؤقت:** كل ميزة في UI لها `flow` كامل من `entry point` إلى `success state` إلى `error state` + Agentic RAG يستجيب لاستعلام واحد على الأقل بالكامل عبر مسار حقيقي.

---

## 8. STR-104 — البنية التحتية الإنتاجية

**القرارات الأربع المُحسَمة في STR-098:**

| الطبقة | الخدمة | الكلفة قبل launch |
|---|---|---|
| Error tracking | Sentry (Vercel integration رسمي + SDK يدوي على Railway) | $0 (مجاني حتى 5K errors/شهر) |
| Frontend logging | Axiom عبر Vercel Log Drain | $0 (مجاني حتى 0.5TB/شهر) |
| Backend logging | Railway Logs (مُضمَّن) | $0 |
| CI | GitHub Actions | $0 (2000 دقيقة مجانية) |
| Frontend hosting | Vercel | $0–20 |
| Backend + DB | Railway (PostgreSQL + Backend) | ~$5–20 |
| Preview environments | Vercel Preview + Railway Branch Deployments | ~$5/شهر |
| **الإجمالي قبل launch** | | **~$10–50/شهر** |

**المهام الإلزامية:**

- 8.1 CI/CD: quality-gate (مُنجز في STR-098) + deploy-staging تلقائي على main + deploy-production يدوي بـ approval + rollback بزر واحد.
- 8.2 Monitoring: Sentry (مُنجز جزئياً) + OpenTelemetry traces + Vercel Analytics + `/api/health` يُعيد حالة كل خدمة خلفية.
- 8.3 Logging: structured JSON + log levels + correlation IDs + log shipping إلى Axiom/Railway.
- 8.4 Security Headers في `next.config.js`: CSP محكم، HSTS، X-Frame-Options، X-Content-Type-Options، Referrer-Policy، Permissions-Policy. الهدف: Mozilla Observatory `A+`.
- 8.5 Rate Limiting: Upstash Rate Limiter على API routes الحساسة + Vercel Firewall rules.
- 8.6 Backups + DR: نسخ احتياطي يومي تلقائي للـ PostgreSQL على Railway + DR runbook + اختبار استعادة فعلي قبل اعتبار الجولة مكتملة.

**معيار القبول:** Mozilla Observatory `A+` + health check يعمل + Sentry يستقبل خطأ تجريبي + staging deploy ناجح + production deploy يتطلب approval + DR test ناجح.

---

## 9. التغطية الأفقية — E2E

موزَّعة عبر الجولات لا في جولة واحدة:

- STR-099: أثناء إصلاح الاختبارات الفاشلة، إضافة E2E لكل صفحة في `apps/web/src/app/(main)/`.
- STR-103: أثناء إكمال الميزات، إضافة E2E للمسارات الجديدة.
- STR-104: smoke tests على staging كجزء من CI.

**الهدف النهائي:** كل صفحة في `(main)` لها spec واحد على الأقل في `apps/web/e2e/`.

---

## 10. الاعتمادات والترتيب الإلزامي

```
STR-098 (Foundation) → STR-099 (Tests) → STR-100 (Lint) → STR-101 (Quality Debt) → STR-102 (File Splits) → discovery للميزات → STR-103 (Features) → STR-104 (Infrastructure)
```

ممنوع التوازي بين الجولات. كل جولة تُغلَق بـ PR مدموج قبل ما التالية تبدأ.

---

## 11. الـ Ratchet المتراكم

كل جولة تُحدِّث `tech-debt-baseline.json` بقيم أصغر فقط. لا توجد جولة لاحقة تستطيع الـ commit لو زادت قيمة سبق إنزالها — `quality-gate.baseline-integrity` يرفض الـ PR آلياً.

في نهاية STR-104، الحالة المستهدفة:

```json
{
  "static_metrics": {
    "console_calls_web_src": { "value": 0 },
    "console_calls_backend_src": { "value": 0 },
    "any_type_web_src": { "value": 0 },
    "any_type_backend_src": { "value": 0 },
    "ts_ignore_total": { "value": 0 },
    "todo_fixme_hack_total": { "value": 0 },
    "files_over_1000_lines": { "value": 0 },
    "files_over_500_lines": { "value": 0 }
  },
  "runtime_metrics": {
    "test_failures_web": 0,
    "test_failures_backend": 0,
    "lint_errors_web": 0,
    "lint_warnings_web": 0,
    "lint_errors_backend": 0,
    "lint_warnings_backend": 0,
    "test_coverage_percent_web": ">= 80",
    "test_coverage_percent_backend": ">= 80"
  },
  "production_ready": true
}
```

عند ضبط `production_ready: true` بشكل دائم، المشروع يدخل وضع الصيانة لا التطوير الكثيف.

---

## 12. سجل القرارات (Decision Log)

| التاريخ | القرار | السبب |
|---|---|---|
| 2026-04-26 | البادئة `STR-` للجولات الاستراتيجية | تمييز سردي + ترقيم فرعي حر + قابلية `git log --grep="STR-"` |
| 2026-04-26 | `quality-gate.yml` workflow مستقل، لا دمج في `ci.yml` | فصل المسؤوليات + تفادي كسر `ci.yml` بنيته 504 سطر |
| 2026-04-26 | Sentry للأخطاء، Axiom للفرونت logs، Railway Logs للباكاند | مجاني قبل launch + تكامل Vercel-native |
| 2026-04-26 | GitHub Actions كطبقة CI موحَّدة | المستودع على GitHub + يقبل deploy hooks لـ Vercel + Railway |
| 2026-04-26 | Vercel Preview + Railway Branch Deployments للـ staging | لا فرع staging دائم — preview ديناميكي لكل PR |
| 2026-04-26 | تجميد baseline بقياس حي لا أرقام Pre-Flight 096 | القاعدة الحاكمة: baseline يجب أن يكون قياساً تشغيلياً مباشراً |

---

## 13. مرجعية الإغلاق

كل جولة `STR-NNN` تُغلَق فقط بـ:

1. PR مدموج في `main`.
2. تحديث `output/round-notes.md` بسجل الجولة.
3. تحديث `output/session-state.md` لو تغيرت حقيقة تشغيلية أو بنيوية.
4. تحديث `tech-debt-baseline.json` بقيم محسَّنة فقط (عبر `--update-baseline`).
5. handoff brief قصير في الجلسة يذكر: ما تغيّر، ما ثبت، ما بقي مفتوحاً.

نهاية المخطط الاستراتيجي.
