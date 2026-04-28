// CineArchitect AI - Mixed Reality Pre-visualization Studio Utils
// دوال مساعدة لاستوديو التصور المسبق بالواقع المختلط

import type { Vector3D, VirtualCamera, XRScene, CameraMovement } from "./types";

/**
 * حساب المسافة بين نقطتين ثلاثية الأبعاد
 */
export function getDistance(a: Vector3D, b: Vector3D): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
  );
}

/**
 * تحليل تكوين الكاميرا (composition analysis)
 */
export function analyzeComposition(
  camera: VirtualCamera,
  scene: XRScene
): Record<string, unknown> {
  const objectsInFrame = scene.objects.filter((obj) => {
    const distance = getDistance(obj.position, camera.position);
    return distance < 20;
  });

  return {
    ruleOfThirds: {
      applied: objectsInFrame.length > 0,
      suggestions:
        objectsInFrame.length === 0
          ? ["Add subjects to the scene"]
          : ["Consider positioning key elements at intersection points"],
    },
    depthLayers: {
      foreground: objectsInFrame.filter(
        (o) => getDistance(o.position, camera.position) < 3
      ).length,
      midground: objectsInFrame.filter((o) => {
        const d = getDistance(o.position, camera.position);
        return d >= 3 && d < 8;
      }).length,
      background: objectsInFrame.filter(
        (o) => getDistance(o.position, camera.position) >= 8
      ).length,
    },
    estimatedFps: 60,
    qualityLevel: "high",
  };
}

/**
 * توليد keyframes لحركة الكاميرا
 */
export function generateKeyframes(movement: CameraMovement): unknown[] {
  const frames = Math.round(movement.duration * 24);
  const keyframes = [];

  for (let i = 0; i <= frames; i += Math.max(1, Math.floor(frames / 10))) {
    const t = i / frames;
    const easedT = applyEasing(t, movement.easing);

    keyframes.push({
      frame: i,
      time: i / 24,
      position: {
        x:
          movement.startPosition.x +
          (movement.endPosition.x - movement.startPosition.x) * easedT,
        y:
          movement.startPosition.y +
          (movement.endPosition.y - movement.startPosition.y) * easedT,
        z:
          movement.startPosition.z +
          (movement.endPosition.z - movement.startPosition.z) * easedT,
      },
    });
  }

  return keyframes;
}

/**
 * تطبيق دالة easing على قيمة t
 */
export function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case "ease-in":
      return t * t;
    case "ease-out":
      return t * (2 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}
