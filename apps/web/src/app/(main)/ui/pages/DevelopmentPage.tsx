import { logger } from "@/lib/ai/utils/logger";

import { useState } from "react";
import { ExportHub } from "@/app/(main)/ui/components/ExportHub";
import { TasksBoard } from "@/app/(main)/ui/components/TasksBoard";
import { VersionsPanel } from "@/app/(main)/ui/components/VersionsPanel";
import { RhythmMap } from "@/app/(main)/ui/components/RhythmMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  CheckCircle,
  Activity,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/use-notifications";

interface DevelopmentPageProps {
  isUnlocked?: boolean;
  importedSummary?: string;
}

export function DevelopmentPage({
  isUnlocked = false,
  importedSummary,
}: DevelopmentPageProps) {
  const notifications = useNotifications();
  const [showRhythmMap, setShowRhythmMap] = useState(true);

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 rounded-full bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-[var(--color-muted)]" />
          </div>
          <h2 className="text-[var(--color-text)] mb-3">ورشة التطوير مقفلة</h2>
          <p className="text-[var(--color-muted)] mb-6" dir="rtl">
            يجب إكمال التحليل السباعي (المحطة السابعة) أولاً لفتح ورشة التطوير
          </p>
          <div
            className="p-4 bg-[var(--color-surface)] rounded-lg text-[var(--color-muted)]"
            dir="rtl"
          >
            💡 انتقل إلى صفحة التحليل وأكمل جميع المحطات السبع
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-[var(--color-surface)] bg-[var(--color-panel)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[var(--color-text)] mb-1" dir="rtl">
              ورشة التطوير
            </h1>
            <p className="text-[var(--color-muted)]" dir="rtl">
              مساحة عمل متقدمة لتطوير المشروع
            </p>
          </div>
          <Badge className="bg-[var(--state-final)] text-white">مفتوحة</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Imported Summary Banner */}
          {importedSummary && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-[var(--color-accent)] mb-2" dir="rtl">
                      تم استيراد التقرير من التحليل السباعي
                    </h3>
                    <p className="text-[var(--color-text)]" dir="rtl">
                      {importedSummary}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="tasks" dir="rtl">
            <TabsList className="grid w-full grid-cols-3 bg-[var(--color-surface)]">
              <TabsTrigger
                value="tasks"
                className="data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-bg)]"
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                لوحة المهام
              </TabsTrigger>
              <TabsTrigger
                value="rhythm"
                className="data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-bg)]"
              >
                <Activity className="w-4 h-4 ml-2" />
                خريطة الإيقاع
              </TabsTrigger>
              <TabsTrigger
                value="versions"
                className="data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-bg)]"
              >
                <GitBranch className="w-4 h-4 ml-2" />
                الإصدارات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-6">
              <TasksBoard
                onTaskMove={(_taskId, from, to) => {
                  notifications.success(`تم نقل المهمة من ${from} إلى ${to}`);
                }}
                onTaskDelete={() => {
                  notifications.success("تم حذف المهمة");
                }}
                onTaskAdd={(column) => {
                  notifications.success(`تم إضافة مهمة جديدة في ${column}`);
                }}
              />
            </TabsContent>

            <TabsContent value="rhythm" className="mt-6">
              <RhythmMap
                showMap={showRhythmMap}
                onToggle={(show) => setShowRhythmMap(show)}
              />
            </TabsContent>

            <TabsContent value="versions" className="mt-6">
              <VersionsPanel
                onVersionSelect={(versionId) => {
                  logger.info("Selected version:", versionId);
                }}
                onRestore={() => {
                  notifications.success("تم استعادة الإصدار بنجاح");
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ExportHub scope="full_project" />
    </div>
  );
}
