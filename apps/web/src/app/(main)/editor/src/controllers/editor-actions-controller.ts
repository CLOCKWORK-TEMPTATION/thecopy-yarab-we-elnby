/**
 * @module controllers/editor-actions-controller
 * @description واجهة عامة صغيرة لأوامر المحرر بعد نقل التنفيذ إلى وحدات أصغر.
 */

export type { EditorActionsDeps } from "./editor-actions/types";
export { openFile } from "./editor-actions/file-actions";
export { runExport } from "./editor-actions/export-actions";
export {
  handleMenuAction,
  handleSidebarItemAction,
} from "./editor-actions/menu-actions";
