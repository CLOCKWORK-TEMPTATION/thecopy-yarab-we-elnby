"use client";

/**
 * @fileoverview استوديو الممثل الذكي - المكون الرئيسي
 * تطبيق شامل لتدريب الممثلين باستخدام الذكاء الاصطناعي
 * يتضمن: تحليل النصوص، شريك المشهد، تمارين الصوت، التحليل البصري، وغيرها
 */

import { useState, useCallback, useEffect, useRef } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useWebcamAnalysis } from "../hooks/useWebcamAnalysis";
import {
  SAMPLE_SCRIPT,
  VOCAL_EXERCISES,
  ACTING_METHODOLOGIES,
  AR_FEATURES,
  GESTURE_CONTROLS,
  SHOT_TYPES,
} from "../types/constants";

import { VoiceCoach } from "./VoiceCoach";

// استيراد المكونات من مجلد studio
import {
  useStudioState,
  useAuth,
  LoginPage,
  RegisterPage,
  HomePage,
  DemoPage,
  VoiceCoachPage,
  ScriptAnalysis,
  ScenePartner,
  Recording,
  VocalExercises,
  RhythmAnalysis,
  WebcamAnalysis,
  ARTraining,
  Header,
  Footer,
  Notification,
} from "./studio";

// استيراد الأنواع والثوابت من الملفات المنفصلة
import type {
  User,
  Script,
  Recording,
  AnalysisResult,
  ChatMessage,
  ViewType,
  SceneRhythmAnalysis,
  WebcamAnalysisResult,
  WebcamSession,
  TeleprompterSettings,
  BlockingMark,
  CameraEyeSettings,
  HolographicPartner,
  GestureControl,
} from "../types";

// ==================== المكون الرئيسي ====================

