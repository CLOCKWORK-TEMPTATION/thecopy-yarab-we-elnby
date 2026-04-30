import React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Recording, ScriptAnalysis, ScenePartner } from "./index";

import type {
  AnalysisResult,
  ChatMessage,
  Recording as PerformanceRecording,
} from "../../types";

interface DemoPageProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  selectedMethodology: string;
  setSelectedMethodology: (method: string) => void;
  analyzing: boolean;
  analysisResult: AnalysisResult | null;
  useSampleScript: () => void;
  analyzeScript: () => void;
  rehearsing: boolean;
  chatMessages: ChatMessage[];
  userInput: string;
  partnerStatus: "ready" | "thinking";
  setUserInput: (input: string) => void;
  startRehearsal: () => void;
  sendMessage: () => void;
  endRehearsal: () => void;
  isRecording: boolean;
  recordingTime: number;
  recordings: PerformanceRecording[];
  startRecording: () => void;
  stopRecording: () => void;
  formatTime: (seconds: number) => string;
}

export const DemoPage: React.FC<DemoPageProps> = ({
  scriptText,
  setScriptText,
  selectedMethodology,
  setSelectedMethodology,
  analyzing,
  analysisResult,
  useSampleScript,
  analyzeScript,
  rehearsing,
  chatMessages,
  userInput,
  partnerStatus,
  setUserInput,
  startRehearsal,
  sendMessage,
  endRehearsal,
  isRecording,
  recordingTime,
  recordings,
  startRecording,
  stopRecording,
  formatTime,
}) => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-6">
      🎬 التجربة التفاعلية
    </h2>

    <Tabs defaultValue="analysis" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="analysis">📝 تحليل النص</TabsTrigger>
        <TabsTrigger value="partner">🎭 شريك المشهد</TabsTrigger>
        <TabsTrigger value="recording">🎥 التسجيل</TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="space-y-6">
        <ScriptAnalysis
          scriptText={scriptText}
          setScriptText={setScriptText}
          selectedMethodology={selectedMethodology}
          setSelectedMethodology={setSelectedMethodology}
          analyzing={analyzing}
          analysisResult={analysisResult}
          useSampleScript={useSampleScript}
          analyzeScript={analyzeScript}
        />
      </TabsContent>

      <TabsContent value="partner" className="space-y-6">
        <ScenePartner
          rehearsing={rehearsing}
          chatMessages={chatMessages}
          userInput={userInput}
          partnerStatus={partnerStatus}
          setUserInput={setUserInput}
          startRehearsal={startRehearsal}
          sendMessage={sendMessage}
          endRehearsal={endRehearsal}
        />
      </TabsContent>

      <TabsContent value="recording" className="space-y-6">
        <Recording
          isRecording={isRecording}
          recordingTime={recordingTime}
          recordings={recordings}
          startRecording={startRecording}
          stopRecording={stopRecording}
          formatTime={formatTime}
        />
      </TabsContent>
    </Tabs>
  </div>
);
