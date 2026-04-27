// CineArchitect AI - AI Lighting Simulator
// محاكي الإضاءة الذكي

import { definedProps } from "@/lib/defined-props";
import { logger } from "@/lib/logger";

import {
  Plugin,
  PluginInput,
  PluginOutput,
  LightingSetup,
  Light,
} from "../../types";

interface LightingSimulationInput {
  scene: {
    location: "interior" | "exterior" | "studio";
    timeOfDay:
      | "dawn"
      | "morning"
      | "midday"
      | "afternoon"
      | "sunset"
      | "dusk"
      | "night";
    weather?: "clear" | "cloudy" | "overcast" | "rain" | "fog";
    mood: string;
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
  };
  style?:
    | "naturalistic"
    | "dramatic"
    | "high-key"
    | "low-key"
    | "noir"
    | "romantic";
  budget?: "low" | "medium" | "high";
}

interface LightingRecommendation {
  setup: LightingSetup;
  equipment: EquipmentItem[];
  diagram: string;
  notes: string;
  notesAr: string;
  alternatives: AlternativeSetup[];
}

interface EquipmentItem {
  name: string;
  nameAr: string;
  type: string;
  quantity: number;
  power?: string;
  accessories?: string[];
}

interface AlternativeSetup {
  name: string;
  description: string;
  budgetLevel: "low" | "medium" | "high";
}

// Natural light color temperatures by time of day
const TIME_COLOR_TEMPS: Record<string, number> = {
  dawn: 3000,
  morning: 4500,
  midday: 5600,
  afternoon: 5200,
  sunset: 3500,
  dusk: 4000,
  night: 4100, // Moonlight simulation
};

export class LightingSimulator implements Plugin {
  id = "lighting-simulator";
  name = "AI Lighting Simulator";
  nameAr = "محاكي الإضاءة الذكي";
  version = "1.0.0";
  description =
    "Simulates natural and artificial lighting conditions with high accuracy";
  descriptionAr = "محاكاة دقيقة لظروف الإضاءة الطبيعية والصناعية";
  category = "ai-analytics" as const;

  initialize(): void {
    logger.info(`[${this.name}] Initialized`);
  }

