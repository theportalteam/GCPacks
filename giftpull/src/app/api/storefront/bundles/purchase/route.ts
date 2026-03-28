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
    const { bundleId, paymentMethod } = body;

    if (!bundleId || !paymentMethod) {
      return NextResponse.json(
        { error: "bundleId and paymentMethod are required" },
        { status: 400 }
      );
    }

    // Validate bundle exists and is active
    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
      include: { items: true },
    });

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    if (!bundle.isActive) {
      return NextResponse.json(
        { error: "Bundle is no longer active" },
        { status: 409 }
      );
    }

    // Find available cards that match each bundle item
    const cardIds: string[] = [];

    for (const item of bundle.items) {
      const availableCards = await prisma.giftCard.findMany({
        where: {
          brand: item.brand,
          denomination: item.denomination,
          status: "AVAILABLE",
        },
        take: item.quantity,
        select: { id: true },
      });

      if (availableCards.length < item.quantity) {
        return NextResponse.json(
          {
            error: `Not enough ${item.brand} $${item.denomination} cards available (need ${item.quantity}, found ${availableCards.length})`,
          },
          { status: 409 }
        );
      }

      cardIds.push(...availableCards.map((c) => c.id));
    }

    // ── STRIPE ──────────────────────────────────────────────
    if (paymentMethod === "STRIPE") {
      const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

      const checkoutSession = await createCheckoutSession({
        amount: bundle.price,
        description: `Bundle: ${bundle.name}`,
        metadata: {
          bundleId: bundle.id,
          userId,
          cardIds: JSON.stringify(cardIds),
          type: "bundle",
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

        if (user.usdcBalance < bundle.price) {
          throw new Error("Insufficient USDC balance");
        }

        // Deduct USDC balance
        await tx.user.update({
          where: { id: userId },
          data: { usdcBalance: { decrement: bundle.price } },
        });

        // Mark all cards as SOLD and assign to user
        const updatedCards = await Promise.all(
          cardIds.map((id) =>
            tx.giftCard.update({
              where: { id },
              data: {
                status: "SOLD",
                currentOwnerId: userId,
              },
            })
          )
        );

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: "BUNDLE_PURCHASE",
            userId,
            amount: bundle.price,
            paymentMethod: "USDC_BASE",
            status: "COMPLETED",
            metadata: {
              bundleId: bundle.id,
              bundleName: bundle.name,
              cardIds,
            },
          },
        });

        return { transaction, cards: updatedCards };
      });

      // Earn points: 1.5x bundle multiplier, 1.25x USDC multiplier (stacked)
      const pointsEarned = calculatePointsEarned(bundle.price, "USDC_BASE", true);
      await earnPoints({
        userId,
        amount: pointsEarned,
        type: "PURCHASE_EARN",
        description: `Bundle purchase: ${bundle.name}`,
        transactionId: result.transaction.id,
      });

      // Update transaction with points earned
      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { pointsEarned },
      });

      await logActivity(userId, "BUNDLE_PURCHASE", `Purchased ${bundle.name} (${cardIds.length} cards)`, { amount: bundle.price, currency: "USD", metadata: { bundleId: bundle.id, cardCount: cardIds.length } });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        cards: result.cards,
        pointsEarned,
      });
    }

    // ── POINTS ──────────────────────────────────────────────
    if (paymentMethod === "POINTS") {
      // Points cost based on bundle face value, not discounted price
      const pointsCost = Math.floor(bundle.faceValue * 100);

      const result = await prisma.$transaction(async (tx) => {
        // Mark all cards as SOLD and assign to user
        const updatedCards = await Promise.all(
          cardIds.map((id) =>
            tx.giftCard.update({
              where: { id },
              data: {
                status: "SOLD",
                currentOwnerId: userId,
              },
            })
          )
        );

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: "BUNDLE_PURCHASE",
            userId,
            amount: 0,
            paymentMethod: "POINTS",
            status: "COMPLETED",
            pointsEarned: 0,
            metadata: {
              bundleId: bundle.id,
              bundleName: bundle.name,
              cardIds,
              pointsCost,
            },
          },
        });

        return { transaction, cards: updatedCards };
      });

      // Deduct points
      await redeemPoints({
        userId,
        amount: pointsCost,
        description: `Redeemed for bundle: ${bundle.name}`,
      });

      await logActivity(userId, "BUNDLE_PURCHASE", `Purchased ${bundle.name} (${cardIds.length} cards) with points`, { amount: bundle.faceValue, currency: "POINTS", metadata: { bundleId: bundle.id, cardCount: cardIds.length, pointsCost } });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        cards: result.cards,
      });
    }

    // ── PORTAL ─────────────────────────────────────────────
    if (paymentMethod === "PORTAL") {
      const { fee, total, feeRate } = calculateFee(bundle.price, "PORTAL");

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

        const updatedCards = await Promise.all(
          cardIds.map((id) =>
            tx.giftCard.update({
              where: { id },
              data: { status: "SOLD", currentOwnerId: userId },
            })
          )
        );

        const transaction = await tx.transaction.create({
          data: {
            type: "BUNDLE_PURCHASE",
            userId,
            amount: bundle.price,
            paymentMethod: "PORTAL",
            status: "COMPLETED",
            metadata: {
              bundleId: bundle.id,
              bundleName: bundle.name,
              cardIds,
              fee,
              feeRate,
              portalRate: portalRate.rate,
              portalCost,
            },
          },
        });

        return { transaction, cards: updatedCards };
      });

      const pointsEarned = calculatePointsEarned(bundle.price, "PORTAL", true);
      await earnPoints({
        userId,
        amount: pointsEarned,
        type: "PURCHASE_EARN",
        description: `Bundle purchase: ${bundle.name}`,
        transactionId: result.transaction.id,
      });

      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { pointsEarned },
      });

      await logActivity(userId, "BUNDLE_PURCHASE", `Purchased ${bundle.name} (${cardIds.length} cards) with PORTAL`, { amount: bundle.price, currency: "USD", metadata: { bundleId: bundle.id, cardCount: cardIds.length, fee, portalRate: portalRate.rate } });
      await capturePortfolioSnapshot(userId);

      return NextResponse.json({
        transaction: result.transaction,
        cards: result.cards,
        pointsEarned,
      });
    }

    return NextResponse.json(
      { error: "Invalid payment method. Use STRIPE, USDC_BASE, POINTS, or PORTAL." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error purchasing bundle:", error);

    const message =
      error instanceof Error ? error.message : "Purchase failed";

    if (message.includes("Insufficient")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
