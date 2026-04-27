"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OrbitControls,
  useTexture,
  ContactShadows,
  Environment,
  Html,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useRef, useState, Suspense } from "react";
import * as THREE from "three";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import WebGLErrorBoundary from "./WebGLErrorBoundary";

type FilmLook = "STD" | "NOIR" | "MATRIX" | "KODAK" | "BLADERUNNER";

interface LightingStudioProps {
  textureUrl?: string;
  color?: string;
}

const EMPTY_TEXTURE_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const FILM_LOOK_SETTINGS: Record<
  FilmLook,
  {
    ambientColor: string;
    spotColor: string;
    spotIntensity: number;
    ambientIntensity: number;
    cssFilter: string;
  }
> = {
  STD: {
    ambientColor: "#ffffff",
    spotColor: "#ffffff",
    spotIntensity: 1.5,
    ambientIntensity: 0.5,
    cssFilter: "none",
  },
  NOIR: {
    ambientColor: "#ffffff",
    spotColor: "#ffffff",
    spotIntensity: 2.5,
    ambientIntensity: 0.2,
    cssFilter: "grayscale(100%) contrast(140%) brightness(1.1)",
  },
  MATRIX: {
    ambientColor: "#003300",
    spotColor: "#ccffcc",
    spotIntensity: 2.0,
    ambientIntensity: 0.4,
    cssFilter: "sepia(100%) hue-rotate(50deg) saturate(200%) contrast(120%)",
  },
  KODAK: {
    ambientColor: "#ffebd6",
    spotColor: "#ffaa00",
    spotIntensity: 1.8,
    ambientIntensity: 0.6,
    cssFilter: "sepia(30%) saturate(140%) contrast(110%)",
  },
  BLADERUNNER: {
    ambientColor: "#002244",
    spotColor: "#ff9900",
    spotIntensity: 3.0,
    ambientIntensity: 0.3,
    cssFilter: "contrast(125%) saturate(110%)",
  },
};

// --- 3D Mannequin Component ---
const Mannequin = ({ textureUrl, color }: LightingStudioProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(textureUrl ?? EMPTY_TEXTURE_DATA_URL);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.2) * 0.05;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.5, 2, 4, 16]} />
        <meshStandardMaterial
          color={textureUrl ? "white" : (color ?? "#cccccc")}
          map={textureUrl ? texture : null}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#E0AC69" roughness={0.4} />
      </mesh>
      <ContactShadows opacity={0.5} scale={10} blur={2.5} far={4} />
    </group>
  );
};

// --- Main Studio Component ---
const LightingStudio: React.FC<LightingStudioProps> = (props) => {
  const [activeLook, setActiveLook] = useState<FilmLook>("STD");
  const {
    ambientColor,
    spotColor,
    spotIntensity,
    ambientIntensity,
    cssFilter,
  } = FILM_LOOK_SETTINGS[activeLook];

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] w-full h-full relative bg-black/14 shadow-2xl border border-white/8 group">
      {/* 1. Film Look Control Panel (تيست الكاميرا) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-white/[0.04] backdrop-blur-xl px-3 py-1 rounded-[12px] border-l-2 border-yellow-500">
          <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
            تيست كاميرا (Screen Test)
          </h3>
        </div>
        <div className="flex flex-col gap-1 bg-white/6 p-1 rounded-[12px] backdrop-blur-xl">
          {[
            { id: "STD", label: "Standard (REC.709)" },
            { id: "NOIR", label: "Noir (أبيض وأسود)" },
            { id: "KODAK", label: "Kodak Portra (دافيء)" },
            { id: "MATRIX", label: "Matrix (أخضر تقني)" },
            { id: "BLADERUNNER", label: "Blade Runner (نيون)" },
          ].map((look) => (
            <button
              key={look.id}
              onClick={() => setActiveLook(look.id as FilmLook)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-[10px] transition-all text-right
                            ${
                              activeLook === look.id
                                ? "bg-yellow-500 text-black shadow-lg scale-105"
                                : "bg-transparent text-white/55 hover:bg-white/8"
                            }
                        `}
            >
              {look.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Visual Canvas with Dynamic CSS Filters */}
      <div
        className="w-full h-full transition-all duration-700 ease-in-out"
        style={{ filter: cssFilter }}
      >
        <WebGLErrorBoundary>
          <Canvas shadows camera={{ position: [0, 1, 5.5], fov: 45 }}>
            <Suspense
              fallback={
                <Html>
                  <div className="text-white text-xs">Loading Studio...</div>
                </Html>
              }
            >
              {/* Dynamic Lights based on Look */}
              <ambientLight intensity={ambientIntensity} color={ambientColor} />
              <spotLight
                position={[5, 5, 5]}
                angle={0.3}
                penumbra={0.5}
                intensity={spotIntensity}
                color={spotColor}
                castShadow
                shadow-bias={-0.0001}
              />
              {/* Rim Light */}
              <pointLight
                position={[-5, 5, -5]}
                intensity={0.5}
                color={activeLook === "BLADERUNNER" ? "#00ffff" : "white"}
              />

              <Mannequin {...props} />

              <Environment preset="city" />
              <OrbitControls
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2}
                enableZoom={true}
              />
            </Suspense>
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      {/* 3. Grain Overlay for Vintage Looks */}
      {(activeLook === "NOIR" || activeLook === "KODAK") && (
        <div
          className="absolute inset-0 pointer-events-none opacity-15 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        ></div>
      )}

      {/* Studio Badge */}
      <div className="absolute bottom-3 left-3 text-[9px] text-white/45 font-mono opacity-50">
        RENDER: THREE.JS r158 | LUT: {activeLook}
      </div>
    </CardSpotlight>
  );
};

export default LightingStudio;
