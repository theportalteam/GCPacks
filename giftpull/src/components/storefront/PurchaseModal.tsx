"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  Coins,
  CircleDollarSign,
  Check,
  Copy,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatPoints, getBrandColor, getBrandDisplayName, generateFakeCode } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type PaymentMethodType = "STRIPE" | "USDC" | "POINTS";

interface PurchaseItem {
  id: string;
  brand: string;
  denomination: number;
  price: number;
  discountPercent: number | null;
  name: string;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PurchaseItem;
  type: "card" | "bundle";
}

// Points earned per dollar spent (10 points per $1)
const POINTS_PER_DOLLAR = 10;
// Points cost multiplier (100 points = $1)
const POINTS_COST_MULTIPLIER = 100;

export function PurchaseModal({ isOpen, onClose, item, type }: PurchaseModalProps) {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as
    | { pointsBalance?: number; usdcBalance?: number }
    | undefined;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>("STRIPE");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [revealedCode, setRevealedCode] = useState("");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [copied, setCopied] = useState(false);

  const pointsBalance = user?.pointsBalance ?? 0;
  const usdcBalance = user?.usdcBalance ?? 0;
  const pointsCost = Math.ceil(item.price * POINTS_COST_MULTIPLIER);
  const hasEnoughPoints = pointsBalance >= pointsCost;
  const hasEnoughUsdc = usdcBalance >= item.price;

  const brandColor = item.brand === "BUNDLE" ? "#7d00ff" : getBrandColor(item.brand);
  const brandName = item.brand === "BUNDLE" ? "Bundle" : getBrandDisplayName(item.brand);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so exit animation plays before reset
      const timer = setTimeout(() => {
        setSelectedMethod("STRIPE");
        setLoading(false);
        setSuccess(false);
        setRevealedCode("");
        setPointsEarned(0);
        setAnimatedPoints(0);
        setCopied(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Animated points count-up
  useEffect(() => {
    if (!success || pointsEarned === 0) return;

    let current = 0;
    const increment = Math.max(1, Math.floor(pointsEarned / 30));
    const timer = setInterval(() => {
      current += increment;
      if (current >= pointsEarned) {
        setAnimatedPoints(pointsEarned);
        clearInterval(timer);
      } else {
        setAnimatedPoints(current);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [success, pointsEarned]);

  const handleConfirm = useCallback(async () => {
    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const earned = Math.floor(item.price * POINTS_PER_DOLLAR);
      setPointsEarned(earned);
      setRevealedCode(generateFakeCode());
      setSuccess(true);
      // Refresh session to get updated balances
      await updateSession();
    } catch {
      // In production, show error toast
    } finally {
      setLoading(false);
    }
  }, [item.price]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(revealedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the code text
    }
  }, [revealedCode]);

  const handleBuyAnother = useCallback(() => {
    onClose();
  }, [onClose]);

  // -- Success View --
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-success/15 border-2 border-success/30 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>

          <h2 className="text-xl font-bold text-text-primary mb-1">
            Purchase Complete!
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {item.name}
          </p>

          {/* Card code reveal */}
          {type === "card" && (
            <div className="mb-6">
              <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-2">
                Your Card Code
              </p>
              <div className="relative inline-flex items-center gap-2 bg-bg-elevated border border-bg-border rounded-none px-5 py-3">
                <code className="text-lg font-mono font-bold text-text-primary tracking-widest select-all">
                  {revealedCode}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-none hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-success mt-1.5">Copied to clipboard!</p>
              )}
            </div>
          )}

          {type === "bundle" && (
            <div className="mb-6 bg-bg-elevated/50 border border-bg-border rounded-none p-4">
              <p className="text-sm text-text-secondary">
                Your bundle codes have been delivered to your account. Visit your{" "}
                <span className="text-primary font-medium">Profile</span> to view
                all purchased cards.
              </p>
            </div>
          )}

          {/* Points earned */}
          <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-full px-4 py-2 mb-6">
            <Coins className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning">
              +{formatPoints(animatedPoints)} Points Earned
            </span>
          </div>

          {/* Buy another */}
          <div>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={handleBuyAnother}
            >
              Buy Another
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // -- Purchase View --
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Purchase" size="md">
      <div>
        {/* Item details */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-bg-border">
          <div
            className="w-12 h-12 rounded-none flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${brandColor}20` }}
          >
            <ShoppingBag className="w-6 h-6" style={{ color: brandColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary truncate">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {brandName}
              </span>
              {item.discountPercent != null && item.discountPercent > 0 && (
                <Badge variant="success" size="sm">
                  {Math.round(item.discountPercent)}% OFF
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-text-primary">
              {formatCurrency(item.price)}
            </p>
          </div>
        </div>

        {/* Payment method selector */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-3">
            Payment Method
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stripe */}
            <button
              onClick={() => setSelectedMethod("STRIPE")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                selectedMethod === "STRIPE"
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-bg-border bg-bg-elevated/50 hover:border-bg-border/80 hover:bg-bg-elevated"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-none flex items-center justify-center",
                  selectedMethod === "STRIPE" ? "bg-primary/15" : "bg-bg-surface"
                )}
              >
                <CreditCard
                  className={cn(
                    "w-5 h-5",
                    selectedMethod === "STRIPE"
                      ? "text-primary"
                      : "text-text-secondary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  selectedMethod === "STRIPE"
                    ? "text-primary"
                    : "text-text-secondary"
                )}
              >
                Pay with Card
              </span>
            </button>

            {/* USDC */}
            <button
              onClick={() => setSelectedMethod("USDC")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                selectedMethod === "USDC"
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-bg-border bg-bg-elevated/50 hover:border-bg-border/80 hover:bg-bg-elevated"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-none flex items-center justify-center",
                  selectedMethod === "USDC" ? "bg-primary/15" : "bg-bg-surface"
                )}
              >
                <CircleDollarSign
                  className={cn(
                    "w-5 h-5",
                    selectedMethod === "USDC"
                      ? "text-primary"
                      : "text-text-secondary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  selectedMethod === "USDC"
                    ? "text-primary"
                    : "text-text-secondary"
                )}
              >
                Pay with USDC
              </span>
              <span className="text-[10px] text-text-secondary">
                Balance: {formatCurrency(usdcBalance)}
              </span>
              {!hasEnoughUsdc && selectedMethod === "USDC" && (
                <span className="text-[10px] text-red-400">Insufficient balance</span>
              )}
            </button>

            {/* Points */}
            <button
              onClick={() => {
                if (hasEnoughPoints) {
                  setSelectedMethod("POINTS");
                }
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                selectedMethod === "POINTS"
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-bg-border bg-bg-elevated/50 hover:border-bg-border/80 hover:bg-bg-elevated",
                !hasEnoughPoints && "opacity-50 cursor-not-allowed"
              )}
              disabled={!hasEnoughPoints}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-none flex items-center justify-center",
                  selectedMethod === "POINTS" ? "bg-primary/15" : "bg-bg-surface"
                )}
              >
                <Coins
                  className={cn(
                    "w-5 h-5",
                    selectedMethod === "POINTS"
                      ? "text-primary"
                      : "text-text-secondary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  selectedMethod === "POINTS"
                    ? "text-primary"
                    : "text-text-secondary"
                )}
              >
                Pay with Points
              </span>
              <span className="text-[10px] text-text-secondary">
                {formatPoints(pointsCost)} pts required
              </span>
              <span className="text-[10px] text-text-secondary">
                You have: {formatPoints(pointsBalance)}
              </span>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-bg-elevated/50 border border-bg-border rounded-none p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Item</span>
            <span className="text-text-primary font-medium">{item.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-text-secondary">Payment</span>
            <span className="text-text-primary font-medium">
              {selectedMethod === "STRIPE" && "Credit / Debit Card"}
              {selectedMethod === "USDC" && `USDC (${formatCurrency(item.price)})`}
              {selectedMethod === "POINTS" && `${formatPoints(pointsCost)} Points`}
            </span>
          </div>
          <div className="h-px bg-bg-border my-3" />
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-semibold">Total</span>
            <span className="text-lg font-bold text-text-primary">
              {selectedMethod === "POINTS"
                ? `${formatPoints(pointsCost)} pts`
                : formatCurrency(item.price)}
            </span>
          </div>
        </div>

        {/* Confirm button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={
            loading ||
            (selectedMethod === "USDC" && !hasEnoughUsdc) ||
            (selectedMethod === "POINTS" && !hasEnoughPoints)
          }
          onClick={handleConfirm}
        >
          {loading ? (
            "Processing..."
          ) : (
            <>Confirm Purchase &mdash; {selectedMethod === "POINTS" ? `${formatPoints(pointsCost)} pts` : formatCurrency(item.price)}</>
          )}
        </Button>

        {/* Earn notice */}
        {selectedMethod !== "POINTS" && (
          <p className="text-center text-xs text-text-secondary mt-3">
            <Coins className="w-3 h-3 inline-block mr-1 text-warning" />
            Earn{" "}
            <span className="text-warning font-semibold">
              {formatPoints(Math.floor(item.price * POINTS_PER_DOLLAR))}
            </span>{" "}
            points with this purchase
          </p>
        )}
      </div>
    </Modal>
  );
}
