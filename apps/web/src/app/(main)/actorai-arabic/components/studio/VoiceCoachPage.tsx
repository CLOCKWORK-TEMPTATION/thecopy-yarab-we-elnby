import React from "react";
import { VoiceCoach } from "../VoiceCoach";

export const VoiceCoachPage: React.FC = () => (
  <div className="max-w-6xl mx-auto py-8">
    <h2 className="text-3xl font-bold text-white/85 mb-2">
      🎙️ مدرب الصوت اللحظي
    </h2>
    <p className="text-white/55 mb-8">
      تحليل صوتي متقدم لتطوير أدائك التمثيلي
    </p>
    <VoiceCoach />
  </div>
);
