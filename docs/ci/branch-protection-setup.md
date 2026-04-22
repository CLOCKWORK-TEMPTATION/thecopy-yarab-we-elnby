# إعداد Branch Protection Rules لفرض بوابات الأمان

> **المتطلب:** صلاحية `Admin` أو `Maintain` على المستودع على GitHub.
> **الوقت المتوقع:** 3–5 دقائق.

هذا المستند يوثّق الخطوات اليدوية اللازمة على GitHub UI لتحويل الفحوصات الأمنية من «تعمل» إلى «إلزامية تمنع الـ merge». التعديلات البرمجية على الفحوصات نفسها أُنجزت في جولة 091، لكن **لا يمكن لأي PR أن تُرفض تلقائيًا قبل تفعيل هذه القواعد في GitHub settings**.

## لماذا هذا مطلوب

GitHub Actions تشغّل الـ workflows، لكن الـ merge button لا يتعطّل عند فشلها إلا لو كانت الـ checks **Required** ضمن Branch Protection. بدون ذلك:

- أي mantainer يستطيع merge PR حتى لو فشل `Dependency Audit` أو `Trivy` أو `Semgrep`.
- الـ bypass غير مسجّل كاستثناء صريح.
- لا ضمان لجاهزية الإنتاج من جهة السياسة.

## الخطوات

### 1) افتح Branch Protection

```
https://github.com/CLOCKWORK-TEMPTATION/yarab-we-elnby-thecopy/settings/branches
```

اضغط **Add branch protection rule** (أو **Edit** إن كان `main` محمياً مسبقًا).

### 2) Branch name pattern

```
main
```

(كرّر نفس الإعداد لاحقًا لـ `develop` إن أردت).

### 3) الخيارات الأساسية (ضع علامة ✓ على كل مما يلي)

| الخيار | الحالة |
|---|---|
| Require a pull request before merging | ✓ |
| Require approvals | ✓ — 1 reviewer على الأقل |
| Dismiss stale pull request approvals when new commits are pushed | ✓ |
| Require status checks to pass before merging | ✓ **(الأهم)** |
| Require branches to be up to date before merging | ✓ |
| Require conversation resolution before merging | ✓ |
| Require signed commits | اختياري — موصى به لاحقاً |
| Require linear history | اختياري |
| Do not allow bypassing the above settings | ✓ |
| Restrict who can push to matching branches | ✓ إن وُجد فريق |

### 4) Required status checks — هذه هي القائمة الإلزامية

في خانة البحث اكتب كل اسم ثم اختره من القائمة المنسدلة. الأسماء مطابقة لأسماء الـ jobs في `.github/workflows/`:

#### من [ci.yml](.github/workflows/ci.yml)

- `Verify Frontend` — lint + type-check + test coverage للويب.
- `Verify Backend` — lint + type-check + test coverage للباكند.
- `Build Frontend`
- `Build Backend`
- `Docker Build Frontend`
- `Docker Verify Backend Runtime`
- `E2E Tests` — فقط على PR.
- `CI Status` — aggregator؛ يفشل إن فشل أي job سابق.

#### من [security-audit.yml](.github/workflows/security-audit.yml)

- `Dependency Audit` — يفشل على HIGH/CRITICAL بعد إزالة `|| true` في جولة 091.
- `Secret Scan` — Gitleaks مع `.gitleaks.toml`.
- `Semgrep Scan` — يفشل على أي finding بمستوى ERROR (جولة 091).
- `Container Scan (web)` — Trivy مع `exit-code: "1"` على CRITICAL/HIGH.
- `Container Scan (backend)` — نفس الشيء.

#### من [codeql.yml](.github/workflows/codeql.yml)

- `Analyze (javascript-typescript)` — CodeQL advanced security + quality queries.

#### من [hybrid-production-audit.yml](.github/workflows/hybrid-production-audit.yml) (اختياري)

- `Hybrid Production Audit` — يعمل فقط على PR يلمس `(main)/**` أو `apps/backend/**`.

### 5) تأكيد التفعيل

اضغط **Create** (أو **Save changes**).

