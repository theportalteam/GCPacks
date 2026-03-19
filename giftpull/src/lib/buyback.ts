import prisma from "@/lib/prisma";

// ─── TYPES ──────────────────────────────────────────────

export interface BuybackResult {
  buybackAmount: number;
  newUsdcBalance: number;
}

// ─── BUYBACK EXECUTION ─────────────────────────────────

/**
 * Execute an instant buyback: user returns a RESERVED gift card in exchange
 * for 95% of its FMV credited to their USDC balance.
 *
 * The card is recycled back into the AVAILABLE pool so it can be pulled again.
 */
export async function executeBuyback(
  userId: string,
  giftCardId: string
): Promise<BuybackResult> {
  // ── 1. VALIDATE ──────────────────────────────────────

  const card = await prisma.giftCard.findUnique({
    where: { id: giftCardId },
  });

  if (!card) {
    throw new Error("Gift card not found");
  }

  if (card.currentOwnerId !== userId) {
    throw new Error("You do not own this gift card");
  }

  if (card.status !== "RESERVED") {
    throw new Error(
      "Only recently pulled (RESERVED) cards can be bought back"
    );
  }

  // ── 2. CALCULATE BUYBACK AMOUNT ──────────────────────

  const buybackAmount = parseFloat((card.fmv * 0.95).toFixed(2));

  // ── 3. EXECUTE IN PRISMA TRANSACTION ────────────────

  const updatedUser = await prisma.$transaction(async (tx) => {
    // Recycle the card back into the available pool
    await tx.giftCard.update({
      where: { id: giftCardId },
      data: {
        status: "AVAILABLE",
        source: "BUYBACK_RECYCLE",
        currentOwnerId: null,
      },
    });

    // Credit the user's USDC balance
    const user = await tx.user.update({
      where: { id: userId },
      data: { usdcBalance: { increment: buybackAmount } },
    });

    // Create transaction record for the buyback
    await tx.transaction.create({
      data: {
        type: "BUYBACK",
        userId,
        giftCardId,
        amount: buybackAmount,
        currency: "USDC",
        paymentMethod: "USDC_BASE",
        status: "COMPLETED",
        metadata: {
          originalFmv: card.fmv,
          buybackRate: 0.95,
          cardBrand: card.brand,
          cardDenomination: card.denomination,
        },
      },
    });

    // Mark all GachaPull records for this card+user as bought back
    await tx.gachaPull.updateMany({
      where: {
        userId,
        giftCardId,
      },
      data: {
        wasBoughtBack: true,
      },
    });

    return user;
  });

  // ── 4. RETURN RESULT ────────────────────────────────

  return {
    buybackAmount,
    newUsdcBalance: updatedUser.usdcBalance,
  };
}
