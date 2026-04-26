export interface ResponsiveConfig {
  cardWidth: number;
  cardHeight: number;
  cardPositions: { top: string; left: string; rotation: number }[];
  scale: number;
  surroundingGroups: { top: string; left: string; width: string; height: string }[][];
}

class HeroConfiguration {
  private static instance: HeroConfiguration;
  private constructor() {
    // Private constructor to prevent direct instantiation (Singleton pattern)
  }
  public static getInstance(): HeroConfiguration {
    if (!HeroConfiguration.instance) {
      HeroConfiguration.instance = new HeroConfiguration();
    }
    return HeroConfiguration.instance;
  }

  public getResponsiveValues(_width: number): ResponsiveConfig {
    // Guardrail:
    // The hero V-shape layout is intentionally fixed across viewport sizes.
    // Do not reintroduce breakpoint-based repositioning without an explicit request.
    const cardWidth = 190;
    const cardHeight = 275;
    const scale = 0.82;
    const positions = [
      { left: "30%", top: "34%", rotation: -6 }, // back-left
      { left: "36%", top: "45%", rotation: -3 }, // left
      { left: "43%", top: "56%", rotation: -1 }, // inner-left
      { left: "50%", top: "67%", rotation: 0 }, // center/front (lowest)
      { left: "57%", top: "56%", rotation: 1 }, // inner-right
      { left: "64%", top: "45%", rotation: 3 }, // right
      { left: "70%", top: "34%", rotation: 6 }, // back-right
    ];

    const cardPositions = positions.map((pos) => ({
      top: pos.top,
      left: pos.left,
      rotation: pos.rotation,
    }));

    return {
      cardWidth,
      cardHeight,
      scale,
      cardPositions,
      surroundingGroups: [
        [
          { top: "5%", left: "5%", width: "18%", height: "25%" },
          { top: "5%", left: "77%", width: "18%", height: "25%" },
          { top: "15%", left: "28%", width: "12%", height: "18%" },
          { top: "15%", left: "60%", width: "12%", height: "18%" },
        ],
        [
          { top: "40%", left: "2%", width: "16%", height: "22%" },
          { top: "40%", left: "82%", width: "16%", height: "22%" },
          { top: "35%", left: "22%", width: "10%", height: "14%" },
          { top: "35%", left: "68%", width: "10%", height: "14%" },
        ],
        [
          { top: "75%", left: "5%", width: "20%", height: "20%" },
          { top: "75%", left: "75%", width: "20%", height: "20%" },
          { top: "80%", left: "30%", width: "15%", height: "15%" },
          { top: "80%", left: "55%", width: "15%", height: "15%" },
        ],
      ],
    };
  }
}

export const heroConfig = HeroConfiguration.getInstance();
