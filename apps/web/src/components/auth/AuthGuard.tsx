"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const currentSearch =
        typeof window === "undefined" ? "" : window.location.search;
      const redirectTarget = `${pathname}${currentSearch}`;

      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[oklch(0.145_0_0)] text-[oklch(0.985_0_0)]">
        <span className="text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
          جارٍ التحقق من المصادقة...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
