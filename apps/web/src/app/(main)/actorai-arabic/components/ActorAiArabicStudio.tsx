"use client";

/**
 * @fileoverview استوديو الممثل الذكي - المكون الرئيسي
 * تطبيق شامل لتدريب الممثلين باستخدام الذكاء الاصطناعي
 * يتضمن: تحليل النصوص، شريك المشهد، تمارين الصوت، التحليل البصري، وغيرها
 */

import React, { useState } from "react";

import { GESTURE_CONTROLS } from "../types/constants";

import {
  useStudioState,
  useAuth,
  useScriptAnalysis,
  useScenePartner,
  useRecording,
  useVocalExercises,
  useRhythmAnalysis,
  useWebcamAnalysisBridge,
  LoginPage,
  RegisterPage,
  HomePage,
  DemoPage,
  VoiceCoachPage,
  VocalExercisesPage,
  WebcamAnalysisPage,
  ARTrainingPage,
  RhythmAnalysisPage,
  Header,
  Footer,
  Notification,
} from "./studio";

import type {
  TeleprompterSettings,
  BlockingMark,
  CameraEyeSettings,
  HolographicPartner,
  GestureControl,
} from "../types";

// ==================== دوال مساعدة للتنقل ====================

type ViewType = string;

interface ContentProps {
  currentView: ViewType;
  renderHome: () => React.ReactNode;
  renderDemo: () => React.ReactNode;
  renderVocalExercises: () => React.ReactNode;
  renderVoiceCoach: () => React.ReactNode;
  renderSceneRhythm: () => React.ReactNode;
  renderWebcamAnalysis: () => React.ReactNode;
  renderARTraining: () => React.ReactNode;
}

const RenderLogin: React.FC<{
  onLogin: (email: string, password: string) => void;
  onNavigate: (view: ViewType) => void;
}> = ({ onLogin, onNavigate }) => (
  <LoginPage onLogin={onLogin} onNavigate={onNavigate} />
);

const RenderRegister: React.FC<{
  onRegister: (name: string, email: string, password: string) => void;
  onNavigate: (view: ViewType) => void;
}> = ({ onRegister, onNavigate }) => (
  <RegisterPage onRegister={onRegister} onNavigate={onNavigate} />
);

function renderMainContent(props: ContentProps): React.ReactNode {
  const {
    currentView,
    renderHome,
    renderDemo,
    renderVocalExercises,
    renderVoiceCoach,
    renderSceneRhythm,
    renderWebcamAnalysis,
    renderARTraining,
  } = props;

  switch (currentView) {
    case "home":
      return renderHome();
    case "demo":
      return renderDemo();
    case "vocal":
      return renderVocalExercises();
    case "voicecoach":
      return renderVoiceCoach();
    case "rhythm":
      return renderSceneRhythm();
    case "webcam":
      return renderWebcamAnalysis();
    case "ar":
      return renderARTraining();
    case "login":
      return null; // handled inline
    case "register":
      return null; // handled inline
    default:
      return renderHome();
  }
}

// ==================== المكون الرئيسي ====================

