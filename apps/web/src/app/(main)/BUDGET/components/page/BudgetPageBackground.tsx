import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function BudgetPageBackground() {
  return (
    <>
      <NoiseBackground />
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-90pct mask-radial-at-center"
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-500"
        glowColorDarkVar="--color-sky-800"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.6}
        speedScale={1}
      />
      <div className="absolute inset-0 opacity-55 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(9,146,104,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(116,104,66,0.16),transparent_34%)]" />
    </>
  );
}
