"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Dice5, LogIn, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PackCard } from "@/components/gacha/PackCard";

interface PackOddsEntry {
  rarity: string;
  percentage: number;
  minValue: number;
  maxValue: number;
}

interface PackData {
  id: string;
  name: string;
  tier: "STARTER" | "STANDARD" | "PREMIUM" | "ULTRA";
  price: number;
  pointsCost: number;
  odds: PackOddsEntry[];
  expectedValue: number;
  pullsToday: number;
  maxPullsPerDay: number;
}

// Fallback mock data for development
const MOCK_PACKS: PackData[] = [
  {
    id: "starter",
    name: "Starter Pack",
    tier: "STARTER",
    price: 5,
    pointsCost: 400,
    odds: [
      { rarity: "COMMON", percentage: 60, minValue: 3, maxValue: 5 },
      { rarity: "UNCOMMON", percentage: 25, minValue: 5, maxValue: 10 },
      { rarity: "RARE", percentage: 12, minValue: 10, maxValue: 15 },
      { rarity: "EPIC", percentage: 2.5, minValue: 15, maxValue: 25 },
      { rarity: "LEGENDARY", percentage: 0.5, minValue: 25, maxValue: 50 },
    ],
    expectedValue: 5.75,
    pullsToday: 0,
    maxPullsPerDay: 10,
  },
  {
    id: "standard",
    name: "Standard Pack",
    tier: "STANDARD",
    price: 15,
    pointsCost: 1200,
    odds: [
      { rarity: "COMMON", percentage: 45, minValue: 10, maxValue: 15 },
      { rarity: "UNCOMMON", percentage: 30, minValue: 15, maxValue: 20 },
      { rarity: "RARE", percentage: 17, minValue: 20, maxValue: 30 },
      { rarity: "EPIC", percentage: 6, minValue: 30, maxValue: 50 },
      { rarity: "LEGENDARY", percentage: 2, minValue: 50, maxValue: 100 },
    ],
    expectedValue: 16.05,
    pullsToday: 2,
    maxPullsPerDay: 5,
  },
  {
    id: "premium",
    name: "Premium Pack",
    tier: "PREMIUM",
    price: 35,
    pointsCost: 2800,
    odds: [
      { rarity: "COMMON", percentage: 30, minValue: 20, maxValue: 30 },
      { rarity: "UNCOMMON", percentage: 30, minValue: 30, maxValue: 40 },
      { rarity: "RARE", percentage: 25, minValue: 40, maxValue: 60 },
      { rarity: "EPIC", percentage: 10, minValue: 60, maxValue: 100 },
      { rarity: "LEGENDARY", percentage: 5, minValue: 100, maxValue: 200 },
    ],
    expectedValue: 39.5,
    pullsToday: 0,
    maxPullsPerDay: 3,
  },
  {
    id: "ultra",
    name: "Ultra Pack",
    tier: "ULTRA",
    price: 75,
    pointsCost: 6000,
    odds: [
      { rarity: "COMMON", percentage: 15, minValue: 50, maxValue: 60 },
      { rarity: "UNCOMMON", percentage: 25, minValue: 60, maxValue: 80 },
      { rarity: "RARE", percentage: 30, minValue: 80, maxValue: 120 },
      { rarity: "EPIC", percentage: 20, minValue: 120, maxValue: 200 },
      { rarity: "LEGENDARY", percentage: 10, minValue: 200, maxValue: 500 },
    ],
    expectedValue: 89.0,
    pullsToday: 0,
    maxPullsPerDay: 2,
  },
];

// Skeleton component for loading state
function PackSkeleton() {
  return (
    <div className="bg-surface border border-border-subtle rounded-card p-7 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-6 w-32 bg-surface-light rounded-lg" />
        <div className="h-5 w-16 bg-surface-light rounded-full" />
      </div>
      <div className="text-center mb-5">
        <div className="h-14 w-24 bg-surface-light rounded-lg mx-auto mb-2" />
        <div className="h-4 w-20 bg-surface-light rounded mx-auto" />
      </div>
      <div className="bg-surface-light/60 rounded-xl p-5 mb-4">
        <div className="h-3 w-20 bg-surface-light rounded mx-auto mb-2" />
        <div className="h-7 w-16 bg-surface-light rounded mx-auto" />
      </div>
      <div className="h-9 w-full bg-surface-light rounded-lg mb-4" />
      <div className="flex justify-center gap-1 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 bg-surface-light rounded-full" />
        ))}
      </div>
      <div className="h-12 w-full bg-surface-light rounded-xl" />
    </div>
  );
}

// Floating background particles
function BackgroundParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function GachaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [packs, setPacks] = useState<PackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = status === "authenticated";

  // Fetch pack data
  useEffect(() => {
    let cancelled = false;

    async function fetchPacks() {
      setLoading(true);
      try {
        const res = await fetch("/api/gacha/packs");
        if (!res.ok) throw new Error("Failed to load packs");
        const data = await res.json();
        if (!cancelled) {
          setPacks(data.packs || data);
        }
      } catch {
        // Fallback to mock data in development
        if (!cancelled) {
          setPacks(MOCK_PACKS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPacks();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePull = useCallback(
    (packId: string) => {
      router.push(`/gacha/pull/${packId}`);
    },
    [router]
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-epic/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-warning/5 rounded-full blur-3xl pointer-events-none" />
      <BackgroundParticles />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-epic/15 border border-epic/30 flex items-center justify-center">
              <Dice5 className="w-6 h-6 text-epic" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary">
              Gacha Packs
            </h1>
          </div>

          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto mb-3">
            Mystery gift card packs with transparent odds and positive expected
            value. Every pull is a chance at something great.
          </p>

          <div className="inline-flex items-center gap-2 text-sm text-success/80 bg-success/8 border border-success/15 rounded-full px-4 py-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-medium">
              All packs have positive expected value
            </span>
          </div>
        </motion.div>

        {/* Auth gate */}
        {status !== "loading" && !isAuthenticated && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="default" padding="lg" className="max-w-md mx-auto text-center">
              <LogIn className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Sign in to start pulling
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Create an account or sign in to purchase and open gacha packs.
              </p>
              <a href="/api/auth/signin">
                <Button variant="primary" size="md">
                  Sign In
                </Button>
              </a>
            </Card>
          </motion.div>
        )}

        {/* Pack grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <PackSkeleton />
              </motion.div>
            ))}
          </div>
        ) : error ? (
          <Card variant="default" padding="lg" className="max-w-md mx-auto text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.12,
                  duration: 0.5,
                  ease: "easeOut",
                }}
              >
                <PackCard
                  pack={pack}
                  authenticated={isAuthenticated}
                  onPull={handlePull}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom info */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">
                Transparent Odds
              </p>
              <p className="text-xs text-text-secondary">
                Every rarity percentage is displayed upfront. No hidden rates.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">
                Positive EV
              </p>
              <p className="text-xs text-text-secondary">
                Average pull value exceeds the pack price across all tiers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-2">
                <Wallet className="w-5 h-5 text-warning" />
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">
                Instant Buyback
              </p>
              <p className="text-xs text-text-secondary">
                Don&apos;t want the card? Sell it back instantly at 95% value.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
