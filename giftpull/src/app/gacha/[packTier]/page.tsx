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
  Lock,
  Unlock,
  TrendingUp,
  Trophy,
  Users,
  Hexagon,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatPoints,
  getBrandDisplayName,
  getRarityColor,
} from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PullAnimation } from "@/components/gacha/PullAnimation";
import { RevealScreen } from "@/components/gacha/RevealScreen";
import { BuybackPrompt } from "@/components/gacha/BuybackPrompt";

type PaymentMethodType = "STRIPE" | "USDC" | "POINTS" | "PORTAL";
type PullStep = "idle" | "pulling" | "animating" | "result";

const TIER_SLUG_MAP: Record<string, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
};

interface OddsEntry {
  rarityTier: string;
  cardValue: number;
  weight: number;
}

interface RecentPull {
  id: string;
  rarityTier: string;
  cardValue: number;
  brand: string;
  denomination: number;
  userName: string;
  createdAt: string;
}

interface PackDetails {
  id: string;
  name: string;
  tier: "COMMON" | "RARE" | "EPIC";
  price: number;
  pointsCost: number;
  expectedValue: number;
  dailyLimit: number;
  pullsRemaining: number;
  pullsToday: number;
  ccUnlocked: boolean;
  odds: OddsEntry[];
  poolStats: { totalCards: number; cardsByRarity: Record<string, number> };
  recentPulls: RecentPull[];
  topHits: RecentPull[];
}

interface PullResult {
  id: string;
  brand: string;
  denomination: number;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  buybackOffer: number;
  pointsEarned: number;
  ccJustUnlocked: boolean;
}

const tierColors: Record<string, string> = {
  COMMON: "#10B981",
  RARE: "#d5bbff",
  EPIC: "#7d00ff",
};

const tierGradients: Record<string, string> = {
  COMMON: "from-emerald-600/20 to-emerald-900/5",
  RARE: "from-blue-600/20 to-blue-900/5",
  EPIC: "from-purple-600/20 to-purple-900/5",
};

