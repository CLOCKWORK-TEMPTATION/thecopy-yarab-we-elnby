"use client";

import { RoleGuard } from "@the-copy/breakapp/guards/RoleGuard";

const ALLOWED = ["crew", "director", "admin"] as const;

export default function CrewRoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={ALLOWED}>{children}</RoleGuard>;
}