export const ActorAiArabicStudio: React.FC = () => {
  // استخدام hooks للحالة والمصادقة
  const {
    currentView,
    user,
    theme,
    notification,
    setUser,
    showNotification,
    navigate,
    toggleTheme,
  } = useStudioState();

  const { handleLogin, handleRegister, handleLogout } = useAuth(
    setUser,
    showNotification,
    navigate
  );

  // حالة تحليل النص
  const [scriptText, setScriptText] = useState("");
  const [selectedMethodology, setSelectedMethodology] =
    useState("stanislavsky");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  // حالة شريك المشهد
  const [rehearsing, setRehearsing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // حالة التسجيل
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: "1",
      title: "مشهد الحديقة - التجربة 3",
      duration: "3:42",
      date: "2025-10-30",
      score: 82,
    },
    {
      id: "2",
      title: "مشهد اللقاء - التجربة 1",
      duration: "4:15",
      date: "2025-10-29",
      score: 76,
    },
  ]);

  // حالة النصوص
  const [scripts] = useState<Script[]>([
    {
      id: "1",
      title: "روميو وجولييت - مشهد الشرفة",
      author: "شكسبير",
      content: SAMPLE_SCRIPT,
      uploadDate: "2025-10-28",
      status: "analyzed",
    },
    {
      id: "2",
      title: "هاملت - أكون أو لا أكون",
      author: "شكسبير",
      content: "...",
      uploadDate: "2025-10-26",
      status: "analyzed",
    },
    {
      id: "3",
      title: "عربة اسمها الرغبة - المشهد 3",
      author: "تينيسي ويليامز",
      content: "...",
      uploadDate: "2025-10-25",
      status: "processing",
    },
  ]);

  // حالة تمارين الصوت
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState(0);

  // حالة تحليل إيقاع المشهد
  const [rhythmScriptText, setRhythmScriptText] = useState("");
  const [analyzingRhythm, setAnalyzingRhythm] = useState(false);
  const [rhythmAnalysis, setRhythmAnalysis] =
    useState<SceneRhythmAnalysis | null>(null);
  const [selectedRhythmTab, setSelectedRhythmTab] = useState<
    "map" | "comparison" | "monotony" | "suggestions"
  >("map");
  // حالة تحليل الأداء البصري (Webcam Analysis)
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamAnalyzing, setWebcamAnalyzing] = useState(false);
  const [webcamAnalysisTime, setWebcamAnalysisTime] = useState(0);
  const [webcamAnalysisResult, setWebcamAnalysisResult] =
    useState<WebcamAnalysisResult | null>(null);
  const [webcamSessions, setWebcamSessions] = useState<WebcamSession[]>([]);
  const [webcamPermission, setWebcamPermission] = useState<
    "granted" | "denied" | "pending"
  >("pending");
  const webcamEngine = useWebcamAnalysis();

  // حالة AR/MR
  const [arMode, setArMode] = useState<
    "setup" | "teleprompter" | "blocking" | "camera" | "partner" | "gestures"
  >("setup");
  const [teleprompterSettings, setTeleprompterSettings] =
    useState<TeleprompterSettings>({
      speed: 50,
      fontSize: 24,
      opacity: 80,
      position: "center",
    });
  const [blockingMarks, setBlockingMarks] = useState<BlockingMark[]>([
    { id: "1", x: 20, y: 30, label: "بداية", color: "#22c55e" },
    { id: "2", x: 50, y: 50, label: "وسط", color: "#3b82f6" },
    { id: "3", x: 80, y: 70, label: "نهاية", color: "#ef4444" },
  ]);
  const [cameraSettings, setCameraSettings] = useState<CameraEyeSettings>({
    focalLength: 50,
    shotType: "medium",
    aspectRatio: "16:9",
  });
  const [holographicPartner, setHolographicPartner] =
    useState<HolographicPartner>({
      character: "ليلى",
      emotion: "حب",
      intensity: 70,
      isActive: false,
    });
  const [activeGestures, setActiveGestures] =
    useState<GestureControl[]>(GESTURE_CONTROLS);
  const [arSessionActive, setArSessionActive] = useState(false);
  const [visionProConnected, setVisionProConnected] = useState(false);

  // ==================== وظائف تحليل النص ====================

  const useSampleScript = useCallback(() => {
    setScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي");
  }, [showNotification]);

  const analyzeScript = useCallback(() => {
    if (!scriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً");
      return;
    }

    setAnalyzing(true);

    // محاكاة تحليل النص
    setTimeout(() => {
      const result: AnalysisResult = {
        objectives: {
          main: "أن يكون مع ليلى ويتغلب على عقبات العائلة",
          scene: "التعبير عن الحب وتقييم مشاعر ليلى تجاهه",
          beats: [
            "مراقبة ليلى من بعيد بشوق",
            "الكشف عن الحضور والتعبير عن المشاعر",
            "تقديم الوعد بإيجاد حل",
          ],
        },
        obstacles: {
          internal: ["الخوف من الرفض", "القلق من اكتشاف العائلة"],
          external: [
            "المسافة الجسدية (الشرفة)",
            "معارضة العائلة",
            "خطر الاكتشاف",
          ],
        },
        emotionalArc: [
          { beat: 1, emotion: "شوق", intensity: 70 },
          { beat: 2, emotion: "أمل", intensity: 85 },
          { beat: 3, emotion: "حب وإصرار", intensity: 95 },
        ],
        coachingTips: [
          "ركز على الصور البصرية - انظر حقاً إلى ليلى كنور في الظلام",
          "اسمح بلحظات صمت للتنفس والتفكير قبل كل جملة",
          "اعثر على التوازن بين الشغف والضعف",
          "استخدم اللغة الشاعرية دون فقدان الأصالة العاطفية",
          "اجعل صوتك يعكس التوتر بين الحب والخوف",
        ],
      };

      setAnalysisResult(result);
      setAnalyzing(false);
      showNotification("success", "تم تحليل النص بنجاح!");
    }, 2500);
  }, [scriptText, showNotification]);

  // ==================== وظائف شريك المشهد ====================

  const startRehearsal = useCallback(() => {
    setRehearsing(true);
    setChatMessages([
      {
        role: "ai",
        text: "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول...",
      },
    ]);
  }, []);

  const sendMessage = useCallback(() => {
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = { role: "user", text: userInput };
    setChatMessages((prev) => [...prev, newMessage]);
    setUserInput("");

    // رد الذكاء الاصطناعي
    setTimeout(() => {
      const aiResponses = [
        "يا أحمد، قلبي معك، لكن العائلة تقف بيننا. ماذا سنفعل؟ 💔",
        "أنا خائفة... لكن حبك يعطيني القوة. هل ستبقى معي؟",
        "كلماتك تلمس قلبي... لكن الطريق صعب أمامنا.",
        "أثق بك يا أحمد. سنجد طريقة معاً.",
      ];

      const randomResponse =
        aiResponses[Math.floor(Math.random() * aiResponses.length)] ??
        "أنا معك.";

      setChatMessages((prev) => [
        ...prev,
        { role: "ai" as const, text: randomResponse, typing: false },
      ]);
    }, 1500);
  }, [userInput]);

  const endRehearsal = useCallback(() => {
    setRehearsing(false);
    setChatMessages([]);
    showNotification("success", "انتهت جلسة التدريب! أحسنت 👏");
  }, [showNotification]);

  // ==================== وظائف التسجيل ====================

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    showNotification("info", "بدأ التسجيل... 🎥");
  }, [showNotification]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const newRecording: Recording = {
      id: Date.now().toString(),
      title: `تسجيل جديد - ${new Date().toLocaleDateString("ar-EG")}`,
      duration,
      date:
        new Date().toISOString().split("T")[0] ??
        new Date().toLocaleDateString(),
      score: Math.floor(Math.random() * 20) + 75, // نتيجة بين 75-95
    };

    setRecordings((prev) => [newRecording, ...prev]);
    showNotification(
      "success",
      `تم حفظ التسجيل! النتيجة: ${newRecording.score}/100`
    );
  }, [recordingTime, showNotification]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ==================== وظائف تمارين الصوت ====================

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeExercise) {
      interval = setInterval(() => {
        setExerciseTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeExercise]);

  const startExercise = useCallback(
    (exerciseId: string) => {
      setActiveExercise(exerciseId);
      setExerciseTimer(0);
      showNotification("info", "ابدأ التمرين الآن!");
    },
    [showNotification]
  );

  const stopExercise = useCallback(() => {
    setActiveExercise(null);
    setExerciseTimer(0);
    showNotification("success", "أحسنت! تم إنهاء التمرين");
  }, [showNotification]);

  // ==================== وظائف وضع اختبار الحفظ ====================

  // دالة معالجة النص للحفظ - حذف كلمات بنسبة محددة

  // بدء جلسة الحفظ

  // إيقاف جلسة الحفظ

  // تفعيل وضع التلقين عند التردد

  // معالجة إدخال المستخدم في وضع الحفظ

  // التحقق من إجابة المستخدم

  // استخدام نص نموذجي

  // زيادة مستوى الصعوبة

  // تكرار الأجزاء الصعبة

  // ==================== وظائف تحليل إيقاع المشهد ====================

  const useRhythmSampleScript = useCallback(() => {
    setRhythmScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي لتحليل الإيقاع");
  }, [showNotification]);

  const analyzeSceneRhythm = useCallback(() => {
    if (!rhythmScriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً لتحليل الإيقاع");
      return;
    }

    setAnalyzingRhythm(true);

    // محاكاة تحليل الإيقاع
    setTimeout(() => {
      const analysis: SceneRhythmAnalysis = {
        overallTempo: "medium",
        rhythmScore: 78,
        rhythmMap: [
          {
            position: 0,
            intensity: 30,
            tempo: "slow",
            emotion: "ترقب",
            beat: "افتتاحية هادئة - وصف المكان",
          },
          {
            position: 15,
            intensity: 45,
            tempo: "medium",
            emotion: "شوق",
            beat: "دخول أحمد للمشهد",
          },
          {
            position: 30,
            intensity: 65,
            tempo: "medium",
            emotion: "توتر رومانسي",
            beat: "المونولوج الأول",
          },
          {
            position: 45,
            intensity: 80,
            tempo: "fast",
            emotion: "تصاعد عاطفي",
            beat: "ظهور ليلى على الشرفة",
          },
          {
            position: 60,
            intensity: 70,
            tempo: "medium",
            emotion: "حوار متوتر",
            beat: "تبادل المشاعر",
          },
          {
            position: 75,
            intensity: 90,
            tempo: "very-fast",
            emotion: "ذروة عاطفية",
            beat: "الوعد بالتغلب على العقبات",
          },
          {
            position: 90,
            intensity: 60,
            tempo: "medium",
            emotion: "أمل مشوب بالقلق",
            beat: "الختام المفتوح",
          },
        ],
        monotonyAlerts: [
          {
            startPosition: 15,
            endPosition: 35,
            severity: "medium",
            description: "فترة طويلة من الإيقاع المتوسط دون تنويع كافٍ",
            suggestion:
              "أضف لحظة صمت درامي أو تغيير مفاجئ في نبرة الصوت لكسر الرتابة",
          },
          {
            startPosition: 55,
            endPosition: 65,
            severity: "low",
            description: "الحوار يميل للنمطية في هذا القسم",
            suggestion: "جرب تسريع إيقاع بعض الجمل أو إضافة وقفات استراتيجية",
          },
        ],
        comparisons: [
          {
            aspect: "التصاعد الدرامي",
            yourScore: 75,
            optimalScore: 85,
            difference: -10,
            feedback: "يمكن تعزيز التصاعد بإضافة نبضات صغرى قبل الذروة",
          },
          {
            aspect: "التنوع الإيقاعي",
            yourScore: 70,
            optimalScore: 80,
            difference: -10,
            feedback: "أضف المزيد من التباين بين المقاطع السريعة والبطيئة",
          },
          {
            aspect: "توقيت الذروة",
            yourScore: 85,
            optimalScore: 85,
            difference: 0,
            feedback: "ممتاز! الذروة في المكان الصحيح",
          },
          {
            aspect: "الختام",
            yourScore: 72,
            optimalScore: 78,
            difference: -6,
            feedback: "الختام سريع قليلاً، فكر في إطالته لإشباع عاطفي أكبر",
          },
          {
            aspect: "الافتتاحية",
            yourScore: 80,
            optimalScore: 82,
            difference: -2,
            feedback: "جيد جداً، افتتاحية مناسبة للمشهد الرومانسي",
          },
        ],
        emotionalSuggestions: [
          {
            segment: "يا ليلى، يا قمر الليل",
            currentEmotion: "شوق عادي",
            suggestedEmotion: "شوق ملتهب",
            technique:
              "تنفس عميق قبل النداء، ثم إخراج الكلمات بنفس طويل متصاعد",
            example:
              "ابدأ بهمس ثم تصاعد تدريجي: يا... ليـ...ـلى (مد الحروف مع تصاعد)",
          },
          {
            segment: "أنتِ نور عيني وروحي",
            currentEmotion: "إعلان مباشر",
            suggestedEmotion: "اكتشاف داخلي",
            technique: "كأنك تكتشف هذه الحقيقة للمرة الأولى أثناء الكلام",
            example: "توقف قصير بين 'عيني' و'روحي' كأنك تبحث عن الكلمة الأعمق",
          },
          {
            segment: "ماذا سنفعل؟",
            currentEmotion: "تساؤل بسيط",
            suggestedEmotion: "قلق ممزوج بأمل",
            technique: "اجعل السؤال معلقاً في الهواء، لا تنهيه بشكل حاسم",
            example: "ارفع نبرتك قليلاً في النهاية مع نظرة تنتظر الجواب",
          },
          {
            segment: "سأجد طريقة، مهما كانت الصعوبات",
            currentEmotion: "وعد عادي",
            suggestedEmotion: "عزم لا يتزعزع",
            technique: "أنزل صوتك قليلاً واجعله أكثر ثباتاً - صوت القرار",
            example:
              "سأجد (وقفة قصيرة مع نظرة مباشرة) طريقة... مهما كانت الصعوبات (بثبات)",
          },
        ],
        peakMoments: [
          "لحظة ظهور ليلى على الشرفة - ذروة بصرية",
          "جملة 'حبنا أقوى من كل العوائق' - ذروة عاطفية",
          "التقاء النظرات الأول - ذروة صامتة",
        ],
        valleyMoments: [
          "الوصف الافتتاحي للحديقة - لحظة سكون ضرورية",
          "تردد ليلى قبل الرد - وقفة درامية",
        ],
        summary:
          "المشهد يتبع قوساً إيقاعياً كلاسيكياً رومانسياً مع بداية هادئة وتصاعد تدريجي نحو ذروة عاطفية. الإيقاع العام جيد لكن يمكن تحسينه بإضافة المزيد من التنوع في القسم الأوسط وإطالة لحظات الصمت الدرامي.",
      };

      setRhythmAnalysis(analysis);
      setAnalyzingRhythm(false);
      showNotification("success", "تم تحليل إيقاع المشهد بنجاح!");
    }, 3000);
  }, [rhythmScriptText, showNotification]);

  const getTempoColor = (tempo: string): string => {
    switch (tempo) {
      case "slow":
        return "bg-blue-400";
      case "medium":
        return "bg-green-400";
      case "fast":
        return "bg-orange-400";
      case "very-fast":
        return "bg-red-500";
      default:
        return "bg-white/45";
    }
  };

  const getTempoLabel = (tempo: string): string => {
    switch (tempo) {
      case "slow":
        return "بطيء";
      case "medium":
        return "متوسط";
      case "fast":
        return "سريع";
      case "very-fast":
        return "سريع جداً";
      default:
        return tempo;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "low":
        return "bg-yellow-100 border-yellow-400 text-yellow-800";
      case "medium":
        return "bg-orange-100 border-orange-400 text-orange-800";
      case "high":
        return "bg-red-100 border-red-400 text-red-800";
      default:
        return "bg-white/6 border-white/8 text-white/85";
    }
  };

  // ==================== وظائف تحليل الأداء البصري ====================

  useEffect(() => {
    setWebcamActive(webcamEngine.state.isActive);
    setWebcamAnalyzing(webcamEngine.state.isAnalyzing);
    setWebcamAnalysisTime(webcamEngine.state.analysisTime);
    setWebcamAnalysisResult(webcamEngine.state.analysisResult);
    setWebcamSessions(webcamEngine.state.sessions);
    setWebcamPermission(webcamEngine.state.permission);
  }, [webcamEngine.state]);

  // طلب إذن الكاميرا
  const requestWebcamPermission = useCallback(async () => {
    try {
      await webcamEngine.requestPermission();
      showNotification("success", "تم تفعيل الكاميرا بنجاح!");
    } catch {
      showNotification("error", "لم يتم السماح بالوصول للكاميرا");
    }
  }, [showNotification, webcamEngine]);

  // إيقاف الكاميرا
  const stopWebcam = useCallback(() => {
    webcamEngine.stopWebcam();
    showNotification("info", "تم إيقاف الكاميرا");
  }, [showNotification, webcamEngine]);

  // بدء التحليل البصري
  const startWebcamAnalysis = useCallback(() => {
    const result = webcamEngine.startAnalysis();
    if (!result.success) {
      showNotification("error", result.error ?? "يرجى تفعيل الكاميرا أولاً");
      return;
    }
    showNotification("info", "بدأ التحليل البصري... 👁️");
  }, [showNotification, webcamEngine]);

  // إيقاف التحليل وعرض النتائج
  const stopWebcamAnalysis = useCallback(() => {
    const result = webcamEngine.stopAnalysis();
    if (!result) {
      showNotification("error", "لا توجد بيانات كافية للتحليل");
      return;
    }
    showNotification(
      "success",
      `تم التحليل! النتيجة: ${result.overallScore}/100`
    );
  }, [showNotification, webcamEngine]);

  // تحديد حالة معدل الرمش
  const getBlinkStatusText = (status: "normal" | "high" | "low"): string => {
    switch (status) {
      case "high":
        return "مرتفع (قد يدل على توتر)";
      case "low":
        return "منخفض (تركيز عالي)";
      default:
        return "طبيعي";
    }
  };

  // تحديد لون حالة معدل الرمش
  const getBlinkStatusColor = (status: "normal" | "high" | "low"): string => {
    switch (status) {
      case "high":
        return "text-orange-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-green-600";
    }
  };

  // ترجمة اتجاه النظر
  const getEyeDirectionText = (direction: string): string => {
    const directions: Record<string, string> = {
      up: "للأعلى",
      down: "للأسفل",
      left: "لليسار",
      right: "لليمين",
      center: "للمركز",
      audience: "للجمهور",
    };
    return directions[direction] ?? direction;
  };

  // ==================== Auto scroll للدردشة ====================

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ==================== عرض الإشعارات ====================

  const renderNotification = () => <Notification notification={notification} />;

  // ==================== عرض الهيدر ====================

  const renderHeader = () => (
    <Header
      currentView={currentView}
      user={user}
      navigate={navigate}
      handleLogout={handleLogout}
      toggleTheme={toggleTheme}
      theme={theme}
    />
  );

  // ==================== صفحة تسجيل الدخول ====================

  const RenderLogin = () => (
    <LoginPage onLogin={handleLogin} onNavigate={navigate} />
  );

  // ==================== صفحة التسجيل ====================

  const RenderRegister = () => (
    <RegisterPage onRegister={handleRegister} onNavigate={navigate} />
  );

  // ==================== الصفحة الرئيسية ====================

  const renderHome = () => <HomePage onNavigate={navigate} />;

  // ==================== صفحة التجربة ====================

  const renderDemo = () => (
    <DemoPage
      scriptText={scriptText}
      setScriptText={setScriptText}
      selectedMethodology={selectedMethodology}
      setSelectedMethodology={setSelectedMethodology}
      analyzing={analyzing}
      analysisResult={analysisResult}
      useSampleScript={useSampleScript}
      analyzeScript={analyzeScript}
      rehearsing={rehearsing}
      chatMessages={chatMessages}
      userInput={userInput}
      setUserInput={setUserInput}
      startRehearsal={startRehearsal}
      sendMessage={sendMessage}
      endRehearsal={endRehearsal}
      isRecording={isRecording}
      recordingTime={recordingTime}
      recordings={recordings}
      startRecording={startRecording}
      stopRecording={stopRecording}
      formatTime={formatTime}
    />
  );

  // ==================== صفحة تمارين الصوت ====================

  const renderVocalExercises = () => (
    <VocalExercises
      activeExercise={activeExercise}
      exerciseTimer={exerciseTimer}
      startExercise={startExercise}
      stopExercise={stopExercise}
      formatTime={formatTime}
    />
  );

  // ==================== صفحة تحليل الأداء البصري ====================

  const renderWebcamAnalysis = () => (
    <WebcamAnalysis
      webcamActive={webcamActive}
      webcamAnalyzing={webcamAnalyzing}
      webcamAnalysisTime={webcamAnalysisTime}
      webcamAnalysisResult={webcamAnalysisResult}
      webcamPermission={webcamPermission}
      webcamEngine={webcamEngine}
      requestWebcamPermission={requestWebcamPermission}
      stopWebcam={stopWebcam}
      startWebcamAnalysis={startWebcamAnalysis}
      stopWebcamAnalysis={stopWebcamAnalysis}
      formatTime={formatTime}
      getEyeDirectionText={getEyeDirectionText}
      getBlinkStatusText={getBlinkStatusText}
      getBlinkStatusColor={getBlinkStatusColor}
    />
  );

  // ==================== صفحة تدريب AR/MR ====================

  const renderARTraining = () => (
    <ARTraining
      arMode={arMode}
      setArMode={setArMode}
      teleprompterSettings={teleprompterSettings}
      setTeleprompterSettings={setTeleprompterSettings}
      blockingMarks={blockingMarks}
      setBlockingMarks={setBlockingMarks}
      cameraSettings={cameraSettings}
      setCameraSettings={setCameraSettings}
      holographicPartner={holographicPartner}
      setHolographicPartner={setHolographicPartner}
      activeGestures={activeGestures}
      setActiveGestures={setActiveGestures}
      arSessionActive={arSessionActive}
      setArSessionActive={setArSessionActive}
      visionProConnected={visionProConnected}
    />
  );

  // ==================== صفحة اختبار الحفظ ====================

  const renderMemorization = () => (
    <Memorization
      memorizationText={memorizationText}
      setMemorizationText={setMemorizationText}
      memorizationResult={memorizationResult}
      setMemorizationResult={setMemorizationResult}
      memorizationMode={memorizationMode}
      setMemorizationMode={setMemorizationMode}
      memorizationTimer={memorizationTimer}
      setMemorizationTimer={setMemorizationTimer}
      startMemorization={startMemorization}
      stopMemorization={stopMemorization}
      formatTime={formatTime}
    />
  );

  // ==================== صفحة مدرب الصوت ====================

  const renderVoiceCoach = () => <VoiceCoachPage />;

  // ==================== صفحة إيقاع المشهد ====================

  const renderSceneRhythm = () => (
    <RhythmAnalysis
      rhythmScriptText={rhythmScriptText}
      setRhythmScriptText={setRhythmScriptText}
      analyzingRhythm={analyzingRhythm}
      rhythmAnalysis={rhythmAnalysis}
      useRhythmSampleScript={useRhythmSampleScript}
      analyzeSceneRhythm={analyzeSceneRhythm}
      getTempoLabel={getTempoLabel}
    />
  );

  // ==================== وضع اختبار الحفظ ====================

  // ==================== الـ Footer ====================

  const renderFooter = () => <Footer />;

  // ==================== تحديد المحتوى الرئيسي ====================

  const renderMainContent = () => {
    switch (currentView) {
      case "home":
        return renderHome();
      case "demo":
        return renderDemo();
      case "vocal":
        return renderVocalExercises();
      case "voicecoach":
        return renderVoiceCoach();
      case "rhythm":
        return renderSceneRhythm();
      case "webcam":
        return renderWebcamAnalysis();
      case "ar":
        return renderARTraining();
      case "dashboard":
        return renderDashboard();
      case "login":
        return <RenderLogin />;
      case "register":
        return <RenderRegister />;
      default:
        return renderHome();
    }
  };

  // ==================== العرض النهائي ====================

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "dark bg-black/14" : "bg-white/[0.04]"}`}
      dir="rtl"
    >
      {renderHeader()}
      {renderNotification()}
      <main className="container mx-auto px-4 py-8">{renderMainContent()}</main>
      {renderFooter()}
    </div>
  );
};
