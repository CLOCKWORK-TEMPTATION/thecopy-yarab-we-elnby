// VR Equipment Data

import type { VREquipment } from "../types";

export const vrEquipment: VREquipment[] = [
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
