/**
 * @fileoverview مكون حاوية الإشعارات
 *
 * هذا المكون يعرض إشعارات Toast بشكل متحرك وجميل.
 *
 * السبب: نوفر تجربة مستخدم أفضل من alert() مع إمكانية
 * عرض إشعارات متعددة وتخصيص مظهرها.
 */

import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import React from "react";

import type {
  Toast,
  ToastType,
} from "../../application/workspace/use-toast-queue";

/**
 * خصائص المكون
 */
interface ToastContainerProps {
  /** قائمة الإشعارات */
  toasts: Toast[];
  /** دالة إزالة الإشعار */
  onDismiss: (id: string) => void;
}

/**
 * تكوين أنماط كل نوع إشعار
 */
const toastStyles: Record<
  ToastType,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    bg: "bg-black/72 backdrop-blur-xl",
    border: "border-emerald-500/50",
    text: "text-emerald-200",
    icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  },
  error: {
    bg: "bg-black/72 backdrop-blur-xl",
    border: "border-red-500/50",
    text: "text-red-200",
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
  },
  warning: {
    bg: "bg-black/72 backdrop-blur-xl",
    border: "border-yellow-500/50",
    text: "text-yellow-200",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  },
  info: {
    bg: "bg-black/72 backdrop-blur-xl",
    border: "border-blue-500/50",
    text: "text-blue-200",
    icon: <Info className="w-5 h-5 text-blue-400" />,
  },
};

/**
 * مكون الإشعار الواحد
 */
const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg
        ${style.bg} ${style.border} ${style.text}
        animate-fadeIn
      `}
      role="alert"
      aria-live="polite"
    >
      {style.icon}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="إغلاق الإشعار"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * حاوية الإشعارات
 *
 * تعرض جميع الإشعارات النشطة في أسفل يسار الشاشة.
 *
 * @example
 * ```tsx
 * const { toasts, dismiss } = useToast();
 * return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
 * ```
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-6 z-50 w-80 space-y-2"
      aria-label="الإشعارات"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainer;
