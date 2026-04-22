"use client";

import { VoiceCoach } from "../../components/VoiceCoach";

export function VoiceCoachView() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white">🎙️ مدرب الصوت اللحظي</h2>
        <p className="text-white/68 mt-2">
          تحليل صوتي متقدم لتطوير أدائك التمثيلي
        </p>
      </div>
      <VoiceCoach />
    </div>
  );
}
