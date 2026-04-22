import { randomUUID } from "node:crypto";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";
import {
  success,
  failure,
  asString,
  mapLocationType,
  uniqueById,
  extractNestedRecord,
  parseList,
} from "./handlers-shared";
import { LocationSetCoordinator } from "./plugins/location-coordinator";
import { runPlugin } from "./plugin-executor";
import { readStore, updateStore, type StoredLocation } from "./store";

export async function handleLocationSearch(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const query = asString(payload["query"]).toLowerCase();
  const type = mapLocationType(asString(payload["type"]));
  const store = await readStore();

  const filtered = store.locations.filter((location) => {
    const matchesQuery =
      !query ||
      location.name.toLowerCase().includes(query) ||
      location.nameAr.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query) ||
      location.features.some((f) => f.toLowerCase().includes(query));

    const matchesType =
      !type || !asString(payload["type"]) || location.type === type;
    return matchesQuery && matchesType;
  });

  return success({
    data: { locations: filtered, count: filtered.length },
  });
}

function buildStoredLocation(
  rawLocation: Record<string, unknown>,
  name: string,
  nameAr: string,
  payload: Record<string, unknown>,
  features: string[]
): StoredLocation {
  const now = new Date().toISOString();
  return {
    id: asString(rawLocation["id"]) || randomUUID(),
    name: asString(rawLocation["name"]) || name,
    nameAr: asString(rawLocation["nameAr"]) || nameAr || name,
    type: mapLocationType(
      asString(rawLocation["type"]) ||
        asString(payload["type"]) ||
        "interior"
    ),
    address:
      asString(rawLocation["address"]) || asString(payload["address"]),
    features,
    createdAt: now,
    updatedAt: now,
  };
}

export async function handleLocationAdd(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const nameAr = asString(payload["nameAr"]);
  const name = asString(payload["name"]) || nameAr;

  if (!name) {
    return failure("اسم الموقع مطلوب");
  }

  const features = parseList(payload["features"]);
  const pluginResult = await runPlugin(LocationSetCoordinator, {
    type: "add-location",
    data: {
      name,
      nameAr: nameAr || name,
      type: mapLocationType(asString(payload["type"]) || "interior"),
      address: asString(payload["address"]),
      amenities: features,
      tags: features,
    },
  });

  if (!pluginResult.success) {
    return failure(pluginResult.error ?? "تعذر إضافة الموقع");
  }

  const rawLocation = extractNestedRecord(pluginResult, "location");
  if (!rawLocation) {
    return failure("تعذر قراءة بيانات الموقع المُضاف", 500);
  }

  const storedLocation = buildStoredLocation(
    rawLocation,
    name,
    nameAr,
    payload,
    features
  );

  await updateStore((store) => {
    store.locations = uniqueById<StoredLocation>(
      store.locations,
      storedLocation
    );
  });

  return success({
    data: { location: storedLocation, message: "تمت إضافة الموقع بنجاح" },
  });
}
