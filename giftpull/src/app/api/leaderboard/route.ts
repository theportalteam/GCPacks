import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getLeaderboard,
  getUserRank,
  getPeriodBounds,
  getSecondsUntilPeriodEnd,
} from "@/lib/leaderboard";
import { LeaderboardPeriod } from "@prisma/client";

const VALID_PERIODS: LeaderboardPeriod[] = ["WEEKLY", "MONTHLY"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "WEEKLY").toUpperCase() as LeaderboardPeriod;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use WEEKLY or MONTHLY." },
        { status: 400 }
      );
    }

    const now = new Date();
    const { start, end } = getPeriodBounds(period, now);
    const secondsRemaining = getSecondsUntilPeriodEnd(period, now);

    const { rows, total } = await getLeaderboard(period, now, limit, offset);

    // If authenticated, include the user's own rank
    let myRank: { rank: number; pointsEarned: number } | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      myRank = await getUserRank(session.user.id, period, now);
    }

    return NextResponse.json({
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      secondsRemaining,
      total,
      rows,
      myRank,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
