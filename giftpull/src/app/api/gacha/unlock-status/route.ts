import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

/**
 * GET /api/gacha/unlock-status
 *
 * Returns CC unlock status for each pack tier for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unlocks = await prisma.userPackUnlock.findMany({
      where: { userId: session.user.id },
      select: { packTier: true },
    });

    const unlockedTiers = new Set(unlocks.map((u) => u.packTier));

    return NextResponse.json({
      COMMON: unlockedTiers.has("COMMON"),
      RARE: unlockedTiers.has("RARE"),
      EPIC: unlockedTiers.has("EPIC"),
    });
  } catch (error) {
    console.error("Error fetching unlock status:", error);
    return NextResponse.json(
      { error: "Failed to fetch unlock status" },
      { status: 500 }
    );
  }
}
