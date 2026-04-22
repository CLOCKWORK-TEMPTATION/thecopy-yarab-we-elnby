/* eslint-disable */
import { definedProps } from "@/utils/defined-props";
import { Plugin, PluginInput, PluginOutput } from "../../types";
import { v4 as uuidv4 } from "uuid";

interface Location {
  id: string;
  name: string;
  nameAr: string;
  type: "studio" | "outdoor" | "interior" | "exterior" | "mixed";
  address: string;
  city: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  availability: AvailabilitySlot[];
  permits: Permit[];
  amenities: string[];
  restrictions: string[];
  photos: string[];
  costPerDay: number;
  currency: string;
  rating: number;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilitySlot {
  startDate: string;
  endDate: string;
  isAvailable: boolean;
  bookedBy?: string;
}

interface Permit {
  type: string;
  status: "pending" | "approved" | "denied" | "expired";
  issuedBy: string;
  validFrom?: string;
  validUntil?: string;
  notes: string;
}

interface SetDesign {
  id: string;
  locationId: string;
  name: string;
  nameAr: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  materials: string[];
  estimatedCost: number;
  buildTime: number;
  photos: string[];
  status: "concept" | "approved" | "building" | "ready" | "strike";
  createdAt: Date;
}

interface SearchCriteria {
  type?: string;
  city?: string;
  maxCostPerDay?: number;
  requiredAmenities?: string[];
  availableFrom?: string;
  availableTo?: string;
  tags?: string[];
}

export class LocationSetCoordinator implements Plugin {
  id = "location-coordinator";
  name = "Smart Location & Set Coordinator";
  nameAr = "منسّق المواقع والديكورات الذكي";
  version = "1.0.0";
  description =
    "Smart database for locations and sets with advanced scheduling and permit management";
  descriptionAr =
    "قاعدة بيانات ذكية للمواقع والديكورات مع جدولة متقدمة وإدارة التصاريح";
  category = "resource-management" as const;

