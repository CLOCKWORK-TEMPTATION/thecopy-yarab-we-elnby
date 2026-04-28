import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SELF_TAPE_STORAGE_KEY } from "../../../lib/self-tape";

export const Header: React.FC = () => (
  <header className="border-b border-purple-500/30 bg-black/30 backdrop-blur-sm">
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-600">
            <span className="text-2xl">🎥</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Self-Tape Suite</h1>
            <p className="text-sm text-purple-300">استوديو التسجيل الذاتي الاحترافي</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-green-500 text-green-400">
            تشغيل محلي
          </Badge>
          <Badge variant="outline" className="border-purple-500/60 text-purple-300">
            {SELF_TAPE_STORAGE_KEY}
          </Badge>
          <Button
            variant="outline"
            className="border-purple-500 text-purple-300 hover:bg-purple-500/20"
            onClick={() => {
              window.location.href = "/actorai-arabic";
            }}
          >
            العودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  </header>
);
