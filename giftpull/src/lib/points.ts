import prisma from "@/lib/prisma";
import { PointsType } from "@prisma/client";
import { recordPointsForLeaderboard } from "@/lib/leaderboard";

interface EarnPointsParams {
  userId: string;
  amount: number;
  type: PointsType;
  multiplier?: number;
  description?: string;
  transactionId?: string;
}

interface RedeemPointsParams {
  userId: string;
  amount: number;
  description?: string;
}

/**
 * Award points to a user. Creates a PointsLedger entry and increments
 * the user's pointsBalance atomically within a transaction.
 */
export async function earnPoints({
  userId,
  amount,
  type,
  multiplier = 1.0,
  description,
  transactionId,
}: EarnPointsParams): Promise<{ ledgerEntryId: string; finalAmount: number }> {
  const finalAmount = Math.floor(amount * multiplier);

  if (finalAmount <= 0) {
    throw new Error("Points amount must be positive after multiplier");
  }

  const result = await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.pointsLedger.create({
      data: {
        userId,
        amount: finalAmount,
        type,
        multiplier,
        description,
        transactionId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        pointsBalance: { increment: finalAmount },
      },
    });

    return { ledgerEntryId: ledgerEntry.id, finalAmount };
  });

  // Record for leaderboard (fire-and-forget, don't block the main flow)
  recordPointsForLeaderboard(userId, result.finalAmount).catch((err) =>
    console.error("Leaderboard tracking error:", err)
  );

  return result;
}

/**
 * Deduct points from a user's balance. Validates sufficient balance,
 * creates a negative ledger entry, and decrements the balance atomically.
 */
export async function redeemPoints({
  userId,
  amount,
  description,
}: RedeemPointsParams): Promise<{ ledgerEntryId: string }> {
  if (amount <= 0) {
    throw new Error("Redemption amount must be positive");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { pointsBalance: true },
    });

    if (user.pointsBalance < amount) {
      throw new Error(
        `Insufficient points balance: have ${user.pointsBalance}, need ${amount}`
      );
    }

    const ledgerEntry = await tx.pointsLedger.create({
      data: {
        userId,
        amount: -amount,
        type: "REDEMPTION",
        multiplier: 1.0,
        description,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        pointsBalance: { decrement: amount },
      },
    });

    return { ledgerEntryId: ledgerEntry.id };
  });

  return result;
}

/**
 * Calculate how many points a user earns for a purchase.
 *
 * Base rate: 1 point per $1 spent on storefront purchases.
 * Multipliers:
 *   - 1.5x for bundle purchases
 *   - 1.25x for USDC payments
 *   - Multipliers stack multiplicatively
 *
 * Returns a floor integer.
 */
export function calculatePointsEarned(
  amount: number,
  paymentMethod: string,
  isBundle: boolean
): number {
  let points = amount; // Base: 1 pt per $1

  if (isBundle) {
    points *= 1.5;
  }

  if (paymentMethod === "USDC_BASE") {
    points *= 1.25;
  }

  return Math.floor(points);
}
