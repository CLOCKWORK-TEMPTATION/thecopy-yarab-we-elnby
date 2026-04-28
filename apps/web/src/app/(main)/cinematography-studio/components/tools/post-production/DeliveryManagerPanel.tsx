import { Button } from "@/components/ui/button";

import { StudioMetricCell, StudioPanel } from "../../studio-ui";

import type { ExportSettings } from "../../../types";

interface DeliveryManagerPanelProps {
  exportSettings: ExportSettings | null;
  platformLabels: Record<ExportSettings["platform"], string>;
  onCreateExportSettings: (platform: ExportSettings["platform"]) => void;
}

export function DeliveryManagerPanel({
  exportSettings,
  platformLabels,
  onCreateExportSettings,
}: DeliveryManagerPanelProps) {
  return (
    <StudioPanel title="Delivery Manager" subtitle="إعدادات التصدير النهائية">
      <div className="space-y-3">
        {(Object.keys(platformLabels) as ExportSettings["platform"][]).map(
          (platform) => (
            <Button
              key={platform}
              type="button"
              onClick={() => onCreateExportSettings(platform)}
              className={
                exportSettings?.platform === platform
                  ? "h-11 w-full border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
                  : "h-11 w-full border border-[#343434] bg-[#0d0d0d] text-[#c6b999] hover:bg-[#171717]"
              }
            >
              {platformLabels[platform]}
            </Button>
          )
        )}

        {exportSettings ? (
          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <div className="grid gap-3">
              <StudioMetricCell
                label="Platform"
                value={platformLabels[exportSettings.platform]}
                tone="white"
              />
              <StudioMetricCell
                label="Resolution"
                value={exportSettings.resolution ?? "--"}
              />
              <StudioMetricCell
                label="Frame Rate"
                value={exportSettings.frameRate ?? "--"}
                tone="white"
              />
              <StudioMetricCell
                label="Codec"
                value={exportSettings.codec ?? "--"}
              />
            </div>
          </div>
        ) : null}
      </div>
    </StudioPanel>
  );
}
