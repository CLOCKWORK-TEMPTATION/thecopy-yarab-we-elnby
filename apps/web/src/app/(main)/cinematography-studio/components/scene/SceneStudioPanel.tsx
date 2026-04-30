"use client";

import { Canvas } from "@react-three/fiber";
import { Download, Link2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  buildCineShareUrl,
  createAdditionalLight,
  readCineSceneSession,
  readSharedCineScene,
  resolveLensPreset,
  serializeCineSceneExport,
  writeCineSceneSession,
} from "../../lib/scene-session";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

import type { CameraRig, LightingRig, Scene } from "../../types";

interface SceneStudioPanelProps {
  forceWebGLUnavailable?: boolean;
}

interface ScenePreviewProps {
  scene: Scene;
  forceWebGLUnavailable?: boolean;
}

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    camera: {
      ...scene.camera,
      position: [...scene.camera.position],
    },
    lens: { ...scene.lens },
    lights: scene.lights.map((light) => ({
      ...light,
      position: [...light.position],
    })),
  };
}

function canCreateWebGLContext(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("jsdom")
  ) {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function SceneGeometry({ scene }: { scene: Scene }) {
  const keyLight = scene.lights[0];
  const fillLight = scene.lights[1];
  const backLight = scene.lights[2];

  return (
    <>
      <ambientLight intensity={0.18} />
      {keyLight ? (
        <pointLight
          color={keyLight.color}
          intensity={keyLight.intensity / 28}
          position={keyLight.position}
        />
      ) : null}
      {fillLight ? (
        <pointLight
          color={fillLight.color}
          intensity={fillLight.intensity / 48}
          position={fillLight.position}
        />
      ) : null}
      {backLight ? (
        <pointLight
          color={backLight.color}
          intensity={backLight.intensity / 34}
          position={backLight.position}
        />
      ) : null}

      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.2, 1.9, 0.55]} />
        <meshStandardMaterial roughness={0.45} color="#c9b894" />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial roughness={0.5} color="#d8c4a0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 1.05, -1.8]}>
        <boxGeometry args={[4.8, 2.2, 0.12]} />
        <meshStandardMaterial color="#1d1d1d" />
      </mesh>
    </>
  );
}