export const ActorAiArabicStudio: React.FC = () => {
  const {
    currentView,
    user,
    theme,
    notification,
    setUser,
    showNotification,
    navigate,
    toggleTheme,
  } = useStudioState();

  const { handleLogin, handleRegister, handleLogout } = useAuth(
    setUser,
    showNotification,
    navigate
  );

  const {
    scriptText,
    setScriptText,
    selectedMethodology,
    setSelectedMethodology,
    analyzing,
    analysisResult,
    useSampleScript,
    analyzeScript,
  } = useScriptAnalysis(showNotification);

  const {
    rehearsing,
    chatMessages,
    userInput,
    setUserInput,
    chatEndRef: _chatEndRef,
    startRehearsal,
    sendMessage,
    endRehearsal,
  } = useScenePartner();

  const {
    isRecording,
    recordingTime,
    recordings,
    startRecording,
    stopRecording,
    formatTime,
  } = useRecording();

  const { activeExercise, exerciseTimer, startExercise, stopExercise } =
    useVocalExercises(showNotification);

  const {
    rhythmScriptText,
    setRhythmScriptText,
    analyzingRhythm,
    rhythmAnalysis,
    useRhythmSampleScript,
    analyzeSceneRhythm,
    getTempoLabel,
  } = useRhythmAnalysis(showNotification);

  const {
    webcamActive,
    webcamAnalyzing,
    webcamAnalysisTime,
    webcamAnalysisResult,
    webcamPermission,
    webcamEngine,
    requestWebcamPermission,
    stopWebcam,
    startWebcamAnalysis,
    stopWebcamAnalysis,
    getBlinkStatusText,
    getBlinkStatusColor,
    getEyeDirectionText,
  } = useWebcamAnalysisBridge(showNotification);

  // حالة AR/MR
  const [arMode, setArMode] = useState<
    "setup" | "teleprompter" | "blocking" | "camera" | "partner" | "gestures"
  >("setup");
  const [teleprompterSettings, setTeleprompterSettings] =
    useState<TeleprompterSettings>({
      speed: 50,
      fontSize: 24,
      opacity: 80,
      position: "center",
    });
  const [blockingMarks, setBlockingMarks] = useState<BlockingMark[]>([
    { id: "1", x: 20, y: 30, label: "بداية", color: "#22c55e" },
    { id: "2", x: 50, y: 50, label: "وسط", color: "#3b82f6" },
    { id: "3", x: 80, y: 70, label: "نهاية", color: "#ef4444" },
  ]);
  const [cameraSettings, setCameraSettings] = useState<CameraEyeSettings>({
    focalLength: 50,
    shotType: "medium",
    aspectRatio: "16:9",
  });
  const [holographicPartner, setHolographicPartner] =
    useState<HolographicPartner>({
      character: "ليلى",
      emotion: "حب",
      intensity: 70,
      isActive: false,
    });
  const [activeGestures, setActiveGestures] =
    useState<GestureControl[]>(GESTURE_CONTROLS);
  const [arSessionActive, setArSessionActive] = useState(false);
  const [visionProConnected, _setVisionProConnected] = useState(false);

  // ==================== دوال العرض ====================

  const renderHome = () => <HomePage onNavigate={navigate} />;

  const renderDemo = () => (
    <DemoPage
      scriptText={scriptText}
      setScriptText={setScriptText}
      selectedMethodology={selectedMethodology}
      setSelectedMethodology={setSelectedMethodology}
      analyzing={analyzing}
      analysisResult={analysisResult}
      useSampleScript={useSampleScript}
      analyzeScript={analyzeScript}
      rehearsing={rehearsing}
      chatMessages={chatMessages}
      userInput={userInput}
      setUserInput={setUserInput}
      startRehearsal={startRehearsal}
      sendMessage={sendMessage}
      endRehearsal={endRehearsal}
      isRecording={isRecording}
      recordingTime={recordingTime}
      recordings={recordings}
      startRecording={startRecording}
      stopRecording={stopRecording}
      formatTime={formatTime}
    />
  );

  const renderVocalExercises = () => (
    <VocalExercisesPage
      activeExercise={activeExercise}
      exerciseTimer={exerciseTimer}
      startExercise={startExercise}
      stopExercise={stopExercise}
      formatTime={formatTime}
    />
  );

  const renderWebcamAnalysis = () => (
    <WebcamAnalysisPage
      webcamActive={webcamActive}
      webcamAnalyzing={webcamAnalyzing}
      webcamAnalysisTime={webcamAnalysisTime}
      webcamAnalysisResult={webcamAnalysisResult}
      webcamPermission={webcamPermission}
      videoRef={webcamEngine.videoRef}
      canvasRef={webcamEngine.canvasRef}
      requestWebcamPermission={requestWebcamPermission}
      stopWebcam={stopWebcam}
      startWebcamAnalysis={startWebcamAnalysis}
      stopWebcamAnalysis={stopWebcamAnalysis}
      formatTime={formatTime}
      getEyeDirectionText={getEyeDirectionText}
      getBlinkStatusText={getBlinkStatusText}
      getBlinkStatusColor={getBlinkStatusColor}
    />
  );

  const renderARTraining = () => (
    <ARTrainingPage
      arMode={arMode}
      setArMode={setArMode}
      teleprompterSettings={teleprompterSettings}
      setTeleprompterSettings={setTeleprompterSettings}
      blockingMarks={blockingMarks}
      setBlockingMarks={setBlockingMarks}
      cameraSettings={cameraSettings}
      setCameraSettings={setCameraSettings}
      holographicPartner={holographicPartner}
      setHolographicPartner={setHolographicPartner}
      activeGestures={activeGestures}
      setActiveGestures={setActiveGestures}
      arSessionActive={arSessionActive}
      setArSessionActive={setArSessionActive}
      visionProConnected={visionProConnected}
    />
  );

  const renderVoiceCoach = () => <VoiceCoachPage />;

  const renderSceneRhythm = () => (
    <RhythmAnalysisPage
      rhythmScriptText={rhythmScriptText}
      setRhythmScriptText={setRhythmScriptText}
      analyzingRhythm={analyzingRhythm}
      rhythmAnalysis={rhythmAnalysis}
      useRhythmSampleScript={useRhythmSampleScript}
      analyzeSceneRhythm={analyzeSceneRhythm}
      getTempoLabel={getTempoLabel}
    />
  );

  // ==================== العرض النهائي ====================

  const isLogin = currentView === "login";
  const isRegister = currentView === "register";

  const mainContent =
    isLogin || isRegister ? (
      isLogin ? (
        <RenderLogin onLogin={handleLogin} onNavigate={navigate} />
      ) : (
        <RenderRegister onRegister={handleRegister} onNavigate={navigate} />
      )
    ) : (
      renderMainContent({
        currentView,
        renderHome,
        renderDemo,
        renderVocalExercises,
        renderVoiceCoach,
        renderSceneRhythm,
        renderWebcamAnalysis,
        renderARTraining,
      })
    );

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "dark bg-black/14" : "bg-white/[0.04]"}`}
      dir="rtl"
    >
      <Header
        currentView={currentView}
        user={user}
        navigate={navigate}
        handleLogout={handleLogout}
        toggleTheme={toggleTheme}
        theme={theme}
      />
      <Notification notification={notification} />
      <main className="container mx-auto px-4 py-8">{mainContent}</main>
      <Footer />
    </div>
  );
};
