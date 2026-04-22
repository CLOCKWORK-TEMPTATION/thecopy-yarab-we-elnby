# scripts/legacy/

محفوظات لسكربتات قديمة تم استبدالها بأدوات قياسية. يُحتفظ بها للرجوع فقط
— لا تستخدمها في الـ pipeline الرسمي.

## الاستبدال المعتمد

| سكربت قديم | البديل الرسمي | المصدر |
|---|---|---|
| `security-scan.sh` | **Gitleaks** | `pnpm security:secrets:staged` (staged) و `pnpm security:secrets` (كامل المستودع) |
| `advanced-security-scan.sh` | **Gitleaks + Trivy + Semgrep** | `pnpm security:all` |

## سبب الاستبدال

- regex بدائية (UUID regex يطابق أي UUID، قواعد OpenAI تغطي فقط `sk-{48}`).
- يفحص الملفات المُرحَّلة فقط دون آلية allowlist فعّالة.
- لا يتوافق مع أداة فحص الـ CI (`gitleaks-action`) فيولد سلوكًا مختلفًا.

## Gitleaks محليًا

```bash
# فحص كامل للمستودع
pnpm security:secrets

# فحص الملفات المُرحَّلة فقط (نفس ما يعمل في pre-commit)
pnpm security:secrets:staged
```

راجع `.gitleaks.toml` في جذر المستودع للقواعد المخصصة وقوائم الـ allowlist.
