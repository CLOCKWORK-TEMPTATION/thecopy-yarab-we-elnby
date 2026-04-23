export type BreakappRole =
  | 'director'
  | 'crew'
  | 'runner'
  | 'vendor'
  | 'admin';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export type SessionStatus = 'active' | 'ended' | 'cancelled';

export type BatchStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface BreakappTokenPayload {
  sub: string;
  projectId: string;
  role: BreakappRole;
  exp: number;
  iat: number;
}

export interface BreakappOrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface BreakappVendorView {
  id: string;
  name: string;
  isMobile: boolean;
  lat: number | null;
  lng: number | null;
  ownerUserId: string | null;
}

export interface BreakappMenuItemView {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  price: number | null;
  available: boolean;
  vendor?: { name: string };
}

export interface BreakappSessionView {
  id: string;
  projectId: string;
  directorUserId: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string | null;
  status: SessionStatus;
  createdAt: string;
}

export interface BreakappOrderItemView {
  menuItemId: string;
  quantity: number;
}

export interface BreakappOrderView {
  id: string;
  sessionId: string;
  userId: string;
  vendorId: string;
  status: OrderStatus;
  createdAt: string;
  items: BreakappOrderItemView[];
}

export interface BreakappRunnerLocationInput {
  runnerId: string;
  lat: number;
  lng: number;
  accuracy?: number | undefined;
  sessionId?: string | undefined;
  timestamp?: number | undefined;
}

export interface BreakappNearbyVendor extends BreakappVendorView {
  distance: number;
}
