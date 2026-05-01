# The Copy Quality Pack

حزمة مهارات مبنية على أدلة ملموسة مستخرجة من سجل طلبات السحب الفعلية للمستودع. كل مهارة تستهدف نمطاً متكرراً تم رصده في commits و PRs، ولا تقترح إجراءً عاماً.

## التزام حاكم

كل مهارة هنا تخضع للقاعدة الأعلى المنصوص عليها في:

```text
AGENTS.md
.repo-agent/OPERATING-CONTRACT.md
```

ممنوع منعاً قاطعاً أن تقوم أي مهارة في هذه الحزمة بإضعاف فحص قائم. الإضافة فقط مسموحة. أي تعديل يمس ملف فحص أو تحقق يستوجب تشغيلاً فعلياً مباشراً للفحص المتأثر.

## المهارات

ترتيب التنفيذ المقترح حسب التأثير:

| المهارة | المشكلة المرصودة | الأولوية |
|---|---|---|
| security-pre-merge-auditor | ثغرات تُكتشف بعد الدمج لا قبله | عالية |
| file-budget-splitter | ثلاث PRs متتالية لتقسيم ملفات تجاوزت 500 سطر | عالية |
| zod-controller-boundary-enforcer | غياب Zod validation عند حدود controllers | عالية |
| sentry-sourcemap-doctor | سلسلة fixes متكررة لتحذيرات Sentry CLI | متوسطة |
| next-config-format-resolver | ثلاث تحويلات متتالية لصيغة next.config | متوسطة |
| eslint-contract-stabilizer | عشر commits لإعادة هيكلة طبقة eslint contract | متوسطة |
| e2e-production-readiness-runner | ثلاث PRs لنفس الفرع e2e-production-readiness | منخفضة |
| rag-systems-unifier | تشتت 5 أنظمة RAG بسياسات حوكمة متضاربة | منخفضة |
| triage-round-orchestrator | أتمتة منهجية A-* القائمة يدوياً | منخفضة |

## الاستخدام

كل مهارة هي مجلد يحتوي SKILL.md وسكريبتات اختيارية.

التفعيل التلقائي يعتمد على وصف المهارة في الـ frontmatter. التفعيل اليدوي عبر:

```text
Skill: <plugin>:<skill-name>
```

## التحقق

كل مهارة في هذه الحزمة تنتهي بخطوة تحقق إلزامية تنتج dlilā نصياً ضمن:

```text
output/round-notes.md
```

ولا تُغلق الجولة بمجرد تشغيل المهارة دون إثبات تنفيذ.
