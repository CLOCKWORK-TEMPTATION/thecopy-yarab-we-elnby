import { useState } from "react";

import { GESTURE_CONTROLS } from "../../types/constants";

import type {
  TeleprompterSettings,
  BlockingMark,
  CameraEyeSettings as CameraSettings,
  HolographicPartner,
  GestureControl,
} from "../../types";

export const useARTraining = () => {
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
    {
      id: "1",
      x: 20,
      y: 30,
      label: "الوقوف عند الحافة",
      color: "#22c55e",
    },
    {
      id: "2",
      x: 80,
      y: 30,
      label: "النظر نحو الشرفة",
      color: "#3b82f6",
    },
  ]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
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
  const [visionProConnected, setVisionProConnected] = useState(false);

  return {
    arMode,
    setArMode,
    teleprompterSettings,
    setTeleprompterSettings,
    blockingMarks,
    setBlockingMarks,
    cameraSettings,
    setCameraSettings,
    holographicPartner,
    setHolographicPartner,
    activeGestures,
    setActiveGestures,
    arSessionActive,
    setArSessionActive,
    visionProConnected,
    setVisionProConnected,
  };
};
