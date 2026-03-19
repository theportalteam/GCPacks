import { NextRequest, NextResponse } from "next/server";
import { getPrizes } from "@/lib/leaderboard";
import { LeaderboardPeriod } from "@prisma/client";

const VALID_PERIODS: LeaderboardPeriod[] = ["WEEKLY", "MONTHLY"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "WEEKLY").toUpperCase() as LeaderboardPeriod;

    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use WEEKLY or MONTHLY." },
        { status: 400 }
      );
    }

    const prizes = await getPrizes(period);

    return NextResponse.json({ period, prizes });
  } catch (error) {
    console.error("Leaderboard prizes API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prizes" },
      { status: 500 }
    );
  }
}
