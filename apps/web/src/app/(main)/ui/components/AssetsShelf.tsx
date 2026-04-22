import { Card } from "@/components/ui/card";
import { FileText, Image, Video } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  size: string;
}

interface AssetsShelfProps {
  assets?: Asset[];
  onAssetClick?: (id: string) => void;
  onAssetSelect?: (id: string) => void;
  onAssetDownload?: (id: string) => void;
  viewMode?: string;
}

const iconMap = {
  image: Image,
  video: Video,
  document: FileText,
};

export function AssetsShelf({ assets = [], onAssetClick }: AssetsShelfProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">الأصول</h3>
      {assets.length === 0 ? (
        <Card className="p-6 text-center text-white/55">
          لا توجد أصول محملة
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((asset) => {
            const Icon = iconMap[asset.type];
            return (
              <Card
                key={asset.id}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onAssetClick?.(asset.id)}
              >
                <Icon className="h-8 w-8 mb-2 mx-auto" />
                <p className="text-sm font-medium truncate">{asset.name}</p>
                <p className="text-xs text-white/55">{asset.size}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
