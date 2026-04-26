import type {
  BreakdownReportScene,
  BreakdownSceneAnalysis,
  SceneHeader,
  ShootingScheduleDay,
  ShootingScheduleItem,
  TimeOfDay,
} from './types';

export const ELEMENT_COLORS: Record<string, string> = {
  CAST: '#FF0000',
  EXTRAS: '#FFD700',
  STUNTS: '#FFA500',
  PROPS: '#800080',
  SET_DRESSING: '#9370DB',
  SFX: '#0000FF',
  VFX: '#00BFFF',
  VEHICLES: '#FF69B4',
  ANIMALS: '#8B4513',
  WARDROBE: '#008000',
  MAKEUP: '#FF1493',
  SOUND: '#00CED1',
  EQUIPMENT: '#696969',
  CONTINUITY: '#FF4500',
  GRAPHICS: '#06B6D4',
};

export function pageCountToText(pageCount: number): string {
  const eighths = Math.max(1, Math.round(pageCount * 8));
  const whole = Math.floor(eighths / 8);
  const remainder = eighths % 8;

  if (remainder === 0) {
    return `${whole}`;
  }

  if (whole === 0) {
    return `${remainder}/8`;
  }

  return `${whole} ${remainder}/8`;
}

export function estimateScenePageCount(content: string): number {
  const normalized = content.trim();
  if (!normalized) {
    return 0.125;
  }

  const words = normalized.split(/\s+/).filter(Boolean).length;
  const estimatedPages = words / 125;
  return Math.max(0.125, Math.round(estimatedPages * 8) / 8);
}

export function estimateShootingTime(pageCount: number): number {
  return Math.max(1, Math.ceil(pageCount * 1.5));
}

export function estimateShootingDays(totalPages: number, dailyCapacity = 3): number {
  return Math.max(1, Math.ceil(totalPages / dailyCapacity));
}

export function validateSceneHeader(header: SceneHeader): string[] {
  const errors: string[] = [];

  if (header.sceneNumber <= 0) {
    errors.push('رقم المشهد يجب أن يكون أكبر من صفر');
  }

  if (!header.location.trim()) {
    errors.push('الموقع غير واضح في رأس المشهد');
  }

  if (header.pageCount <= 0) {
    errors.push('عدد صفحات المشهد غير صالح');
  }

  if (header.storyDay <= 0) {
    errors.push('اليوم الدرامي يجب أن يكون أكبر من صفر');
  }

  return errors;
}

export function formatSceneHeader(header: SceneHeader): string {
  return `مشهد ${header.sceneNumber} - ${header.sceneType}. ${header.location} - ${header.timeOfDay} (${pageCountToText(header.pageCount)}) - يوم ${header.storyDay}`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clampMetric(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function timeSortValue(timeOfDay: TimeOfDay): number {
  switch (timeOfDay) {
    case 'DAWN':
      return 1;
    case 'MORNING':
      return 2;
    case 'DAY':
      return 3;
    case 'EVENING':
      return 4;
    case 'DUSK':
      return 5;
    case 'NIGHT':
      return 6;
    default:
      return 7;
  }
}

function buildScheduleItem(scene: BreakdownReportScene): ShootingScheduleItem {
  return {
    sceneId: scene.sceneId,
    sceneNumber: scene.headerData.sceneNumber,
    header: scene.header,
    location: scene.headerData.location,
    timeOfDay: scene.headerData.timeOfDay,
    estimatedHours: estimateShootingTime(scene.headerData.pageCount),
    pageCount: scene.headerData.pageCount,
  };
}

function needsNewScheduleGroup(
  currentGroup: ShootingScheduleDay | null,
  item: ShootingScheduleItem
): boolean {
  return (
    currentGroup?.location !== item.location ||
    currentGroup.timeOfDay !== item.timeOfDay ||
    currentGroup.estimatedHours + item.estimatedHours > 12
  );
}

export function generateShootingSchedule(
  scenes: BreakdownReportScene[]
): ShootingScheduleDay[] {
  const sortedScenes = [...scenes].sort((left, right) => {
    if (left.headerData.location !== right.headerData.location) {
      return left.headerData.location.localeCompare(right.headerData.location, 'ar');
    }

    if (left.headerData.timeOfDay !== right.headerData.timeOfDay) {
      return timeSortValue(left.headerData.timeOfDay) - timeSortValue(right.headerData.timeOfDay);
    }

    return left.headerData.sceneNumber - right.headerData.sceneNumber;
  });

  const schedule: ShootingScheduleDay[] = [];
  let currentGroup: ShootingScheduleDay | null = null;

  for (const scene of sortedScenes) {
    const item = buildScheduleItem(scene);

    if (needsNewScheduleGroup(currentGroup, item)) {
      currentGroup = {
        dayNumber: schedule.length + 1,
        location: item.location,
        timeOfDay: item.timeOfDay,
        scenes: [],
        estimatedHours: 0,
        totalPages: 0,
      };
      schedule.push(currentGroup);
    }

    if (!currentGroup) {
      continue;
    }

    currentGroup.scenes.push(item);
    currentGroup.estimatedHours += item.estimatedHours;
    currentGroup.totalPages += item.pageCount;
  }

  return schedule;
}

export function buildElementsByCategory(
  scenes: BreakdownReportScene[]
): Record<string, number> {
  return scenes.reduce<Record<string, number>>((accumulator, scene) => {
    scene.analysis.elements.forEach((element) => {
      accumulator[element.category] = (accumulator[element.category] || 0) + 1;
    });
    return accumulator;
  }, {});
}

export function buildSummaryText(scenes: BreakdownReportScene[]): string {
  const totalScenes = scenes.length;
  const totalCast = scenes.reduce(
    (sum, scene) => sum + scene.analysis.cast.length,
    0
  );
  const totalLocations = new Set(
    scenes.map((scene) => scene.headerData.location)
  ).size;
  const totalWarnings = scenes.reduce(
    (sum, scene) => sum + scene.analysis.warnings.length,
    0
  );

  return `تم تحليل ${totalScenes} مشهد، مع ${totalCast} شخصية و${totalLocations} موقعاً رئيسياً. رُصد ${totalWarnings} تحذيراً إنتاجياً يحتاج مراجعة.`;
}

export function buildSceneStats(
  analysis: Omit<BreakdownSceneAnalysis, 'stats' | 'elements'>
): BreakdownSceneAnalysis['stats'] {
  return {
    cast: analysis.cast.length,
    extras: analysis.extras.length,
    extrasGroups: analysis.extrasGroups.length,
    silentBits: analysis.silentBits.length,
    props: analysis.props.length,
    handProps: analysis.handProps.length,
    setDressing: analysis.setDressing.length,
    costumes: analysis.costumes.length,
    makeup: analysis.makeup.length,
    sound: analysis.sound.length,
    soundRequirements: analysis.soundRequirements.length,
    equipment: analysis.equipment.length,
    specialEquipment: analysis.specialEquipment.length,
    vehicles: analysis.vehicles.length,
    stunts: analysis.stunts.length,
    animals: analysis.animals.length,
    spfx: analysis.spfx.length,
    vfx: analysis.vfx.length,
    graphics: analysis.graphics.length,
    continuity: analysis.continuity.length + analysis.continuityNotes.length,
  };
}
