"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Medal,
  Star,
  Clock,
  Coins,
  Gift,
  ChevronUp,
  ChevronDown,
  Minus,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Zap,
  Calendar,
  Users,
  Repeat,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, formatPoints } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────

type Period = "WEEKLY" | "MONTHLY";

interface LeaderboardRow {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  pointsEarned: number;
}

interface LeaderboardData {
  period: Period;
  periodStart: string;
  periodEnd: string;
  secondsRemaining: number;
  total: number;
  rows: LeaderboardRow[];
  myRank: { rank: number; pointsEarned: number } | null;
}

interface Prize {
  id: string;
  period: Period;
  rankMin: number;
  rankMax: number;
  prizeType: string;
  prizeValue: number;
  prizeLabel: string;
}

// ─── Helpers ────────────────────────────────────────────────

function formatCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return null;
}

function getRankStyle(rank: number): string {
  if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40";
  if (rank === 2) return "bg-gradient-to-r from-gray-400/15 to-gray-300/15 border-gray-400/30";
  if (rank === 3) return "bg-gradient-to-r from-amber-700/15 to-amber-600/15 border-amber-600/30";
  return "border-bg-border";
}

// ─── Component ──────────────────────────────────────────────

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>("WEEKLY");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const [lbRes, prizeRes] = await Promise.all([
        fetch(`/api/leaderboard?period=${period}`),
        fetch(`/api/leaderboard/prizes?period=${period}`),
      ]);

      if (lbRes.ok) {
        const lbData: LeaderboardData = await lbRes.json();
        setData(lbData);
        setCountdown(lbData.secondsRemaining);
      }

      if (prizeRes.ok) {
        const prizeData = await prizeRes.json();
        setPrizes(prizeData.prizes);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer (ticks every second)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Track rank changes for animation
  useEffect(() => {
    if (!data) return;
    const newRanks = new Map<string, number>();
    data.rows.forEach((r) => newRanks.set(r.userId, r.rank));
    prevRanksRef.current = newRanks;
  }, [data]);

  const getRankChange = (userId: string, currentRank: number) => {
    const prev = prevRanksRef.current.get(userId);
    if (prev === undefined) return 0;
    return prev - currentRank; // positive = moved up
  };

  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-bg-surface to-warning/10 border-b border-bg-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-10 h-10 text-warning" />
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-warning via-primary to-epic bg-clip-text text-transparent">
                Leaderboard
              </h1>
            </div>
            <p className="text-text-secondary max-w-lg">
              Earn points through purchases, gacha pulls, daily logins, and referrals.
              Top players win gift cards and bonus points every period!
            </p>

            {/* My Rank Summary */}
            {data?.myRank && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mt-2 px-6 py-3 bg-bg-surface/80 rounded-xl border border-primary/30 backdrop-blur-sm"
              >
                <div className="text-center">
                  <p className="text-xs text-text-secondary">Your Rank</p>
                  <p className="text-2xl font-bold text-primary">#{data.myRank.rank}</p>
                </div>
                <div className="w-px h-10 bg-bg-border" />
                <div className="text-center">
                  <p className="text-xs text-text-secondary">Points Earned</p>
                  <p className="text-2xl font-bold text-warning">
                    {formatPoints(data.myRank.pointsEarned)}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Period Tabs + Countdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-bg-surface rounded-xl border border-bg-border p-1">
            {(["WEEKLY", "MONTHLY"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  period === p
                    ? "bg-primary text-white shadow-md"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                {p === "WEEKLY" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>

          {countdown > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-bg-surface rounded-xl border border-bg-border">
              <Clock className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Ends in</span>
              <span className="text-sm font-bold text-primary font-mono">
                {formatCountdown(countdown)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Prize Table + Points Explainer */}
          <div className="space-y-6">
            {/* Prize Table */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-warning" />
                <h2 className="text-lg font-bold text-text-primary">
                  {period === "WEEKLY" ? "Weekly" : "Monthly"} Prizes
                </h2>
              </div>
              <div className="space-y-2">
                {prizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-elevated/50"
                  >
                    <div className="flex items-center gap-2">
                      {prize.rankMin === 1 && prize.rankMax === 1 ? (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      ) : prize.prizeType === "GIFT_CARD" ? (
                        <Gift className="w-4 h-4 text-success" />
                      ) : (
                        <Star className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm text-text-primary font-medium">
                        {prize.rankMin === prize.rankMax
                          ? `#${prize.rankMin}`
                          : `#${prize.rankMin}-${prize.rankMax}`}
                      </span>
                    </div>
                    <Badge
                      variant={prize.prizeType === "GIFT_CARD" ? "success" : "brand"}
                      size="sm"
                    >
                      {prize.prizeLabel}
                    </Badge>
                  </div>
                ))}
                {prizes.length === 0 && !loading && (
                  <p className="text-sm text-text-secondary text-center py-4">
                    No prizes configured yet
                  </p>
                )}
              </div>
            </Card>

            {/* Points Explainer */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text-primary">How to Earn</h2>
              </div>
              <div className="space-y-3">
                {[
                  { icon: ShoppingBag, label: "Storefront Purchase", value: "1 pt / $1", color: "text-success" },
                  { icon: Zap, label: "Gacha Pull", value: "2 pts / $1", color: "text-epic" },
                  { icon: Users, label: "P2P Sale", value: "0.5 pts / $1", color: "text-primary" },
                  { icon: Calendar, label: "Daily Login", value: "5 pts", color: "text-warning" },
                  { icon: Repeat, label: "Referral", value: "100 pts", color: "text-success" },
                  { icon: TrendingUp, label: "USDC Bonus", value: "1.25x", color: "text-primary" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      <span className="text-sm text-text-secondary">{item.label}</span>
                    </div>
                    <span className={cn("text-sm font-semibold", item.color)}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Leaderboard Table */}
          <div className="lg:col-span-2">
            <Card padding="sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" />
                  <h2 className="text-lg font-bold text-text-primary">Rankings</h2>
                </div>
                {data && (
                  <span className="text-sm text-text-secondary">
                    {data.total} players
                  </span>
                )}
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-bg-border/50">
                <div className="col-span-2">Rank</div>
                <div className="col-span-7">Player</div>
                <div className="col-span-3 text-right">Points</div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-14 bg-bg-elevated rounded-lg animate-pulse" />
                  ))}
                </div>
              )}

              {/* Leaderboard Rows */}
              {!loading && data && (
                <div className="divide-y divide-bg-border/30">
                  <AnimatePresence mode="popLayout">
                    {data.rows.map((row) => {
                      const isMe = row.userId === myUserId;
                      const rankChange = getRankChange(row.userId, row.rank);

                      return (
                        <motion.div
                          key={row.userId}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "grid grid-cols-12 gap-2 px-4 py-3 items-center border-l-2 transition-colors",
                            isMe
                              ? "bg-primary/10 border-l-primary"
                              : getRankStyle(row.rank),
                            !isMe && row.rank > 3 && "border-l-transparent"
                          )}
                        >
                          {/* Rank */}
                          <div className="col-span-2 flex items-center gap-2">
                            {getRankIcon(row.rank) || (
                              <span className="text-lg font-bold text-text-secondary w-5 text-center">
                                {row.rank}
                              </span>
                            )}
                            {row.rank <= 3 && (
                              <span className="text-lg font-bold text-text-primary">
                                {row.rank}
                              </span>
                            )}
                            {/* Rank change indicator */}
                            {rankChange > 0 && (
                              <ChevronUp className="w-3 h-3 text-success" />
                            )}
                            {rankChange < 0 && (
                              <ChevronDown className="w-3 h-3 text-danger" />
                            )}
                            {rankChange === 0 && row.rank <= 10 && (
                              <Minus className="w-3 h-3 text-text-secondary/30" />
                            )}
                          </div>

                          {/* Player */}
                          <div className="col-span-7 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                              {(row.userName || "?")[0]?.toUpperCase()}
                            </div>
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                isMe ? "text-primary" : "text-text-primary"
                              )}
                            >
                              {row.userName || "Anonymous"}
                              {isMe && (
                                <span className="ml-2 text-xs text-primary/70">(You)</span>
                              )}
                            </span>
                          </div>

                          {/* Points */}
                          <div className="col-span-3 text-right">
                            <span className="text-sm font-bold text-warning">
                              {formatPoints(row.pointsEarned)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Empty State */}
              {!loading && data && data.rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                  <Trophy className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No rankings yet</p>
                  <p className="text-sm">Start earning points to climb the leaderboard!</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
