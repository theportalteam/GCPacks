"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { getRarityColor } from "@/lib/utils";

type RarityTier = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

interface PullAnimationProps {
  rarityTier: RarityTier;
  cardBrand: string;
  cardDenomination: number;
  isPlaying: boolean;
  onComplete: () => void;
}

// Rarity-specific timing and intensity
const rarityConfig: Record<
  RarityTier,
  {
    buildDuration: number;
    shakeIntensity: number;
    particleCount: number;
    burstScale: number;
    screenShake: boolean;
    edgePulse: boolean;
    particleShower: boolean;
  }
> = {
  COMMON: {
    buildDuration: 800,
    shakeIntensity: 2,
    particleCount: 6,
    burstScale: 1.3,
    screenShake: false,
    edgePulse: false,
    particleShower: false,
  },
  UNCOMMON: {
    buildDuration: 1000,
    shakeIntensity: 3,
    particleCount: 10,
    burstScale: 1.5,
    screenShake: false,
    edgePulse: false,
    particleShower: false,
  },
  RARE: {
    buildDuration: 1200,
    shakeIntensity: 5,
    particleCount: 16,
    burstScale: 1.8,
    screenShake: true,
    edgePulse: false,
    particleShower: false,
  },
  EPIC: {
    buildDuration: 1500,
    shakeIntensity: 8,
    particleCount: 24,
    burstScale: 2.0,
    screenShake: true,
    edgePulse: true,
    particleShower: false,
  },
  LEGENDARY: {
    buildDuration: 2000,
    shakeIntensity: 12,
    particleCount: 40,
    burstScale: 2.5,
    screenShake: true,
    edgePulse: true,
    particleShower: true,
  },
};

// Rarity sequence: colors build through tiers
const raritySequence: RarityTier[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
];

// Generate random particles for burst effect
function generateParticles(count: number, color: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 600,
    size: Math.random() * 8 + 3,
    delay: Math.random() * 0.3,
    duration: 0.6 + Math.random() * 0.8,
    color,
    rotation: Math.random() * 360,
  }));
}

// Generate edge glow particles
function generateEdgeParticles(count: number, color: string) {
  return Array.from({ length: count }, (_, i) => {
    const side = Math.floor(Math.random() * 4);
    let x: string, y: string;
    if (side === 0) {
      x = `${Math.random() * 100}%`;
      y = "0%";
    } else if (side === 1) {
      x = "100%";
      y = `${Math.random() * 100}%`;
    } else if (side === 2) {
      x = `${Math.random() * 100}%`;
      y = "100%";
    } else {
      x = "0%";
      y = `${Math.random() * 100}%`;
    }
    return {
      id: i,
      x,
      y,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 2,
      duration: 1 + Math.random() * 2,
      color,
    };
  });
}

