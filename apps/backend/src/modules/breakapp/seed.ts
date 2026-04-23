/**
 * بذور تشغيلية لبيانات BREAKAPP.
 * تُشغَّل يدوياً عبر scripts/seed-breakapp.ts عند الحاجة.
 * لا تُستدعى تلقائياً من الخادم — السيرفيس يستخدم قاعدة البيانات حصراً.
 */

export interface SeededVendor {
  name: string;
  lat: number;
  lng: number;
  isMobile: boolean;
}

export interface SeededMenuItem {
  vendorName: string;
  name: string;
  description: string;
  available: boolean;
  price: number | null;
}

export const SEED_BREAKAPP_VENDORS: SeededVendor[] = [
  { name: 'Cairo Craft Catering', lat: 30.0444, lng: 31.2357, isMobile: true },
  { name: 'Nile Bistro', lat: 30.0333, lng: 31.2333, isMobile: false },
  { name: 'Studio Fuel', lat: 30.0495, lng: 31.2243, isMobile: true },
];

export const SEED_BREAKAPP_MENU_ITEMS: SeededMenuItem[] = [
  {
    vendorName: 'Cairo Craft Catering',
    name: 'Breakfast Box',
    description: 'كرواسون، فاكهة، وقهوة',
    available: true,
    price: 120,
  },
  {
    vendorName: 'Cairo Craft Catering',
    name: 'Energy Wrap',
    description: 'راب دجاج وخضار',
    available: true,
    price: 95,
  },
  {
    vendorName: 'Nile Bistro',
    name: 'Nile Pasta',
    description: 'باستا بصلصة الطماطم والريحان',
    available: true,
    price: 140,
  },
  {
    vendorName: 'Nile Bistro',
    name: 'Fresh Salad',
    description: 'سلطة موسمية',
    available: true,
    price: 80,
  },
  {
    vendorName: 'Studio Fuel',
    name: 'Studio Burger',
    description: 'برجر لحم مع بطاطس',
    available: true,
    price: 160,
  },
  {
    vendorName: 'Studio Fuel',
    name: 'Protein Bowl',
    description: 'أرز بني مع دجاج وخضار',
    available: true,
    price: 150,
  },
];
