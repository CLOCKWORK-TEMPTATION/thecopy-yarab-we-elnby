/**
 * @the-copy/breakapp - BREAKAPP Package
 *
 * Film production management business logic extracted from the BREAKAPP app.
 * Re-exports only the server-safe public surface.
 * Client-only hooks and components must be imported through explicit subpaths.
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  JWTPayload,
  AuthResponse,
  CurrentUser,
  ConnectionState,
  ConnectionStatus,
  SocketConnectionOptions,
  LocationPosition,
  GeolocationOptions,
  Vendor,
  VendorMapData,
  MenuItem,
  OrderItem,
  Order,
  DeliveryTask,
  ApiError,
  ApiResponse,
} from './lib/types';

export {
  JWTPayloadSchema,
  QRTokenSchema,
  AuthResponseSchema,
  ScanQRRequestSchema,
} from './lib/types';

// ── Auth / API utilities ─────────────────────────────────────────────────────
export {
  storeToken,
  getToken,
  removeToken,
  isAuthenticated,
  getCurrentUser,
  scanQRAndLogin,
  verifyToken,
  generateDeviceHash,
  api,
} from './lib/auth';

export type { UserRole } from './lib/roles';
export {
  ROLE_PERMISSIONS,
  canAccessPath,
  getDefaultRedirect,
  getRoleLabel,
  isValidRole,
} from './lib/roles';

