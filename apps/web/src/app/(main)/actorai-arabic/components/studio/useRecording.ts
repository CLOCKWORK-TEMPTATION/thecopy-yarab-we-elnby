import { useState, useCallback, useEffect } from "react";

import type { Recording } from "../../types";

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: "1",
      title: "مشهد الحديقة - التجربة 3",
      duration: "3:42",
      date: "2025-10-30",
      score: 82,
    },
    {
      id: "2",
      title: "مشهد اللقاء - التجربة 1",
      duration: "4:15",
      date: "2025-10-29",
      score: 76,
    },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    const now = new Date();
    const isoDate = now.toISOString().split("T")[0] ?? now.toISOString();

    const newRecording: Recording = {
      id: now.getTime().toString(),
      title: `مشهد جديد - ${now.toLocaleDateString("ar-EG")}`,
      duration: formatTime(recordingTime),
      date: isoDate,
      score: Math.floor(Math.random() * 20) + 80,
    };
    setRecordings((prev) => [newRecording, ...prev]);
  }, [formatTime, recordingTime]);

  return {
    isRecording,
    recordingTime,
    recordings,
    startRecording,
    stopRecording,
    formatTime,
  };
};
