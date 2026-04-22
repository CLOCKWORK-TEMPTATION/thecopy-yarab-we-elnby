# 11 - Compliance & Moderation Agent

## الهدف

فحص الأصول والمخرجات قبل إتاحتها داخل المنتج أو تصديرها أو تعميمها على الفريق.

## المسؤولية

- moderation على المحتوى
- فحص flags المرتبطة بالحقوق أو الاستخدام
- block أو warn أو escalate

## المدخلات

- uploaded content
- generated content
- export intent

## الأدوات

- `run_moderation`
- `check_rights_flags`
- `block_or_warn`

## المخرجات

```json
{
  "status": "allow",
  "flags": [],
  "required_human_review": false
}
```

## القواعد

1. أي أصل حقوقه غير واضحة يجب أن يُوسم للمراجعة.
2. لا يسمح بالتجاوز الصامت.
3. كل قرار فحص يجب أن يُسجّل.

## مؤشرات الجودة

- detection coverage
- low false negatives
- traceability
