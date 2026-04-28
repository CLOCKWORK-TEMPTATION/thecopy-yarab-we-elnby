import {
  asJsonRecord,
  asJsonRecordArray,
  asNumber,
  asString,
  asStringArray,
  isJsonRecord,
} from "./json-helpers";
import type {
  ArtisticReferencesResult,
  DynamicToneResult,
  GenreMatrixResult,
  ThemeAnalysis,
  ThreeDMapResult,
} from "./types";

export function validate3DMap(parsed: unknown): ThreeDMapResult {
  const data = asJsonRecord(parsed);
  const temporalDevelopmentAxis = asJsonRecord(data.temporalDevelopmentAxis);

  return {
    horizontalEventsAxis: asJsonRecordArray(data.horizontalEventsAxis).map(
      (event) => ({
        event: asString(event.event),
        sceneRef: asString(event.sceneRef),
        timestamp: asString(event.timestamp),
        narrativeWeight: asNumber(event.narrativeWeight, 5),
      })
    ),
    verticalMeaningAxis: asJsonRecordArray(data.verticalMeaningAxis).map(
      (meaning) => ({
        eventRef: asString(meaning.eventRef),
        symbolicLayer: asString(meaning.symbolicLayer),
        thematicConnection: asString(meaning.thematicConnection),
        depth: asNumber(meaning.depth, 5),
      })
    ),
    temporalDevelopmentAxis: {
      pastInfluence: asString(temporalDevelopmentAxis.pastInfluence),
      presentChoices: asString(temporalDevelopmentAxis.presentChoices),
      futureExpectations: asString(temporalDevelopmentAxis.futureExpectations),
      heroArcConnection: asString(temporalDevelopmentAxis.heroArcConnection),
      causality: asString(temporalDevelopmentAxis.causality),
    },
  };
}

export function validateGenreMatrix(parsed: unknown): GenreMatrixResult {
  const result: GenreMatrixResult = {};

  for (const [genre, contributions] of Object.entries(asJsonRecord(parsed))) {
    if (isJsonRecord(contributions)) {
      result[genre] = {
        conflictContribution: asString(contributions.conflictContribution),
        pacingContribution: asString(contributions.pacingContribution),
        visualCompositionContribution: asString(
          contributions.visualCompositionContribution
        ),
        soundMusicContribution: asString(contributions.soundMusicContribution),
        charactersContribution: asString(contributions.charactersContribution),
        weight: asNumber(contributions.weight, 0.5),
      };
    }
  }

  return result;
}

export function validateDynamicTone(parsed: unknown): DynamicToneResult {
  const result: DynamicToneResult = {};
  const data = asJsonRecord(parsed);
  const stages = ["setup", "confrontation", "resolution"];

  for (const stage of stages) {
    const stageData = asJsonRecord(data[stage]);
    if (Object.keys(stageData).length > 0) {
      result[stage] = {
        visualAtmosphereDescribed: asString(
          stageData.visualAtmosphereDescribed
        ),
        writtenPacing: asString(stageData.writtenPacing),
        dialogueStructure: asString(stageData.dialogueStructure),
        soundIndicationsDescribed: asString(
          stageData.soundIndicationsDescribed
        ),
        emotionalIntensity: asNumber(stageData.emotionalIntensity, 5),
      };
    }
  }

  return result;
}

export function validateArtisticReferences(
  parsed: unknown
): ArtisticReferencesResult {
  const data = asJsonRecord(parsed);

  return {
    visualReferences: asJsonRecordArray(data.visualReferences).map(
      (reference) => {
        const artist =
          typeof reference.artist === "string" ? reference.artist : undefined;
        return {
          work: asString(reference.work),
          ...(artist !== undefined ? { artist } : {}),
          reason: asString(reference.reason),
          sceneApplication: asString(reference.sceneApplication),
        };
      }
    ),
    musicalMood: asString(data.musicalMood),
    cinematicInfluences: asJsonRecordArray(data.cinematicInfluences).map(
      (influence) => {
        const director =
          typeof influence.director === "string"
            ? influence.director
            : undefined;
        return {
          film: asString(influence.film),
          ...(director !== undefined ? { director } : {}),
          aspect: asString(influence.aspect),
        };
      }
    ),
    literaryParallels: asJsonRecordArray(data.literaryParallels).map(
      (parallel) => {
        const author =
          typeof parallel.author === "string" ? parallel.author : undefined;
        return {
          work: asString(parallel.work),
          ...(author !== undefined ? { author } : {}),
          connection: asString(parallel.connection),
        };
      }
    ),
  };
}

export function validateThemeAnalysis(parsed: unknown): ThemeAnalysis {
  const data = asJsonRecord(parsed);

  return {
    primaryThemes: asJsonRecordArray(data.primaryThemes).map((theme) => ({
      theme: asString(theme.theme),
      evidence: asStringArray(theme.evidence),
      strength: asNumber(theme.strength, 5),
      development: asString(theme.development),
    })),
    secondaryThemes: asJsonRecordArray(data.secondaryThemes).map((theme) => ({
      theme: asString(theme.theme),
      occurrences: asNumber(theme.occurrences, 1),
    })),
    thematicConsistency: asNumber(data.thematicConsistency, 5),
  };
}
