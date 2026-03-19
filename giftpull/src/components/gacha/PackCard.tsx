"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lock, Sparkles, Unlock } from "lucide-react";
import { cn, formatCurrency, formatPoints, getRarityColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface PackOddsEntry {
  rarityTier: string;
  cardValue: number;
  weight: number;
}

interface PackData {
  id: string;
  name: string;
  tier: "COMMON" | "RARE" | "EPIC";
  price: number;
  pointsCost: number;
  odds: PackOddsEntry[];
  expectedValue: number;
  pullsToday?: number;
  pullsRemaining?: number;
  dailyLimit?: number;
  ccUnlocked?: boolean;
}

interface PackCardProps {
  pack: PackData;
  authenticated: boolean;
  onPull: (packTier: string) => void;
}

const tierConfig: Record<
  PackData["tier"],
  { badge: string; color: string; glowColor: string; gradient?: string }
> = {
  COMMON: {
    badge: "success",
    color: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.3)",
  },
  RARE: {
    badge: "brand",
    color: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.3)",
  },
  EPIC: {
    badge: "epic",
    color: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.3)",
    gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)",
  },
};

export function PackCard({ pack, authenticated, onPull }: PackCardProps) {
  const [showOdds, setShowOdds] = useState(false);
  const config = tierConfig[pack.tier];
  const dailyLimit = pack.dailyLimit || 5;
  const pullsRemaining = pack.pullsRemaining ?? (dailyLimit - (pack.pullsToday || 0));
  const canPull = authenticated && pullsRemaining > 0;
  const ccUnlocked = pack.ccUnlocked ?? false;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        variant="default"
        padding="lg"
        className={cn(
          "relative overflow-hidden transition-shadow duration-300 group",
          "hover:shadow-2xl"
        )}
        style={
          {
            "--pack-glow": config.glowColor,
          } as React.CSSProperties
        }
      >
        {/* Hover glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-card"
          style={{
            boxShadow: `inset 0 0 60px ${config.glowColor}, 0 0 30px ${config.glowColor}`,
          }}
        />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-card"
          style={{
            background: config.gradient || config.color,
          }}
        />

        <div className="relative z-10">
          {/* Header: Pack name + Tier badge */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">{pack.name}</h3>
            <Badge variant={config.badge as any} size="sm">
              {pack.tier}
            </Badge>
          </div>

          {/* Price display */}
          <div className="text-center mb-5">
            <p
              className="text-5xl font-extrabold tracking-tight"
              style={{ color: config.color }}
            >
              {formatCurrency(pack.price)}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              or {formatPoints(pack.pointsCost)} pts
            </p>
          </div>

          {/* Expected value */}
          <div className="bg-bg-elevated/60 border border-bg-border rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-0.5">
              Average Value
            </p>
            <p className="text-xl font-bold text-success">
              {formatCurrency(pack.expectedValue)}
            </p>
          </div>

          {/* CC Lock indicator */}
          {authenticated && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium",
                ccUnlocked
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-warning/10 text-warning border border-warning/20"
              )}
            >
              {ccUnlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>CC Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pull with points to unlock CC</span>
                </>
              )}
            </div>
          )}

          {/* View Odds expandable */}
          <button
            onClick={() => setShowOdds(!showOdds)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50 transition-colors mb-4"
          >
            <span>View Odds</span>
            <motion.span
              animate={{ rotate: showOdds ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>

          <AnimatePresence>
            {showOdds && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-bg-elevated/40 border border-bg-border rounded-xl p-3 space-y-2">
                  {pack.odds.map((entry) => (
                    <div
                      key={entry.rarityTier}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: getRarityColor(entry.rarityTier),
                          }}
                        />
                        <span className="text-text-primary font-medium">
                          {entry.rarityTier}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-text-secondary text-xs">
                          {formatCurrency(entry.cardValue)}
                        </span>
                        <span
                          className="font-bold tabular-nums min-w-[3rem] text-right"
                          style={{ color: getRarityColor(entry.rarityTier) }}
                        >
                          {(entry.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily pulls counter */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(dailyLimit, 10) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-colors",
                    i < pullsRemaining
                      ? "bg-success"
                      : "bg-bg-elevated border border-bg-border"
                  )}
                />
              ))}
              {dailyLimit > 10 && (
                <span className="text-xs text-text-secondary ml-1">...</span>
              )}
            </div>
            <span className="text-xs text-text-secondary ml-1">
              {pullsRemaining}/{dailyLimit} today
            </span>
          </div>

          {/* Pull button */}
          {!authenticated ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              disabled
              icon={<Lock className="w-4 h-4" />}
            >
              Sign In to Pull
            </Button>
          ) : pullsRemaining <= 0 ? (
            <Button variant="secondary" size="lg" className="w-full" disabled>
              Daily Limit Reached
            </Button>
          ) : (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="primary"
                size="lg"
                className="w-full relative overflow-hidden"
                style={{
                  background: config.gradient || undefined,
                  boxShadow: `0 4px 20px ${config.glowColor}`,
                }}
                icon={<Sparkles className="w-5 h-5" />}
                onClick={() => onPull(pack.tier)}
              >
                PULL
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
