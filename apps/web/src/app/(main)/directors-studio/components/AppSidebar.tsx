"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Film,
  FileText,
  Layers,
  Users,
  Camera,
  Sparkles,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "لوحة التحكم",
    url: "/",
    icon: Film,
  },
  {
    title: "السيناريو",
    url: "/script",
    icon: FileText,
  },
  {
    title: "المشاهد",
    url: "/scenes",
    icon: Layers,
  },
  {
    title: "الشخصيات",
    url: "/characters",
    icon: Users,
  },
  {
    title: "تخطيط اللقطات",
    url: "/shots",
    icon: Camera,
  },
  {
    title: "المساعد الذكي",
    url: "/ai-assistant",
    icon: Sparkles,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <h2 className="text-lg font-bold font-serif">مساعد الإخراج</h2>
            <p className="text-xs text-[var(--app-text-muted)]">السينمائي AI</p>
          </div>
          <div className="p-2 rounded-md bg-[var(--app-accent)] text-white">
            <Film className="w-6 h-6" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-right">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.url}`}>
                    <a
                      href={item.url}
                      className="flex items-center justify-end gap-3"
                    >
                      <span>{item.title}</span>
                      <item.icon className="w-4 h-4" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-end"
          data-testid="button-settings"
        >
          <span className="mr-2">الإعدادات</span>
          <Settings className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-end"
          data-testid="button-help"
        >
          <span className="mr-2">المساعدة</span>
          <HelpCircle className="w-4 h-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
