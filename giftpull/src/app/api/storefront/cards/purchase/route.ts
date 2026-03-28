import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { earnPoints, redeemPoints, calculatePointsEarned } from "@/lib/points";
import { logActivity } from "@/lib/activity";
import { capturePortfolioSnapshot } from "@/lib/portfolio";
import { calculateFee } from "@/lib/fees";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { cardId, paymentMethod } = body;

    if (!cardId || !paymentMethod) {
      return NextResponse.json(
        { error: "cardId and paymentMethod are required" },
        { status: 400 }
      );
    }

    // Validate card exists and is available
    const card = await prisma.giftCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Card is no longer available" },
        { status: 409 }
      );
    }

    const price = card.listedPrice ?? card.fmv;

    // ── STRIPE ──────────────────────────────────────────────
    if (paymentMethod === "STRIPE") {
      const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

      const checkoutSession = await createCheckoutSession({
        amount: price,
        description: `${card.brand} $${card.denomination} Gift Card`,
        metadata: {
          cardId: card.id,
          userId,
          type: "storefront_card",
        },
        successUrl: `${origin}/storefront/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/storefront`,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    }

    // ── USDC_BASE ───────────────────────────────────────────
    if (paymentMethod === "USDC_BASE") {
      const result = await prisma.$transaction(async (tx) => {
        // Verify sufficient USDC balance
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { usdcBalance: true },
        });

        if (user.usdcBalance < price) {
          throw new Error("Insufficient USDC balance");
        }

        // Deduct USDC balance
        await tx.user.update({
          where: { id: userId },
          data: { usdcBalance: { decrement: price } },
        });

        // Mark card as SOLD and assign to user
        const updatedCard = await tx.giftCard.update({
          where: { id: cardId },
          data: {
            status: "SOLD",
            currentOwnerId: userId,
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: "STOREFRONT_PURCHASE",
            userId,
            giftCardId: cardId,
            amount: price,
            paymentMethod: "USDC_BASE",
            status: "COMPLETED",
          },
        });

        return { transaction, card: updatedCard };
      });

      // Earn points (outside the main transaction for non-critical path)
      const pointsEarned = calculatePointsEarned(price, "USDC_BASE", false);
      await earnPoints({
        userId,
        amount: pointsEarned,
        type: "PURCHASE_EARN",
        description: `Storefront purchase: ${card.brand} $${card.denomination}`,
        transactionId: result.transaction.id,
      });

      // Update transaction with points earned
      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { pointsEarned },
      });

      await logActivity(userId, "STOREFRONT_PURCHASE", `Purchased $${card.denomination} ${card.brand} Gift Card`, { amount: price, currency: "USD", metadata: { cardBrand: card.brand, cardId } });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        card: result.card,
        pointsEarned,
      });
    }

    // ── POINTS ──────────────────────────────────────────────
    if (paymentMethod === "POINTS") {
      const pointsCost = Math.floor(card.denomination * 100);

      const result = await prisma.$transaction(async (tx) => {
        // Mark card as SOLD and assign to user
        const updatedCard = await tx.giftCard.update({
          where: { id: cardId },
          data: {
            status: "SOLD",
            currentOwnerId: userId,
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: "POINTS_REDEMPTION",
            userId,
            giftCardId: cardId,
            amount: 0, // No dollar amount for points purchases
            paymentMethod: "POINTS",
            status: "COMPLETED",
            pointsEarned: 0,
            metadata: { pointsCost },
          },
        });

        return { transaction, card: updatedCard };
      });

      // Deduct points (handles balance validation internally)
      await redeemPoints({
        userId,
        amount: pointsCost,
        description: `Redeemed for ${card.brand} $${card.denomination} gift card`,
      });

      await logActivity(userId, "STOREFRONT_PURCHASE", `Purchased $${card.denomination} ${card.brand} Gift Card with points`, { amount: card.denomination, currency: "POINTS", metadata: { cardBrand: card.brand, cardId, pointsCost } });
      await logActivity(userId, "POINTS_REDEEMED", `Redeemed ${pointsCost} points for ${card.brand} $${card.denomination} Gift Card`, { amount: pointsCost, currency: "POINTS" });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        card: result.card,
      });
    }

    // ── PORTAL ─────────────────────────────────────────────
    if (paymentMethod === "PORTAL") {
      const { fee, total, feeRate } = calculateFee(price, "PORTAL");

      // Get current PORTAL rate
      const portalRate = await prisma.portalRate.findFirst({
        orderBy: { lockedAt: "desc" },
      });
      if (!portalRate) {
        return NextResponse.json({ error: "PORTAL rate not available" }, { status: 400 });
      }

      const portalCost = Math.round((total / portalRate.rate) * 100) / 100;

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { portalBalance: true },
        });

        if (user.portalBalance < portalCost) {
          throw new Error("Insufficient PORTAL balance");
        }

        await tx.user.update({
          where: { id: userId },
          data: { portalBalance: { decrement: portalCost } },
        });

        const updatedCard = await tx.giftCard.update({
          where: { id: cardId },
          data: { status: "SOLD", currentOwnerId: userId },
        });

        const transaction = await tx.transaction.create({
          data: {
            type: "STOREFRONT_PURCHASE",
            userId,
            giftCardId: cardId,
            amount: price,
            paymentMethod: "PORTAL",
            status: "COMPLETED",
            metadata: { fee, feeRate, portalRate: portalRate.rate, portalCost },
          },
        });

        return { transaction, card: updatedCard };
      });

      const pointsEarned = calculatePointsEarned(price, "PORTAL", false);
      await earnPoints({
        userId,
        amount: pointsEarned,
        type: "PURCHASE_EARN",
        description: `Storefront purchase: ${card.brand} $${card.denomination}`,
        transactionId: result.transaction.id,
      });

      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { pointsEarned },
      });

      await logActivity(userId, "STOREFRONT_PURCHASE", `Purchased $${card.denomination} ${card.brand} Gift Card with PORTAL`, { amount: price, currency: "USD", metadata: { cardBrand: card.brand, cardId, fee, portalRate: portalRate.rate } });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        card: result.card,
        pointsEarned,
      });
    }

    return NextResponse.json(
      { error: "Invalid payment method. Use STRIPE, USDC_BASE, POINTS, or PORTAL." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error purchasing card:", error);

    const message =
      error instanceof Error ? error.message : "Purchase failed";

    if (
      message.includes("Insufficient") ||
      message.includes("Insufficient USDC") ||
      message.includes("Insufficient points")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
