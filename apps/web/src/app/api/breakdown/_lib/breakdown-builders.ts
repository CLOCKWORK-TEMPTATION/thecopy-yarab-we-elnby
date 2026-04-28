import type {
  BreakdownReportScene,
  CastMember,
  ShootingScheduleDay,
  ShootingScheduleItem,
} from "@/app/(main)/breakdown/domain/models";

/**
 * توليد جدول تصوير مبسط من قائمة المشاهد
 */
export function buildShootingSchedule(
  scenes: BreakdownReportScene[]
): ShootingScheduleDay[] {
  const days: ShootingScheduleDay[] = [];
  let dayIndex = 1;

  // تجميع مشاهد الموقع نفسه معًا
  const locationGroups = new Map<string, BreakdownReportScene[]>();
  for (const scene of scenes) {
    const loc = scene.headerData.location;
    const existing = locationGroups.get(loc) ?? [];
    existing.push(scene);
    locationGroups.set(loc, existing);
  }

  for (const [location, locationScenes] of locationGroups) {
    const items: ShootingScheduleItem[] = locationScenes.map((s) => ({
      sceneId: s.sceneId,
      sceneNumber: s.headerData.sceneNumber,
      header: s.header,
      location: s.headerData.location,
      timeOfDay: s.headerData.timeOfDay,
      estimatedHours: 2 + s.headerData.pageCount,
      pageCount: s.headerData.pageCount,
    }));

    const totalHours = items.reduce((sum, i) => sum + i.estimatedHours, 0);
    const totalPages = items.reduce((sum, i) => sum + i.pageCount, 0);
    const timeOfDay = locationScenes[0]?.headerData.timeOfDay ?? "DAY";

    days.push({
      dayNumber: dayIndex++,
      location,
      timeOfDay,
      scenes: items,
      estimatedHours: totalHours,
      totalPages,
    });
  }

  return days;
}

/**
 * بناء ملخص إجمالي للتقرير
 */
export function buildReportSummary(scenes: BreakdownReportScene[]): string {
  const totalScenes = scenes.length;
  const locations = new Set(scenes.map((s) => s.headerData.location)).size;
  const totalCast = new Set(
    scenes.flatMap((s) => s.analysis.cast.map((c: CastMember) => c.name))
  ).size;

  return `تقرير تفريغ ${totalScenes} مشهد | ${locations} موقع تصوير | ${totalCast} شخصية`;
}

/**
 * تجميع عناصر التفريغ حسب الفئة
 */
export function buildElementsByCategory(
  scenes: BreakdownReportScene[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const scene of scenes) {
    for (const el of scene.analysis.elements) {
      counts[el.category] = (counts[el.category] ?? 0) + 1;
    }
  }
  return counts;
}