للتحقق: افتح PR جديد — يجب أن يظهر صندوق الـ checks في الأسفل مع القائمة الكاملة، وزر **Merge** يظل معطّلاً حتى تخضرّ جميع الإلزامية.

## استثناءات موصى بها

- **Emergency override** — بدلاً من تعطيل الحماية، استخدم صلاحية `admin bypass` موثّقة في سجل Audit Log. إن احتاج الفريق تخطّي bolted-on، فعّل **Allow specified actors to bypass required pull requests** مع قائمة محدودة (بوت DevOps فقط مثلاً).
- **Dependabot** — إن فشلت فحوصات الأمان على PR من Dependabot بسبب dep جديد، الحل هو **fix the dep**، ليس disable القاعدة.

## اختبار النظام بعد التفعيل

### سيناريو 1 — PR آمن يجب أن يمر

```bash
git checkout -b test/branch-protection-ok
echo "// harmless comment" >> apps/web/src/app/layout.tsx
git add apps/web/src/app/layout.tsx
git commit -m "test: trivial change"
git push -u origin test/branch-protection-ok
gh pr create --title "test: branch protection OK" --body "verify green path"
```

جميع الـ checks يجب أن تخضرّ، و **Merge** يصبح متاحًا.

### سيناريو 2 — PR به ثغرة أمنية يجب أن يفشل

```bash
git checkout -b test/branch-protection-fail
# حقن sk-** pattern مزيف (Gitleaks يجب أن يكتشف)
echo 'const leaked = "sk-1234567890abcdef1234567890abcdef12345678";' >> apps/web/src/app/page.tsx
git add apps/web/src/app/page.tsx
git commit -m "test: inject fake secret"
git push -u origin test/branch-protection-fail
gh pr create --title "test: secret leak should fail" --body "verify secret-scan blocks merge"
```

`Secret Scan` يجب أن يفشل، وزر **Merge** يبقى معطّلاً.

### سيناريو 3 — PR به code injection style يجب أن يفشل Semgrep

```bash
git checkout -b test/branch-protection-semgrep
# انتهاك لقاعدة no-raw-gemini-service-generatecontent في ملف غير مستثنى
cat >> apps/web/src/app/api/development/execute/route.ts << 'EOF'

// محاولة تجاوز الطبقة الموحّدة
import { GoogleGenAI } from "@google/genai";
const leak = new GoogleGenAI({ apiKey: "x" });
leak.models.generateContent({ model: "gemini-2.5-flash", contents: "test" });
EOF
git add -A && git commit -m "test: violate semgrep rule" && git push -u origin test/branch-protection-semgrep
gh pr create --title "test: semgrep should fail" --body "verify semgrep blocks merge"
```

`Semgrep Scan` يجب أن يفشل بمعرّف القاعدة الواضح `thecopy.ai.no-raw-gemini-service-generatecontent`.

نظّف الفروع التجريبية بعد التأكد:

```bash
git checkout main
git branch -D test/branch-protection-ok test/branch-protection-fail test/branch-protection-semgrep
git push origin --delete test/branch-protection-ok test/branch-protection-fail test/branch-protection-semgrep
```

## مرجع تسميات الـ Jobs

إذا لم تظهر جميع الـ jobs في القائمة المنسدلة:

1. تأكّد أن كل workflow عمل مرة واحدة على الأقل على `main` (حتى يعرف GitHub أسماء الـ jobs).
   - شغّل: **Actions** → اختر workflow → **Run workflow** → `main`.
2. أسماء الـ jobs تأخذ من `name:` في ملف الـ workflow YAML، **لا من job id**. إن لم تظهر، افتح ملف الـ workflow وتأكّد من حقل `name:`.
3. matrix jobs تظهر باسم مدموج مع قيمة المصفوفة (مثلاً `Container Scan (web)`).

## ما التالي

بعد التفعيل:

- حدّث [output/round-notes.md](../../output/round-notes.md) بتاريخ التفعيل.
- أزل «تفعيل Branch Protection» من قائمة «ما تبقى مفتوحًا» في [output/session-state.md](../../output/session-state.md).
- راجع القائمة الإلزامية كل ربع سنة (عند إضافة/حذف workflows) لضمان عدم تراكم jobs مهملة.
