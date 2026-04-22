export type SceneType = 'INT' | 'EXT';

export type TimeOfDay =
  | 'DAY'
  | 'NIGHT'
  | 'DAWN'
  | 'DUSK'
  | 'MORNING'
  | 'EVENING'
  | 'UNKNOWN';

export interface SceneHeader {
  sceneNumber: number;
  sceneType: SceneType;
  location: string;
  timeOfDay: TimeOfDay;
  pageCount: number;
  storyDay: number;
  rawHeader: string;
}

export interface ParsedScene {
  header: string;
  content: string;
  headerData: SceneHeader;
  warnings: string[];
}

export interface ParsedScreenplay {
  title: string;
  scenes: ParsedScene[];
  totalPages: number;
  warnings: string[];
}

export interface CastMember {
  name: string;
  role: string;
  age: string;
  gender: string;
  description: string;
  motivation: string;
}

export interface ExtrasGroup {
  description: string;
  count: number;
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

export interface BreakdownSceneAnalysis {
  headerData: SceneHeader;
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
  source: 'ai' | 'fallback';
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
  headerData: SceneHeader;
  analysis: BreakdownSceneAnalysis;
  scenarios: ScenarioAnalysis;
}

export interface BreakdownReport {
  id: string;
  projectId: string;
  title: string;
  generatedAt: string;
  updatedAt: string;
  source: 'backend-breakdown';
  summary: string;
  warnings: string[];
  sceneCount: number;
  totalPages: number;
  totalEstimatedShootDays: number;
  elementsByCategory: Record<string, number>;
  schedule: ShootingScheduleDay[];
  scenes: BreakdownReportScene[];
}

export interface BreakdownChatResponse {
  answer: string;
}
