import Image from "next/image";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export default function DottedGlowBackgroundDemo() {
  return (
    <div className="relative flex aspect-square w-60 items-end justify-end overflow-hidden rounded-bl-3xl rounded-br-3xl rounded-md rounded-tl-3xl border border-transparent px-4 shadow ring-1 shadow-black/10 ring-black/5 md:w-[25rem] dark:shadow-white/10 dark:ring-white/5">
      <div className="absolute inset-0 z-20 m-auto size-10 md:size-20">
        <Image
          src="https://assets.aceternity.com/logos/calcom.png"
          alt="Cal.com logo"
          fill
          sizes="(min-width: 768px) 5rem, 2.5rem"
          className="object-contain dark:invert dark:filter"
        />
      </div>

      <div className="relative z-20 flex w-full justify-between px-2 py-3 backdrop-blur-[2px] md:px-4">
        <p className="text-xs font-normal text-neutral-600 md:text-sm dark:text-neutral-400">
          The modern call scheduling app
        </p>
        <p className="text-xs font-normal text-neutral-600 md:text-sm dark:text-neutral-400">
          &rarr;
        </p>
      </div>

      <DottedGlowBackground
        className="pointer-events-none mask-radial-at-center mask-radial-to-90pct"
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
    </div>
  );
}
