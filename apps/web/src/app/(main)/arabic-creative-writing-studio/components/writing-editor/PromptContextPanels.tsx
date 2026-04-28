import type { FeaturedWeeklyChallenge } from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import type { CreativePrompt } from "@/app/(main)/arabic-creative-writing-studio/types";

interface PromptContextPanelsProps {
  activeChallenge?: FeaturedWeeklyChallenge | null | undefined;
  selectedPrompt: CreativePrompt | null;
}

export function PromptContextPanels({
  activeChallenge,
  selectedPrompt,
}: PromptContextPanelsProps) {
  return (
    <>
      {selectedPrompt ? (
        <div className="mb-6 rounded-[22px] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <h3 className="mb-2 text-lg font-semibold text-white">
            📝 المحفز الإبداعي: {selectedPrompt.title}
          </h3>
          <p className="leading-relaxed text-white/68">
            {selectedPrompt.arabic}
          </p>
          {selectedPrompt.tips && selectedPrompt.tips.length > 0 ? (
            <div className="mt-4">
              <h4 className="mb-2 font-medium text-white">💡 نصائح</h4>
              <ul className="space-y-1 text-sm text-white/68">
                {selectedPrompt.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-purple-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeChallenge ? (
        <div className="mb-6 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-6 backdrop-blur-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                🏆 {activeChallenge.title}
              </h3>
              <p className="mt-2 max-w-3xl leading-7 text-white/72">
                {activeChallenge.description}
              </p>
            </div>
            <div className="text-sm text-white/72">
              ينتهي في {activeChallenge.deadline.toLocaleDateString("ar-EG")}
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/78">
            {activeChallenge.requirements.map((requirement, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-emerald-300">•</span>
                {requirement}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
