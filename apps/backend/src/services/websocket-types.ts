import { Socket } from "socket.io";

/**
 * Extended Socket interface with custom properties
 */
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  authenticated?: boolean;
  authExpiresAtMs?: number;
}
