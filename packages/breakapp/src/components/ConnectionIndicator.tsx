'use client';

/**
 * مؤشر حالة الاتصال — ConnectionIndicator
 *
 * @description
 * نسخة مدمجة من ConnectionTest تُعرض كـ pill/badge صغير داخل topbar الموحّد.
 * تفحص اتصال API دورياً (كل 30 ثانية) وتُظهر حالة socket الواردة من hook
 * useSocket. مصممة للاستخدام في الحواف العلوية، ليس في منتصف الشاشة.
 *
 * السبب: الوكلاء الآخرون يحتاجون مؤشراً عالمياً خفيف الحجم يُدمج في AppShell
 * افتراضياً، ويبقى صالحاً للاستخدام المستقل في صفحات التشخيص.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { api } from '../lib/auth';
import { useSocket } from '../hooks/useSocket';
import type { ConnectionState, ConnectionStatus } from '../lib/types';

/**
 * خيارات ConnectionIndicator
 */
export interface ConnectionIndicatorProps {
  /**
   * فاصل إعادة فحص API بالملّي ثانية (افتراضياً 30 ثانية)
   */
  pollIntervalMs?: number;
  /**
   * هل نُظهر نصاً وصفياً بجانب النقطة (افتراضياً true)
   */
  showLabel?: boolean;
  /**
   * classNames إضافية للحاوي الخارجي
   */
  className?: string;
}

/**
 * ألوان حالة الاتصال وفق نظام tailwind داخلي
 */
const STATE_STYLE: Record<ConnectionState, { dot: string; text: string; ring: string }> = {
  connected: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    ring: 'ring-emerald-400/30',
  },
  disconnected: {
    dot: 'bg-red-400',
    text: 'text-red-300',
    ring: 'ring-red-400/30',
  },
  checking: {
    dot: 'bg-amber-300 animate-pulse',
    text: 'text-amber-200',
    ring: 'ring-amber-300/30',
  },
};

/**
 * تسميات الحالة بالعربية
 */
const STATE_LABEL: Record<ConnectionState, string> = {
  connected: 'متصل',
  disconnected: 'منقطع',
  checking: 'يفحص',
};

/**
 * مؤشر مدمج لحالة API + Socket
 *
 * @param props - خيارات العرض
 */
export function ConnectionIndicator({
  pollIntervalMs = 30_000,
  showLabel = true,
  className = '',
}: ConnectionIndicatorProps): ReactElement {
  const [status, setStatus] = useState<ConnectionStatus>({
    api: 'checking',
    socket: 'checking',
  });

  const { connected: socketConnected, error: socketError } = useSocket({
    autoConnect: true,
    auth: false,
  });

  /**
   * فحص اتصال API عبر /health
   */
  const testApi = useCallback(async (): Promise<void> => {
    try {
      await api.get('/health');
      setStatus((prev) => ({
        ...prev,
        api: 'connected',
        apiMessage: 'API متصل',
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'فشل الاتصال';
      setStatus((prev) => ({
        ...prev,
        api: 'disconnected',
        apiMessage: message,
      }));
    }
  }, []);

  useEffect(() => {
    void testApi();
    if (pollIntervalMs <= 0) {
      return;
    }
    const id = setInterval(() => {
      void testApi();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [testApi, pollIntervalMs]);

  useEffect(() => {
    if (socketConnected) {
      setStatus((prev) => ({
        ...prev,
        socket: 'connected',
        socketMessage: 'Socket متصل',
      }));
    } else if (socketError) {
      setStatus((prev) => ({
        ...prev,
        socket: 'disconnected',
        socketMessage: socketError,
      }));
    }
  }, [socketConnected, socketError]);

  const apiStyle = useMemo(() => STATE_STYLE[status.api], [status.api]);
  const socketStyle = useMemo(() => STATE_STYLE[status.socket], [status.socket]);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-flex items-center gap-1.5 ${apiStyle.text}`}
        title={status.apiMessage ?? ''}
      >
        <span className={`h-2 w-2 rounded-full ring-2 ${apiStyle.dot} ${apiStyle.ring}`} />
        {showLabel && (
          <span className="text-xs font-cairo">
            API · {STATE_LABEL[status.api]}
          </span>
        )}
      </span>
      <span className="h-3 w-px bg-white/15" aria-hidden="true" />
      <span
        className={`inline-flex items-center gap-1.5 ${socketStyle.text}`}
        title={status.socketMessage ?? ''}
      >
        <span className={`h-2 w-2 rounded-full ring-2 ${socketStyle.dot} ${socketStyle.ring}`} />
        {showLabel && (
          <span className="text-xs font-cairo">
            Socket · {STATE_LABEL[status.socket]}
          </span>
        )}
      </span>
    </div>
  );
}

export default ConnectionIndicator;
