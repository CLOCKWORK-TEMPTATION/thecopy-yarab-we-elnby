import React from "react";

import { VocalExercises } from "./index";

interface VocalExercisesPageProps {
  activeExercise: string | null;
  exerciseTimer: number;
  startExercise: (id: string) => void;
  stopExercise: () => void;
  formatTime: (seconds: number) => string;
}

export const VocalExercisesPage: React.FC<VocalExercisesPageProps> = ({
  activeExercise,
  exerciseTimer,
  startExercise,
  stopExercise,
  formatTime,
}) => (
  <VocalExercises
    activeExercise={activeExercise}
    exerciseTimer={exerciseTimer}
    startExercise={startExercise}
    stopExercise={stopExercise}
    formatTime={formatTime}
  />
);
