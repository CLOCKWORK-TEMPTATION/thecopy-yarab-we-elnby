import type { TechnicalBreakdownKey } from "../../domain/models";

export interface AgentConfig {
  role: string;
  focus: string;
  extractionRules: string;
}

export const AGENT_PERSONAS: Record<TechnicalBreakdownKey, AgentConfig> = {
  costumes: {
    role: "Costume Designer Agent",
    focus: "Wardrobe, clothing, accessories, and fabric states",
    extractionRules:
      "Identify specific garments, their condition (torn, bloody, dirty), and specific accessories. Do not list props.",
  },
  makeup: {
    role: "Makeup & Hair Artist Agent",
    focus: "Cosmetics, wounds, hairstyles, and sweat/dirt",
    extractionRules:
      "Identify needed makeup effects, specific hairstyles, cuts, bruises, blood, sweat levels, or prosthetic requirements.",
  },
  setDressing: {
    role: "Set Decoration Agent",
    focus: "Background scenic items and environment dressing",
    extractionRules:
      "Identify non-handheld environment details that production design must prepare, such as furniture, wall dressing, table setups, debris, signage, practical decor, and repeated scenic arrangements. Do not list props actively used by actors.",
  },
  props: {
    role: "Property Master Agent",
    focus: "Hand-held items and active objects",
    extractionRules:
      "Identify items actors touch, hold, or interact with. Distinguish from set dressing (background) and costumes.",
  },
  sound: {
    role: "Sound & Playback Agent",
    focus:
      "Playback cues, practical sound requirements, and special recording needs",
    extractionRules:
      "Identify playback tracks, diegetic sound sources, practical sound effects, microphones hidden in action, off-screen audio cues, public address systems, phones, radios, sirens, crowd chants, or any sound requirement that needs production planning.",
  },
  equipment: {
    role: "Special Equipment Agent",
    focus: "Special cameras, rigs, and production equipment",
    extractionRules:
      "Identify non-standard equipment such as drones, cranes, Russian arms, underwater housings, rain rigs, wind machines, specialty lenses, projection systems, monitors, playback carts, or safety equipment required specifically for the scene.",
  },
  vehicles: {
    role: "Transportation Coordinator Agent",
    focus: "Cars, bikes, boats, aircraft",
    extractionRules:
      "Identify specific make/model (if mentioned), type of vehicle, condition (crashed, new), and if it's moving or static.",
  },
  stunts: {
    role: "Stunt Coordinator Agent",
    focus: "Physical action, safety, and combat",
    extractionRules:
      "Identify falls, fights, weapon use, fast driving, wire work, or any action requiring safety supervision/doubles.",
  },
  spfx: {
    role: "Special Effects Supervisor Agent (Practical)",
    focus: "On-set physical effects",
    extractionRules:
      "Identify rain, wind, fire, smoke, explosions, squibs (gunshots), debris, or atmospherics created physically on set.",
  },
  vfx: {
    role: "VFX Supervisor Agent (Digital)",
    focus: "Post-production visual effects",
    extractionRules:
      "Identify green screens, digital set extensions, creature animation, wire removal, or impossible physics.",
  },
  animals: {
    role: "Animal Wrangler Agent",
    focus: "Live animals",
    extractionRules:
      "Identify any living creature needed on set, including insects. Note specific behaviors required.",
  },
  locations: {
    role: "Location Manager Agent",
    focus: "Environment and geography",
    extractionRules:
      "Identify the setting type (INT/EXT), specific architectural features, era, terrain, and environmental conditions.",
  },
  graphics: {
    role: "Playback Specialist Agent",
    focus: "Screens and printed media",
    extractionRules:
      "Identify content on TV screens, smartphones, computer monitors, newspapers, or signage that needs to be created.",
  },
  continuity: {
    role: "Continuity Supervisor Agent",
    focus: "Stateful details that must stay consistent across connected scenes",
    extractionRules:
      "Identify continuity-sensitive details such as injuries, blood levels, dirt, wetness, costume state, prop state, broken objects, food levels, cigarette length, vehicle damage, weather continuity, time-of-day continuity, and any detail that another scene would need to match.",
  },
  extras: {
    role: "Crowd Coordinator Agent",
    focus: "Background actors",
    extractionRules:
      "Identify specific groups of people in the background (e.g., 'angry mob', 'cafe patrons', 'pedestrians'). Estimate vibe/activity.",
  },
};
