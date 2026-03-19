import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { executeGachaPull } from "@/lib/gacha-engine";
import type { PaymentMethod } from "@prisma/client";

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "STRIPE",
  "USDC_BASE",
  "POINTS",
];

/**
 * POST /api/gacha/pull
 *
 * Execute a gacha pull.  Requires authentication.
 *
 * Body: { packId: string, paymentMethod: "STRIPE" | "USDC_BASE" | "POINTS" }
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
    const { packId, paymentMethod } = body;

    // ── Input validation ───────────────────────────────

    if (!packId || !paymentMethod) {
      return NextResponse.json(
        { error: "packId and paymentMethod are required" },
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
      packId,
      paymentMethod as PaymentMethod,
      origin
    );

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
    });
  } catch (error: any) {
    // ── Stripe redirect (not a real error) ─────────────

    if (error && typeof error === "object" && "checkoutUrl" in error) {
      return NextResponse.json({ checkoutUrl: error.checkoutUrl });
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
