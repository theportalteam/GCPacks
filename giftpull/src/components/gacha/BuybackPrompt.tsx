"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  getRarityColor,
  getBrandDisplayName,
  getBrandColor,
} from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BuybackCard {
  id: string;
  brand: string;
  denomination: number;
  rarity: string;
}

interface BuybackPromptProps {
  isOpen: boolean;
  onClose: () => void;
  card: BuybackCard;
  buybackAmount: number;
  userBalance: number;
  onConfirm: () => Promise<void>;
  onPullAgain: () => void;
}

export function BuybackPrompt({
  isOpen,
  onClose,
  card,
  buybackAmount,
  userBalance,
  onConfirm,
  onPullAgain,
}: BuybackPromptProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rarityColor = getRarityColor(card.rarity);
  const brandColor = getBrandColor(card.brand);
  const brandName = getBrandDisplayName(card.brand);
  const newBalance = userBalance + buybackAmount;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      setSuccess(true);
    } catch (err) {
      setError("Buyback failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onConfirm]);

  const handlePullAgain = useCallback(() => {
    onClose();
    onPullAgain();
  }, [onClose, onPullAgain]);

  // ===== SUCCESS VIEW =====
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <div className="text-center py-2">
          {/* Success icon */}
          <motion.div
            className="mx-auto w-16 h-16 rounded-full bg-success/15 border-2 border-success/30 flex items-center justify-center mb-5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <Check className="w-8 h-8 text-success" />
          </motion.div>

          <motion.h2
            className="text-xl font-bold text-text-primary mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Buyback Complete!
          </motion.h2>

          <motion.p
            className="text-text-secondary text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            Your USDC balance has been credited.
          </motion.p>

          {/* Credited amount */}
          <motion.div
            className="bg-success/8 border border-success/20 rounded-xl p-4 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">
              Credited
            </p>
            <p className="text-2xl font-extrabold text-success">
              +{formatCurrency(buybackAmount)}
            </p>
          </motion.div>

          {/* New balance */}
          <motion.div
            className="bg-surface-light/50 border border-border-subtle rounded-xl p-4 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">
              New Balance
            </p>
            <p className="text-xl font-bold text-text-primary">
              {formatCurrency(newBalance)}
            </p>
          </motion.div>

          {/* Pull Again CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="primary"
              size="lg"
              className="w-full mb-3"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handlePullAgain}
            >
              Pull Again?
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={onClose}
            >
              Done
            </Button>
          </motion.div>
        </div>
      </Modal>
    );
  }

  // ===== CONFIRMATION VIEW =====
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sell Back Card" size="sm">
      <div>
        {/* Card details */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border-subtle">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${brandColor}20` }}
          >
            <Wallet className="w-5 h-5" style={{ color: brandColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">{brandName}</p>
            <p className="text-lg font-extrabold text-text-primary">
              {formatCurrency(card.denomination)}
            </p>
          </div>
          <Badge
            variant={
              (card.rarity === "LEGENDARY"
                ? "legendary"
                : card.rarity === "EPIC"
                  ? "epic"
                  : card.rarity === "RARE"
                    ? "brand"
                    : card.rarity === "UNCOMMON"
                      ? "success"
                      : "default") as any
            }
            size="sm"
          >
            {card.rarity}
          </Badge>
        </div>

        {/* Buyback amount */}
        <div className="bg-success/8 border border-success/20 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">
            You will receive
          </p>
          <p className="text-3xl font-extrabold text-success">
            {formatCurrency(buybackAmount)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            95% of {formatCurrency(card.denomination)} face value
          </p>
        </div>

        {/* Balance change */}
        <div className="bg-surface-light/50 border border-border-subtle rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Current USDC Balance</span>
            <span className="text-text-primary font-medium">
              {formatCurrency(userBalance)}
            </span>
          </div>
          <div className="flex items-center justify-center my-2">
            <ArrowRight className="w-4 h-4 text-text-secondary/40" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">New Balance</span>
            <span className="text-success font-bold">
              {formatCurrency(newBalance)}
            </span>
          </div>
        </div>

        {/* Warning note */}
        <div className="flex items-start gap-2 text-xs text-text-secondary/70 mb-5">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <p>
            This action is permanent. The card will be removed from your
            inventory and cannot be undone.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            size="md"
            className="flex-1"
            loading={loading}
            onClick={handleConfirm}
          >
            {loading ? "Processing..." : `Sell for ${formatCurrency(buybackAmount)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
