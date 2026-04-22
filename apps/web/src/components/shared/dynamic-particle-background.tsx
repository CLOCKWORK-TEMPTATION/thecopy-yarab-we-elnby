"use client";

/**
 * Dynamic Particle Background with Code Splitting
 *
 * This component lazy-loads the Three.js particle background (~600KB).
 * The background is only loaded when actually rendered, reducing initial bundle size.
 *
 * Features:
 * - Lazy loading with next/dynamic
 * - SSR disabled for performance
 * - Graceful loading state
 * - Respects prefers-reduced-motion
 *
 * Usage:
 * ```tsx
 * import DynamicParticleBackground from '@/components/dynamic-particle-background';
 *
 * <DynamicParticleBackground />
 * ```
 */

import dynamic from "next/dynamic";

// Loading component shown while particle background is loading
const ParticleLoading = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent_50%)]" />
  </div>
);

// Dynamically import particle background with loading state
const DynamicParticleBackground = dynamic(
  () => import("./particle-background"),
  {
    loading: ParticleLoading,
    ssr: false, // Three.js doesn't work with SSR
  }
);

export default DynamicParticleBackground;