  execute(input: PluginInput): PluginOutput {
    switch (input.type) {
      case "simulate":
        return this.simulateLighting(
          input.data as unknown as LightingSimulationInput
        );
      case "calculate":
        return this.calculateEquipment(
          input.data as unknown as {
            area: number;
            targetLux: number;
            colorTemp: number;
          }
        );
      case "match":
        return this.matchNaturalLight(
          input.data as unknown as {
            targetTime: string;
            currentSetup: LightingSetup;
          }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private simulateLighting(data: LightingSimulationInput): PluginOutput {
    const { scene, style = "naturalistic" } = data;

    const colorTemp = TIME_COLOR_TEMPS[scene.timeOfDay] ?? 5600;
    const equipment: EquipmentItem[] = [];
    const alternatives: AlternativeSetup[] = [];

    // Determine key light based on location and time
    let keyLight: Light;
    let fillLight: Light;
    let backLight: Light | undefined;
    const practicals: Light[] = [];

    if (scene.location === "exterior") {
      // Exterior lighting setup
      if (
        ["dawn", "morning", "midday", "afternoon", "sunset"].includes(
          scene.timeOfDay
        )
      ) {
        // Daylight scenarios
        keyLight = {
          type:
            scene.weather === "overcast"
              ? "Diffused Sunlight"
              : "Direct Sunlight",
          intensity: scene.weather === "overcast" ? 70 : 100,
          colorTemperature: colorTemp,
          position: this.getSunPosition(scene.timeOfDay),
        };

        if (scene.weather !== "overcast") {
          equipment.push({
            name: "12x12 Silk/Diffusion Frame",
            nameAr: "إطار حرير/تشتيت 12×12",
            type: "diffusion",
            quantity: 1,
            accessories: ["C-stands", "Sandbags"],
          });
        }

        // Bounce for fill
        fillLight = {
          type: "Bounce (Reflector)",
          intensity: 40,
          colorTemperature: colorTemp,
          position: "Opposite key light",
        };

        equipment.push({
          name: "4x4 Reflector (Silver/Gold)",
          nameAr: "عاكس 4×4 (فضي/ذهبي)",
          type: "reflector",
          quantity: 2,
        });
      } else {
        // Night exterior
        keyLight = {
          type: "HMI or LED Panel",
          intensity: 80,
          colorTemperature: 5600,
          position: "High angle, simulating moonlight",
        };

        equipment.push({
          name: "ARRI M18 HMI",
          nameAr: "ARRI M18 HMI",
          type: "hmi",
          quantity: 1,
          power: "1800W",
          accessories: ["Chimera", "Gel frame"],
        });

        fillLight = {
          type: "LED Panel (Dimmable)",
          intensity: 30,
          colorTemperature: 4500,
          position: "Low fill",
        };
      }
    } else if (scene.location === "interior") {
      // Interior lighting setup
      keyLight = {
        type: "Soft source through window",
        intensity: 80,
        colorTemperature: colorTemp,
        position: "Window side",
      };

      equipment.push({
        name: "ARRI SkyPanel S60",
        nameAr: "ARRI SkyPanel S60",
        type: "led-panel",
        quantity: 1,
        power: "358W",
        accessories: ["Softbox", "Grid"],
      });

      if (scene.timeOfDay === "night") {
        // Add practicals
        practicals.push({
          type: "Practical lamp",
          intensity: 25,
          colorTemperature: 2700,
          position: "Table/desk",
        });

        equipment.push({
          name: "Practical lamps with dimmers",
          nameAr: "مصابيح عملية مع مخفتات",
          type: "practical",
          quantity: 2,
        });
      }

      fillLight = {
        type: "Bounce or soft LED",
        intensity: 35,
        colorTemperature: colorTemp,
        position: "Camera side, low",
      };
    } else {
      // Studio setup
      keyLight = {
        type: "Fresnel or LED",
        intensity: 100,
        colorTemperature: 5600,
        position: "45° from camera, slightly above eye level",
      };

      fillLight = {
        type: "Soft LED Panel",
        intensity: 50,
        colorTemperature: 5600,
        position: "Opposite key, near camera",
      };

      backLight = {
        type: "Fresnel or LED Spot",
        intensity: 60,
        colorTemperature: 5600,
        position: "Behind subject, high",
      };

      equipment.push(
        {
          name: "ARRI Fresnel 650W",
          nameAr: "ARRI Fresnel 650W",
          type: "fresnel",
          quantity: 2,
          power: "650W",
        },
        {
          name: "LED Panel Bi-Color",
          nameAr: "لوح LED ثنائي اللون",
          type: "led-panel",
          quantity: 2,
          accessories: ["Softbox", "Barn doors"],
        }
      );
    }

    // Apply style modifications
    if (style === "low-key" || style === "noir") {
      fillLight.intensity *= 0.3;
      keyLight.intensity *= 0.8;
    } else if (style === "high-key") {
      fillLight.intensity *= 1.5;
      keyLight.intensity *= 1.2;
    }

    // Build setup object
    const setup: LightingSetup = {
      type:
        scene.location === "exterior" && scene.timeOfDay !== "night"
          ? "natural"
          : "mixed",
      keyLight,
      notes: this.generateNotes(scene, style),
      ...definedProps({
        fillLight,
        backLight,
        practicals: practicals.length > 0 ? practicals : undefined,
      }),
    };

    // Add alternatives
    alternatives.push(
      {
        name: "Budget Alternative",
        description: "Use available window light with DIY reflectors",
        budgetLevel: "low",
      },
      {
        name: "Premium Setup",
        description: "Full ARRI setup with HMIs and SkyPanels",
        budgetLevel: "high",
      }
    );

    const recommendation: LightingRecommendation = {
      setup,
      equipment,
      diagram: this.generateDiagram(setup),
      notes: this.generateNotes(scene, style),
      notesAr: this.generateNotesAr(scene, style),
      alternatives,
    };

    return {
      success: true,
      data: recommendation as unknown as Record<string, unknown>,
    };
  }

  private getSunPosition(timeOfDay: string): string {
    const positions: Record<string, string> = {
      dawn: "Low angle, East",
      morning: "30-45° angle, East",
      midday: "High overhead, slightly South",
      afternoon: "30-45° angle, West",
      sunset: "Low angle, West",
      dusk: "Very low, West",
    };
    return positions[timeOfDay] ?? "Variable";
  }

  private generateDiagram(setup: LightingSetup): string {
    // ASCII diagram representation
    return `
    ┌─────────────────────────────────────┐
    │           LIGHTING DIAGRAM           │
    ├─────────────────────────────────────┤
    │                                     │
    │     [BL]                            │
    │       ↓                             │
    │   ┌───────┐                         │
    │   │Subject│ ← [KEY] ${setup.keyLight?.type ?? "N/A"}
    │   └───────┘                         │
    │       ↑                             │
    │     [FL]  ${setup.fillLight?.type ?? "N/A"}
    │                                     │
    │   [CAM] ◉                           │
    │                                     │
    └─────────────────────────────────────┘

    KEY: Key Light | FL: Fill Light | BL: Back Light
    `;
  }

  private generateNotes(
    scene: LightingSimulationInput["scene"],
    style: string
  ): string {
    const notes: string[] = [];

    notes.push(`Scene: ${scene.location} - ${scene.timeOfDay}`);
    notes.push(`Style: ${style}`);
    notes.push(`Base color temperature: ${TIME_COLOR_TEMPS[scene.timeOfDay]}K`);

    if (scene.weather) {
      notes.push(`Weather consideration: ${scene.weather}`);
    }

    return notes.join("\n");
  }

  private generateNotesAr(
    scene: LightingSimulationInput["scene"],
    style: string
  ): string {
    const locations: Record<string, string> = {
      interior: "داخلي",
      exterior: "خارجي",
      studio: "استوديو",
    };

    const times: Record<string, string> = {
      dawn: "فجر",
      morning: "صباح",
      midday: "ظهيرة",
      afternoon: "بعد الظهر",
      sunset: "غروب",
      dusk: "مغيب",
      night: "ليل",
    };

    return `المشهد: ${locations[scene.location]} - ${times[scene.timeOfDay]}\nالنمط: ${style}\nدرجة حرارة اللون: ${TIME_COLOR_TEMPS[scene.timeOfDay]}K`;
  }

  private calculateEquipment(data: {
    area: number;
    targetLux: number;
    colorTemp: number;
  }): PluginOutput {
    const { area, targetLux, colorTemp } = data;

    // Calculate required lumens
    const lumensNeeded = area * targetLux;

    // Estimate equipment
    const equipment: EquipmentItem[] = [];

    if (lumensNeeded < 5000) {
      equipment.push({
        name: "LED Panel 1x1",
        nameAr: "لوح LED 1×1",
        type: "led-panel",
        quantity: Math.ceil(lumensNeeded / 2000),
        power: "100W",
      });
    } else if (lumensNeeded < 20000) {
      equipment.push({
        name: "ARRI SkyPanel S60",
        nameAr: "ARRI SkyPanel S60",
        type: "led-panel",
        quantity: Math.ceil(lumensNeeded / 8000),
        power: "358W",
      });
    } else {
      equipment.push({
        name: "HMI 1.8K",
        nameAr: "HMI 1.8K",
        type: "hmi",
        quantity: Math.ceil(lumensNeeded / 18000),
        power: "1800W",
      });
    }

    return {
      success: true,
      data: {
        area,
        targetLux,
        lumensNeeded,
        colorTemp,
        equipment,
      },
    };
  }

  private matchNaturalLight(data: {
    targetTime: string;
    currentSetup: LightingSetup;
  }): PluginOutput {
    const { targetTime, currentSetup } = data;
    const targetTemp = TIME_COLOR_TEMPS[targetTime] ?? 5600;

    const adjustments = [];

    if (currentSetup.keyLight) {
      const tempDiff = targetTemp - currentSetup.keyLight.colorTemperature;
      if (Math.abs(tempDiff) > 200) {
        adjustments.push({
          light: "Key Light",
          current: currentSetup.keyLight.colorTemperature,
          target: targetTemp,
          suggestion:
            tempDiff > 0
              ? "Add CTB gel or increase LED color temp"
              : "Add CTO gel or decrease LED color temp",
        });
      }
    }

    return {
      success: true,
      data: {
        targetTime,
        targetColorTemperature: targetTemp,
        adjustments,
        notes: `To match ${targetTime} lighting, target ${targetTemp}K color temperature`,
      },
    };
  }

  shutdown(): void {
    logger.info(`[${this.name}] Shut down`);
  }
}

export const lightingSimulator = new LightingSimulator();
