import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ColorGrade } from "./types";

interface ColorWheelsCardProps {
  grade: ColorGrade;
  onUpdate: (key: keyof ColorGrade, value: number) => void;
}

const COLOR_WHEELS: Array<{ key: keyof ColorGrade; label: string }> = [
  { key: "shadowHue", label: "الظلال" },
  { key: "midtoneHue", label: "النصف" },
  { key: "highlightHue", label: "الإضاءات" },
];

export function ColorWheelsCard({ grade, onUpdate }: ColorWheelsCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider">
          عجلات الألوان
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_WHEELS.map(({ key, label }) => (
            <div key={key} className="text-center">
              <div
                className="w-12 h-12 mx-auto rounded-full border-2 border-zinc-700 relative cursor-pointer"
                style={{
                  background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = event.clientX - rect.left - rect.width / 2;
                  const y = event.clientY - rect.top - rect.height / 2;
                  const angle = Math.atan2(y, x) * (180 / Math.PI) + 180;
                  onUpdate(key, Math.round(angle));
                }}
              >
                <div
                  className="absolute w-3 h-3 bg-white rounded-full border-2 border-black"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `
                      translate(-50%, -50%)
                      rotate(${grade[key]}deg)
                      translateY(-18px)
                    `,
                  }}
                />
              </div>
              <span className="text-xs text-zinc-500 mt-1 block">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
