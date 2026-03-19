"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  History,
  DollarSign,
  TrendingUp,
  Trophy,
  Hash,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatCurrency,
  getRarityColor,
  getBrandDisplayName,
  getBrandColor,
} from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface PullHistoryEntry {
  id: string;
  createdAt: string;
  packTier: string;
  rarity: string;
  brand: string;
  denomination: number;
  pricePaid: number;
  boughtBack: boolean;
  buybackAmount: number | null;
}

interface HistoryStats {
  totalSpent: number;
  totalValue: number;
  bestPullValue: number;
  totalPulls: number;
}

interface HistoryResponse {
  pulls: PullHistoryEntry[];
  stats: HistoryStats;
  page: number;
  totalPages: number;
  total: number;
}

const tierBadgeVariant: Record<string, string> = {
  COMMON: "success",
  RARE: "brand",
  EPIC: "epic",
};

const rarityBadgeVariant: Record<string, string> = {
  COMMON: "default",
  UNCOMMON: "success",
  RARE: "brand",
  EPIC: "epic",
  LEGENDARY: "legendary",
};

// Skeleton for loading
function StatSkeleton() {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-card p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-bg-elevated rounded-lg" />
        <div className="h-3 w-20 bg-bg-elevated rounded" />
      </div>
      <div className="h-8 w-24 bg-bg-elevated rounded" />
    </div>
  );
}

function PullSkeleton() {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-card p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bg-elevated rounded-lg" />
          <div>
            <div className="h-4 w-28 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-20 bg-bg-elevated rounded" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-5 w-16 bg-bg-elevated rounded mb-2" />
          <div className="h-3 w-12 bg-bg-elevated rounded" />
        </div>
      </div>
    </div>
  );
}

// Mock data for development
const MOCK_STATS: HistoryStats = {
  totalSpent: 245.0,
  totalValue: 312.5,
  bestPullValue: 100.0,
  totalPulls: 18,
};

const MOCK_PULLS: PullHistoryEntry[] = [
  {
    id: "1",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    packTier: "RARE",
    rarity: "RARE",
    brand: "STEAM",
    denomination: 25,
    pricePaid: 25,
    boughtBack: false,
    buybackAmount: null,
  },
  {
    id: "2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    packTier: "EPIC",
    rarity: "EPIC",
    brand: "XBOX",
    denomination: 100,
    pricePaid: 75,
    boughtBack: true,
    buybackAmount: 95.00,
  },
  {
    id: "3",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    packTier: "EPIC",
    rarity: "LEGENDARY",
    brand: "PLAYSTATION",
    denomination: 200,
    pricePaid: 75,
    boughtBack: false,
    buybackAmount: null,
  },
  {
    id: "4",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    packTier: "COMMON",
    rarity: "COMMON",
    brand: "AMAZON",
    denomination: 5,
    pricePaid: 10,
    boughtBack: true,
    buybackAmount: 4.75,
  },
  {
    id: "5",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    packTier: "RARE",
    rarity: "UNCOMMON",
    brand: "SPOTIFY",
    denomination: 15,
    pricePaid: 25,
    boughtBack: false,
    buybackAmount: null,
  },
];

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [pulls, setPulls] = useState<PullHistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch history
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gacha/history?page=${page}&limit=10`);
        if (!res.ok) throw new Error("Failed to load history");
        const data: HistoryResponse = await res.json();
        if (!cancelled) {
          setPulls(data.pulls);
          setStats(data.stats);
          setTotalPages(data.totalPages);
        }
      } catch {
        // Fallback mock data
        if (!cancelled) {
          setPulls(MOCK_PULLS);
          setStats(MOCK_STATS);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {/* Back button */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <a
            href="/gacha"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Packs
          </a>
        </motion.div>

        {/* Header */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <History className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary">
              Pull History
            </h1>
            <p className="text-sm text-text-secondary">
              Your gacha pack results and stats
            </p>
          </div>
        </motion.div>

        {/* Stats cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card variant="default" padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    Total Spent
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-text-primary">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card variant="default" padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    Total Value
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-success">
                  {formatCurrency(stats.totalValue)}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card variant="default" padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-warning" />
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    Best Pull
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-warning">
                  {formatCurrency(stats.bestPullValue)}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card variant="default" padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-epic/10 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-epic" />
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    Total Pulls
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-text-primary">
                  {stats.totalPulls}
                </p>
              </Card>
            </motion.div>
          </div>
        ) : null}

        {/* Profit/Loss indicator */}
        {stats && stats.totalPulls > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                stats.totalValue >= stats.totalSpent
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              {stats.totalValue >= stats.totalSpent ? "+" : ""}
              {formatCurrency(stats.totalValue - stats.totalSpent)} net (
              {(((stats.totalValue - stats.totalSpent) / stats.totalSpent) * 100).toFixed(1)}
              %)
            </div>
          </motion.div>
        )}

        {/* Pull list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <PullSkeleton key={i} />
            ))}
          </div>
        ) : pulls.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              variant="default"
              padding="lg"
              className="text-center py-16"
            >
              <Sparkles className="w-12 h-12 text-epic/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">
                No pulls yet
              </h3>
              <p className="text-text-secondary text-sm mb-6">
                Try your luck with a gacha pack!
              </p>
              <a href="/gacha">
                <Button variant="primary" size="md">
                  Open Packs
                </Button>
              </a>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {pulls.map((pull, i) => {
              const rarityColor = getRarityColor(pull.rarity);
              const brandColor = getBrandColor(pull.brand);
              const brandName = getBrandDisplayName(pull.brand);
              const profit = pull.denomination - pull.pricePaid;

              return (
                <motion.div
                  key={pull.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Card
                    variant="default"
                    padding="md"
                    className="hover:border-bg-border/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: brand icon + details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${brandColor}20` }}
                        >
                          <span
                            className="text-xs font-bold"
                            style={{ color: brandColor }}
                          >
                            {brandName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-text-primary truncate">
                              {brandName}{" "}
                              {formatCurrency(pull.denomination)}
                            </span>
                            <Badge
                              variant={
                                (rarityBadgeVariant[pull.rarity] ||
                                  "default") as any
                              }
                              size="sm"
                            >
                              {pull.rarity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <Badge
                              variant={
                                (tierBadgeVariant[pull.packTier] ||
                                  "default") as any
                              }
                              size="sm"
                            >
                              {pull.packTier}
                            </Badge>
                            <span>{formatDate(pull.createdAt)}</span>
                            {pull.boughtBack && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-elevated text-text-secondary border border-bg-border">
                                Bought Back
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: value + profit */}
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-text-primary">
                          {formatCurrency(pull.denomination)}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            profit >= 0
                              ? "text-success"
                              : "text-red-400"
                          )}
                        >
                          {profit >= 0 ? "+" : ""}
                          {formatCurrency(profit)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="flex items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
