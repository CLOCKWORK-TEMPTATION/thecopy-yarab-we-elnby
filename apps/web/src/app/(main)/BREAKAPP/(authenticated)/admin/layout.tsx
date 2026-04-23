"use client";

import { RoleGuard } from "@the-copy/breakapp/guards/RoleGuard";

const ALLOWED = ["admin"] as const;

export default function AdminRoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={ALLOWED}>{children}</RoleGuard>;
}
