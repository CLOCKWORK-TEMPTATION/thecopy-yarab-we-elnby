export type MediaDeviceKind = "camera" | "microphone";

export type MediaDeviceStatus =
  | "denied"
  | "no-device"
  | "unsupported"
  | "busy"
  | "error";

export interface MediaDeviceFailure {
  status: MediaDeviceStatus;
  message: string;
}

const deviceLabels: Record<MediaDeviceKind, string> = {
  camera: "الكاميرا",
  microphone: "الميكروفون",
};

const fallbackLabels: Record<MediaDeviceKind, string> = {
  camera: "رفع ملف أو عينة تدريب",
  microphone: "ملفًا صوتيًا",
};

const missingDeviceLabels: Record<MediaDeviceKind, string> = {
  camera: "كاميرا",
  microphone: "ميكروفون",
};

interface BrowserFeaturePolicy {
  allowsFeature: (feature: string) => boolean;
}

interface DocumentWithMediaPolicies extends Document {
  permissionsPolicy?: BrowserFeaturePolicy;
  featurePolicy?: BrowserFeaturePolicy;
}

const policyFeatureNames: Record<MediaDeviceKind, string> = {
  camera: "camera",
  microphone: "microphone",
};

function getErrorName(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
    ? error.name
    : "";
}

function getNormalizedError(error: unknown): string {
  const name = getErrorName(error);
  const message = error instanceof Error ? error.message : String(error);
  return `${name} ${message}`.toLowerCase();
}

export function isMediaFeatureAllowedByPolicy(kind: MediaDeviceKind): boolean {
  if (typeof document === "undefined") {
    return true;
  }

  const feature = policyFeatureNames[kind];
  const currentDocument = document as DocumentWithMediaPolicies;
  const policy =
    currentDocument.permissionsPolicy ?? currentDocument.featurePolicy;

  if (!policy || typeof policy.allowsFeature !== "function") {
    return true;
  }

  try {
    return policy.allowsFeature(feature);
  } catch {
    return false;
  }
}

export function translateMediaDeviceError(
  error: unknown,
  kind: MediaDeviceKind
): MediaDeviceFailure {
  const errorName = getErrorName(error);
  const normalized = getNormalizedError(error);
  const deviceLabel = deviceLabels[kind];
  const fallbackLabel = fallbackLabels[kind];

  if (
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError"
  ) {
    return {
      status: "denied",
      message: `تم رفض صلاحية ${deviceLabel}. اسمح بها من إعدادات المتصفح أو استخدم ${fallbackLabel} كبديل.`,
    };
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return {
      status: "no-device",
      message: `لا توجد ${missingDeviceLabels[kind]} متاحة على هذا الجهاز. استخدم ${fallbackLabel} بدلًا منها.`,
    };
  }

  if (
    errorName === "NotSupportedError" ||
    errorName === "SecurityError" ||
    errorName === "TypeError" ||
    normalized.includes("not supported") ||
    normalized.includes("unsupported")
  ) {
    return {
      status: "unsupported",
      message: `المتصفح الحالي لا يدعم الوصول إلى ${deviceLabel} في هذه الجلسة. استخدم ${fallbackLabel} بدلًا منها.`,
    };
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return {
      status: "busy",
      message: `${deviceLabel} مشغول أو غير قابل للقراءة الآن. أغلق أي تطبيق آخر يستخدمه ثم أعد المحاولة.`,
    };
  }

  return {
    status: "error",
    message: `تعذر تفعيل ${deviceLabel}. استخدم ${fallbackLabel} كبديل ثم أعد المحاولة لاحقًا.`,
  };
}