// Shower particles that rain down from top
function generateShowerParticles(color: string) {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    startX: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 1 + Math.random() * 2,
    size: Math.random() * 6 + 2,
    color,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

type AnimPhase = "idle" | "pack" | "build" | "burst" | "reveal";

export function PullAnimation({
  rarityTier,
  cardBrand,
  cardDenomination,
  isPlaying,
  onComplete,
}: PullAnimationProps) {
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const packControls = useAnimation();

  const config = rarityConfig[rarityTier];
  const rarityColor = getRarityColor(rarityTier);
  const rarityIndex = raritySequence.indexOf(rarityTier);

  const burstParticles = useMemo(
    () => generateParticles(config.particleCount, rarityColor),
    [config.particleCount, rarityColor]
  );

  const edgeParticles = useMemo(
    () => (config.edgePulse ? generateEdgeParticles(20, rarityColor) : []),
    [config.edgePulse, rarityColor]
  );

  const showerParticles = useMemo(
    () => (config.particleShower ? generateShowerParticles(rarityColor) : []),
    [config.particleShower, rarityColor]
  );

  // Reset when not playing
  useEffect(() => {
    if (!isPlaying) {
      setPhase("idle");
      setBuildProgress(0);
      setCurrentHintIndex(0);
    }
  }, [isPlaying]);

  // Main animation sequence controller
  useEffect(() => {
    if (!isPlaying) return;

    let cancelled = false;

    const runSequence = async () => {
      // Phase 1: Pack appears (500ms)
      setPhase("pack");
      await delay(500);
      if (cancelled) return;

      // Phase 2: Build tension
      setPhase("build");

      // Color hint progression during build
      const hintInterval = config.buildDuration / (rarityIndex + 1);
      for (let i = 0; i <= rarityIndex; i++) {
        if (cancelled) return;
        setCurrentHintIndex(i);
        await delay(hintInterval);
      }
      if (cancelled) return;

      // Shake animation during build (run via framer-motion controls)
      const shakeFrames = 20;
      const shakeDelay = config.buildDuration / shakeFrames;
      for (let i = 0; i < shakeFrames; i++) {
        if (cancelled) return;
        const progress = i / shakeFrames;
        setBuildProgress(progress);
        const intensity = config.shakeIntensity * progress;
        await packControls.start({
          x: (Math.random() - 0.5) * intensity * 2,
          y: (Math.random() - 0.5) * intensity,
          rotate: (Math.random() - 0.5) * intensity * 0.5,
          transition: { duration: shakeDelay / 1000 },
        });
      }
      if (cancelled) return;

      // Phase 3: Burst (500ms)
      setPhase("burst");
      await delay(600);
      if (cancelled) return;

      // Phase 4: Reveal (500ms)
      setPhase("reveal");
      await delay(800);
      if (cancelled) return;

      onComplete();
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [isPlaying, rarityTier, config, rarityIndex, packControls, onComplete]);

  // Don't render anything when idle
  if (!isPlaying && phase === "idle") return null;

  const hintColor = getRarityColor(raritySequence[currentHintIndex] || "COMMON");

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Screen shake wrapper for RARE+ */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={
              config.screenShake && phase === "burst"
                ? {
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                    y: [0, 4, -4, 3, -3, 2, -2, 0],
                  }
                : {}
            }
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Edge pulse for EPIC/LEGENDARY during build */}
            {config.edgePulse && (phase === "build" || phase === "burst") && (
              <>
                {/* Top edge */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                  style={{
                    background: `linear-gradient(to bottom, ${rarityColor}40, transparent)`,
                  }}
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Bottom edge */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${rarityColor}40, transparent)`,
                  }}
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                />
                {/* Left edge */}
                <motion.div
                  className="absolute top-0 bottom-0 left-0 w-32 pointer-events-none"
                  style={{
                    background: `linear-gradient(to right, ${rarityColor}30, transparent)`,
                  }}
                  animate={{ opacity: [0.1, 0.5, 0.1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3,
                  }}
                />
                {/* Right edge */}
                <motion.div
                  className="absolute top-0 bottom-0 right-0 w-32 pointer-events-none"
                  style={{
                    background: `linear-gradient(to left, ${rarityColor}30, transparent)`,
                  }}
                  animate={{ opacity: [0.1, 0.5, 0.1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.7,
                  }}
                />

                {/* Edge particles */}
                {edgeParticles.map((p) => (
                  <motion.div
                    key={`edge-${p.id}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: p.x,
                      top: p.y,
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                    }}
                    animate={{
                      opacity: [0, 0.8, 0],
                      scale: [0.5, 1.5, 0.5],
                    }}
                    transition={{
                      duration: p.duration,
                      repeat: Infinity,
                      delay: p.delay,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </>
            )}

            {/* LEGENDARY particle shower */}
            {config.particleShower && phase === "burst" && (
              <>
                {showerParticles.map((p) => (
                  <motion.div
                    key={`shower-${p.id}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: `${p.startX}%`,
                      top: "-5%",
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      opacity: p.opacity,
                    }}
                    animate={{
                      y: ["0vh", "110vh"],
                      x: [0, (Math.random() - 0.5) * 100],
                      rotate: [0, 360],
                      opacity: [p.opacity, 0],
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: "easeIn",
                    }}
                  />
                ))}
              </>
            )}

            {/* ===== Phase 1 & 2: The Pack ===== */}
            <AnimatePresence>
              {(phase === "pack" || phase === "build") && (
                <motion.div
                  className="relative"
                  animate={packControls}
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  exit={{
                    scale: config.burstScale,
                    opacity: 0,
                    transition: { duration: 0.4, ease: "easeOut" },
                  }}
                >
                  {/* Pack glow aura */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      boxShadow: `0 0 ${40 + buildProgress * 80}px ${hintColor}60, 0 0 ${20 + buildProgress * 40}px ${hintColor}30`,
                    }}
                    animate={
                      phase === "pack"
                        ? { scale: 1, opacity: 1, rotate: 0 }
                        : undefined
                    }
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                    }}
                  />

                  {/* The pack itself */}
                  <motion.div
                    className="relative w-56 h-80 sm:w-64 sm:h-96 rounded-2xl overflow-hidden"
                    style={{
                      background: `linear-gradient(145deg, #1A1F2E, #242B3D)`,
                      border: `2px solid ${hintColor}50`,
                    }}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                      borderColor: `${hintColor}80`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                    }}
                  >
                    {/* Inner glow */}
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${hintColor}15, transparent 70%)`,
                      }}
                    />

                    {/* Pack pattern lines */}
                    <div className="absolute inset-0 opacity-10">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full h-px"
                          style={{
                            top: `${(i + 1) * 12}%`,
                            background: `linear-gradient(90deg, transparent, ${hintColor}40, transparent)`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Center icon / question mark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="text-6xl font-black select-none"
                        style={{ color: `${hintColor}60` }}
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        ?
                      </motion.div>
                    </div>

                    {/* Emission particles from edges during build */}
                    {phase === "build" &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={`emit-${i}`}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            width: 4 + buildProgress * 4,
                            height: 4 + buildProgress * 4,
                            backgroundColor: hintColor,
                            left: `${10 + Math.random() * 80}%`,
                            bottom: "0%",
                          }}
                          animate={{
                            y: [0, -200 - Math.random() * 200],
                            x: [(Math.random() - 0.5) * 60],
                            opacity: [0.8, 0],
                            scale: [1, 0.3],
                          }}
                          transition={{
                            duration: 1 + Math.random() * 0.5,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeOut",
                          }}
                        />
                      ))}

                    {/* Top emission particles */}
                    {phase === "build" &&
                      buildProgress > 0.3 &&
                      Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                          key={`emit-top-${i}`}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            width: 3 + buildProgress * 3,
                            height: 3 + buildProgress * 3,
                            backgroundColor: hintColor,
                            left: `${15 + Math.random() * 70}%`,
                            top: "0%",
                          }}
                          animate={{
                            y: [0, 150 + Math.random() * 100],
                            opacity: [0.6, 0],
                          }}
                          transition={{
                            duration: 0.8 + Math.random() * 0.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== Phase 3: Burst Flash ===== */}
            <AnimatePresence>
              {phase === "burst" && (
                <>
                  {/* Full-screen color flash */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: rarityColor }}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />

                  {/* Central burst ring */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      border: `3px solid ${rarityColor}`,
                      width: 100,
                      height: 100,
                    }}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 8, opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />

                  {/* Second burst ring (delayed) */}
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${rarityColor}80`,
                      width: 60,
                      height: 60,
                    }}
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 10, opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      ease: "easeOut",
                      delay: 0.1,
                    }}
                  />

                  {/* Burst particles */}
                  {burstParticles.map((p) => (
                    <motion.div
                      key={`burst-${p.id}`}
                      className="absolute pointer-events-none"
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                      }}
                      initial={{
                        x: 0,
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        rotate: 0,
                      }}
                      animate={{
                        x: p.x,
                        y: p.y,
                        opacity: 0,
                        scale: 0.2,
                        rotate: p.rotation,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut",
                      }}
                    />
                  ))}

                  {/* LEGENDARY extra: golden sparkle grid */}
                  {rarityTier === "LEGENDARY" &&
                    Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={`sparkle-${i}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.5, 0],
                          rotate: [0, 180],
                        }}
                        transition={{
                          duration: 0.6,
                          delay: 0.1 + Math.random() * 0.5,
                          ease: "easeOut",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill={rarityColor}
                        >
                          <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z" />
                        </svg>
                      </motion.div>
                    ))}
                </>
              )}
            </AnimatePresence>

            {/* ===== Phase 4: Card Reveal ===== */}
            <AnimatePresence>
              {phase === "reveal" && (
                <motion.div
                  className="relative"
                  initial={{ y: 100, opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ y: 0, opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 18,
                    duration: 0.5,
                  }}
                >
                  {/* Card outer glow */}
                  <div
                    className="absolute -inset-4 rounded-3xl pointer-events-none blur-xl"
                    style={{
                      backgroundColor: `${rarityColor}30`,
                    }}
                  />

                  {/* Legendary animated gradient border */}
                  {rarityTier === "LEGENDARY" ? (
                    <div
                      className="relative p-[3px] rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, #F59E0B, #EF4444, #F59E0B, #EF4444)`,
                        backgroundSize: "300% 300%",
                        animation: "legendaryBorderSpin 2s linear infinite",
                      }}
                    >
                      <RevealCardInner
                        rarityTier={rarityTier}
                        rarityColor={rarityColor}
                        cardBrand={cardBrand}
                        cardDenomination={cardDenomination}
                      />
                    </div>
                  ) : (
                    <div
                      className="relative rounded-2xl"
                      style={{
                        border: `2px solid ${rarityColor}`,
                        boxShadow: `0 0 30px ${rarityColor}40, 0 0 60px ${rarityColor}20`,
                      }}
                    >
                      <RevealCardInner
                        rarityTier={rarityTier}
                        rarityColor={rarityColor}
                        cardBrand={cardBrand}
                        cardDenomination={cardDenomination}
                      />
                    </div>
                  )}

                  {/* UNCOMMON+ glow ring */}
                  {rarityTier !== "COMMON" && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        boxShadow: `0 0 40px ${rarityColor}50`,
                      }}
                      animate={{
                        boxShadow: [
                          `0 0 40px ${rarityColor}50`,
                          `0 0 60px ${rarityColor}70`,
                          `0 0 40px ${rarityColor}50`,
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Inline style for legendary border animation */}
          <style jsx global>{`
            @keyframes legendaryBorderSpin {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inner card content used by the reveal phase
function RevealCardInner({
  rarityTier,
  rarityColor,
  cardBrand,
  cardDenomination,
}: {
  rarityTier: RarityTier;
  rarityColor: string;
  cardBrand: string;
  cardDenomination: number;
}) {
  return (
    <div className="w-56 sm:w-64 bg-[#1A1F2E] rounded-2xl p-6 text-center relative overflow-hidden">
      {/* Inner radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${rarityColor}15, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Brand badge */}
        <motion.div
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold text-white mb-4"
          style={{ backgroundColor: `${rarityColor}30`, color: rarityColor }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.15 }}
        >
          {cardBrand}
        </motion.div>

        {/* Denomination */}
        <motion.p
          className="text-5xl sm:text-6xl font-extrabold text-text-primary mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          style={
            rarityTier === "LEGENDARY"
              ? {
                  background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }
              : undefined
          }
        >
          ${cardDenomination}
        </motion.p>

        {/* Rarity badge */}
        <motion.div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${rarityColor}20`,
            color: rarityColor,
            border: `1px solid ${rarityColor}40`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: rarityColor }}
          />
          {rarityTier}
        </motion.div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
