// @vitest-environment jsdom
/**
 * @fileoverview Unit tests for cinematography studio control hooks
 *
 * Covers:
 *  - useProduction: color temperature slider, focus peaking toggle, false color toggle,
 *    mood-based recommended values, ready-to-shoot state
 *  - usePostProduction: temperature slider with Zod validation, mood-based recommendation,
 *    scene type selection, export settings
 *  - usePreProduction: darkness slider, complexity slider, canGenerate guard, reset
 *  - useCinematographyStudio: phase transitions, tab mapping, view mode, visual mood
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("../../lib/studio-route-client", () => ({
  postStudioFormData: vi.fn().mockResolvedValue({ validation: {} }),
  postStudioJson: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

// ---------------------------------------------------------------------------
// Import hooks AFTER mocks
// ---------------------------------------------------------------------------

const { useProduction } = await import("../useProduction");
const { usePostProduction } = await import("../usePostProduction");
const { usePreProduction } = await import("../usePreProduction");
const { useCinematographyStudio } = await import("../useCinematographyStudio");

// ===========================================================================
// useProduction
// ===========================================================================

describe("useProduction", () => {
  it("initializes with default technical settings", () => {
    const { result } = renderHook(() => useProduction("noir"));

    expect(result.current.technicalSettings.focusPeaking).toBe(true);
    expect(result.current.technicalSettings.falseColor).toBe(false);
    expect(result.current.technicalSettings.colorTemp).toBe(3200);
  });

  it("toggles focus peaking on/off", () => {
    const { result } = renderHook(() => useProduction("noir"));

    expect(result.current.technicalSettings.focusPeaking).toBe(true);

    act(() => result.current.toggleFocusPeaking());
    expect(result.current.technicalSettings.focusPeaking).toBe(false);

    act(() => result.current.toggleFocusPeaking());
    expect(result.current.technicalSettings.focusPeaking).toBe(true);
  });

  it("toggles false color on/off", () => {
    const { result } = renderHook(() => useProduction("noir"));

    expect(result.current.technicalSettings.falseColor).toBe(false);

    act(() => result.current.toggleFalseColor());
    expect(result.current.technicalSettings.falseColor).toBe(true);

    act(() => result.current.toggleFalseColor());
    expect(result.current.technicalSettings.falseColor).toBe(false);
  });

  it("updates color temperature via slider adapter (number[])", () => {
    const { result } = renderHook(() => useProduction("noir"));

    act(() => result.current.setColorTempFromSlider([5600]));
    expect(result.current.technicalSettings.colorTemp).toBe(5600);
    expect(result.current.colorTempValue).toEqual([5600]);
  });

  it("clamps color temperature within valid range", () => {
    const { result } = renderHook(() => useProduction("noir"));

    // Below minimum — should not change (setColorTemp guards 2000-10000)
    act(() => result.current.setColorTempFromSlider([500]));
    expect(result.current.technicalSettings.colorTemp).toBe(3200);

    // Above maximum — should not change
    act(() => result.current.setColorTempFromSlider([15000]));
    expect(result.current.technicalSettings.colorTemp).toBe(3200);

    // Within range
    act(() => result.current.setColorTempFromSlider([7000]));
    expect(result.current.technicalSettings.colorTemp).toBe(7000);
  });

  it("returns correct recommended color temp per mood", () => {
    const { result: noir } = renderHook(() => useProduction("noir"));
    expect(noir.current.recommendedColorTemp).toBe(3200);

    const { result: realistic } = renderHook(() => useProduction("realistic"));
    expect(realistic.current.recommendedColorTemp).toBe(5600);

    const { result: surreal } = renderHook(() => useProduction("surreal"));
    expect(surreal.current.recommendedColorTemp).toBe(4500);

    const { result: vintage } = renderHook(() => useProduction("vintage"));
    expect(vintage.current.recommendedColorTemp).toBe(3800);
  });

  it("reports not ready to shoot when no analysis exists", () => {
    const { result } = renderHook(() => useProduction("noir"));

    expect(result.current.hasAnalysis).toBe(false);
    expect(result.current.isReadyToShoot).toBe(false);
  });

  it("updates question state", () => {
    const { result } = renderHook(() => useProduction("noir"));

    act(() => result.current.setQuestion("What lens should I use?"));
    expect(result.current.question).toBe("What lens should I use?");
  });

  it("resets analysis state", () => {
    const { result } = renderHook(() => useProduction("noir"));

    act(() => result.current.setQuestion("test question"));
    expect(result.current.question).toBe("test question");

    act(() => result.current.resetAnalysis());
    expect(result.current.question).toBe("");
    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

// ===========================================================================
// usePostProduction
// ===========================================================================

describe("usePostProduction", () => {
  it("initializes with default temperature", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    expect(result.current.temperature).toBe(5500);
    expect(result.current.temperatureValue).toEqual([5500]);
  });

  it("updates temperature via slider (number[])", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    act(() => result.current.setTemperature([4200]));
    expect(result.current.temperature).toBe(4200);
    expect(result.current.temperatureValue).toEqual([4200]);
  });

  it("rejects out-of-range temperature values via Zod", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    // Zod schema should reject extreme values
    act(() => result.current.setTemperature([500]));
    // Temperature should remain at default if rejected
    expect(result.current.temperature).toBe(5500);
  });

  it("returns mood-based recommended temperature", () => {
    const { result: noir } = renderHook(() => usePostProduction("noir"));
    expect(noir.current.recommendedTemperature).toBe(3200);

    const { result: realistic } = renderHook(() =>
      usePostProduction("realistic")
    );
    expect(realistic.current.recommendedTemperature).toBe(5600);

    const { result: vintage } = renderHook(() => usePostProduction("vintage"));
    expect(vintage.current.recommendedTemperature).toBe(3800);
  });

  it("sets scene type for color grading", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    expect(result.current.sceneType).toBeNull();

    act(() => result.current.setSceneType("night"));
    expect(result.current.sceneType).toBe("night");

    act(() => result.current.setSceneType("morning"));
    expect(result.current.sceneType).toBe("morning");
  });

  it("creates export settings for different platforms", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    expect(result.current.exportSettings).toBeNull();

    act(() => result.current.createExportSettings("cinema-dcp"));
    expect(result.current.exportSettings).toEqual({
      platform: "cinema-dcp",
      resolution: "4096x2160",
      frameRate: 24,
      codec: "JPEG2000",
    });

    act(() => result.current.createExportSettings("web-social"));
    expect(result.current.exportSettings).toEqual({
      platform: "web-social",
      resolution: "1920x1080",
      frameRate: 30,
      codec: "H.264",
    });
  });

  it("tracks editorial notes", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    expect(result.current.editorialNotes).toBe("");

    act(() => result.current.setEditorialNotes("Cut at 2:30 mark"));
    expect(result.current.editorialNotes).toBe("Cut at 2:30 mark");
  });

  it("starts with no color palette", () => {
    const { result } = renderHook(() => usePostProduction("noir"));

    expect(result.current.hasColorPalette).toBe(false);
    expect(result.current.colorPalette).toEqual([]);
  });
});

// ===========================================================================
// usePreProduction
// ===========================================================================

describe("usePreProduction", () => {
  it("initializes with default darkness and complexity", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    expect(result.current.darkness).toEqual([50]);
    expect(result.current.complexity).toEqual([30]);
  });

  it("updates darkness slider", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    act(() => result.current.setDarkness([75]));
    expect(result.current.darkness).toEqual([75]);
  });

  it("updates complexity slider", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    act(() => result.current.setComplexity([60]));
    expect(result.current.complexity).toEqual([60]);
  });

  it("canGenerate is false with short prompt", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    expect(result.current.canGenerate).toBe(false);

    act(() => result.current.setPrompt("short"));
    expect(result.current.canGenerate).toBe(false);
  });

  it("canGenerate is true with sufficient prompt length", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    act(() =>
      result.current.setPrompt("A dark alley with rain falling slowly")
    );
    expect(result.current.canGenerate).toBe(true);
  });

  it("resets all state to defaults", () => {
    const { result } = renderHook(() => usePreProduction("noir"));

    act(() => {
      result.current.setPrompt("Some long scene description here");
      result.current.setDarkness([80]);
      result.current.setComplexity([90]);
    });

    expect(result.current.darkness).toEqual([80]);
    expect(result.current.complexity).toEqual([90]);

    act(() => result.current.reset());

    expect(result.current.prompt).toBe("");
    expect(result.current.darkness).toEqual([50]);
    expect(result.current.complexity).toEqual([30]);
    expect(result.current.canGenerate).toBe(false);
  });
});

// ===========================================================================
// useCinematographyStudio
// ===========================================================================

describe("useCinematographyStudio", () => {
  it("initializes with pre phase and dashboard view", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    expect(result.current.currentPhase).toBe("pre");
    expect(result.current.activeView).toBe("dashboard");
    expect(result.current.visualMood).toBe("noir");
    expect(result.current.activeTool).toBeNull();
  });

  it("changes phase correctly", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    act(() => result.current.setPhase("production"));
    expect(result.current.currentPhase).toBe("production");

    act(() => result.current.setPhase("post"));
    expect(result.current.currentPhase).toBe("post");
  });

  it("maps tab value correctly from phase", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    expect(result.current.currentTabValue).toBe("pre-production");

    act(() => result.current.setPhase("production"));
    expect(result.current.currentTabValue).toBe("production");

    act(() => result.current.setPhase("post"));
    expect(result.current.currentTabValue).toBe("post-production");
  });

  it("handles tab change and updates phase", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    act(() => result.current.handleTabChange("production"));
    expect(result.current.currentPhase).toBe("production");

    act(() => result.current.handleTabChange("post-production"));
    expect(result.current.currentPhase).toBe("post");
  });

  it("ignores invalid tab values", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    act(() => result.current.handleTabChange("invalid-tab"));
    expect(result.current.currentPhase).toBe("pre");
  });

  it("sets visual mood with validation", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    act(() => result.current.setVisualMood("vintage"));
    expect(result.current.visualMood).toBe("vintage");

    // Invalid mood should be ignored
    act(() => result.current.setVisualMood("invalid-mood"));
    expect(result.current.visualMood).toBe("vintage");
  });

  it("manages active tool state", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    expect(result.current.hasActiveTool).toBe(false);

    act(() => result.current.openTool("color-grading"));
    expect(result.current.activeTool).toBe("color-grading");
    expect(result.current.hasActiveTool).toBe(true);

    act(() => result.current.closeTool());
    expect(result.current.activeTool).toBeNull();
    expect(result.current.hasActiveTool).toBe(false);
  });

  it("navigates to phase with view change", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    expect(result.current.isDashboardView).toBe(true);
    expect(result.current.isPhasesView).toBe(false);

    act(() => result.current.navigateToPhase("production"));
    expect(result.current.currentPhase).toBe("production");
    expect(result.current.activeView).toBe("phases");
    expect(result.current.isPhasesView).toBe(true);
    expect(result.current.isDashboardView).toBe(false);
  });

  it("switches view mode directly", () => {
    const { result } = renderHook(() => useCinematographyStudio());

    act(() => result.current.setActiveView("phases"));
    expect(result.current.activeView).toBe("phases");

    act(() => result.current.setActiveView("dashboard"));
    expect(result.current.activeView).toBe("dashboard");
  });
});
