"use client";

import { RoleGuard } from "@the-copy/breakapp/guards/RoleGuard";

const ALLOWED = ["vendor", "admin"] as const;

export default function VendorRoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={ALLOWED}>{children}</RoleGuard>;
}
