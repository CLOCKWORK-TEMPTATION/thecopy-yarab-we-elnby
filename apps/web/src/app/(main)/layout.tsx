"use client";

import { Logo } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { DESKTOP_WEB_APP_FRAME_CLASS } from "@/lib/desktop-shell";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/editor")) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider
      className={DESKTOP_WEB_APP_FRAME_CLASS}
      data-layout-mode="desktop-locked"
    >
      <Sidebar collapsible="none">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 text-xs text-muted-foreground">
            &copy; 2025 النسخة
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-[60px] items-center justify-between gap-4 border-b bg-card px-6">
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
