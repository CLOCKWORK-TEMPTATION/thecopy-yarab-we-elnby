'use client';

/**
 * خطاف اتصال WebSocket - Socket Connection Hook
 * 
 * @description
 * يوفر واجهة بسيطة للتواصل في الوقت الفعلي مع الخادم
 * عبر WebSocket مع إدارة تلقائية للاتصال وإعادة الاتصال
 * 
 * السبب: التحديثات الفورية ضرورية لتتبع موقع Runner
 * وإشعارات الطلبات الجديدة دون الحاجة لإعادة التحميل
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/auth';
import type { SocketConnectionOptions } from '../lib/types';

/**
 * خيارات اتصال Socket الداخلية
 * 
 * @description
 * تمثل إعدادات socket.io-client الفعلية المُمررة لمكتبة io()
 * منفصلة عن SocketConnectionOptions لأنها تحتوي على خصائص
 * إضافية خاصة بالمكتبة مثل transports و reconnection
 */
interface InternalSocketOptions {
  transports: string[];
  withCredentials: boolean;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  auth?: { token: string };
}

/**
 * قيمة الإرجاع من خطاف useSocket
 */
interface UseSocketReturn {
  /** مثيل Socket الحالي */
  socket: Socket | null;
  /** هل الاتصال نشط */
  connected: boolean;
  /** رسالة الخطأ إن وُجدت */
  error: string | null;
  /** إرسال حدث للخادم */
  emit: (event: string, data: unknown) => void;
  /** الاشتراك في حدث */
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  /** إلغاء الاشتراك من حدث */
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  /** بدء الاتصال يدوياً */
  connect: () => void;
  /** قطع الاتصال */
  disconnect: () => void;
}

/**
 * خطاف اتصال WebSocket
 * 
 * @description
 * يدير دورة حياة اتصال Socket.io بالكامل من الإنشاء للتنظيف
 * 
 * @param options - خيارات الاتصال
 * @returns واجهة التحكم في الاتصال
 * 
 * @example
 * ```tsx
 * const { connected, emit, on } = useSocket({ auth: true });
 * 
 * useEffect(() => {
 *   on('message', (data) => console.log(data));
 * }, [on]);
 * 
 * const sendMessage = () => emit('chat', { text: 'مرحباً' });
 * ```
 */
export function useSocket(options: SocketConnectionOptions = {}): UseSocketReturn {
  const { 
    url = process.env['NEXT_PUBLIC_SOCKET_URL'] || "",
    autoConnect = true,
    auth = false 
  } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    if (!url) {
      setError("NEXT_PUBLIC_SOCKET_URL is not configured");
      setConnected(false);
      return;
    }

    // إعداد خيارات الاتصال
    const socketOptions: InternalSocketOptions = {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    // إضافة رمز المصادقة إذا كان مطلوباً
    if (auth) {
      const token = getToken();
      if (token) {
        socketOptions.auth = { token };
      }
    }

    // إنشاء اتصال Socket
    const socket = io(url, socketOptions);
    socketRef.current = socket;

    /**
     * معالج حدث الاتصال الناجح
     */
    const handleConnect = () => {
      setConnected(true);
      setError(null);

      if (auth) {
        const token = getToken();
        if (token) {
          socket.emit('authenticate', { token });
        }
      }
    };

    /**
     * معالج حدث قطع الاتصال
     */
    const handleDisconnect = () => {
      setConnected(false);
    };

    /**
     * معالج خطأ الاتصال
     */
    const handleConnectError = (err: Error) => {
      setError(err.message);
      setConnected(false);
    };

    /**
     * معالج الأخطاء العامة
     */
    const handleError = (err: string) => {
      setError(err);
    };

    // ربط معالجات الأحداث
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleError);

    const handleStorage = (event: StorageEvent) => {
      if (!auth || event.key !== 'breakapp.access_token' || !event.newValue) {
        return;
      }

      if (socket.connected) {
        socket.emit('token:refresh', { token: event.newValue });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // التنظيف عند إلغاء التحميل
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('error', handleError);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      socket.disconnect();
    };
  }, [url, autoConnect, auth]);

  /**
   * إرسال حدث للخادم
   */
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    }
  }, [connected]);

  /**
   * الاشتراك في حدث من الخادم
   */
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  /**
   * إلغاء الاشتراك من حدث
   */
  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  /**
   * بدء الاتصال يدوياً
   */
  const connect = useCallback(() => {
    if (socketRef.current && !connected) {
      socketRef.current.connect();
    }
  }, [connected]);

  /**
   * قطع الاتصال
   */
  const disconnect = useCallback(() => {
    if (socketRef.current && connected) {
      socketRef.current.disconnect();
    }
  }, [connected]);

  return {
    socket: socketRef.current,
    connected,
    error,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
}
