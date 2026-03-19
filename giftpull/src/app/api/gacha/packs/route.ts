import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { calculateExpectedValue, countTodayPulls } from "@/lib/gacha-engine";

/**
 * GET /api/gacha/packs
 *
 * Returns all active gacha packs with their odds, expected values,
 * and (if authenticated) the user's pull counts for today.
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

    // Enrich each pack with calculated fields
    const enrichedPacks = await Promise.all(
      packs.map(async (pack) => {
        const expectedValue = calculateExpectedValue(pack.odds);

        let pullsToday = 0;
        if (userId) {
          pullsToday = await countTodayPulls(userId, pack.id);
        }

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
