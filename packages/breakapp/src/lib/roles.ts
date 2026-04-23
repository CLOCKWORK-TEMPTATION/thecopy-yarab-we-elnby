/**
 * تعريف الأدوار والصلاحيات — Role-Based Access Control
 *
 * @description
 * يحدد الأدوار المتاحة والمسارات المسموح بها لكل دور
 * لضمان عدم وصول المستخدمين لصفحات غير مصرح لهم بها
 */

export type UserRole = "director" | "crew" | "runner" | "admin" | "vendor";

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    label: string;
    allowedPaths: string[];
    defaultRedirect: string;
  }
> = {
  director: {
    label: "المخرج",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/director",
      "/BREAKAPP/crew/menu",
      "/BREAKAPP/runner/track",
      "/BREAKAPP/profile",
    ],
    defaultRedirect: "/BREAKAPP/director",
  },
  crew: {
    label: "عضو الطاقم",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/crew/menu",
      "/BREAKAPP/crew/orders",
      "/BREAKAPP/profile",
    ],
    defaultRedirect: "/BREAKAPP/crew/menu",
  },
  runner: {
    label: "عامل التوصيل",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/runner/track",
      "/BREAKAPP/runner/active-delivery",
      "/BREAKAPP/profile",
    ],
    defaultRedirect: "/BREAKAPP/runner/track",
  },
  admin: {
    label: "المدير",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/admin",
      "/BREAKAPP/director",
      "/BREAKAPP/crew/menu",
      "/BREAKAPP/runner/track",
      "/BREAKAPP/vendor",
      "/BREAKAPP/profile",
    ],
    defaultRedirect: "/BREAKAPP/admin",
  },
  vendor: {
    label: "المورد",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/vendor",
      "/BREAKAPP/profile",
    ],
    defaultRedirect: "/BREAKAPP/vendor/dashboard",
  },
};

export function canAccessPath(role: UserRole, path: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }

  return permissions.allowedPaths.some((allowed) => path.startsWith(allowed));
}

export function getDefaultRedirect(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.defaultRedirect || "/BREAKAPP/dashboard";
}

export function getRoleLabel(role: string): string {
  return ROLE_PERMISSIONS[role as UserRole]?.label || role;
}

export function isValidRole(role: string): role is UserRole {
  return role in ROLE_PERMISSIONS;
}
