import crypto from "crypto";
import prisma from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/stripe";
import { earnPoints, redeemPoints } from "@/lib/points";
import type { PaymentMethod, PackTier, RarityTier } from "@prisma/client";

// ─── TYPES ──────────────────────────────────────────────

export interface PullResult {
  giftCard: any;
  rarityTier: string;
  buybackOffer: number;
  pointsEarned: number;
  pull: any;
  ccJustUnlocked: boolean;
}

interface OddsEntry {
  id: string;
  packId: string;
  rarityTier: RarityTier;
  cardValue: number;
  weight: number;
}

// ─── CC UNLOCK CHECK ────────────────────────────────────

export class CCLockedError extends Error {
  constructor(tier: string) {
    super(
      `Complete your first pull with points to unlock credit card purchases for ${tier} packs`
    );
    this.name = "CCLockedError";
  }
}

// ─── MAIN PULL FUNCTION ─────────────────────────────────

/**
 * Execute a full gacha pull: validate, pay, roll rarity, assign card, record.
 *
 * Now accepts `packTier` instead of `packId`.
 *
 * For STRIPE payments this throws an object containing { checkoutUrl } so the
 * caller can redirect the user to Stripe Checkout.  The actual pull is
 * completed later by the webhook after payment succeeds.
 */
export async function executeGachaPull(
  userId: string,
  packTier: PackTier,
  paymentMethod: PaymentMethod,
  origin?: string
): Promise<PullResult> {
  // ── 1. VALIDATE ──────────────────────────────────────

  const pack = await prisma.gachaPack.findUnique({
    where: { tier: packTier },
    include: { odds: true },
  });

  if (!pack) {
    throw new Error("Pack not found");
  }

  if (!pack.isActive) {
    throw new Error("This pack is currently unavailable");
  }

  if (!pack.odds.length) {
    throw new Error("Pack has no configured odds");
  }

  const todayPulls = await countTodayPulls(userId, pack.id);

  if (todayPulls >= pack.dailyLimit) {
    throw new Error(
      `Daily limit reached (${pack.dailyLimit} pulls per day for this pack)`
    );
  }

  // ── 1b. CC UNLOCK GATE ─────────────────────────────

  if (paymentMethod === "STRIPE") {
    const unlock = await prisma.userPackUnlock.findUnique({
      where: {
        userId_packTier: { userId, packTier },
      },
    });

    if (!unlock) {
      throw new CCLockedError(packTier);
    }
  }

  // ── 2. PROCESS PAYMENT ───────────────────────────────

  if (paymentMethod === "STRIPE") {
    const base =
      origin || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      amount: pack.price,
      description: `${pack.name} - GiftPull Pack`,
      metadata: {
        packTier: pack.tier,
        userId,
        type: "gacha_pull",
      },
      successUrl: `${base}/gacha/result?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/gacha`,
    });

    // Throw with checkoutUrl so the route handler can respond with a redirect
    throw { checkoutUrl: checkoutSession.url };
  }

  if (paymentMethod === "USDC_BASE") {
    // Atomically verify and deduct USDC balance
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { usdcBalance: true },
    });

    if (user.usdcBalance < pack.price) {
      throw new Error(
        `Insufficient USDC balance: have $${user.usdcBalance.toFixed(2)}, need $${pack.price.toFixed(2)}`
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { usdcBalance: { decrement: pack.price } },
    });
  }

  if (paymentMethod === "POINTS") {
    if (pack.pointsCost == null) {
      throw new Error("This pack cannot be purchased with points");
    }

    await redeemPoints({
      userId,
      amount: pack.pointsCost,
      description: `GiftPull pack: ${pack.name}`,
    });
  }

  // ── 3. DETERMINE RARITY (CSPRNG) ────────────────────

  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const random = buf[0] / (0xffffffff + 1);

  // Sort odds by weight descending so high-probability tiers are checked first
  const sortedOdds = [...pack.odds].sort((a, b) => b.weight - a.weight);

  let cumulative = 0;
  let selectedOdds: OddsEntry = sortedOdds[sortedOdds.length - 1];

  for (const odds of sortedOdds) {
    cumulative += odds.weight;
    if (random < cumulative) {
      selectedOdds = odds;
      break;
    }
  }

  // ── 4. SELECT CARD ──────────────────────────────────

  // Try exact match: AVAILABLE card at the rolled rarity and value
  let card = await prisma.giftCard.findFirst({
    where: {
      status: "AVAILABLE",
      rarityTier: selectedOdds.rarityTier,
      denomination: selectedOdds.cardValue,
    },
    orderBy: { createdAt: "asc" }, // FIFO
  });

  // Fallback: any AVAILABLE card at the target value regardless of rarity
  if (!card) {
    card = await prisma.giftCard.findFirst({
      where: {
        status: "AVAILABLE",
        denomination: selectedOdds.cardValue,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!card) {
    // Refund the payment since we can't fulfil the pull
    if (paymentMethod === "USDC_BASE") {
      await prisma.user.update({
        where: { id: userId },
        data: { usdcBalance: { increment: pack.price } },
      });
    }
    // Points refunds are handled by the redeemPoints rollback at the Prisma tx level
    throw new Error(
      "No cards available for the selected rarity. Please try again later."
    );
  }

  // ── 5. EXECUTE IN PRISMA TRANSACTION ────────────────

  const buybackOffer = parseFloat((card.fmv * 0.95).toFixed(2));
  const randomSeed = buf[0].toString(16).padStart(8, "0");

  // Points earned: 2 pts per $1 spent, 2.5x multiplier for USDC
  const basePoints = Math.floor(pack.price * 2);
  const pointsMultiplier = paymentMethod === "USDC_BASE" ? 2.5 : 1;
  const pointsEarned = Math.floor(basePoints * pointsMultiplier);

  // Check if this is the first points pull for this tier (CC unlock)
  let ccJustUnlocked = false;
  if (paymentMethod === "POINTS") {
    const existingUnlock = await prisma.userPackUnlock.findUnique({
      where: {
        userId_packTier: { userId, packTier },
      },
    });
    if (!existingUnlock) {
      ccJustUnlocked = true;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Reserve card for the user
    const updatedCard = await tx.giftCard.update({
      where: { id: card!.id },
      data: {
        status: "RESERVED",
        currentOwnerId: userId,
      },
    });

    // Create the GachaPull record
    const pull = await tx.gachaPull.create({
      data: {
        userId,
        packId: pack.id,
        giftCardId: card!.id,
        rarityTier: selectedOdds.rarityTier,
        cardValue: selectedOdds.cardValue,
        buybackOffer,
        randomSeed,
      },
    });

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        type: "GACHA_PULL",
        userId,
        giftCardId: card!.id,
        amount: paymentMethod === "POINTS" ? 0 : pack.price,
        currency: paymentMethod === "USDC_BASE" ? "USDC" : "USD",
        paymentMethod,
        status: "COMPLETED",
        pointsEarned,
        metadata: {
          packId: pack.id,
          packTier: pack.tier,
          rarityTier: selectedOdds.rarityTier,
          cardValue: selectedOdds.cardValue,
        },
      },
    });

    // Award points (only for paid pulls, not POINTS redemptions)
    if (pointsEarned > 0 && paymentMethod !== "POINTS") {
      await tx.pointsLedger.create({
        data: {
          userId,
          amount: pointsEarned,
          type: "GACHA_EARN",
          multiplier: pointsMultiplier,
          description: `GiftPull: ${pack.name} (${selectedOdds.rarityTier})`,
          transactionId: transaction.id,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: pointsEarned } },
      });
    }

    // Create CC unlock record if first points pull for this tier
    if (ccJustUnlocked) {
      await tx.userPackUnlock.create({
        data: {
          userId,
          packTier,
        },
      });
    }

    return { pull, card: updatedCard };
  });

  // ── 6. RETURN RESULT ────────────────────────────────

  return {
    giftCard: result.card,
    rarityTier: selectedOdds.rarityTier,
    buybackOffer,
    pointsEarned: paymentMethod === "POINTS" ? 0 : pointsEarned,
    pull: result.pull,
    ccJustUnlocked,
  };
}

// ─── HELPERS ────────────────────────────────────────────

/**
 * Count how many pulls a user has made today for a specific pack.
 * Uses UTC day boundaries.
 */
export async function countTodayPulls(
  userId: string,
  packId: string
): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  return prisma.gachaPull.count({
    where: {
      userId,
      packId,
      createdAt: { gte: startOfDay },
    },
  });
}

/**
 * Calculate the expected value of a pack based on its odds table.
 * EV = sum of (weight * cardValue) for each odds entry.
 */
export function calculateExpectedValue(
  odds: Pick<OddsEntry, "weight" | "cardValue">[]
): number {
  return parseFloat(
    odds
      .reduce((sum, entry) => sum + entry.weight * entry.cardValue, 0)
      .toFixed(2)
  );
}
