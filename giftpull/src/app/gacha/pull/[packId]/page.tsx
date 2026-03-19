"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  CircleDollarSign,
  Coins,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatPoints,
  getBrandDisplayName,
} from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PullAnimation } from "@/components/gacha/PullAnimation";
import { RevealScreen } from "@/components/gacha/RevealScreen";
import { BuybackPrompt } from "@/components/gacha/BuybackPrompt";

type PaymentMethodType = "STRIPE" | "USDC" | "POINTS";
type PullStep = "payment" | "pulling" | "animating" | "result";

interface PackDetails {
  id: string;
  name: string;
  tier: "STARTER" | "STANDARD" | "PREMIUM" | "ULTRA";
  price: number;
  pointsCost: number;
  expectedValue: number;
  pullsRemaining: number;
}

interface PullResult {
  id: string;
  brand: string;
  denomination: number;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  buybackOffer: number;
  pointsEarned: number;
}

const tierColors: Record<string, string> = {
  STARTER: "#10B981",
  STANDARD: "#3B82F6",
  PREMIUM: "#8B5CF6",
  ULTRA: "#F59E0B",
};

// Points conversion
const POINTS_COST_MULTIPLIER = 100;

export default function PullPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as
    | { pointsBalance?: number; usdcBalance?: number }
    | undefined;

  const packId = params.packId as string;

  const [pack, setPack] = useState<PackDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<PullStep>("payment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("STRIPE");
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [showBuyback, setShowBuyback] = useState(false);
  const [pullsRemaining, setPullsRemaining] = useState(0);

  const pointsBalance = user?.pointsBalance ?? 0;
  const usdcBalance = user?.usdcBalance ?? 0;

  // Fetch pack details
  useEffect(() => {
    let cancelled = false;

    async function fetchPack() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gacha/packs/${packId}`);
        if (!res.ok) throw new Error("Pack not found");
        const data = await res.json();
        if (!cancelled) {
          setPack(data);
          setPullsRemaining(data.pullsRemaining);
        }
      } catch {
        // Fallback mock for development
        if (!cancelled) {
          const mockPack: PackDetails = {
            id: packId,
            name:
              packId === "starter"
                ? "Starter Pack"
                : packId === "standard"
                  ? "Standard Pack"
                  : packId === "premium"
                    ? "Premium Pack"
                    : "Ultra Pack",
            tier:
              packId === "starter"
                ? "STARTER"
                : packId === "standard"
                  ? "STANDARD"
                  : packId === "premium"
                    ? "PREMIUM"
                    : "ULTRA",
            price:
              packId === "starter"
                ? 5
                : packId === "standard"
                  ? 15
                  : packId === "premium"
                    ? 35
                    : 75,
            pointsCost:
              packId === "starter"
                ? 400
                : packId === "standard"
                  ? 1200
                  : packId === "premium"
                    ? 2800
                    : 6000,
            expectedValue:
              packId === "starter"
                ? 5.75
                : packId === "standard"
                  ? 16.05
                  : packId === "premium"
                    ? 39.5
                    : 89.0,
            pullsRemaining: 3,
          };
          setPack(mockPack);
          setPullsRemaining(mockPack.pullsRemaining);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPack();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  // Handle pull
  const handlePull = useCallback(async () => {
    if (!pack) return;

    setPulling(true);
    setStep("pulling");

    try {
      const res = await fetch("/api/gacha/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        throw new Error("Pull failed");
      }

      const data: PullResult = await res.json();
      setResult(data);

      // Start animation
      setStep("animating");
      setAnimationPlaying(true);
    } catch {
      // Mock result for development
      const rarities: PullResult["rarity"][] = [
        "COMMON",
        "UNCOMMON",
        "RARE",
        "EPIC",
        "LEGENDARY",
      ];
      const brands = [
        "XBOX",
        "STEAM",
        "NINTENDO",
        "PLAYSTATION",
        "AMAZON",
        "SPOTIFY",
        "NETFLIX",
        "ROBLOX",
      ];
      const roll = Math.random();
      let rarity: PullResult["rarity"];
      if (roll < 0.45) rarity = "COMMON";
      else if (roll < 0.75) rarity = "UNCOMMON";
      else if (roll < 0.92) rarity = "RARE";
      else if (roll < 0.98) rarity = "EPIC";
      else rarity = "LEGENDARY";

      const denominations: Record<string, number[]> = {
        COMMON: [5, 10],
        UNCOMMON: [10, 15, 20],
        RARE: [20, 25, 30, 50],
        EPIC: [50, 75, 100],
        LEGENDARY: [100, 150, 200, 250, 500],
      };
      const denoms = denominations[rarity];
      const denom = denoms[Math.floor(Math.random() * denoms.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];

      const mockResult: PullResult = {
        id: `pull-${Date.now()}`,
        brand,
        denomination: denom,
        rarity,
        buybackOffer: Math.round(denom * 0.95 * 100) / 100,
        pointsEarned: Math.floor(pack.price * 10),
      };
      setResult(mockResult);
      setStep("animating");
      setAnimationPlaying(true);
    } finally {
      setPulling(false);
    }
  }, [pack, paymentMethod]);

  // Animation complete handler
  const handleAnimationComplete = useCallback(() => {
    setAnimationPlaying(false);
    setStep("result");
    setPullsRemaining((prev) => Math.max(0, prev - 1));
  }, []);

  // Keep card handler
  const handleKeep = useCallback(() => {
    // Card is already RESERVED, just acknowledge
    router.push("/gacha");
  }, [router]);

  // Buyback handler
  const handleBuyback = useCallback(() => {
    setShowBuyback(true);
  }, []);

  // Buyback confirm
  const handleBuybackConfirm = useCallback(async () => {
    if (!result) return;

    const res = await fetch("/api/gacha/buyback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pullId: result.id }),
    });

    if (!res.ok) {
      throw new Error("Buyback failed");
    }
  }, [result]);

  // Pull again handler
  const handlePullAgain = useCallback(() => {
    setResult(null);
    setStep("payment");
    setShowBuyback(false);
    setAnimationPlaying(false);
  }, []);

  if (loading || !pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Loading pack...</p>
        </div>
      </div>
    );
  }

  const tierColor = tierColors[pack.tier] || "#3B82F6";
  const pointsCost = pack.pointsCost;
  const hasEnoughPoints = pointsBalance >= pointsCost;
  const hasEnoughUsdc = usdcBalance >= pack.price;

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `${tierColor}08` }}
      />

      {/* Pull animation overlay */}
      {result && (
        <PullAnimation
          rarityTier={result.rarity}
          cardBrand={getBrandDisplayName(result.brand)}
          cardDenomination={result.denomination}
          isPlaying={animationPlaying}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* Buyback modal */}
      {result && (
        <BuybackPrompt
          isOpen={showBuyback}
          onClose={() => setShowBuyback(false)}
          card={{
            id: result.id,
            brand: result.brand,
            denomination: result.denomination,
            rarity: result.rarity,
          }}
          buybackAmount={result.buybackOffer}
          userBalance={usdcBalance}
          onConfirm={handleBuybackConfirm}
          onPullAgain={handlePullAgain}
        />
      )}

      <div className="relative mx-auto max-w-lg px-4 sm:px-6 pt-8 pb-20">
        {/* Back button */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => router.push("/gacha")}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Packs
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ===== STEP 1: Payment ===== */}
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Pack header */}
              <div className="text-center mb-8">
                <Badge
                  variant={
                    (pack.tier === "STARTER"
                      ? "success"
                      : pack.tier === "STANDARD"
                        ? "brand"
                        : pack.tier === "PREMIUM"
                          ? "epic"
                          : "legendary") as any
                  }
                  size="md"
                >
                  {pack.tier}
                </Badge>
                <h1 className="text-3xl font-extrabold text-text-primary mt-3 mb-1">
                  {pack.name}
                </h1>
                <p className="text-text-secondary text-sm">
                  Avg. value:{" "}
                  <span className="text-success font-semibold">
                    {formatCurrency(pack.expectedValue)}
                  </span>
                </p>
              </div>

              {/* Price display */}
              <Card variant="default" padding="lg" className="mb-6">
                <div className="text-center">
                  <p
                    className="text-5xl font-extrabold mb-1"
                    style={{ color: tierColor }}
                  >
                    {formatCurrency(pack.price)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    or {formatPoints(pointsCost)} pts
                  </p>
                </div>
              </Card>

              {/* Payment method */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-text-secondary mb-3">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Stripe */}
                  <button
                    onClick={() => setPaymentMethod("STRIPE")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      paymentMethod === "STRIPE"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        paymentMethod === "STRIPE"
                          ? "bg-primary/15"
                          : "bg-surface"
                      )}
                    >
                      <CreditCard
                        className={cn(
                          "w-5 h-5",
                          paymentMethod === "STRIPE"
                            ? "text-primary"
                            : "text-text-secondary"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        paymentMethod === "STRIPE"
                          ? "text-primary"
                          : "text-text-secondary"
                      )}
                    >
                      Card
                    </span>
                  </button>

                  {/* USDC */}
                  <button
                    onClick={() => setPaymentMethod("USDC")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      paymentMethod === "USDC"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        paymentMethod === "USDC"
                          ? "bg-primary/15"
                          : "bg-surface"
                      )}
                    >
                      <CircleDollarSign
                        className={cn(
                          "w-5 h-5",
                          paymentMethod === "USDC"
                            ? "text-primary"
                            : "text-text-secondary"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        paymentMethod === "USDC"
                          ? "text-primary"
                          : "text-text-secondary"
                      )}
                    >
                      USDC
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {formatCurrency(usdcBalance)}
                    </span>
                  </button>

                  {/* Points */}
                  <button
                    onClick={() => {
                      if (hasEnoughPoints) setPaymentMethod("POINTS");
                    }}
                    disabled={!hasEnoughPoints}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      paymentMethod === "POINTS"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light",
                      !hasEnoughPoints && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        paymentMethod === "POINTS"
                          ? "bg-primary/15"
                          : "bg-surface"
                      )}
                    >
                      <Coins
                        className={cn(
                          "w-5 h-5",
                          paymentMethod === "POINTS"
                            ? "text-primary"
                            : "text-text-secondary"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        paymentMethod === "POINTS"
                          ? "text-primary"
                          : "text-text-secondary"
                      )}
                    >
                      Points
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {formatPoints(pointsBalance)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Pulls remaining */}
              <div className="text-center text-sm text-text-secondary mb-6">
                <span className="font-medium">{pullsRemaining}</span> pull
                {pullsRemaining !== 1 ? "s" : ""} remaining today
              </div>

              {/* Pull button */}
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full text-lg font-bold"
                  style={{
                    background:
                      pack.tier === "ULTRA"
                        ? "linear-gradient(135deg, #F59E0B, #EF4444)"
                        : undefined,
                    boxShadow: `0 4px 25px ${tierColor}40`,
                  }}
                  icon={<Sparkles className="w-5 h-5" />}
                  onClick={handlePull}
                  disabled={
                    pulling ||
                    pullsRemaining <= 0 ||
                    (paymentMethod === "USDC" && !hasEnoughUsdc) ||
                    (paymentMethod === "POINTS" && !hasEnoughPoints)
                  }
                  loading={pulling}
                >
                  {pulling
                    ? "Processing..."
                    : paymentMethod === "POINTS"
                      ? `PULL — ${formatPoints(pointsCost)} pts`
                      : `PULL — ${formatCurrency(pack.price)}`}
                </Button>
              </motion.div>

              {/* Insufficient funds warning */}
              {paymentMethod === "USDC" && !hasEnoughUsdc && (
                <p className="text-center text-xs text-red-400 mt-2">
                  Insufficient USDC balance
                </p>
              )}
              {paymentMethod === "POINTS" && !hasEnoughPoints && (
                <p className="text-center text-xs text-red-400 mt-2">
                  Insufficient points balance
                </p>
              )}
            </motion.div>
          )}

          {/* ===== STEP 2: Pulling (waiting for API) ===== */}
          {step === "pulling" && (
            <motion.div
              key="pulling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-text-secondary text-lg font-medium">
                Opening {pack.name}...
              </p>
            </motion.div>
          )}

          {/* ===== STEP 3: Animation plays (handled by PullAnimation overlay) ===== */}
          {step === "animating" && (
            <motion.div
              key="animating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              {/* Content is hidden behind the animation overlay */}
              <p className="text-text-secondary/30 text-sm">Revealing...</p>
            </motion.div>
          )}

          {/* ===== STEP 4: Result ===== */}
          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <RevealScreen
                card={{
                  id: result.id,
                  brand: result.brand,
                  denomination: result.denomination,
                  rarity: result.rarity,
                }}
                buybackOffer={result.buybackOffer}
                pointsEarned={result.pointsEarned}
                pullsRemaining={pullsRemaining}
                onKeep={handleKeep}
                onBuyback={handleBuyback}
                onPullAgain={handlePullAgain}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
