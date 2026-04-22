export type BreakappRole = "director" | "crew" | "runner";
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface BreakappTokenPayload {
  sub: string;
  projectId: string;
  role: BreakappRole;
  exp: number;
  iat: number;
}

export interface BreakappSessionRecord {
  id: string;
  projectId: string;
  lat: number;
  lng: number;
  createdAt: string;
  createdBy: string;
}

export interface BreakappOrderItemRecord {
  menuItemId: string;
  quantity: number;
}

export interface BreakappOrderRecord {
  id: string;
  sessionId: string;
  userId: string;
  vendorId: string;
  items: BreakappOrderItemRecord[];
  status: OrderStatus;
  created_at: string;
}

export interface BreakappVendorRecord {
  id: string;
  name: string;
  fixed_location: { lat: number; lng: number };
  is_mobile?: boolean;
}

export interface BreakappMenuItemRecord {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  available: boolean;
}

export interface BreakappRunnerLocation {
  runnerId: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface BreakappStore {
  sessions: BreakappSessionRecord[];
  orders: BreakappOrderRecord[];
  runnerLocations: Record<string, BreakappRunnerLocation>;
}

export const SEEDED_VENDORS: BreakappVendorRecord[] = [
  {
    id: "vendor-cairo-craft",
    name: "Cairo Craft Catering",
    fixed_location: { lat: 30.0444, lng: 31.2357 },
    is_mobile: true,
  },
  {
    id: "vendor-nile-bistro",
    name: "Nile Bistro",
    fixed_location: { lat: 30.0333, lng: 31.2333 },
  },
  {
    id: "vendor-studio-fuel",
    name: "Studio Fuel",
    fixed_location: { lat: 30.0495, lng: 31.2243 },
    is_mobile: true,
  },
];

export const SEEDED_MENU_ITEMS: BreakappMenuItemRecord[] = [
  {
    id: "menu-craft-breakfast-box",
    vendorId: "vendor-cairo-craft",
    name: "Breakfast Box",
    description: "كرواسون، فاكهة، وقهوة",
    available: true,
  },
  {
    id: "menu-craft-energy-wrap",
    vendorId: "vendor-cairo-craft",
    name: "Energy Wrap",
    description: "راب دجاج وخضار",
    available: true,
  },
  {
    id: "menu-nile-pasta",
    vendorId: "vendor-nile-bistro",
    name: "Nile Pasta",
    description: "باستا بصلصة الطماطم والريحان",
    available: true,
  },
  {
    id: "menu-nile-salad",
    vendorId: "vendor-nile-bistro",
    name: "Fresh Salad",
    description: "سلطة موسمية",
    available: true,
  },
  {
    id: "menu-studio-burger",
    vendorId: "vendor-studio-fuel",
    name: "Studio Burger",
    description: "برجر لحم مع بطاطس",
    available: true,
  },
  {
    id: "menu-studio-protein-bowl",
    vendorId: "vendor-studio-fuel",
    name: "Protein Bowl",
    description: "أرز بني مع دجاج وخضار",
    available: true,
  },
];
