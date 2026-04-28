import { useState, useCallback, useEffect } from "react";

export const useVocalExercises = (showNotification: (type: string, message: string) => void) => {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeExercise) {
      interval = setInterval(() => {
        setExerciseTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeExercise]);

  const startExercise = useCallback((exerciseId: string) => {
    setActiveExercise(exerciseId);
    setExerciseTimer(0);
    showNotification("info", "بدأ التمرين! 🎤");
  }, [showNotification]);

  const stopExercise = useCallback(() => {
    setActiveExercise(null);
    setExerciseTimer(0);
    showNotification("success", "انتهى التمرين! أحسنت 👏");
  }, [showNotification]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    activeExercise,
    exerciseTimer,
    startExercise,
    stopExercise,
    formatTime,
  };
};
