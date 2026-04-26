"use client";

import { StationCard } from "./StationCard";

import type { StationId, StationState } from "../lib/types";

interface Props {
  stations: StationState[];
  canRetry: boolean;
  onRetry: (stationId: StationId) => void;
}

export function StationsBoard({ stations, canRetry, onRetry }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stations.map((s) => (
        <StationCard
          key={s.id}
          station={s}
          canRetry={canRetry}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