export default function PackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const user = session?.user as
    | { pointsBalance?: number; usdcBalance?: number; portalBalance?: number }
    | undefined;

  const slug = (params.packTier as string).toLowerCase();
  const packTier = TIER_SLUG_MAP[slug];

  const [pack, setPack] = useState<PackDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<PullStep>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("POINTS");
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [showBuyback, setShowBuyback] = useState(false);
  const [pullsRemaining, setPullsRemaining] = useState(0);
  const [ccUnlocked, setCcUnlocked] = useState(false);

  const pointsBalance = user?.pointsBalance ?? 0;
  const usdcBalance = user?.usdcBalance ?? 0;
  const portalBalance = user?.portalBalance ?? 0;
  const isAuthenticated = status === "authenticated";

  // Redirect if invalid tier
  useEffect(() => {
    if (!packTier) {
      router.push("/gacha");
    }
  }, [packTier, router]);

  // Fetch pack details from packs endpoint
  useEffect(() => {
    if (!packTier) return;
    let cancelled = false;

    async function fetchPack() {
      setLoading(true);
      try {
        const res = await fetch("/api/gacha/packs");
        if (!res.ok) throw new Error("Failed to load packs");
        const data = await res.json();
        const found = (data.packs || []).find(
          (p: any) => p.tier === packTier
        );
        if (!cancelled && found) {
          setPack(found);
          setPullsRemaining(found.pullsRemaining);
          setCcUnlocked(found.ccUnlocked);
          // Default to POINTS if CC not unlocked
          if (!found.ccUnlocked) {
            setPaymentMethod("POINTS");
          }
        }
      } catch {
        // No mock needed, just show loading
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPack();
    return () => {
      cancelled = true;
    };
  }, [packTier]);

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
          packTier: pack.tier,
          paymentMethod: paymentMethod === "USDC" ? "USDC_BASE" : paymentMethod === "PORTAL" ? "PORTAL" : paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "CC_LOCKED") {
          alert(data.message);
          setStep("idle");
          setPulling(false);
          return;
        }
        throw new Error(data.error || "Pull failed");
      }

      // Handle Stripe redirect
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const pullResult: PullResult = {
        id: data.pull?.id || data.card?.id || `pull-${Date.now()}`,
        brand: data.card?.brand || "STEAM",
        denomination: data.card?.denomination || 10,
        rarity: data.rarityTier || data.card?.rarityTier || "COMMON",
        buybackOffer: data.buybackOffer || 0,
        pointsEarned: data.pointsEarned || 0,
        ccJustUnlocked: data.ccJustUnlocked || false,
      };

      setResult(pullResult);
      if (pullResult.ccJustUnlocked) {
        setCcUnlocked(true);
      }

      // Refresh session to get updated balances
      await updateSession();

      // Start animation
      setStep("animating");
      setAnimationPlaying(true);
    } catch (err: any) {
      alert(err.message || "Pull failed");
      setStep("idle");
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

  const handleKeep = useCallback(() => {
    router.push("/gacha");
  }, [router]);

  const handleBuyback = useCallback(() => {
    setShowBuyback(true);
  }, []);

  const handleBuybackConfirm = useCallback(async () => {
    if (!result) return;
    await fetch("/api/gacha/buyback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pullId: result.id }),
    });
    await updateSession();
  }, [result, updateSession]);

  const handlePullAgain = useCallback(() => {
    setResult(null);
    setStep("idle");
    setShowBuyback(false);
    setAnimationPlaying(false);
  }, []);

  if (!packTier) return null;

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

  const tierColor = tierColors[pack.tier] || "#d5bbff";
  const pointsCost = pack.pointsCost;
  const hasEnoughPoints = pointsBalance >= pointsCost;
  const hasEnoughUsdc = usdcBalance >= pack.price;
  const evPercent = ((pack.expectedValue / pack.price - 1) * 100).toFixed(0);

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b pointer-events-none",
          tierGradients[pack.tier]
        )}
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

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-20">
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
          {/* ===== Result screen ===== */}
          {step === "result" && result ? (
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
                ccJustUnlocked={result.ccJustUnlocked}
              />
            </motion.div>
          ) : step === "pulling" ? (
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
          ) : step === "animating" ? (
            <motion.div
              key="animating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <p className="text-text-secondary/30 text-sm">Revealing...</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* ===== HERO SECTION ===== */}
              <div className="text-center mb-8">
                <Badge
                  variant={
                    (pack.tier === "COMMON"
                      ? "success"
                      : pack.tier === "RARE"
                        ? "brand"
                        : "epic") as any
                  }
                  size="md"
                >
                  {pack.tier}
                </Badge>
                <h1 className="text-4xl font-headline font-black uppercase tracking-tighter italic text-text-primary mt-3 mb-2">
                  {pack.name}
                </h1>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-text-secondary">
                    <span className="text-2xl font-extrabold" style={{ color: tierColor }}>
                      {formatCurrency(pack.price)}
                    </span>{" "}
                    or {formatPoints(pointsCost)} pts
                  </span>
                  <span className="inline-flex items-center gap-1 text-success font-semibold bg-success/10 rounded-full px-3 py-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{evPercent}% EV
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column: Odds + Pool */}
                <div className="space-y-6">
                  {/* Odds table */}
                  <Card variant="default" padding="lg">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
                      Drop Rates
                    </h3>
                    <div className="space-y-3">
                      {pack.odds
                        .sort((a, b) => b.weight - a.weight)
                        .map((entry) => {
                          const pct = (entry.weight * 100).toFixed(1);
                          return (
                            <div key={entry.rarityTier} className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: getRarityColor(entry.rarityTier) }}
                              />
                              <span className="text-sm font-medium text-text-primary flex-1">
                                {entry.rarityTier}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {formatCurrency(entry.cardValue)}
                              </span>
                              <div className="w-24 h-2 bg-bg-elevated rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(entry.weight * 100, 100)}%`,
                                    backgroundColor: getRarityColor(entry.rarityTier),
                                  }}
                                />
                              </div>
                              <span
                                className="text-sm font-bold tabular-nums w-14 text-right"
                                style={{ color: getRarityColor(entry.rarityTier) }}
                              >
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-bg-border flex justify-between text-sm">
                      <span className="text-text-secondary">Expected Value</span>
                      <span className="text-success font-bold">
                        {formatCurrency(pack.expectedValue)}
                      </span>
                    </div>
                  </Card>

                  {/* Pool composition */}
                  <Card variant="default" padding="lg">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">
                      Card Pool
                    </h3>
                    <p className="text-2xl font-headline font-black uppercase tracking-tighter italic text-text-primary mb-3">
                      {pack.poolStats.totalCards}{" "}
                      <span className="text-sm text-text-secondary font-normal">cards available</span>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(pack.poolStats.cardsByRarity).map(([rarity, count]) => (
                        <span
                          key={rarity}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                          style={{
                            borderColor: `${getRarityColor(rarity)}40`,
                            backgroundColor: `${getRarityColor(rarity)}10`,
                            color: getRarityColor(rarity),
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getRarityColor(rarity) }}
                          />
                          {rarity}: {count}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Right column: Pull section + Recent */}
                <div className="space-y-6">
                  {/* Pull card */}
                  <Card variant="default" padding="lg">
                    {/* CC lock status */}
                    {isAuthenticated && !ccUnlocked && (
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-none bg-warning/10 border border-warning/20">
                        <Lock className="w-4 h-4 text-warning shrink-0" />
                        <p className="text-xs text-warning">
                          Complete your first pull with <strong>Points</strong> to unlock credit card purchases
                        </p>
                      </div>
                    )}

                    {isAuthenticated && ccUnlocked && (
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-none bg-success/10 border border-success/20">
                        <Unlock className="w-4 h-4 text-success shrink-0" />
                        <p className="text-xs text-success">
                          Credit card unlocked for {pack.tier} packs
                        </p>
                      </div>
                    )}

                    {/* Payment method */}
                    <p className="text-sm font-semibold text-text-secondary mb-3">
                      Payment Method
                    </p>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {/* Stripe */}
                      <button
                        onClick={() => ccUnlocked && setPaymentMethod("STRIPE")}
                        disabled={!ccUnlocked}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-none border-2 transition-all duration-200",
                          !ccUnlocked && "opacity-40 cursor-not-allowed",
                          paymentMethod === "STRIPE" && ccUnlocked
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-none flex items-center justify-center",
                            paymentMethod === "STRIPE" && ccUnlocked
                              ? "bg-primary/15"
                              : "bg-surface"
                          )}
                        >
                          {!ccUnlocked ? (
                            <Lock className="w-4 h-4 text-text-secondary" />
                          ) : (
                            <CreditCard
                              className={cn(
                                "w-4 h-4",
                                paymentMethod === "STRIPE"
                                  ? "text-primary"
                                  : "text-text-secondary"
                              )}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            paymentMethod === "STRIPE" && ccUnlocked
                              ? "text-primary"
                              : "text-text-secondary"
                          )}
                        >
                          Card
                        </span>
                      </button>

                      {/* USDC */}
                      <button
                        onClick={() => ccUnlocked && setPaymentMethod("USDC")}
                        disabled={!ccUnlocked}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-none border-2 transition-all duration-200",
                          !ccUnlocked && "opacity-40 cursor-not-allowed",
                          paymentMethod === "USDC" && ccUnlocked
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-none flex items-center justify-center",
                            paymentMethod === "USDC" && ccUnlocked
                              ? "bg-primary/15"
                              : "bg-surface"
                          )}
                        >
                          <CircleDollarSign
                            className={cn(
                              "w-4 h-4",
                              paymentMethod === "USDC" && ccUnlocked
                                ? "text-primary"
                                : "text-text-secondary"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            paymentMethod === "USDC" && ccUnlocked
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

                      {/* Points (always available) */}
                      <button
                        onClick={() => {
                          if (hasEnoughPoints) setPaymentMethod("POINTS");
                        }}
                        disabled={!hasEnoughPoints}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-none border-2 transition-all duration-200",
                          paymentMethod === "POINTS"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80",
                          !hasEnoughPoints && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-none flex items-center justify-center",
                            paymentMethod === "POINTS"
                              ? "bg-primary/15"
                              : "bg-surface"
                          )}
                        >
                          <Coins
                            className={cn(
                              "w-4 h-4",
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

                      {/* PORTAL (always available like USDC) */}
                      <button
                        onClick={() => ccUnlocked && setPaymentMethod("PORTAL")}
                        disabled={!ccUnlocked}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-none border-2 transition-all duration-200",
                          !ccUnlocked && "opacity-40 cursor-not-allowed",
                          paymentMethod === "PORTAL" && ccUnlocked
                            ? "border-[#9333ea] bg-[#9333ea]/5 shadow-lg shadow-[#9333ea]/10"
                            : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-none flex items-center justify-center",
                            paymentMethod === "PORTAL" && ccUnlocked
                              ? "bg-[#9333ea]/15"
                              : "bg-surface"
                          )}
                        >
                          <Hexagon
                            className={cn(
                              "w-4 h-4",
                              paymentMethod === "PORTAL" && ccUnlocked
                                ? "text-[#9333ea]"
                                : "text-text-secondary"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            paymentMethod === "PORTAL" && ccUnlocked
                              ? "text-[#9333ea]"
                              : "text-text-secondary"
                          )}
                        >
                          $PORTAL
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          {formatCurrency(portalBalance)}
                        </span>
                        {paymentMethod === "PORTAL" && (
                          <span className="text-[10px] text-[#9333ea] font-semibold">5% OFF</span>
                        )}
                      </button>
                    </div>

                    {/* Pulls remaining */}
                    <div className="text-center text-sm text-text-secondary mb-4">
                      <span className="font-medium">{pullsRemaining}</span> pull
                      {pullsRemaining !== 1 ? "s" : ""} remaining today
                    </div>

                    {/* Pull button */}
                    {!isAuthenticated ? (
                      <a href="/api/auth/signin">
                        <Button variant="primary" size="lg" className="w-full">
                          Sign In to Pull
                        </Button>
                      </a>
                    ) : (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-lg font-bold"
                          style={{
                            boxShadow: `0 4px 25px ${tierColor}40`,
                          }}
                          icon={<Sparkles className="w-5 h-5" />}
                          onClick={handlePull}
                          disabled={
                            pulling ||
                            pullsRemaining <= 0 ||
                            (paymentMethod === "USDC" && !hasEnoughUsdc) ||
                            (paymentMethod === "POINTS" && !hasEnoughPoints) ||
                            (paymentMethod === "PORTAL" && portalBalance < pack.price * 0.95)
                          }
                          loading={pulling}
                        >
                          {pulling
                            ? "Processing..."
                            : !ccUnlocked && paymentMethod === "POINTS"
                              ? `PULL WITH POINTS — ${formatPoints(pointsCost)} pts`
                              : paymentMethod === "POINTS"
                                ? `PULL — ${formatPoints(pointsCost)} pts`
                                : paymentMethod === "PORTAL"
                                  ? `PULL — ${formatCurrency(pack.price * 0.95)} (5% OFF)`
                                  : `PULL — ${formatCurrency(pack.price)}`}
                        </Button>
                      </motion.div>
                    )}

                    {/* Insufficient funds warning */}
                    {paymentMethod === "USDC" && !hasEnoughUsdc && isAuthenticated && (
                      <p className="text-center text-xs text-red-400 mt-2">
                        Insufficient USDC balance
                      </p>
                    )}
                    {paymentMethod === "POINTS" && !hasEnoughPoints && isAuthenticated && (
                      <p className="text-center text-xs text-red-400 mt-2">
                        Insufficient points balance
                      </p>
                    )}
                    {paymentMethod === "PORTAL" && portalBalance < pack.price * 0.95 && isAuthenticated && (
                      <p className="text-center text-xs text-red-400 mt-2">
                        Insufficient PORTAL balance
                      </p>
                    )}
                  </Card>

                  {/* Top hits */}
                  {pack.topHits.length > 0 && (
                    <Card variant="default" padding="lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-warning" />
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                          Top Hits
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {pack.topHits.map((hit) => (
                          <div
                            key={hit.id}
                            className="flex items-center justify-between py-2 border-b border-bg-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getRarityColor(hit.rarityTier) }}
                              />
                              <span className="text-sm text-text-primary font-medium">
                                {getBrandDisplayName(hit.brand)} {formatCurrency(hit.denomination)}
                              </span>
                              <Badge
                                variant={
                                  (hit.rarityTier === "LEGENDARY"
                                    ? "legendary"
                                    : "epic") as any
                                }
                                size="sm"
                              >
                                {hit.rarityTier}
                              </Badge>
                            </div>
                            <span className="text-xs text-text-secondary">
                              {hit.userName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Recent pulls */}
                  {pack.recentPulls.length > 0 && (
                    <Card variant="default" padding="lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                          Recent Pulls
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {pack.recentPulls.slice(0, 8).map((pull) => (
                          <div
                            key={pull.id}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getRarityColor(pull.rarityTier) }}
                              />
                              <span className="text-xs text-text-secondary">
                                {pull.userName}
                              </span>
                              <span className="text-xs text-text-primary font-medium">
                                {getBrandDisplayName(pull.brand)} {formatCurrency(pull.denomination)}
                              </span>
                            </div>
                            <Badge
                              variant={
                                ({
                                  COMMON: "default",
                                  UNCOMMON: "success",
                                  RARE: "brand",
                                  EPIC: "epic",
                                  LEGENDARY: "legendary",
                                }[pull.rarityTier] || "default") as any
                              }
                              size="sm"
                            >
                              {pull.rarityTier}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
