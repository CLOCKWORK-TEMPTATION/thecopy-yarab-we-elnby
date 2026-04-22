/**
 * @deprecated
 * انتقل backend runtime الخاص بالمحرر إلى apps/backend/editor-runtime.
 * تُترك نقطة الدخول القديمة هنا فقط كجسر توافق يُحوّل التنفيذ إلى المصدر
 * التشغيلي الجديد ويمنع رجوع أي script قديم إلى نسخة web المنسوخة.
 */

import "../../../../../../backend/editor-runtime/file-import-server.mjs";
