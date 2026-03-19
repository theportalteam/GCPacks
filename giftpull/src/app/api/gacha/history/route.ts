import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

/**
 * GET /api/gacha/history?page=1&limit=20
 *
 * Returns paginated pull history for the authenticated user, along with
 * aggregate stats (total spent, total value won, best pull, total pulls).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // ── Parse query params ─────────────────────────────

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // ── Fetch pulls + total count in parallel ──────────

    const [pulls, totalPulls] = await Promise.all([
      prisma.gachaPull.findMany({
        where: { userId },
        include: {
          pack: {
            select: {
              id: true,
              tier: true,
              name: true,
              price: true,
            },
          },
          giftCard: {
            select: {
              id: true,
              brand: true,
              denomination: true,
              fmv: true,
              rarityTier: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.gachaPull.count({ where: { userId } }),
    ]);

    // ── Calculate aggregate stats ──────────────────────

    const stats = await prisma.gachaPull.aggregate({
      where: { userId },
      _sum: { cardValue: true },
      _max: { cardValue: true },
    });

    // Total spent = sum of pack prices across all the user's gacha transactions
    const spentAgg = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "GACHA_PULL",
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const totalPages = Math.ceil(totalPulls / limit);

    return NextResponse.json({
      pulls: pulls.map((p) => ({
        id: p.id,
        rarityTier: p.rarityTier,
        cardValue: p.cardValue,
        buybackOffer: p.buybackOffer,
        wasBoughtBack: p.wasBoughtBack,
        createdAt: p.createdAt,
        pack: p.pack,
        giftCard: p.giftCard,
      })),
      stats: {
        totalPulls,
        totalSpent: spentAgg._sum.amount ?? 0,
        totalValue: stats._sum.cardValue ?? 0,
        bestPull: stats._max.cardValue ?? 0,
      },
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching gacha history:", error);
    return NextResponse.json(
      { error: "Failed to fetch pull history" },
      { status: 500 }
    );
  }
}
