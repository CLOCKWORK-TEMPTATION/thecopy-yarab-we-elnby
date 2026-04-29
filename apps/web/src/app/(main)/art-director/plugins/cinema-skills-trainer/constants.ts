// CineArchitect AI - Cinema Skills Trainer Constants
// ثوابت المدرب الافتراضي للمهارات السينمائية

import type { TrainingCategory, TrainingScenario, VREquipment } from "./types";

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "cam-101",
    name: "Basic Camera Movement",
    nameAr: "حركات الكاميرا الأساسية",
    category: "camera-operation",
    difficulty: "beginner",
    duration: 30,
    objectives: [
      "Master pan and tilt movements",
      "Understand dolly shots",
      "Practice tracking shots",
    ],
    equipment: ["Camera rig", "Dolly", "Tripod"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "cam-201",
    name: "Advanced Steadicam Techniques",
    nameAr: "تقنيات ستيديكام المتقدمة",
    category: "camera-operation",
    difficulty: "advanced",
    duration: 60,
    objectives: [
      "Smooth walking shots",
      "Stair navigation",
      "Complex choreography",
    ],
    equipment: ["Steadicam rig", "Vest", "Monitor"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "light-101",
    name: "Three-Point Lighting Setup",
    nameAr: "إعداد الإضاءة ثلاثية النقاط",
    category: "lighting-setup",
    difficulty: "beginner",
    duration: 45,
    objectives: [
      "Position key light",
      "Set fill light ratio",
      "Add back light",
    ],
    equipment: ["Fresnel lights", "Softboxes", "Flags", "C-stands"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "light-301",
    name: "Cinematic Night Scenes",
    nameAr: "مشاهد الليل السينمائية",
    category: "lighting-setup",
    difficulty: "expert",
    duration: 90,
    objectives: [
      "Create moonlight effect",
      "Light large exterior",
      "Manage color contrast",
    ],
    equipment: ["HMI lights", "LED panels", "Gels", "Generators"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "dir-101",
    name: "Blocking Fundamentals",
    nameAr: "أساسيات تحريك الممثلين",
    category: "directing",
    difficulty: "beginner",
    duration: 45,
    objectives: [
      "Stage actors for camera",
      "Maintain screen direction",
      "Create visual storytelling",
    ],
    equipment: ["Virtual actors", "Set pieces", "Camera"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "sound-101",
    name: "Location Sound Recording",
    nameAr: "تسجيل الصوت في الموقع",
    category: "sound-recording",
    difficulty: "intermediate",
    duration: 45,
    objectives: [
      "Microphone placement",
      "Managing ambient noise",
      "Boom operation",
    ],
    equipment: ["Boom pole", "Shotgun mic", "Lavalier mics", "Mixer"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "set-201",
    name: "Period Set Dressing",
    nameAr: "تجهيز الديكور التاريخي",
    category: "set-design",
    difficulty: "intermediate",
    duration: 60,
    objectives: [
      "Historical accuracy",
      "Color coordination",
      "Prop placement for camera",
    ],
    equipment: ["Period furniture", "Props", "Textiles", "Lighting fixtures"],
    vrRequired: true,
    aiAssisted: true,
  },
  {
    id: "vfx-201",
    name: "Green Screen Compositing",
    nameAr: "دمج الشاشة الخضراء",
    category: "visual-effects",
    difficulty: "intermediate",
    duration: 60,
    objectives: [
      "Proper lighting for keying",
      "Camera tracking markers",
      "Color matching",
    ],
    equipment: ["Green screen", "Even lighting", "Tracking markers"],
    vrRequired: true,
    aiAssisted: true,
  },
];

export const VR_EQUIPMENT: VREquipment[] = [
  {
    id: "arri-alexa",
    name: "ARRI ALEXA Mini",
    nameAr: "أري أليكسا ميني",
    type: "camera",
    model3D: "/models/arri-alexa-mini.glb",
    interactions: ["power", "record", "menu", "lens-mount", "monitor-attach"],
    tutorials: [
      {
        step: 1,
        title: "Power On",
        titleAr: "التشغيل",
        description: "Press and hold the power button",
        descriptionAr: "اضغط مع الاستمرار على زر الطاقة",
        action: "hold-power",
        validationCriteria: "camera-powered",
      },
      {
        step: 2,
        title: "Mount Lens",
        titleAr: "تركيب العدسة",
        description: "Align the lens and rotate clockwise",
        descriptionAr: "قم بمحاذاة العدسة ولفها في اتجاه عقارب الساعة",
        action: "mount-lens",
        validationCriteria: "lens-mounted",
      },
    ],
  },
  {
    id: "steadicam-ultra",
    name: "Steadicam Ultra",
    nameAr: "ستيديكام ألترا",
    type: "stabilizer",
    model3D: "/models/steadicam.glb",
    interactions: ["balance", "mount-camera", "adjust-arm", "calibrate"],
    tutorials: [
      {
        step: 1,
        title: "Wear Vest",
        titleAr: "ارتداء السترة",
        description: "Put on the support vest and adjust straps",
        descriptionAr: "ارتد سترة الدعم واضبط الأحزمة",
        action: "wear-vest",
        validationCriteria: "vest-worn",
      },
      {
        step: 2,
        title: "Connect Arm",
        titleAr: "توصيل الذراع",
        description: "Attach the iso-elastic arm",
        descriptionAr: "قم بتوصيل الذراع المرنة",
        action: "connect-arm",
        validationCriteria: "arm-connected",
      },
    ],
  },
  {
    id: "skypanel-s60",
    name: "ARRI SkyPanel S60",
    nameAr: "أري سكاي بانل S60",
    type: "lighting",
    model3D: "/models/skypanel.glb",
    interactions: ["power", "color-temp", "intensity", "effects", "dmx"],
    tutorials: [
      {
        step: 1,
        title: "Mount Light",
        titleAr: "تركيب الضوء",
        description: "Secure to stand with yoke",
        descriptionAr: "ثبت على الحامل باستخدام القوس",
        action: "mount-light",
        validationCriteria: "light-mounted",
      },
      {
        step: 2,
        title: "Set Color Temperature",
        titleAr: "ضبط درجة حرارة اللون",
        description: "Adjust color temperature using the control panel",
        descriptionAr: "اضبط درجة حرارة اللون باستخدام لوحة التحكم",
        action: "set-temp",
        validationCriteria: "temp-set",
      },
    ],
  },
];

export const DEFAULT_SKILL_LEVELS: Record<TrainingCategory, number> = {
  "camera-operation": 0,
  "lighting-setup": 0,
  "sound-recording": 0,
  directing: 0,
  "set-design": 0,
  "color-grading": 0,
  "visual-effects": 0,
  "production-management": 0,
};

export const PERFORMANCE_WEIGHTS = {
  accuracy: 0.25,
  timing: 0.2,
  technique: 0.3,
  creativity: 0.15,
  safety: 0.1,
};

export const DIFFICULTY_ORDER: (
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
)[] = ["beginner", "intermediate", "advanced", "expert"];
