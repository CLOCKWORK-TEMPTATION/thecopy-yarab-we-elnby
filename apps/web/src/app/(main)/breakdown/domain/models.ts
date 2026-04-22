// ============================================
// TYPES & INTERFACES
// ============================================

export type SceneType = "INT" | "EXT";
export type TimeOfDay =
  | "DAY"
  | "NIGHT"
  | "DAWN"
  | "DUSK"
  | "MORNING"
  | "EVENING"
  | "UNKNOWN";

export interface SceneHeaderData {
  sceneNumber: number;
  sceneType: SceneType;
  location: string;
  timeOfDay: TimeOfDay;
  pageCount: number;
  storyDay: number;
  rawHeader?: string;
}

export interface BreakdownElement {
  id: string;
  type: string;
  category: string;
  description: string;
  color: string;
  notes?: string;
}

export interface SceneStats {
  cast: number;
  extras: number;
  extrasGroups: number;
  silentBits: number;
  props: number;
  handProps: number;
  setDressing: number;
  costumes: number;
  makeup: number;
  sound: number;
  soundRequirements: number;
  equipment: number;
  specialEquipment: number;
  vehicles: number;
  stunts: number;
  animals: number;
  spfx: number;
  vfx: number;
  graphics: number;
  continuity: number;
}

export interface ExtrasGroup {
  description: string;
  count: number;
}

export interface Scene {
  id: number;
  remoteId?: string;
  projectId?: string;
  reportId?: string;
  header: string;
  content: string;
  headerData?: SceneHeaderData;
  stats?: SceneStats;
  elements?: BreakdownElement[];
  warnings?: string[];
  source?: "ai" | "fallback";
  isAnalyzed: boolean;
  analysis?: SceneBreakdown;
  scenarios?: ScenarioAnalysis;
  versions?: Version[];
}

export interface Version {
  id: string;
  timestamp: number;
  label: string;
  analysis?: SceneBreakdown;
  scenarios?: ScenarioAnalysis;
  headerData?: SceneHeaderData;
  stats?: SceneStats;
  warnings?: string[];
}

export interface CastMember {
  name: string;
  role: string;
  age: string;
  gender: string;
  description: string;
  motivation: string;
}

export interface SceneBreakdown {
  headerData?: SceneHeaderData;
  cast: CastMember[];
  costumes: string[];
  makeup: string[];
  setDressing: string[];
  graphics: string[];
  sound: string[];
  soundRequirements: string[];
  equipment: string[];
  specialEquipment: string[];
  vehicles: string[];
  locations: string[];
  extras: string[];
  extrasGroups: ExtrasGroup[];
  props: string[];
  handProps: string[];
  silentBits: string[];
  stunts: string[];
  animals: string[];
  spfx: string[];
  vfx: string[];
  continuity: string[];
  continuityNotes: string[];
  elements: BreakdownElement[];
  stats: SceneStats;
  warnings: string[];
  summary: string;
  source?: "ai" | "fallback";
}

export interface ImpactMetrics {
  budget: number;
  schedule: number;
  risk: number;
  creative: number;
}

export interface ScenarioOption {
  id: string;
  name: string;
  description: string;
  metrics: ImpactMetrics;
  agentInsights: {
    logistics: string;
    budget: string;
    schedule: string;
    creative: string;
    risk: string;
  };
  recommended: boolean;
}

export interface ScenarioAnalysis {
  scenarios: ScenarioOption[];
}

export interface ShootingScheduleItem {
  sceneId: string;
  sceneNumber: number;
  header: string;
  location: string;
  timeOfDay: TimeOfDay;
  estimatedHours: number;
  pageCount: number;
}

export interface ShootingScheduleDay {
  dayNumber: number;
  location: string;
  timeOfDay: TimeOfDay;
  scenes: ShootingScheduleItem[];
  estimatedHours: number;
  totalPages: number;
}

export interface BreakdownReportScene {
  reportSceneId: string;
  sceneId: string;
  header: string;
  content: string;
  headerData: SceneHeaderData;
  analysis: SceneBreakdown;
  scenarios: ScenarioAnalysis;
}

export interface BreakdownReport {
  id: string;
  projectId: string;
  title: string;
  generatedAt: string;
  updatedAt: string;
  source: "backend-breakdown";
  summary: string;
  warnings: string[];
  sceneCount: number;
  totalPages: number;
  totalEstimatedShootDays: number;
  elementsByCategory: Record<string, number>;
  schedule: ShootingScheduleDay[];
  scenes: BreakdownReportScene[];
}

export interface BreakdownBootstrapResponse {
  projectId: string;
  title: string;
  parsed: ScriptSegmentResponse;
}

export type TechnicalBreakdownKey =
  | "locations"
  | "setDressing"
  | "costumes"
  | "makeup"
  | "props"
  | "sound"
  | "equipment"
  | "vehicles"
  | "stunts"
  | "extras"
  | "spfx"
  | "vfx"
  | "animals"
  | "graphics"
  | "continuity";

export type AgentKey =
  | TechnicalBreakdownKey
  | "logistics"
  | "budget"
  | "schedule"
  | "creative"
  | "risk";

export interface AgentDef {
  key: AgentKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  type: "breakdown" | "strategic";
}

export interface ScriptSegmentScene {
  header: string;
  content: string;
  headerData?: SceneHeaderData;
  sceneId?: string;
}

export interface ScriptSegmentResponse {
  scenes: ScriptSegmentScene[];
}

// ============================================
// CAST BREAKDOWN TYPES
// ============================================

export interface ExtendedCastMember extends CastMember {
  id: string;
  nameArabic?: string;
  roleCategory:
    | "Lead"
    | "Supporting"
    | "Bit Part"
    | "Silent"
    | "Group"
    | "Mystery";
  ageRange: string;
  gender: "Male" | "Female" | "Non-binary" | "Unknown";
  visualDescription: string;
  motivation: string;
  personalityTraits?: string[];
  relationships?: { character: string; type: string }[];
  scenePresence?: {
    sceneNumbers: number[];
    dialogueLines: number;
    silentAppearances: number;
  };
}

export interface CastAnalysisOptions {
  apiKey?: string;
  model?: string;
  language?: "ar" | "en" | "both";
}

export interface CastAnalysisResult {
  members: ExtendedCastMember[];
  summary: {
    totalCharacters: number;
    leadCount: number;
    supportingCount: number;
    maleCount: number;
    femaleCount: number;
    estimatedAgeRanges: Record<string, number>;
  };
  insights: string[];
  warnings: string[];
}
