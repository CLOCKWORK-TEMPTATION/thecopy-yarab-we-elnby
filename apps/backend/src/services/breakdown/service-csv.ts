import type { BreakdownReportScene } from "./types";

export function buildCsvRow(scene: BreakdownReportScene): (string | number)[] {
  return [
    scene.headerData.sceneNumber,
    scene.headerData.sceneType,
    `"${scene.headerData.location.replace(/"/g, '""')}"`,
    scene.headerData.timeOfDay,
    scene.headerData.pageCount,
    scene.headerData.storyDay,
    scene.analysis.cast.length,
    scene.analysis.extras.length,
    scene.analysis.props.length,
    scene.analysis.setDressing.length,
    scene.analysis.sound.length,
    scene.analysis.equipment.length,
    scene.analysis.vehicles.length,
    scene.analysis.stunts.length,
    scene.analysis.animals.length,
    scene.analysis.spfx.length,
    scene.analysis.vfx.length,
    scene.analysis.continuity.length + scene.analysis.continuityNotes.length,
  ];
}

export const CSV_HEADERS = [
  "sceneNumber",
  "sceneType",
  "location",
  "timeOfDay",
  "pageCount",
  "storyDay",
  "cast",
  "extras",
  "props",
  "setDressing",
  "sound",
  "equipment",
  "vehicles",
  "stunts",
  "animals",
  "spfx",
  "vfx",
  "continuity",
];
