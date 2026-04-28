# Findings

## الحقائق الحالية

- الويب الرسمي يعمل على المنفذ `5000`
- الخلفية المرجعية تعمل على المنفذ `3001`
- لا يوجد مصدر أعلى للحقيقة غير `AGENTS.md` والعقد التشغيلي الكامل
- `output/session-state.md` هو المصدر الوحيد للحالة الحالية
- طبقة المعرفة والاسترجاع الحالية حالتها `ungoverned`

## إشارات التشتت أو المنافسة

- لا توجد إشارات منافسة موثقة حاليًا.

## تحذيرات الكشف

- مرشح معرفة غير ممثل في الجرد المرجعي: apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts (path signal: rag)

## الملفات غير المحكومة مرجعيًا

- `apps/web/src/lib/drama-analyst/agents/shared/standardAgentPattern.rag.ts`
