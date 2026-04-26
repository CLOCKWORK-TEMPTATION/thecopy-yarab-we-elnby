# Runtime Flows

## المسار المؤتمت

1. `pnpm agent:start`
2. `pnpm agent:bootstrap`
3. قراءة `output/session-state.md`
4. تنفيذ المهمة
5. `pnpm agent:verify`

## مسار IDE

1. قراءة `AGENTS.md`
2. قراءة `output/session-state.md`
3. قراءة ما يلزم من الخرائط
4. إخراج brief من 3 إلى 7 حقائق يثبت القراءة ويتضمن قاعدة الفحوصات
5. تنفيذ المهمة
6. تحديث `output/round-notes.md`
7. تحديث `output/session-state.md` عند تغير الحقيقة

## طبقة المعرفة والاسترجاع

1. يتم اكتشافها داخل bootstrap
2. يتم إدراجها داخل session-state والسياق المولد
3. تدخل في fingerprint
4. يفشل verify عند drift معرفي أو استرجاعي

## المنافذ الحالية

- الويب: `5000`
- الخلفية: `3001`
