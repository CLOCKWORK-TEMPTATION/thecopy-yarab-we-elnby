<!-- markdownlint-disable MD013 MD032 -->

# دليل الإعداد — The Copy

## المتطلبات الأساسية

| الأداة | الإصدار | التحقق |
|--------|---------|--------|
| Node.js | `24.x` | `node -v` |
| pnpm | `10.x` أو أحدث | `pnpm -v` |
| PowerShell | متاح على النظام | `pwsh -v` أو `powershell -v` |

Docker ليس جزءًا من المسار الرسمي المحلي لهذا المستودع.

## الإعداد السريع

```bash
git clone <repo-url>
cd "the copy"
pnpm install
```

بعد تثبيت الحزم:

```bash
pnpm doctor
pnpm dev
```

## أوامر التشغيل المرجعية

```bash
pnpm dev
pnpm start
pnpm doctor
pnpm verify:runtime
pnpm agent:bootstrap
pnpm agent:verify
pnpm agent:start
```

## المنافذ المرجعية الحالية

| الخدمة | المنفذ |
|--------|--------|
| Frontend (`@the-copy/web`) | `5000` |
| Backend المرجعي في فحص الجاهزية | `3001` |

## طبقة الوكلاء

أي جلسة ترميز يجب أن تبدأ من:

```text
AGENTS.md
```

ثم:

```text
output/session-state.md
```

وإذا كانت الجلسة مؤتمتة، فالمسار الرسمي هو:

```bash
pnpm agent:start
```

## التحقق من الجاهزية

```bash
pnpm doctor
pnpm verify:runtime
```

## ملاحظات مهمة

- لا تعتمد على Docker كمصدر تشغيل محلي رسمي.
- لا تستخدم `npm` أو `yarn` بدل `pnpm` داخل هذا المستودع.
- الحالة التشغيلية الحالية تُقرأ من `output/session-state.md`.
