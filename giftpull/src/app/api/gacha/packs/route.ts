import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { calculateExpectedValue, countTodayPulls } from "@/lib/gacha-engine";

/**
 * GET /api/gacha/packs
 *
 * Returns all active gacha packs with their odds, expected values,
 * CC unlock status, pool stats, recent pulls, and top hits.
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.id;

    // Fetch all active packs with their odds tables
    const packs = await prisma.gachaPack.findMany({
      where: { isActive: true },
      include: {
        odds: {
          orderBy: { weight: "desc" },
        },
      },
      orderBy: { price: "asc" },
    });

    // Fetch CC unlock status for authenticated user
    let unlocks: Set<string> = new Set();
    if (userId) {
      const userUnlocks = await prisma.userPackUnlock.findMany({
        where: { userId },
        select: { packTier: true },
      });
      unlocks = new Set(userUnlocks.map((u) => u.packTier));
    }

    // Enrich each pack with calculated fields
    const enrichedPacks = await Promise.all(
      packs.map(async (pack) => {
        const expectedValue = calculateExpectedValue(pack.odds);

        let pullsToday = 0;
        if (userId) {
          pullsToday = await countTodayPulls(userId, pack.id);
        }

        // Pool stats: count cards by rarity for this tier's denominations
        const cardValues = pack.odds.map((o) => o.cardValue);
        const poolCards = await prisma.giftCard.groupBy({
          by: ["rarityTier"],
          where: {
            status: "AVAILABLE",
            denomination: { in: cardValues },
          },
          _count: true,
        });
        const totalPoolCards = poolCards.reduce((sum, g) => sum + g._count, 0);
        const cardsByRarity: Record<string, number> = {};
        for (const g of poolCards) {
          if (g.rarityTier) {
            cardsByRarity[g.rarityTier] = g._count;
          }
        }

        // Recent pulls for this pack (last 10)
        const recentPulls = await prisma.gachaPull.findMany({
          where: { packId: pack.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            giftCard: {
              select: { brand: true, denomination: true },
            },
            user: {
              select: { name: true },
            },
          },
        });

        // Top hits: notable recent legendary/epic pulls
        const topHits = await prisma.gachaPull.findMany({
          where: {
            packId: pack.id,
            rarityTier: { in: ["LEGENDARY", "EPIC"] },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            giftCard: {
              select: { brand: true, denomination: true },
            },
            user: {
              select: { name: true },
            },
          },
        });

        return {
          id: pack.id,
          tier: pack.tier,
          name: pack.name,
          description: pack.description,
          price: pack.price,
          pointsCost: pack.pointsCost,
          dailyLimit: pack.dailyLimit,
          odds: pack.odds.map((o) => ({
            rarityTier: o.rarityTier,
            cardValue: o.cardValue,
            weight: o.weight,
          })),
          expectedValue,
          pullsToday,
          pullsRemaining: Math.max(0, pack.dailyLimit - pullsToday),
          ccUnlocked: unlocks.has(pack.tier),
          poolStats: {
            totalCards: totalPoolCards,
            cardsByRarity,
          },
          recentPulls: recentPulls.map((p) => ({
            id: p.id,
            rarityTier: p.rarityTier,
            cardValue: p.cardValue,
            brand: p.giftCard.brand,
            denomination: p.giftCard.denomination,
            userName: p.user.name || "Anonymous",
            createdAt: p.createdAt.toISOString(),
          })),
          topHits: topHits.map((p) => ({
            id: p.id,
            rarityTier: p.rarityTier,
            cardValue: p.cardValue,
            brand: p.giftCard.brand,
            denomination: p.giftCard.denomination,
            userName: p.user.name || "Anonymous",
            createdAt: p.createdAt.toISOString(),
          })),
        };
      })
    );

    return NextResponse.json({ packs: enrichedPacks });
  } catch (error) {
    console.error("Error fetching gacha packs:", error);
    return NextResponse.json(
      { error: "Failed to fetch packs" },
      { status: 500 }
    );
  }
}
