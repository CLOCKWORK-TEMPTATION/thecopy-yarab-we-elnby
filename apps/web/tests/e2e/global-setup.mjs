/**
 * @fileoverview Playwright global setup.
 *
 * يضمن وجود ملحقات الاختبار الحتمية (صور وفيديوهات عينة) قبل بدء
 * أي اختبار نهاية إلى نهاية. لا يستخدم شبكة ولا أدوات نظام خارجية.
 */

import { ensureMediaFixtures } from "../fixtures/media/ensure-media-fixtures.mjs";
import { ensureEditorFixtures } from "../fixtures/editor/ensure-editor-fixtures.mjs";

export default async function globalSetup() {
  const result = await ensureMediaFixtures();
  const editorFixtures = await ensureEditorFixtures();
   
  console.log(
    "[playwright global-setup] media fixtures ensured:",
    JSON.stringify(result)
  );
   
  console.log(
    "[playwright global-setup] editor fixtures ensured:",
    JSON.stringify(editorFixtures)
  );
}
