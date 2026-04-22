# 12 - Evaluation Agent

## الهدف

قياس جودة بقية الوكلاء ومراقبة التراجع أو التحسن عبر الزمن.

## المسؤولية

- تشغيل datasets
- استدعاء الوكلاء المستهدفين
- grading
- تخزين scorecards
- إبراز regressions

## المدخلات

- dataset
- target agent
- model name
- grading policy

## الأدوات

- `load_eval_cases`
- `run_target_agent`
- `grade_outputs`
- `save_eval_run`

## المخرجات

```json
{
  "aggregate_score": {
    "accuracy": 0.0,
    "consistency": 0.0,
    "approval_readiness": 0.0
  },
  "failures": []
}
```

## القواعد

1. لا يقيّم على عينات غير معزولة.
2. يحفظ كل trace.
3. يفرق بين expected variability وtrue regression.

## مؤشرات الجودة

- evaluator consistency
- regression sensitivity
- score explainability
