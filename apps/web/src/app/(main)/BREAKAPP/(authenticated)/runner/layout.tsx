"use client";

import { RoleGuard } from "@the-copy/breakapp/guards/RoleGuard";

const ALLOWED = ["runner", "admin"] as const;

export default function RunnerRoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={ALLOWED}>{children}</RoleGuard>;
}
