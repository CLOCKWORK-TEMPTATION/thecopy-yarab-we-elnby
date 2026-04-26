import {
  Eye,
  Languages,
  DollarSign,
  Sun,
  AlertTriangle,
  FileCheck,
  Palette,
  MapPin,
  Recycle,
  BarChart3,
  FileText,
  Box,
  Clapperboard,
  GraduationCap,
  Cuboid,
  Video,
  LucideIcon,
} from "lucide-react";

import { artDirectorApiPath } from "../lib/api-client";

export interface ToolInputOption {
  value: string;
  label: string;
}

export interface ToolInput {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  options?: ToolInputOption[];
}

export interface ToolConfig {
  icon: LucideIcon;
  color: string;
  endpoint: string;
  requestType: string;
  inputs: ToolInput[];
}

export const toolConfigs: Record<string, ToolConfig> = {
  "visual-analyzer": {
    icon: Eye,
    color: "#e94560",
    endpoint: artDirectorApiPath("/analyze/visual-consistency"),
    requestType: "analyze",
    inputs: [
      {
        name: "sceneId",
        label: "رقم المشهد",
        type: "text",
        placeholder: "مثال: scene-001",
      },
      {
        name: "referenceColors",
        label: "الألوان المرجعية",
        type: "text",
        placeholder: "مثال: #FF5733, #3498DB",
      },
      {
        name: "lightingCondition",
        label: "حالة الإضاءة",
        type: "select",
        options: [
          { value: "daylight", label: "ضوء النهار" },
          { value: "sunset", label: "غروب الشمس" },
          { value: "night", label: "ليلي" },
          { value: "artificial", label: "إضاءة صناعية" },
        ],
      },
    ],
  },
  "terminology-translator": {
    icon: Languages,
    color: "#4ade80",
    endpoint: artDirectorApiPath("/translate/cinema-terms"),
    requestType: "translate",
    inputs: [
      {
        name: "term",
        label: "المصطلح",
        type: "text",
        placeholder: "مثال: Key Light",
      },
      {
        name: "sourceLang",
        label: "اللغة المصدر",
        type: "select",
        options: [
          { value: "en", label: "الإنجليزية" },
          { value: "ar", label: "العربية" },
        ],
      },
      {
        name: "targetLang",
        label: "اللغة الهدف",
        type: "select",
        options: [
          { value: "ar", label: "العربية" },
          { value: "en", label: "الإنجليزية" },
        ],
      },
    ],
  },
  "budget-optimizer": {
    icon: DollarSign,
    color: "#fbbf24",
    endpoint: artDirectorApiPath("/optimize/budget"),
    requestType: "optimize",
    inputs: [
      {
        name: "totalBudget",
        label: "الميزانية الإجمالية",
        type: "number",
        placeholder: "100000",
      },
      {
        name: "categories",
        label: "الفئات (مفصولة بفواصل)",
        type: "text",
        placeholder: "ديكور, إضاءة, أثاث",
      },
      {
        name: "priority",
        label: "الأولوية",
        type: "select",
        options: [
          { value: "quality", label: "الجودة" },
          { value: "cost", label: "التوفير" },
          { value: "balanced", label: "متوازن" },
        ],
      },
    ],
  },
  "lighting-simulator": {
    icon: Sun,
    color: "#60a5fa",
    endpoint: artDirectorApiPath("/simulate/lighting"),
    requestType: "simulate",
    inputs: [
      {
        name: "timeOfDay",
        label: "وقت اليوم",
        type: "select",
        options: [
          { value: "dawn", label: "الفجر" },
          { value: "morning", label: "الصباح" },
          { value: "noon", label: "الظهر" },
          { value: "afternoon", label: "بعد الظهر" },
          { value: "sunset", label: "الغروب" },
          { value: "night", label: "الليل" },
        ],
      },
      {
        name: "location",
        label: "نوع الموقع",
        type: "select",
        options: [
          { value: "interior", label: "داخلي" },
          { value: "exterior", label: "خارجي" },
        ],
      },
      {
        name: "mood",
        label: "المزاج المطلوب",
        type: "text",
        placeholder: "مثال: درامي، رومانسي",
      },
    ],
  },
  "risk-analyzer": {
    icon: AlertTriangle,
    color: "#ef4444",
    endpoint: artDirectorApiPath("/analyze/risks"),
    requestType: "analyze",
    inputs: [
      {
        name: "projectPhase",
        label: "مرحلة المشروع",
        type: "select",
        options: [
          { value: "pre-production", label: "ما قبل الإنتاج" },
          { value: "production", label: "الإنتاج" },
          { value: "post-production", label: "ما بعد الإنتاج" },
        ],
      },
      {
        name: "budget",
        label: "الميزانية",
        type: "number",
        placeholder: "500000",
      },
      {
        name: "timeline",
        label: "الجدول الزمني (أيام)",
        type: "number",
        placeholder: "60",
      },
    ],
  },
  "production-readiness-report": {
    icon: FileCheck,
    color: "#a78bfa",
    endpoint: artDirectorApiPath("/analyze/production-readiness"),
    requestType: "build-prompt",
    inputs: [
      {
        name: "projectName",
        label: "اسم المشروع",
        type: "text",
        placeholder: "اسم الفيلم أو المسلسل",
      },
      {
        name: "department",
        label: "القسم",
        type: "select",
        options: [
          { value: "art", label: "قسم الفن" },
          { value: "lighting", label: "الإضاءة" },
          { value: "props", label: "الإكسسوارات" },
          { value: "all", label: "جميع الأقسام" },
        ],
      },
      {
        name: "checklistType",
        label: "نوع القائمة",
        type: "select",
        options: [
          { value: "full", label: "كاملة" },
          { value: "quick", label: "سريعة" },
        ],
      },
    ],
  },
  "creative-inspiration": {
    icon: Palette,
    color: "#ec4899",
    endpoint: artDirectorApiPath("/inspiration/analyze"),
    requestType: "analyze",
    inputs: [
      {
        name: "sceneDescription",
        label: "وصف المشهد",
        type: "textarea",
        placeholder: "صف المشهد بالتفصيل...",
      },
      {
        name: "mood",
        label: "المزاج",
        type: "select",
        options: [
          { value: "romantic", label: "رومانسي" },
          { value: "dramatic", label: "درامي" },
          { value: "mysterious", label: "غامض" },
          { value: "cheerful", label: "مرح" },
        ],
      },
      {
        name: "era",
        label: "الحقبة",
        type: "text",
        placeholder: "مثال: الثمانينيات",
      },
    ],
  },
  "location-coordinator": {
    icon: MapPin,
    color: "#14b8a6",
    endpoint: artDirectorApiPath("/locations/search"),
    requestType: "search",
    inputs: [
      {
        name: "query",
        label: "البحث",
        type: "text",
        placeholder: "ابحث عن موقع...",
      },
      {
        name: "type",
        label: "النوع",
        type: "select",
        options: [
          { value: "interior", label: "داخلي" },
          { value: "exterior", label: "خارجي" },
          { value: "natural", label: "طبيعي" },
          { value: "studio", label: "استوديو" },
        ],
      },
    ],
  },
  "set-reusability": {
    icon: Recycle,
    color: "#22c55e",
    endpoint: artDirectorApiPath("/sets/reusability"),
    requestType: "analyze",
    inputs: [
      {
        name: "setName",
        label: "اسم الديكور",
        type: "text",
        placeholder: "اسم قطعة الديكور",
      },
      {
        name: "condition",
        label: "الحالة",
        type: "select",
        options: [
          { value: "excellent", label: "ممتاز" },
          { value: "good", label: "جيد" },
          { value: "fair", label: "مقبول" },
          { value: "poor", label: "سيء" },
        ],
      },
      {
        name: "category",
        label: "الفئة",
        type: "select",
        options: [
          { value: "furniture", label: "أثاث" },
          { value: "props", label: "إكسسوارات" },
          { value: "structural", label: "هياكل" },
        ],
      },
    ],
  },
  "productivity-analyzer": {
    icon: BarChart3,
    color: "#f97316",
    endpoint: artDirectorApiPath("/analyze/productivity"),
    requestType: "analyze",
    inputs: [
      {
        name: "period",
        label: "الفترة",
        type: "select",
        options: [
          { value: "daily", label: "يومي" },
          { value: "weekly", label: "أسبوعي" },
          { value: "monthly", label: "شهري" },
        ],
      },
      {
        name: "department",
        label: "القسم",
        type: "text",
        placeholder: "اسم القسم",
      },
    ],
  },
  "documentation-generator": {
    icon: FileText,
    color: "#8b5cf6",
    endpoint: artDirectorApiPath("/documentation/generate"),
    requestType: "generate-book",
    inputs: [
      {
        name: "projectName",
        label: "اسم المشروع",
        type: "text",
        placeholder: "اسم الفيلم",
      },
      {
        name: "projectNameAr",
        label: "اسم المشروع (عربي)",
        type: "text",
        placeholder: "الاسم بالعربية",
      },
      {
        name: "director",
        label: "المخرج",
        type: "text",
        placeholder: "اسم المخرج",
      },
      {
        name: "productionCompany",
        label: "شركة الإنتاج",
        type: "text",
        placeholder: "اسم الشركة",
      },
    ],
  },
  "mr-previz-studio": {
    icon: Box,
    color: "#06b6d4",
    endpoint: artDirectorApiPath("/xr/previz/create-scene"),
    requestType: "create-scene",
    inputs: [
      {
        name: "name",
        label: "اسم المشهد",
        type: "text",
        placeholder: "مثال: المشهد الافتتاحي",
      },
      {
        name: "description",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف تفصيلي للمشهد...",
      },
      {
        name: "environment",
        label: "البيئة",
        type: "select",
        options: [
          { value: "indoor", label: "داخلي" },
          { value: "outdoor", label: "خارجي" },
          { value: "studio", label: "استوديو" },
          { value: "virtual", label: "افتراضي" },
        ],
      },
      {
        name: "width",
        label: "العرض (متر)",
        type: "number",
        placeholder: "10",
      },
      {
        name: "height",
        label: "الارتفاع (متر)",
        type: "number",
        placeholder: "3",
      },
      {
        name: "depth",
        label: "العمق (متر)",
        type: "number",
        placeholder: "10",
      },
    ],
  },
  "virtual-set-editor": {
    icon: Clapperboard,
    color: "#f43f5e",
    endpoint: artDirectorApiPath("/xr/set-editor/create"),
    requestType: "create-set",
    inputs: [
      {
        name: "name",
        label: "اسم الديكور",
        type: "text",
        placeholder: "مثال: غرفة المعيشة",
      },
      {
        name: "description",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف الديكور...",
      },
      {
        name: "realTimeRendering",
        label: "عرض فوري",
        type: "select",
        options: [
          { value: "true", label: "نعم" },
          { value: "false", label: "لا" },
        ],
      },
    ],
  },
  "cinema-skills-trainer": {
    icon: GraduationCap,
    color: "#10b981",
    endpoint: artDirectorApiPath("/training/scenarios"),
    requestType: "list-scenarios",
    inputs: [
      {
        name: "category",
        label: "الفئة",
        type: "select",
        options: [
          { value: "all", label: "جميع السيناريوهات" },
          { value: "lighting", label: "الإضاءة" },
          { value: "camera", label: "الكاميرا" },
          { value: "art-direction", label: "إدارة الفن" },
          { value: "set-design", label: "تصميم الديكور" },
        ],
      },
      {
        name: "difficulty",
        label: "المستوى",
        type: "select",
        options: [
          { value: "all", label: "جميع المستويات" },
          { value: "beginner", label: "مبتدئ" },
          { value: "intermediate", label: "متوسط" },
          { value: "advanced", label: "متقدم" },
        ],
      },
    ],
  },
  "immersive-concept-art": {
    icon: Cuboid,
    color: "#f59e0b",
    endpoint: artDirectorApiPath("/concept-art/create-project"),
    requestType: "create-project",
    inputs: [
      {
        name: "name",
        label: "اسم المشروع",
        type: "text",
        placeholder: "مثال: التصميم المفاهيمي للفيلم",
      },
      {
        name: "description",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف رؤية المشروع...",
      },
      {
        name: "style",
        label: "النمط الفني",
        type: "select",
        options: [
          { value: "realistic", label: "واقعي" },
          { value: "stylized", label: "منمق" },
          { value: "painterly", label: "فني" },
          { value: "sci-fi", label: "خيال علمي" },
          { value: "fantasy", label: "خيالي" },
        ],
      },
      {
        name: "targetPlatform",
        label: "المنصة المستهدفة",
        type: "select",
        options: [
          { value: "vr", label: "الواقع الافتراضي" },
          { value: "ar", label: "الواقع المعزز" },
          { value: "desktop", label: "سطح المكتب" },
        ],
      },
    ],
  },
  "virtual-production-engine": {
    icon: Video,
    color: "#8b5cf6",
    endpoint: artDirectorApiPath("/virtual-production/create"),
    requestType: "create-production",
    inputs: [
      {
        name: "name",
        label: "اسم الإنتاج",
        type: "text",
        placeholder: "مثال: مشروع LED Wall",
      },
      {
        name: "description",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف الإنتاج الافتراضي...",
      },
      {
        name: "ledWallWidth",
        label: "عرض شاشة LED (متر)",
        type: "number",
        placeholder: "12",
      },
      {
        name: "ledWallHeight",
        label: "ارتفاع شاشة LED (متر)",
        type: "number",
        placeholder: "4",
      },
      {
        name: "cameraType",
        label: "نوع الكاميرا",
        type: "select",
        options: [
          { value: "cinema", label: "سينمائية" },
          { value: "broadcast", label: "بث" },
          { value: "dslr", label: "DSLR" },
        ],
      },
    ],
  },
};

export type ToolId = keyof typeof toolConfigs;
