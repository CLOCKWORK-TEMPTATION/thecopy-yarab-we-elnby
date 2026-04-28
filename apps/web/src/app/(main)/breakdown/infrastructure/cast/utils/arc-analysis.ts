// Character Arc Analysis Utilities

export type ArcType = "rising" | "falling" | "flat" | "arc" | "unknown";

export interface ArcAnalysis {
  type: ArcType;
  description: string;
  confidence: number;
}

/**
 * Analyzes a character's dramatic arc across scenes.
 */
export const analyzeCharacterArc = (character: {
  sceneAppearances: number[];
  dialogueCount: number;
  firstScene: number;
  lastScene: number;
  totalScenes: number;
  emotionalTrajectory?: number[];
}): ArcAnalysis => {
  const {
    sceneAppearances,
    dialogueCount,
    firstScene,
    lastScene,
    totalScenes,
    emotionalTrajectory = [],
  } = character;

  const presenceRatio = sceneAppearances.length / totalScenes;

  // Determine arc type
  let type: ArcType = "flat";
  let description = "";
  let confidence = 0.5;

  if (sceneAppearances.length <= 1) {
    type = "flat";
    description = "Single appearance - insufficient data for arc analysis";
    confidence = 0.9;
  } else if (presenceRatio > 0.8 && dialogueCount > totalScenes) {
    type = "arc";
    description =
      "Protagonist with consistent presence and dialogue throughout";
    confidence = 0.85;
  } else if (firstScene === 1 && lastScene < totalScenes * 0.5) {
    type = "falling";
    description =
      "Character appears early then fades - possible setup or mentor role";
    confidence = 0.7;
  } else if (firstScene > totalScenes * 0.5 && lastScene === totalScenes) {
    type = "rising";
    description =
      "Character enters late and grows in importance - possible reveal or antagonist";
    confidence = 0.7;
  } else if (emotionalTrajectory.length > 2) {
    const firstEmotion = emotionalTrajectory[0];
    const lastEmotion = emotionalTrajectory[emotionalTrajectory.length - 1];
    if (firstEmotion !== undefined && lastEmotion !== undefined) {
      const trend = lastEmotion - firstEmotion;
      if (trend > 0.5) {
        type = "rising";
        description = "Character shows positive emotional growth trajectory";
        confidence = 0.65;
      } else if (trend < -0.5) {
        type = "falling";
        description = "Character shows declining emotional trajectory";
        confidence = 0.65;
      }
    }
  }

  // Check for classic three-arc structure
  if (sceneAppearances.length >= 5 && presenceRatio > 0.4) {
    type = "arc";
    description = "Multi-scene presence suggests character arc development";
    confidence = 0.75;
  }

  return { type, description, confidence };
};
