import prisma from "@/lib/prisma";
import { LeaderboardPeriod } from "@prisma/client";

// ─── Period Helpers ──────────────────────────────────────────

/** Get the Monday 00:00 UTC → Sunday 23:59 UTC bounds for a given date */
export function getWeekBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setUTCDate(d.getUTCDate() + diff);
  const start = new Date(d);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/** Get 1st 00:00 UTC → last-day 23:59 UTC bounds for a given date */
export function getMonthBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
  return { start, end };
}

/** Get period bounds based on period type */
export function getPeriodBounds(
  period: LeaderboardPeriod,
  date: Date = new Date()
) {
  return period === "WEEKLY" ? getWeekBounds(date) : getMonthBounds(date);
}

/** Seconds remaining until the given period ends */
export function getSecondsUntilPeriodEnd(
  period: LeaderboardPeriod,
  date: Date = new Date()
): number {
  const { end } = getPeriodBounds(period, date);
  return Math.max(0, Math.floor((end.getTime() - date.getTime()) / 1000));
}

// ─── Recording ───────────────────────────────────────────────

/**
 * Record points earned by a user into both WEEKLY and MONTHLY
 * leaderboard entries for the current period. Uses upsert to
 * create or increment.
 */
export async function recordPointsForLeaderboard(
  userId: string,
  points: number
): Promise<void> {
  if (points <= 0) return;

  const now = new Date();
  const week = getWeekBounds(now);
  const month = getMonthBounds(now);

  await prisma.$transaction([
    // Weekly entry
    prisma.leaderboardEntry.upsert({
      where: {
        userId_period_periodStart: {
          userId,
          period: "WEEKLY",
          periodStart: week.start,
        },
      },
      create: {
        userId,
        period: "WEEKLY",
        periodStart: week.start,
        periodEnd: week.end,
        pointsEarned: points,
      },
      update: {
        pointsEarned: { increment: points },
      },
    }),
    // Monthly entry
    prisma.leaderboardEntry.upsert({
      where: {
        userId_period_periodStart: {
          userId,
          period: "MONTHLY",
          periodStart: month.start,
        },
      },
      create: {
        userId,
        period: "MONTHLY",
        periodStart: month.start,
        periodEnd: month.end,
        pointsEarned: points,
      },
      update: {
        pointsEarned: { increment: points },
      },
    }),
  ]);
}

// ─── Querying ────────────────────────────────────────────────

export interface LeaderboardRow {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  pointsEarned: number;
}

/**
 * Get the ranked leaderboard for a period. Returns users ordered
 * by pointsEarned descending.
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  date: Date = new Date(),
  limit = 50,
  offset = 0
): Promise<{ rows: LeaderboardRow[]; total: number }> {
  const { start } = getPeriodBounds(period, date);

  const [entries, total] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { period, periodStart: start },
      orderBy: { pointsEarned: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.leaderboardEntry.count({
      where: { period, periodStart: start },
    }),
  ]);

  const rows: LeaderboardRow[] = entries.map((e, i) => ({
    rank: offset + i + 1,
    userId: e.userId,
    userName: e.user.name,
    userImage: e.user.image,
    pointsEarned: e.pointsEarned,
  }));

  return { rows, total };
}

/**
 * Get a specific user's rank and points for the current period.
 */
export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod,
  date: Date = new Date()
): Promise<{ rank: number; pointsEarned: number } | null> {
  const { start } = getPeriodBounds(period, date);

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      userId_period_periodStart: {
        userId,
        period,
        periodStart: start,
      },
    },
  });

  if (!entry) return null;

  // Count how many users have more points
  const above = await prisma.leaderboardEntry.count({
    where: {
      period,
      periodStart: start,
      pointsEarned: { gt: entry.pointsEarned },
    },
  });

  return { rank: above + 1, pointsEarned: entry.pointsEarned };
}

/**
 * Get the prize a rank qualifies for in a given period.
 */
export async function getPrizeForRank(
  rank: number,
  period: LeaderboardPeriod
): Promise<{
  prizeType: string;
  prizeValue: number;
  prizeLabel: string;
} | null> {
  const prize = await prisma.leaderboardPrize.findFirst({
    where: {
      period,
      isActive: true,
      rankMin: { lte: rank },
      rankMax: { gte: rank },
    },
  });

  if (!prize) return null;

  return {
    prizeType: prize.prizeType,
    prizeValue: prize.prizeValue,
    prizeLabel: prize.prizeLabel,
  };
}

/**
 * Get all active prizes for a period.
 */
export async function getPrizes(period: LeaderboardPeriod) {
  return prisma.leaderboardPrize.findMany({
    where: { period, isActive: true },
    orderBy: { rankMin: "asc" },
  });
}
