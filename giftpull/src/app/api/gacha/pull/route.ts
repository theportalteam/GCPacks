import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { executeGachaPull, CCLockedError } from "@/lib/gacha-engine";
import { logActivity } from "@/lib/activity";
import { capturePortfolioSnapshot } from "@/lib/portfolio";
import type { PaymentMethod, PackTier } from "@prisma/client";

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "STRIPE",
  "USDC_BASE",
  "POINTS",
  "PORTAL",
];

const VALID_PACK_TIERS: PackTier[] = ["COMMON", "RARE", "EPIC"];

/**
 * POST /api/gacha/pull
 *
 * Execute a gacha pull.  Requires authentication.
 *
 * Body: { packTier: "COMMON" | "RARE" | "EPIC", paymentMethod: "STRIPE" | "USDC_BASE" | "POINTS" }
 *
 * - For STRIPE: returns { checkoutUrl } (user must complete payment externally)
 * - For USDC / POINTS: returns the pull result immediately
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { packTier, paymentMethod } = body;

    // ── Input validation ───────────────────────────────

    if (!packTier || !paymentMethod) {
      return NextResponse.json(
        { error: "packTier and paymentMethod are required" },
        { status: 400 }
      );
    }

    if (!VALID_PACK_TIERS.includes(packTier as PackTier)) {
      return NextResponse.json(
        {
          error: `Invalid packTier. Use one of: ${VALID_PACK_TIERS.join(", ")}`,
        },
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

    // ── Execute the pull ───────────────────────────────

    const origin =
      request.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const result = await executeGachaPull(
      userId,
      packTier as PackTier,
      paymentMethod as PaymentMethod,
      origin
    );

    await logActivity(userId, "GACHA_PULL", `Pulled ${packTier} Pack — $${result.giftCard.denomination} ${result.giftCard.brand} Gift Card (${result.rarityTier})`, { amount: result.pull.cardValue, currency: "USD", metadata: { packTier, cardBrand: result.giftCard.brand, cardValue: result.giftCard.denomination, rarity: result.rarityTier } });
    if (result.pointsEarned > 0) {
      await logActivity(userId, "POINTS_EARNED", `Earned ${result.pointsEarned} points from ${packTier} Pack pull`, { amount: result.pointsEarned, currency: "POINTS", metadata: { source: "GACHA_EARN" } });
    }
    await capturePortfolioSnapshot(userId);

    return NextResponse.json({
      pull: result.pull,
      card: {
        id: result.giftCard.id,
        brand: result.giftCard.brand,
        denomination: result.giftCard.denomination,
        code: result.giftCard.code,
        fmv: result.giftCard.fmv,
        rarityTier: result.giftCard.rarityTier,
      },
      rarityTier: result.rarityTier,
      buybackOffer: result.buybackOffer,
      pointsEarned: result.pointsEarned,
      ccJustUnlocked: result.ccJustUnlocked,
    });
  } catch (error: any) {
    // ── Stripe redirect (not a real error) ─────────────

    if (error && typeof error === "object" && "checkoutUrl" in error) {
      return NextResponse.json({ checkoutUrl: error.checkoutUrl });
    }

    // ── CC Locked error ──────────────────────────────────

    if (error instanceof CCLockedError) {
      return NextResponse.json(
        { error: "CC_LOCKED", message: error.message },
        { status: 403 }
      );
    }

    // ── Known business errors ──────────────────────────

    const message =
      error instanceof Error ? error.message : "Pull failed";

    console.error("Gacha pull error:", message);

    if (
      message.includes("not found") ||
      message.includes("unavailable")
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message.includes("Daily limit") ||
      message.includes("Insufficient") ||
      message.includes("cannot be purchased") ||
      message.includes("No cards available")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Pull failed" }, { status: 500 });
  }
}
