export interface ScenarioInsights {
  canonicalTitle: string;
  sceneCount: number;
  shootingDays: number;
  preProductionDays: number;
  postProductionDays: number;
  locations: string[];
  locationCount: number;
  leadCastCount: number;
  supportingCastCount: number;
  actionLevel: number;
  stuntMoments: number;
  nightShootCount: number;
  vfxLevel: number;
  vehicleCount: number;
  crowdLevel: number;
  genre: string;
}

const ACTION_KEYWORDS = [
  /action/giu,
  /fight/giu,
  /chase/giu,
  /explosion/giu,
  /stunt/giu,
  /مطاردة/gu,
  /انفجار/gu,
  /قتال/gu,
  /أكشن/gu,
  /مشهد حركة/gu,
];

const VFX_KEYWORDS = [
  /vfx/giu,
  /cgi/giu,
  /green screen/giu,
  /visual effect/giu,
  /مؤثرات بصرية/gu,
  /جرافيك/gu,
];

const NIGHT_KEYWORDS = [/night/giu, /ليل/gu, /ليلاً/gu, /مسائي/gu];

const VEHICLE_KEYWORDS = [
  /car/giu,
  /vehicle/giu,
  /truck/giu,
  /helicopter/giu,
  /motorcycle/giu,
  /سيارة/gu,
  /مركبة/gu,
  /شاحنة/gu,
  /هليكوبتر/gu,
];

const CROWD_KEYWORDS = [
  /crowd/giu,
  /extras/giu,
  /audience/giu,
  /جمهور/gu,
  /كومبارس/gu,
  /حشد/gu,
];

const LOCATION_HEADING_PATTERN =
  /(?:^|\n)\s*(?:scene\s*\d+[:\-]?\s*)?(?:int\.?|ext\.?|داخل(?:ي)?|خارجي)\s*\.?\s*([^\n\-]+?)(?:\s*-\s*[^\n]+)?$/gim;

const TITLE_SANITIZER_PATTERN =
  /^(?:scene\s*\d+[:\-]?\s*|int\.?\s*|ext\.?\s*|مشهد\s*\d+[:\-]?\s*|داخلي\s*|خارجي\s*)/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countMatches(patterns: RegExp[], source: string): number {
  return patterns.reduce((count, pattern) => {
    const matches = source.match(pattern);
    return count + (matches?.length ?? 0);
  }, 0);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferTitle(title: string | undefined, scenario: string): string {
  if (title?.trim()) {
    return title.trim();
  }

  const firstMeaningfulLine = scenario
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstMeaningfulLine) {
    return "Untitled Production Budget";
  }

  const cleaned = firstMeaningfulLine
    .replace(TITLE_SANITIZER_PATTERN, "")
    .replace(/[:\-–—]+$/u, "")
    .trim();

  return cleaned || "Untitled Production Budget";
}

function inferLocations(scenario: string): string[] {
  const explicitLocations = [...scenario.matchAll(LOCATION_HEADING_PATTERN)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);

  if (explicitLocations.length > 0) {
    return uniqueStrings(explicitLocations).slice(0, 6);
  }

  const heuristicHits = [
    /desert/iu.test(scenario) || /صحراء/u.test(scenario) ? "Desert Exterior" : "",
    /warehouse/iu.test(scenario) || /مخزن/u.test(scenario) ? "Warehouse Interior" : "",
    /street|highway|strip/iu.test(scenario) || /شارع|طريق/u.test(scenario)
      ? "Street Location"
      : "",
    /cafe|restaurant/iu.test(scenario) || /مطعم|مقهى/u.test(scenario)
      ? "Hospitality Location"
      : "",
  ].filter(Boolean);

  return uniqueStrings(heuristicHits).slice(0, 4);
}

function inferGenre(scenario: string, actionLevel: number, vfxLevel: number): string {
  if (actionLevel >= 2) {
    return "Action";
  }

  if (vfxLevel >= 2) {
    return "Sci-Fi";
  }

  if (/comedy|كوميدي|كوميديا/iu.test(scenario)) {
    return "Comedy";
  }

  if (/horror|رعب/iu.test(scenario)) {
    return "Horror";
  }

  return "Drama";
}

function inferCastCount(scenario: string): number {
  const uppercaseCues = uniqueStrings(
    [...scenario.matchAll(/(?:^|\n)\s*([A-Z][A-Z0-9 ]{2,24})\s*(?:\(|$)/gm)].map(
      (match) => match[1] ?? ""
    )
  ).filter((name) => !["INT", "EXT", "DAY", "NIGHT", "SCENE"].includes(name.trim()));

  const dialogueCues = uniqueStrings(
    [...scenario.matchAll(/(?:^|\n)\s*([\p{L}]{2,30})\s*:/gu)].map(
      (match) => match[1] ?? ""
    )
  );

  return clamp(uppercaseCues.length || dialogueCues.length || 2, 2, 12);
}

function inferExplicitShootingDays(scenario: string): number | null {
  const match = scenario.match(/(\d+)\s*(?:day|days|يوم|أيام)/iu);
  if (!match) {
    return null;
  }

  return clamp(Number(match[1]) || 0, 1, 60);
}

export function buildScenarioInsights(
  scenario: string,
  title?: string
): ScenarioInsights {
  const sceneCount = Math.max(
    1,
    [...scenario.matchAll(/(?:^|\n)\s*(?:scene\b|مشهد\b|int\.|ext\.|داخلي|خارجي)/gim)].length
  );
  const actionLevel = clamp(countMatches(ACTION_KEYWORDS, scenario), 0, 4);
  const vfxLevel = clamp(countMatches(VFX_KEYWORDS, scenario), 0, 3);
  const nightShootCount = clamp(countMatches(NIGHT_KEYWORDS, scenario), 0, 6);
  const vehicleCount = clamp(countMatches(VEHICLE_KEYWORDS, scenario), 0, 6);
  const crowdLevel = clamp(countMatches(CROWD_KEYWORDS, scenario), 0, 4);
  const stuntMoments = clamp(actionLevel + vehicleCount, 0, 6);
  const locations = inferLocations(scenario);
  const locationCount = Math.max(1, locations.length || Math.ceil(sceneCount / 2));
  const castCount = inferCastCount(scenario);
  const explicitDays = inferExplicitShootingDays(scenario);
  const shootingDays = explicitDays
    ? explicitDays
    : clamp(
        sceneCount +
          locationCount +
          actionLevel * 2 +
          vfxLevel +
          nightShootCount +
          crowdLevel,
        3,
        32
      );

  return {
    canonicalTitle: inferTitle(title, scenario),
    sceneCount,
    shootingDays,
    preProductionDays: Math.max(3, Math.ceil(shootingDays * 0.6) + locationCount),
    postProductionDays: Math.max(5, Math.ceil(shootingDays * 0.75) + vfxLevel),
    locations,
    locationCount,
    leadCastCount: clamp(Math.min(3, castCount), 1, 3),
    supportingCastCount: clamp(Math.max(castCount - 1, 2 + crowdLevel), 2, 10),
    actionLevel,
    stuntMoments,
    nightShootCount,
    vfxLevel,
    vehicleCount,
    crowdLevel,
    genre: inferGenre(scenario, actionLevel, vfxLevel),
  };
}