  private locations: Map<string, Location> = new Map();
  private setDesigns: Map<string, SetDesign> = new Map();

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initialized`);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "add-location":
        return this.addLocation(input.data as unknown as Partial<Location>);
      case "search":
        return this.searchLocations(input.data as unknown as SearchCriteria);
      case "get-location":
        return this.getLocation(input.data as { id: string });
      case "update-availability":
        return this.updateAvailability(
          input.data as { locationId: string; slot: AvailabilitySlot }
        );
      case "add-permit":
        return this.addPermit(
          input.data as { locationId: string; permit: Permit }
        );
      case "add-set":
        return this.addSetDesign(input.data as unknown as Partial<SetDesign>);
      case "get-sets":
        return this.getSetDesigns(input.data as { locationId?: string });
      case "match":
        return this.matchLocationToScene(
          input.data as { sceneRequirements: Record<string, unknown> }
        );
      case "schedule":
        return this.getSchedule(
          input.data as { startDate: string; endDate: string }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private async addLocation(data: Partial<Location>): Promise<PluginOutput> {
    if (!data.name || !data.type) {
      return {
        success: false,
        error: "Location name and type are required",
      };
    }

    const location: Location = {
      id: uuidv4(),
      name: data.name,
      nameAr: data.nameAr || data.name,
      type: data.type,
      address: data.address || "",
      city: data.city || "",
      country: data.country || "",
      availability: data.availability || [],
      permits: data.permits || [],
      amenities: data.amenities || [],
      restrictions: data.restrictions || [],
      photos: data.photos || [],
      costPerDay: data.costPerDay || 0,
      currency: data.currency || "USD",
      rating: data.rating || 0,
      tags: data.tags || [],
      notes: data.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...definedProps({
        coordinates: data.coordinates,
      }),
    };

    this.locations.set(location.id, location);

    return {
      success: true,
      data: {
        message: "Location added successfully",
        messageAr: "تمت إضافة الموقع بنجاح",
        location: location as unknown as Record<string, unknown>,
      },
    };
  }

  private async searchLocations(
    criteria: SearchCriteria
  ): Promise<PluginOutput> {
    let results = Array.from(this.locations.values());

    if (criteria.type) {
      results = results.filter((l) => l.type === criteria.type);
    }
    if (criteria.city) {
      results = results.filter((l) =>
        l.city.toLowerCase().includes(criteria.city!.toLowerCase())
      );
    }
    if (criteria.maxCostPerDay) {
      results = results.filter((l) => l.costPerDay <= criteria.maxCostPerDay!);
    }
    if (criteria.requiredAmenities && criteria.requiredAmenities.length > 0) {
      results = results.filter((l) =>
        criteria.requiredAmenities!.every((a) => l.amenities.includes(a))
      );
    }
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter((l) =>
        criteria.tags!.some((t) => l.tags.includes(t))
      );
    }
    if (criteria.availableFrom && criteria.availableTo) {
      results = results.filter((l) =>
        this.isLocationAvailable(
          l,
          criteria.availableFrom!,
          criteria.availableTo!
        )
      );
    }

    results.sort((a, b) => b.rating - a.rating);

    return {
      success: true,
      data: {
        count: results.length,
        locations: results as unknown as Record<string, unknown>[],
      },
    };
  }

  private isLocationAvailable(
    location: Location,
    from: string,
    to: string
  ): boolean {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    for (const slot of location.availability) {
      const slotStart = new Date(slot.startDate);
      const slotEnd = new Date(slot.endDate);

      if (
        !slot.isAvailable &&
        ((fromDate >= slotStart && fromDate <= slotEnd) ||
          (toDate >= slotStart && toDate <= slotEnd))
      ) {
        return false;
      }
    }

    return true;
  }

  private async getLocation(data: { id: string }): Promise<PluginOutput> {
    const location = this.locations.get(data.id);

    if (!location) {
      return {
        success: false,
        error: `Location with ID "${data.id}" not found`,
      };
    }

    return {
      success: true,
      data: location as unknown as Record<string, unknown>,
    };
  }

  private async updateAvailability(data: {
    locationId: string;
    slot: AvailabilitySlot;
  }): Promise<PluginOutput> {
    const location = this.locations.get(data.locationId);

    if (!location) {
      return {
        success: false,
        error: `Location with ID "${data.locationId}" not found`,
      };
    }

    location.availability.push(data.slot);
    location.updatedAt = new Date();

    return {
      success: true,
      data: {
        message: "Availability updated",
        messageAr: "تم تحديث التوفر",
        location: location as unknown as Record<string, unknown>,
      },
    };
  }

  private async addPermit(data: {
    locationId: string;
    permit: Permit;
  }): Promise<PluginOutput> {
    const location = this.locations.get(data.locationId);

    if (!location) {
      return {
        success: false,
        error: `Location with ID "${data.locationId}" not found`,
      };
    }

    location.permits.push(data.permit);
    location.updatedAt = new Date();

    return {
      success: true,
      data: {
        message: "Permit added",
        messageAr: "تمت إضافة التصريح",
        permit: data.permit,
      },
    };
  }

  private async addSetDesign(data: Partial<SetDesign>): Promise<PluginOutput> {
    if (!data.name || !data.locationId) {
      return {
        success: false,
        error: "Set name and location ID are required",
      };
    }

    const setDesign: SetDesign = {
      id: uuidv4(),
      locationId: data.locationId,
      name: data.name,
      nameAr: data.nameAr || data.name,
      description: data.description || "",
      dimensions: data.dimensions || { width: 0, height: 0, depth: 0 },
      materials: data.materials || [],
      estimatedCost: data.estimatedCost || 0,
      buildTime: data.buildTime || 0,
      photos: data.photos || [],
      status: data["status"] || "concept",
      createdAt: new Date(),
    };

    this.setDesigns.set(setDesign.id, setDesign);

    return {
      success: true,
      data: {
        message: "Set design added",
        messageAr: "تمت إضافة تصميم الديكور",
        setDesign: setDesign as unknown as Record<string, unknown>,
      },
    };
  }

  private async getSetDesigns(data: {
    locationId?: string;
  }): Promise<PluginOutput> {
    let sets = Array.from(this.setDesigns.values());

    if (data.locationId) {
      sets = sets.filter((s) => s.locationId === data.locationId);
    }

    return {
      success: true,
      data: {
        count: sets.length,
        sets: sets as unknown as Record<string, unknown>[],
      },
    };
  }

  private async matchLocationToScene(data: {
    sceneRequirements: Record<string, unknown>;
  }): Promise<PluginOutput> {
    const reqs = data.sceneRequirements;
    const scores: Array<{
      location: Location;
      score: number;
      reasons: string[];
    }> = [];

    for (const location of this.locations.values()) {
      let score = 0;
      const reasons: string[] = [];

      if (reqs["type"] && location.type === reqs["type"]) {
        score += 30;
        reasons.push("Type matches");
      }

      if (reqs["amenities"] && Array.isArray(reqs["amenities"])) {
        const matchedAmenities = (reqs["amenities"] as string[]).filter((a) =>
          location.amenities.includes(a)
        );
        score += matchedAmenities.length * 10;
        if (matchedAmenities.length > 0) {
          reasons.push(`${matchedAmenities.length} amenities match`);
        }
      }

      if (reqs["maxBudget"] && location.costPerDay <= (reqs["maxBudget"] as number)) {
        score += 20;
        reasons.push("Within budget");
      }

      score += location.rating * 5;
      if (location.rating >= 4) {
        reasons.push("Highly rated");
      }

      if (score > 0) {
        scores.push({ location, score, reasons });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        matches: scores.slice(0, 5).map((s) => ({
          location: s.location,
          matchScore: s.score,
          matchReasons: s.reasons,
        })) as unknown as Record<string, unknown>[],
      },
    };
  }

  private async getSchedule(data: {
    startDate: string;
    endDate: string;
  }): Promise<PluginOutput> {
    const schedule: Array<{
      location: Location;
      bookings: AvailabilitySlot[];
    }> = [];

    const from = new Date(data.startDate);
    const to = new Date(data.endDate);

    for (const location of this.locations.values()) {
      const relevantBookings = location.availability.filter((slot) => {
        const slotStart = new Date(slot.startDate);
        const slotEnd = new Date(slot.endDate);
        return (
          (slotStart >= from && slotStart <= to) ||
          (slotEnd >= from && slotEnd <= to)
        );
      });

      if (relevantBookings.length > 0) {
        schedule.push({
          location,
          bookings: relevantBookings,
        });
      }
    }

    return {
      success: true,
      data: {
        period: { startDate: data.startDate, endDate: data.endDate },
        schedule: schedule as unknown as Record<string, unknown>[],
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const locationCoordinator = new LocationSetCoordinator();
