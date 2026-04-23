"use client";

import { RoleGuard } from "@the-copy/breakapp/guards/RoleGuard";

const ALLOWED = ["director", "admin"] as const;

export default function DirectorRoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={ALLOWED}>{children}</RoleGuard>;
}
