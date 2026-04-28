import type { JsonRecord } from "./types";
import { asArray, asJsonRecord, asNumber, asString } from "./utils";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

/**
 * Create structured summary of previous analyses
 */
export function createStructuredAnalysisSummary(
  previousStationsOutput: PreviousStationsOutput
): string {
  const station1 = asJsonRecord(previousStationsOutput.station1);
  const station2 = asJsonRecord(previousStationsOutput.station2);
  const station3 = asJsonRecord(previousStationsOutput.station3);
  const station4 = asJsonRecord(previousStationsOutput.station4);
  const station5 = asJsonRecord(previousStationsOutput.station5);
  const station1MajorCharacters = asArray<unknown>(station1.majorCharacters);
  const station2HybridGenre = asJsonRecord(station2.hybridGenre);
  const station2Themes = asJsonRecord(station2.themes);
  const station2PrimaryThemes = asArray<unknown>(station2Themes.primary);
  const station3NetworkAnalysis = asJsonRecord(station3.networkAnalysis);
  const station3ConflictAnalysis = asJsonRecord(station3.conflictAnalysis);
  const station3MainConflict = asJsonRecord(
    station3ConflictAnalysis.mainConflict
  );
  const station4EfficiencyMetrics = asJsonRecord(station4.efficiencyMetrics);
  const station5SymbolicAnalysis = asJsonRecord(station5.symbolicAnalysis);
  const station5TensionAnalysis = asJsonRecord(station5.tensionAnalysis);

  return `
**محطة 1 - التحليل الأساسي:**
- الشخصيات الرئيسية: ${station1MajorCharacters.length}
- ملخص القصة: ${asString(station1.logline, "غير متوفر")}

**محطة 2 - التحليل المفاهيمي:**
- النوع: ${asString(station2HybridGenre.primary, "غير محدد")}
- المواضيع الرئيسية: ${station2PrimaryThemes.length}

**محطة 3 - شبكة الصراعات:**
- كثافة الشبكة: ${asNumber(station3NetworkAnalysis.density, 0)}
- الصراعات الرئيسية: ${asString(station3MainConflict.description, "غير محدد")}

**محطة 4 - مقاييس الكفاءة:**
- درجة الكفاءة الإجمالية: ${asNumber(station4EfficiencyMetrics.overallEfficiencyScore, 0)}

**محطة 5 - التحليل الديناميكي والرمزي:**
- عمق التحليل الرمزي: ${asNumber(station5SymbolicAnalysis.depthScore, 0)}
- توتر السرد: ${asNumber(station5TensionAnalysis.overallTension, 0)}
`;
}
