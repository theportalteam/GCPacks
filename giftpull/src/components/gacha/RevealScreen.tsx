"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ShoppingBag,
  RefreshCw,
  ArrowRight,
  Coins,
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  formatPoints,
  getRarityColor,
  getBrandDisplayName,
  getBrandColor,
} from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface RevealCard {
  id: string;
  brand: string;
  denomination: number;
  rarity: string;
}

interface RevealScreenProps {
  card: RevealCard;
  buybackOffer: number;
  pointsEarned: number;
  pullsRemaining: number;
  onKeep: () => void;
  onBuyback: () => void;
  onPullAgain: () => void;
  ccJustUnlocked?: boolean;
}

const rarityBadgeVariant: Record<string, string> = {
  COMMON: "default",
  UNCOMMON: "success",
  RARE: "brand",
  EPIC: "epic",
  LEGENDARY: "legendary",
};

export function RevealScreen({
  card,
  buybackOffer,
  pointsEarned,
  pullsRemaining,
  onKeep,
  onBuyback,
  onPullAgain,
  ccJustUnlocked = false,
}: RevealScreenProps) {
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const rarityColor = getRarityColor(card.rarity);
  const brandColor = getBrandColor(card.brand);
  const brandName = getBrandDisplayName(card.brand);
  const isLegendary = card.rarity === "LEGENDARY";

  // Animated points count-up
  useEffect(() => {
    if (pointsEarned === 0) return;

    let current = 0;
    const increment = Math.max(1, Math.floor(pointsEarned / 40));
    const timer = setInterval(() => {
      current += increment;
      if (current >= pointsEarned) {
        setAnimatedPoints(pointsEarned);
        clearInterval(timer);
      } else {
        setAnimatedPoints(current);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [pointsEarned]);

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Card display */}
      <div className="mb-6">
        {isLegendary ? (
          <div
            className="p-[3px] rounded-2xl mx-auto"
            style={{
              background:
                "linear-gradient(135deg, #ffb1c3, #7d00ff, #d5bbff)",
              backgroundSize: "200% 200%",
              animation: "shimmer 2s linear infinite",
            }}
          >
            <CardDisplay
              card={card}
              rarityColor={rarityColor}
              brandColor={brandColor}
              brandName={brandName}
            />
          </div>
        ) : (
          <div
            className="rounded-2xl mx-auto"
            style={{
              border: `2px solid ${rarityColor}`,
              boxShadow: `0 0 25px ${rarityColor}30`,
            }}
          >
            <CardDisplay
              card={card}
              rarityColor={rarityColor}
              brandColor={brandColor}
              brandName={brandName}
            />
          </div>
        )}
      </div>

      {/* CC Just Unlocked celebration */}
      {ccJustUnlocked && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        >
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                Credit Card Unlocked!
              </span>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-text-secondary">
              You can now use Stripe for this pack tier
            </p>
          </div>
        </motion.div>
      )}

      {/* Points earned */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-full px-5 py-2.5">
          <Coins className="w-4 h-4 text-warning" />
          <span className="text-sm font-bold text-warning">
            +{formatPoints(animatedPoints)} Points
          </span>
        </div>
      </motion.div>

      {/* Buyback offer */}
      <motion.div
        className="bg-success/8 border border-success/20 rounded-xl p-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-success">
            Instant Buyback Available
          </span>
        </div>
        <p className="text-text-secondary text-sm">
          Sell back for{" "}
          <span className="text-success font-bold text-base">
            {formatCurrency(buybackOffer)}
          </span>{" "}
          <span className="text-text-tertiary">(95% of face value)</span>
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          variant="primary"
          size="md"
          className="flex-col h-auto py-3 gap-1"
          onClick={onKeep}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-xs">Keep Card</span>
        </Button>

        <Button
          variant="success"
          size="md"
          className="flex-col h-auto py-3 gap-1"
          onClick={onBuyback}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-xs">Sell Back</span>
        </Button>

        <a href="/marketplace/sell">
          <Button
            variant="secondary"
            size="md"
            className="flex-col h-auto py-3 gap-1 w-full"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs">List It</span>
          </Button>
        </a>
      </motion.div>

      {/* Pull again */}
      {pullsRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="ghost"
            size="lg"
            className="w-full border border-bg-border hover:border-primary/30"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={onPullAgain}
          >
            Pull Again
            <span className="text-text-secondary text-xs ml-2">
              ({pullsRemaining} left today)
            </span>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Card inner display component
function CardDisplay({
  card,
  rarityColor,
  brandColor,
  brandName,
}: {
  card: RevealCard;
  rarityColor: string;
  brandColor: string;
  brandName: string;
}) {
  const badgeVariant = (rarityBadgeVariant[card.rarity] || "default") as any;

  return (
    <div className="bg-bg-surface rounded-2xl p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${rarityColor}10, transparent 70%)`,
        }}
      />

      <div className="relative z-10 text-center">
        {/* Brand badge */}
        <div
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white mb-4"
          style={{ backgroundColor: brandColor }}
        >
          {brandName}
        </div>

        {/* Denomination */}
        <p
          className={cn(
            "text-5xl font-extrabold mb-4",
            card.rarity === "LEGENDARY"
              ? "bg-gradient-to-r from-tertiary to-primary-container bg-clip-text text-transparent"
              : "text-text-primary"
          )}
        >
          {formatCurrency(card.denomination)}
        </p>

        {/* Rarity badge */}
        <Badge variant={badgeVariant} size="md">
          <span
            className="w-2 h-2 rounded-full mr-1.5 inline-block"
            style={{ backgroundColor: rarityColor }}
          />
          {card.rarity}
        </Badge>
      </div>
    </div>
  );
}
