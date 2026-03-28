import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { earnPoints, redeemPoints } from "@/lib/points";
import { logActivity } from "@/lib/activity";
import { capturePortfolioSnapshot } from "@/lib/portfolio";
import { calculateFee } from "@/lib/fees";
import type { SellerTier, PaymentMethod } from "@prisma/client";

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["STRIPE", "USDC_BASE", "POINTS", "PORTAL"];

// Commission rates by seller tier
const COMMISSION_RATES: Record<SellerTier, number> = {
  NEW: 0.10,
  VERIFIED: 0.07,
  POWER: 0.05,
};

// Points earned per dollar spent
const POINTS_PER_DOLLAR = 1;

// Points cost multiplier (100 points = $1)
const POINTS_COST_MULTIPLIER = 100;

/**
 * POST /api/marketplace/buy
 *
 * Purchase a P2P listing. Requires authentication.
 * Body: { listingId, paymentMethod }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buyerId = session.user.id;
    const body = await request.json();
    const { listingId, paymentMethod } = body;

    // ── Input validation ───────────────────────────────
    if (!listingId || !paymentMethod) {
      return NextResponse.json(
        { error: "listingId and paymentMethod are required" },
        { status: 400 }
      );
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
      return NextResponse.json(
        {
          error: `Invalid paymentMethod. Use one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── Fetch listing with relations ───────────────────
    const listing = await prisma.p2PListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerTier: true,
          },
        },
        giftCard: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Listing is no longer available" },
        { status: 409 }
      );
    }

    if (listing.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Listing has expired" },
        { status: 409 }
      );
    }

    if (listing.sellerId === buyerId) {
      return NextResponse.json(
        { error: "You cannot buy your own listing" },
        { status: 400 }
      );
    }

    const commissionRate = COMMISSION_RATES[listing.seller.sellerTier];
    const commission = Math.round(listing.askingPrice * commissionRate * 100) / 100;
    const sellerPayout = Math.round((listing.askingPrice - commission) * 100) / 100;

    // ── STRIPE ─────────────────────────────────────────
    if (paymentMethod === "STRIPE") {
      const origin =
        request.headers.get("origin") ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";

      const checkoutSession = await createCheckoutSession({
        amount: listing.askingPrice,
        description: `P2P: ${listing.giftCard.brand} $${listing.giftCard.denomination} Gift Card`,
        metadata: {
          listingId: listing.id,
          buyerId,
          sellerId: listing.sellerId,
          type: "p2p_purchase",
        },
        successUrl: `${origin}/marketplace/${listing.id}?purchased=true`,
        cancelUrl: `${origin}/marketplace/${listing.id}`,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    }

    // ── USDC_BASE ──────────────────────────────────────
    if (paymentMethod === "USDC_BASE") {
      const result = await prisma.$transaction(async (tx) => {
        // Verify buyer has sufficient USDC balance
        const buyer = await tx.user.findUniqueOrThrow({
          where: { id: buyerId },
          select: { usdcBalance: true },
        });

        if (buyer.usdcBalance < listing.askingPrice) {
          throw new Error("Insufficient USDC balance");
        }

        // Deduct buyer's USDC balance
        await tx.user.update({
          where: { id: buyerId },
          data: { usdcBalance: { decrement: listing.askingPrice } },
        });

        // Credit seller's USDC balance (minus commission)
        await tx.user.update({
          where: { id: listing.sellerId },
          data: {
            usdcBalance: { increment: sellerPayout },
            totalSales: { increment: 1 },
          },
        });

        // Update listing status to SOLD
        const updatedListing = await tx.p2PListing.update({
          where: { id: listingId },
          data: {
            status: "SOLD",
            buyerId,
          },
        });

        // Update card status to RESERVED with buyer as owner
        const updatedCard = await tx.giftCard.update({
          where: { id: listing.giftCardId },
          data: {
            status: "RESERVED",
            currentOwnerId: buyerId,
          },
        });

        // Create buyer transaction (P2P_PURCHASE)
        const buyerTransaction = await tx.transaction.create({
          data: {
            type: "P2P_PURCHASE",
            userId: buyerId,
            giftCardId: listing.giftCardId,
            amount: listing.askingPrice,
            paymentMethod: "USDC_BASE",
            status: "COMPLETED",
          },
        });

        // Create seller transaction (P2P_SALE)
        await tx.transaction.create({
          data: {
            type: "P2P_SALE",
            userId: listing.sellerId,
            giftCardId: listing.giftCardId,
            amount: sellerPayout,
            paymentMethod: "USDC_BASE",
            status: "COMPLETED",
            metadata: {
              commission,
              commissionRate,
              listingId: listing.id,
            },
          },
        });

        return { transaction: buyerTransaction, card: updatedCard, listing: updatedListing };
      });

      // Earn points for buyer (1 point per $1 spent)
      const pointsEarned = Math.floor(listing.askingPrice * POINTS_PER_DOLLAR);
      if (pointsEarned > 0) {
        await earnPoints({
          userId: buyerId,
          amount: pointsEarned,
          type: "PURCHASE_EARN",
          description: `P2P purchase: ${listing.giftCard.brand} $${listing.giftCard.denomination}`,
          transactionId: result.transaction.id,
        });

        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: { pointsEarned },
        });
      }

      await logActivity(buyerId, "MARKETPLACE_PURCHASE", `Bought $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card from @${listing.seller.name} for $${listing.askingPrice.toFixed(2)}`, { amount: listing.askingPrice, currency: "USD", metadata: { listingId, sellerId: listing.sellerId } });
      await logActivity(listing.sellerId, "MARKETPLACE_SALE", `Sold $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card for $${listing.askingPrice.toFixed(2)}`, { amount: listing.askingPrice, currency: "USD", metadata: { listingId, buyerId, commission } });
      await capturePortfolioSnapshot(buyerId);
      await capturePortfolioSnapshot(listing.sellerId);

      return NextResponse.json({
        transaction: result.transaction,
        card: result.card,
        pointsEarned,
      });
    }

    // ── POINTS ─────────────────────────────────────────
    if (paymentMethod === "POINTS") {
      const pointsCost = Math.ceil(listing.askingPrice * POINTS_COST_MULTIPLIER);

      const result = await prisma.$transaction(async (tx) => {
        // Verify buyer has enough points
        const buyer = await tx.user.findUniqueOrThrow({
          where: { id: buyerId },
          select: { pointsBalance: true },
        });

        if (buyer.pointsBalance < pointsCost) {
          throw new Error(
            `Insufficient points: have ${buyer.pointsBalance}, need ${pointsCost}`
          );
        }

        // Update listing status to SOLD
        const updatedListing = await tx.p2PListing.update({
          where: { id: listingId },
          data: {
            status: "SOLD",
            buyerId,
          },
        });

        // Update card status to RESERVED with buyer as owner
        const updatedCard = await tx.giftCard.update({
          where: { id: listing.giftCardId },
          data: {
            status: "RESERVED",
            currentOwnerId: buyerId,
          },
        });

        // Credit seller's USDC balance (minus commission, converted from points value)
        await tx.user.update({
          where: { id: listing.sellerId },
          data: {
            usdcBalance: { increment: sellerPayout },
            totalSales: { increment: 1 },
          },
        });

        // Create buyer transaction (P2P_PURCHASE)
        const buyerTransaction = await tx.transaction.create({
          data: {
            type: "P2P_PURCHASE",
            userId: buyerId,
            giftCardId: listing.giftCardId,
            amount: 0,
            paymentMethod: "POINTS",
            status: "COMPLETED",
            metadata: { pointsCost },
          },
        });

        // Create seller transaction (P2P_SALE)
        await tx.transaction.create({
          data: {
            type: "P2P_SALE",
            userId: listing.sellerId,
            giftCardId: listing.giftCardId,
            amount: sellerPayout,
            paymentMethod: "POINTS",
            status: "COMPLETED",
            metadata: {
              commission,
              commissionRate,
              listingId: listing.id,
            },
          },
        });

        return { transaction: buyerTransaction, card: updatedCard, listing: updatedListing };
      });

      // Deduct points from buyer
      await redeemPoints({
        userId: buyerId,
        amount: pointsCost,
        description: `P2P purchase: ${listing.giftCard.brand} $${listing.giftCard.denomination}`,
      });

      await logActivity(buyerId, "MARKETPLACE_PURCHASE", `Bought $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card with points`, { amount: listing.askingPrice, currency: "POINTS", metadata: { listingId, sellerId: listing.sellerId, pointsCost } });
      await logActivity(listing.sellerId, "MARKETPLACE_SALE", `Sold $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card for $${listing.askingPrice.toFixed(2)}`, { amount: listing.askingPrice, currency: "USD", metadata: { listingId, buyerId, commission } });
      await capturePortfolioSnapshot(buyerId);
      await capturePortfolioSnapshot(listing.sellerId);

      return NextResponse.json({
        transaction: result.transaction,
        card: result.card,
        pointsEarned: 0,
      });
    }

    // ── PORTAL ────────────────────────────────────────
    if (paymentMethod === "PORTAL") {
      const { fee: buyerFee, total: buyerTotal, feeRate: buyerFeeRate } = calculateFee(listing.askingPrice, "PORTAL");

      const portalRate = await prisma.portalRate.findFirst({
        orderBy: { lockedAt: "desc" },
      });
      if (!portalRate) {
        return NextResponse.json({ error: "PORTAL rate not available" }, { status: 400 });
      }

      const portalCost = Math.round((buyerTotal / portalRate.rate) * 100) / 100;

      const result = await prisma.$transaction(async (tx) => {
        const buyer = await tx.user.findUniqueOrThrow({
          where: { id: buyerId },
          select: { portalBalance: true },
        });

        if (buyer.portalBalance < portalCost) {
          throw new Error("Insufficient PORTAL balance");
        }

        await tx.user.update({
          where: { id: buyerId },
          data: { portalBalance: { decrement: portalCost } },
        });

        // Seller still receives USDC payout
        await tx.user.update({
          where: { id: listing.sellerId },
          data: {
            usdcBalance: { increment: sellerPayout },
            totalSales: { increment: 1 },
          },
        });

        const updatedListing = await tx.p2PListing.update({
          where: { id: listingId },
          data: { status: "SOLD", buyerId },
        });

        const updatedCard = await tx.giftCard.update({
          where: { id: listing.giftCardId },
          data: { status: "RESERVED", currentOwnerId: buyerId },
        });

        const buyerTransaction = await tx.transaction.create({
          data: {
            type: "P2P_PURCHASE",
            userId: buyerId,
            giftCardId: listing.giftCardId,
            amount: listing.askingPrice,
            paymentMethod: "PORTAL",
            status: "COMPLETED",
            metadata: { buyerFee, buyerFeeRate, portalRate: portalRate.rate, portalCost },
          },
        });

        await tx.transaction.create({
          data: {
            type: "P2P_SALE",
            userId: listing.sellerId,
            giftCardId: listing.giftCardId,
            amount: sellerPayout,
            paymentMethod: "PORTAL",
            status: "COMPLETED",
            metadata: { commission, commissionRate, listingId: listing.id },
          },
        });

        return { transaction: buyerTransaction, card: updatedCard, listing: updatedListing };
      });

      const pointsEarned = Math.floor(listing.askingPrice * POINTS_PER_DOLLAR);
      if (pointsEarned > 0) {
        await earnPoints({
          userId: buyerId,
          amount: pointsEarned,
          type: "PURCHASE_EARN",
          description: `P2P purchase: ${listing.giftCard.brand} $${listing.giftCard.denomination}`,
          transactionId: result.transaction.id,
        });

        await prisma.transaction.update({
          where: { id: result.transaction.id },
          data: { pointsEarned },
        });
      }

      await logActivity(buyerId, "MARKETPLACE_PURCHASE", `Bought $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card with PORTAL`, { amount: listing.askingPrice, currency: "USD", metadata: { listingId, sellerId: listing.sellerId, buyerFee, portalRate: portalRate.rate } });
      await logActivity(listing.sellerId, "MARKETPLACE_SALE", `Sold $${listing.giftCard.denomination} ${listing.giftCard.brand} Gift Card for $${listing.askingPrice.toFixed(2)}`, { amount: listing.askingPrice, currency: "USD", metadata: { listingId, buyerId, commission } });
      await capturePortfolioSnapshot(buyerId);
      await capturePortfolioSnapshot(listing.sellerId);

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
    console.error("Error purchasing listing:", error);

    const message =
      error instanceof Error ? error.message : "Purchase failed";

    if (message.includes("Insufficient")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