function ScenePreview({ scene, forceWebGLUnavailable }: ScenePreviewProps) {
  const webglAvailable = forceWebGLUnavailable ? false : canCreateWebGLContext();
  const keyLightIntensity = scene.lights[0]?.intensity ?? 0;

  return (
    <div
      className="relative min-h-[360px] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]"
      data-testid="cine-scene-preview"
    >
      {webglAvailable ? (
        <div className="h-[360px] w-full">
          <Canvas
            camera={{
              position: scene.camera.position,
              fov: Math.max(
                18,
                Math.min(72, 80 - scene.camera.focalLength / 3)
              ),
            }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
          >
            <color attach="background" args={["#121212"]} />
            <SceneGeometry scene={scene} />
          </Canvas>
        </div>
      ) : (
        <div className="flex min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(229,181,79,0.18),transparent_30%),linear-gradient(135deg,#080808,#111_52%,#050505)] p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto h-20 w-20 rounded-full border border-[#73572a] bg-[#130d05] shadow-[0_0_48px_rgba(229,181,79,0.16)]" />
            <p className="mt-5 text-lg font-semibold text-[#f6cf72]">
              العرض ثلاثي الأبعاد غير متاح في هذه الجلسة
            </p>
            <p className="mt-3 text-sm leading-7 text-[#b4aa92]">
              تستطيع متابعة تعديل الإضاءة والكاميرا والحفظ.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-4 bottom-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Key Light
          </p>
          <p className="mt-1 text-sm font-semibold text-[#f6cf72]">
            إضاءة رئيسية {keyLightIntensity}%
          </p>
        </div>
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Lens
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {scene.camera.focalLength}mm
          </p>
        </div>
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Package
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {scene.lens.label}
          </p>
        </div>
      </div>
    </div>
  );
}

function updateSceneTimestamp(scene: Scene): Scene {
  return { ...scene, updatedAt: new Date().toISOString() };
}

function updateCamera(scene: Scene, patch: Partial<CameraRig>): Scene {
  return updateSceneTimestamp({
    ...scene,
    camera: { ...scene.camera, ...patch },
  });
}

function updateLens(scene: Scene, preset: string): Scene {
  const lens = resolveLensPreset(preset);
  return updateSceneTimestamp({ ...scene, lens });
}

function updateLight(
  scene: Scene,
  lightId: string,
  patch: Partial<LightingRig>
): Scene {
  return updateSceneTimestamp({
    ...scene,
    lights: scene.lights.map((light) =>
      light.id === lightId ? { ...light, ...patch } : light
    ),
  });
}

function downloadJson(scene: Scene): void {
  const json = serializeCineSceneExport(scene);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${scene.name.trim() || "cine-scene"}.json`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

function SceneIdentityControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">اسم المشهد</span>
        <input
          aria-label="اسم المشهد"
          value={scene.name}
          onChange={(event) =>
            onSceneChange(
              updateSceneTimestamp({ ...scene, name: event.target.value })
            )
          }
          className="h-11 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">وصف المشهد</span>
        <textarea
          aria-label="وصف المشهد"
          value={scene.description}
          maxLength={5000}
          onChange={(event) =>
            onSceneChange(
              updateSceneTimestamp({
                ...scene,
                description: event.target.value.slice(0, 5000),
              })
            )
          }
          className="min-h-[92px] w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        />
      </label>
    </div>
  );
}

function CameraControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">حزمة العدسة</span>
        <select
          aria-label="حزمة العدسة"
          value={scene.lens.preset}
          onChange={(event) =>
            onSceneChange(updateLens(scene, event.target.value))
          }
          className="h-11 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        >
          <option value="spherical">Spherical</option>
          <option value="anamorphic">Anamorphic</option>
          <option value="vintage">Vintage</option>
          <option value="macro">Macro</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          البعد البؤري {scene.camera.focalLength}mm
        </span>
        <input
          aria-label="البعد البؤري"
          type="range"
          min={12}
          max={200}
          value={scene.camera.focalLength}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { focalLength: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          فتحة العدسة {scene.camera.aperture.toFixed(1)}
        </span>
        <input
          aria-label="فتحة العدسة"
          type="range"
          min={0.7}
          max={22}
          step={0.1}
          value={scene.camera.aperture}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { aperture: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          حساسية الكاميرا {scene.camera.iso}
        </span>
        <input
          aria-label="حساسية الكاميرا"
          type="range"
          min={100}
          max={12800}
          step={100}
          value={scene.camera.iso}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { iso: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>
    </div>
  );
}

function LightControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="space-y-3">
      {scene.lights.map((light) => (
        <div
          key={light.id}
          data-testid="cine-light-row"
          className="rounded-[8px] border border-[#262626] bg-[#070707] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{light.label}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f7b71]">
                {light.kind}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSceneChange(
                  updateSceneTimestamp({
                    ...scene,
                    lights: scene.lights.filter((item) => item.id !== light.id),
                  })
                )
              }
              disabled={scene.lights.length <= 1}
              aria-label={`حذف ${light.label}`}
              className="rounded-[8px] border border-[#343434] p-2 text-[#b4aa92] hover:text-[#f6cf72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_90px]">
            <label className="space-y-2">
              <span className="text-xs text-[#ddd2b8]">
                {light.label === "إضاءة رئيسية"
                  ? "شدة الضوء الرئيسي"
                  : `شدة ${light.label}`}
              </span>
              <input
                aria-label={
                  light.label === "إضاءة رئيسية"
                    ? "شدة الضوء الرئيسي"
                    : `شدة ${light.label}`
                }
                type="range"
                min={0}
                max={100}
                value={light.intensity}
                onChange={(event) =>
                  onSceneChange(
                    updateLight(scene, light.id, {
                      intensity: Number(event.target.value),
                    })
                  )
                }
                className="w-full accent-[#e5b54f]"
              />
            </label>
            <input
              aria-label={`لون ${light.label}`}
              type="color"
              value={light.color}
              onChange={(event) =>
                onSceneChange(
                  updateLight(scene, light.id, { color: event.target.value })
                )
              }
              className="h-10 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d]"
            />
          </div>
          <p className="mt-2 text-xs text-[#b4aa92]">
            {light.intensity}% عند موضع {light.position.join(" / ")}
          </p>
        </div>
      ))}

      <Button
        type="button"
        onClick={() =>
          onSceneChange(
            updateSceneTimestamp({
              ...scene,
              lights: [
                ...scene.lights,
                createAdditionalLight(scene.lights.length + 1),
              ],
            })
          )
        }
        className="h-11 w-full border border-[#73572a] bg-[#120d06] text-[#f6cf72] hover:bg-[#23160a]"
      >
        <Plus className="mr-2 h-4 w-4" />
        إضافة مصدر ضوء
      </Button>
    </div>
  );
}

export function SceneStudioPanel({
  forceWebGLUnavailable = false,
}: SceneStudioPanelProps) {
  const [scene, setScene] = useState<Scene>(() => {
    if (typeof window === "undefined") {
      return readCineSceneSession().scene;
    }
    const shared = readSharedCineScene(window.location.search);
    return shared ?? readCineSceneSession().scene;
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  const handleSceneChange = useCallback((nextScene: Scene) => {
    setScene(cloneScene(nextScene));
  }, []);

  const saveScene = useCallback(() => {
    const session = writeCineSceneSession(scene);
    setSavedAt(session.savedAt);
  }, [scene]);

  const exportScene = useCallback(() => {
    downloadJson(scene);
  }, [scene]);

  const createShareLink = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = "/cinematography-studio";
    const absoluteUrl = buildCineShareUrl(scene, { origin, path });
    const visibleUrl = absoluteUrl.replace(origin, "");
    setShareUrl(visibleUrl);
    writeCineSceneSession(scene);
  }, [scene]);

  const summary = useMemo(() => {
    const totalLight = scene.lights.reduce(
      (sum, light) => sum + light.intensity,
      0
    );
    const averageLight = Math.round(
      totalLight / Math.max(1, scene.lights.length)
    );
    return {
      averageLight,
      lightCount: scene.lights.length,
      lensLabel: scene.lens.label,
    };
  }, [scene]);

  return (
    <StudioPanel
      title="Scene Studio"
      subtitle="مشهد تصوير كامل مع إضاءة وكاميرا وعدسات وحفظ وتصدير"
      headerRight={
        <span className="rounded-full border border-[#73572a] bg-[#120d06] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#f6cf72]">
          Production Ready Flow
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-4">
          <ScenePreview
            scene={scene}
            forceWebGLUnavailable={forceWebGLUnavailable}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <StudioMetricCell
              label="Lights"
              value={summary.lightCount}
              tone="white"
            />
            <StudioMetricCell
              label="Average Light"
              value={`${summary.averageLight}%`}
            />
            <StudioMetricCell
              label="Lens"
              value={summary.lensLabel}
              tone="white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <SceneIdentityControls
              scene={scene}
              onSceneChange={handleSceneChange}
            />
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
              Camera And Lens
            </p>
            <CameraControls scene={scene} onSceneChange={handleSceneChange} />
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
              Lighting Rig
            </p>
            <LightControls scene={scene} onSceneChange={handleSceneChange} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              onClick={saveScene}
              className="h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
            >
              <Save className="mr-2 h-4 w-4" />
              حفظ تصميم التصوير
            </Button>
            <Button
              type="button"
              onClick={exportScene}
              className="h-11 border border-[#343434] bg-[#0d0d0d] text-[#ddd2b8] hover:bg-[#171717]"
            >
              <Download className="mr-2 h-4 w-4" />
              تصدير إعدادات التصوير
            </Button>
            <Button
              type="button"
              onClick={createShareLink}
              className="h-11 border border-[#343434] bg-[#0d0d0d] text-[#ddd2b8] hover:bg-[#171717]"
            >
              <Link2 className="mr-2 h-4 w-4" />
              إنشاء رابط مشاركة
            </Button>
          </div>

          <div
            className={cn(
              "rounded-[8px] border border-[#262626] bg-[#050505] px-3 py-3 text-sm leading-7 text-[#b4aa92]",
              savedAt || shareUrl ? "block" : "hidden"
            )}
            aria-live="polite"
          >
            {savedAt ? <p>تم حفظ آخر تصميم عند {savedAt}</p> : null}
            {shareUrl ? (
              <p className="break-all" data-testid="cine-share-link">
                {shareUrl}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </StudioPanel>
  );
}

export default SceneStudioPanel;
