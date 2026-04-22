'use client';

/**
 * مكون اختبار الاتصال - Connection Test Component
 * 
 * @description
 * يعرض حالة اتصال التطبيق بالمنصة الأم (API و WebSocket)
 * لمساعدة المستخدم على تشخيص مشاكل الاتصال
 * 
 * السبب: في بيئات التصوير الميدانية قد تكون الشبكة
 * غير مستقرة، لذا من المهم إعلام المستخدم بحالة الاتصال
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/auth';
import { useSocket } from '../hooks/useSocket';
import type { ConnectionStatus, ConnectionState } from '../lib/types';

/**
 * مكون اختبار الاتصال بالمنصة
 * 
 * @description
 * يفحص اتصال API و WebSocket بشكل دوري
 * ويعرض النتائج بألوان واضحة للمستخدم
 * 
 * @example
 * ```tsx
 * <ConnectionTest />
 * ```
 */
export default function ConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>({
    api: 'checking',
    socket: 'checking',
  });

  const { connected: socketConnected, error: socketError } = useSocket({
    autoConnect: true,
    auth: false,
  });

  /**
   * اختبار الاتصال بـ API
   */
  const testApiConnection = useCallback(async (): Promise<void> => {
    try {
      await api.get('/health');
      setStatus(prev => ({
        ...prev,
        api: 'connected',
        apiMessage: 'تم الاتصال بنجاح بالمنصة الأم',
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل الاتصال بالمنصة الأم';
      setStatus(prev => ({
        ...prev,
        api: 'disconnected',
        apiMessage: errorMessage,
      }));
    }
  }, []);

  // اختبار الاتصال عند التحميل وبشكل دوري
  useEffect(() => {
    testApiConnection();
    const interval = setInterval(testApiConnection, 30000);
    return () => clearInterval(interval);
  }, [testApiConnection]);

  // تحديث حالة Socket
  useEffect(() => {
    if (socketConnected) {
      setStatus(prev => ({
        ...prev,
        socket: 'connected',
        socketMessage: 'تم الاتصال بنجاح بمقبس المنصة الأم',
      }));
    } else if (socketError) {
      setStatus(prev => ({
        ...prev,
        socket: 'disconnected',
        socketMessage: socketError,
      }));
    }
  }, [socketConnected, socketError]);

  /**
   * الحصول على لون الحالة
   */
  const getStatusColor = useCallback((state: ConnectionState): string => {
    const colors: Record<ConnectionState, string> = {
      connected: 'bg-green-100 text-green-800 border-green-300',
      disconnected: 'bg-red-100 text-red-800 border-red-300',
      checking: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[state];
  }, []);

  /**
   * الحصول على أيقونة الحالة
   */
  const getStatusIcon = useCallback((state: ConnectionState): string => {
    const icons: Record<ConnectionState, string> = {
      connected: '✓',
      disconnected: '✗',
      checking: '⟳',
    };
    return icons[state];
  }, []);

  // عناوين URLs للعرض
  const urls = useMemo(
    () => ({
      api:
        process.env['NEXT_PUBLIC_API_URL'] ||
        process.env['NEXT_PUBLIC_BREAKAPP_API_URL'] ||
        '/api/breakapp',
      socket: process.env['NEXT_PUBLIC_SOCKET_URL'] || 'NOT_CONFIGURED',
    }),
    []
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        حالة الاتصال بالمنصة الأم
      </h3>
      
      <div className="space-y-4">
        {/* حالة اتصال API */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(status.api)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">واجهة برمجة التطبيقات (API)</span>
            <span className="text-2xl">{getStatusIcon(status.api)}</span>
          </div>
          <p className="text-sm">
            {status.apiMessage || 'جارٍ التحقق من الاتصال...'}
          </p>
          <p className="text-xs mt-2 opacity-75">
            العنوان: {urls.api}
          </p>
        </div>

        {/* حالة اتصال Socket */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(status.socket)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">المقبس (WebSocket)</span>
            <span className="text-2xl">{getStatusIcon(status.socket)}</span>
          </div>
          <p className="text-sm">
            {status.socketMessage || 'جارٍ التحقق من الاتصال...'}
          </p>
          <p className="text-xs mt-2 opacity-75">
            العنوان: {urls.socket}
          </p>
        </div>
      </div>
    </div>
  );
}
