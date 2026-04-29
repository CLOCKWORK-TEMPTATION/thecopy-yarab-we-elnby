"use client";
import { motion } from "framer-motion";
import React from "react";

const paths = [
  "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
  "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
  "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
] as const;

const beamAnimationConfig = paths.map((_, index) => ({
  y2: `${93 + ((index * 5) % 8)}%`,
  duration: 10 + ((index * 7) % 10),
  delay: (index * 3) % 10,
}));

export const BackgroundBeams = React.memo(() => {
  return (
    <div className="absolute h-full w-full inset-0 [mask-size:40px] [mask-repeat:no-repeat] flex items-center justify-center pointer-events-none">
      <svg
        className="z-0 h-full w-full pointer-events-none absolute"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, index) => (
          <motion.path
            key={`path-${index}`}
            d={path}
            stroke={`url(#linearGradient-${index})`}
            strokeOpacity="0.4"
            strokeWidth="0.5"
          ></motion.path>
        ))}
        <defs>
          {beamAnimationConfig.map((config, index) => (
            <motion.linearGradient
              id={`linearGradient-${index}`}
              key={`gradient-${index}`}
              initial={{
                x1: "0%",
                x2: "0%",
                y1: "0%",
                y2: "0%",
              }}
              animate={{
                x1: ["0%", "100%"],
                x2: ["0%", "95%"],
                y1: ["0%", "100%"],
                y2: ["0%", config.y2],
              }}
              transition={{
                duration: config.duration,
                ease: "easeInOut",
                repeat: Infinity,
                delay: config.delay,
              }}
            >
              <stop stopColor="#FFD700" stopOpacity="0"></stop>
              <stop stopColor="#FFD700"></stop>
              <stop offset="32.5%" stopColor="#FFD700"></stop>
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0"></stop>
            </motion.linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  );
});

BackgroundBeams.displayName = "BackgroundBeams";
