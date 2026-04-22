/**
 * تعريف الأدوار والصلاحيات — Role-Based Access Control
 *
 * @description
 * يحدد الأدوار المتاحة والمسارات المسموح بها لكل دور
 * لضمان عدم وصول المستخدمين لصفحات غير مصرح لهم بها
 */

export type UserRole = "director" | "crew" | "runner" | "admin";

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
    ],
    defaultRedirect: "/BREAKAPP/dashboard",
  },
  crew: {
    label: "عضو الطاقم",
    allowedPaths: ["/BREAKAPP/dashboard", "/BREAKAPP/crew/menu"],
    defaultRedirect: "/BREAKAPP/dashboard",
  },
  runner: {
    label: "عامل التوصيل",
    allowedPaths: ["/BREAKAPP/dashboard", "/BREAKAPP/runner/track"],
    defaultRedirect: "/BREAKAPP/dashboard",
  },
  admin: {
    label: "المدير",
    allowedPaths: [
      "/BREAKAPP/dashboard",
      "/BREAKAPP/director",
      "/BREAKAPP/crew/menu",
      "/BREAKAPP/runner/track",
    ],
    defaultRedirect: "/BREAKAPP/dashboard",
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
