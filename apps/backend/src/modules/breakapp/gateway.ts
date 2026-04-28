/**
 * BREAKAPP Socket.IO Gateway
 * --------------------------
 * يضيف معالجات أحداث خاصة بـ BREAKAPP (runner:register, runner:location, order:status)
 * فوق نفس خادم Socket.IO المُهيّأ في `websocket.service.ts`.
 *
 * ملاحظة: معالجات `runner:register` و `runner:location` و `order:status` موجودة
 * بالفعل داخل websocket.service.ts كمحطة وسيطة. هذا الـ gateway يضيف:
 * - الانضمام لغرف `session:<sessionId>` لمتابعة الموقع مقصور على المخرجين.
 * - بث `runner:location:update` للمخرجين فقط عبر غرفة الجلسة.
 * - بث `session:started` و `session:ended` عند إنشاء/إنهاء جلسة.
 *
 * لا يُعاد تعريف ما في websocket.service — هو ينادي `service.updateRunnerLocation`
 * ولكن لا يبث لغرفة الجلسة. هذا الـ gateway يكمّل تلك النقطة الناقصة.
 */

import { logger } from "@/lib/logger";

import * as repo from "./repository";
import { breakappService } from "./service";

import type { Server as SocketIOServer, Socket } from "socket.io";

interface BreakappSocketEntry {
  sessionId?: string;
  role?: string;
  runnerId?: string;
}

function sessionRoom(sessionId: string): string {
  return `breakapp-session:${sessionId}`;
}

class BreakappGateway {
  private io: SocketIOServer | null = null;
  private readonly socketEntries = new Map<string, BreakappSocketEntry>();

  private getEntry(socket: Socket): BreakappSocketEntry {
    let entry = this.socketEntries.get(socket.id);
    if (!entry) {
      entry = {};
      this.socketEntries.set(socket.id, entry);
    }
    return entry;
  }

  attach(io: SocketIOServer): void {
    if (this.io) {
      logger.warn("[BreakappGateway] already attached");
      return;
    }
    this.io = io;

    io.on("connection", (socket: Socket) => {
      socket.on("disconnect", () => {
        this.socketEntries.delete(socket.id);
      });

      socket.on(
        "breakapp:session:join",
        async (data: { sessionId?: string; role?: string }) => {
          if (!data?.sessionId) return;
          const session = await repo
            .getSession(data.sessionId)
            .catch(() => null);
          if (!session) return;
          const room = sessionRoom(data.sessionId);
          await socket.join(room);
          const entry = this.getEntry(socket);
          entry.sessionId = data.sessionId;
          if (data.role) entry.role = data.role;
          socket.emit("breakapp:session:joined", {
            sessionId: data.sessionId,
            room,
            timestamp: new Date().toISOString(),
          });
        },
      );

      socket.on(
        "breakapp:runner:location",
        async (data: {
          runnerId?: string;
          sessionId?: string;
          lat?: number;
          lng?: number;
          accuracy?: number;
        }) => {
          if (
            !data?.runnerId ||
            typeof data.lat !== "number" ||
            typeof data.lng !== "number"
          ) {
            return;
          }

          await breakappService.updateRunnerLocation({
            runnerId: data.runnerId,
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy ?? undefined,
            sessionId: data.sessionId ?? undefined,
          });

          if (data.sessionId && this.io) {
            this.io
              .to(sessionRoom(data.sessionId))
              .emit("runner:location:update", {
                runnerId: data.runnerId,
                lat: data.lat,
                lng: data.lng,
                accuracy: data.accuracy ?? null,
                timestamp: new Date().toISOString(),
              });
          }
        },
      );
    });

    logger.info("[BreakappGateway] attached to Socket.IO server");
  }

  emitSessionStarted(sessionId: string, projectId: string): void {
    if (!this.io) return;
    this.io.to(sessionRoom(sessionId)).emit("session:started", {
      sessionId,
      projectId,
      timestamp: new Date().toISOString(),
    });
    this.io.emit("session:started", {
      sessionId,
      projectId,
      timestamp: new Date().toISOString(),
    });
  }

  emitSessionEnded(sessionId: string, projectId: string): void {
    if (!this.io) return;
    this.io.to(sessionRoom(sessionId)).emit("session:ended", {
      sessionId,
      projectId,
      timestamp: new Date().toISOString(),
    });
    this.io.emit("session:ended", {
      sessionId,
      projectId,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderStatusUpdate(payload: {
    orderId: string;
    status: string;
    sessionId?: string;
    vendorId?: string;
  }): void {
    if (!this.io) return;
    const body = {
      orderId: payload.orderId,
      status: payload.status,
      sessionId: payload.sessionId ?? null,
      vendorId: payload.vendorId ?? null,
      timestamp: new Date().toISOString(),
    };
    if (payload.sessionId) {
      this.io
        .to(sessionRoom(payload.sessionId))
        .emit("order:status:update", body);
    }
    this.io.emit("order:status:update", body);
  }

  emitTaskNew(payload: {
    id: string;
    vendorId: string;
    vendorName: string;
    items: number;
    sessionId: string;
  }): void {
    if (!this.io) return;
    this.io.emit("task:new", {
      ...payload,
      status: "pending",
      timestamp: new Date().toISOString(),
    });
  }
}

export const breakappGateway = new BreakappGateway();
