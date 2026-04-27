import type { ElementType } from "../../extensions/classification-types";

// — خريطة: نوع العنصر الدرامي ← اسم أمر TipTap المقابل
export const commandNameByFormat: Record<ElementType, string> = {
  action: "setAction",
  dialogue: "setDialogue",
  character: "setCharacter",
  scene_header_1: "setSceneHeaderTopLine",
  scene_header_2: "setSceneHeaderTopLine",
  scene_header_3: "setSceneHeader3",
  scene_header_top_line: "setSceneHeaderTopLine",
  transition: "setTransition",
  parenthetical: "setParenthetical",
  basmala: "setBasmala",
};

// — خريطة: نوع العنصر الدرامي ← التسمية العربية الظاهرة للمستخدم
export const formatLabelByType: Record<ElementType, string> = {
  action: "حدث / وصف",
  dialogue: "حوار",
  character: "شخصية",
  scene_header_1: "رأس المشهد (1)",
  scene_header_2: "رأس المشهد (2)",
  scene_header_3: "رأس المشهد (3)",
  scene_header_top_line: "سطر رأس المشهد",
  transition: "انتقال",
  parenthetical: "تعليمات حوار",
  basmala: "بسملة",
};
