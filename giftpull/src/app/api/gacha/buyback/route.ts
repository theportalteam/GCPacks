import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { executeBuyback } from "@/lib/buyback";

/**
 * POST /api/gacha/buyback
 *
 * Instantly sell back a recently pulled gift card for 95% of its FMV.
 * Requires authentication. The card must be RESERVED and owned by the caller.
 *
 * Body: { giftCardId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { giftCardId } = body;

    if (!giftCardId) {
      return NextResponse.json(
        { error: "giftCardId is required" },
        { status: 400 }
      );
    }

    const result = await executeBuyback(userId, giftCardId);

    return NextResponse.json({
      buybackAmount: result.buybackAmount,
      newUsdcBalance: result.newUsdcBalance,
      cardRecycled: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Buyback failed";

    console.error("Buyback error:", message);

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message.includes("do not own") ||
      message.includes("Only recently pulled")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Buyback failed" }, { status: 500 });
  }
}
