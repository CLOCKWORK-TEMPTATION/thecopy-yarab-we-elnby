/**
 * @file studio/index.ts — Barrel export for studio components
 * @description Re-exports all studio components and hooks for backward compatibility
 */

// Hooks
export { useStudioState } from "./useStudioState";
export { useAuth } from "./useAuth";
export { useScriptAnalysis } from "./useScriptAnalysis";
export { useScenePartner } from "./useScenePartner";
export { useRecording } from "./useRecording";
export { useVocalExercises } from "./useVocalExercises";
export { useRhythmAnalysis } from "./useRhythmAnalysis";
export { useWebcamAnalysisBridge } from "./useWebcamAnalysisBridge";
export { useRhythmAnalysis } from "./useRhythmAnalysis";
export { useWebcamAnalysis } from "./useWebcamAnalysis";
export { useARTraining } from "./useARTraining";

// Page Components
export { LoginPage } from "./LoginPage";
export { RegisterPage } from "./RegisterPage";
export { HomePage } from "./HomePage";
export { DemoPage } from "./DemoPage";
export { VoiceCoachPage } from "./VoiceCoachPage";
export { VocalExercisesPage } from "./VocalExercisesPage";
export { WebcamAnalysisPage } from "./WebcamAnalysisPage";
export { ARTrainingPage } from "./ARTrainingPage";
export { RhythmAnalysisPage } from "./RhythmAnalysisPage";

// Feature Components
export { ScriptAnalysis } from "./ScriptAnalysis";
export { ScenePartner } from "./ScenePartner";
export { Recording } from "./Recording";

// Additional Components
export { VocalExercises } from "./VocalExercises";
export { RhythmAnalysis } from "./RhythmAnalysis";
export { WebcamAnalysis } from "./WebcamAnalysis";
export { ARTraining } from "./ARTraining";

// UI Components
export { Header } from "./Header";
export { Footer } from "./Footer";
export { Notification } from "./Notification";
