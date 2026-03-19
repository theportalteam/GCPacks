"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

interface OddsEntry {
  id: string;
  packId: string;
  rarityTier: string;
  cardValue: number;
  weight: number;
}

interface GachaPack {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price: number;
  pointsCost: number | null;
  dailyLimit: number;
  isActive: boolean;
  totalPulls: number;
  expectedValue: number;
  odds: OddsEntry[];
}

// ── Rarity colors ──────────────────────────────────────

const rarityColors: Record<string, string> = {
  COMMON: "#6B7280",
  UNCOMMON: "#10B981",
  RARE: "#3B82F6",
  EPIC: "#8B5CF6",
  LEGENDARY: "#F59E0B",
};

const tierColors: Record<string, string> = {
  COMMON: "#10B981",
  RARE: "#3B82F6",
  EPIC: "#8B5CF6",
};

// ── Page Component ─────────────────────────────────────

function GachaConfigContent() {
  const [packs, setPacks] = useState<GachaPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [killSwitching, setKillSwitching] = useState(false);

  // Editable state — keyed by odds ID
  const [editedWeights, setEditedWeights] = useState<Record<string, string>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Pack-level edits
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [editedLimits, setEditedLimits] = useState<Record<string, string>>({});

  // ── Fetch packs ────────────────────────────────────
  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/gacha");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPacks(data.packs);
    } catch {
      console.error("Failed to load gacha config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  // ── Calculate live EV from edited weights ──────────
  const calculateEV = (pack: GachaPack) => {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const odd of pack.odds) {
      const w = editedWeights[odd.id] !== undefined
        ? parseFloat(editedWeights[odd.id]) || 0
        : odd.weight;
      const v = editedValues[odd.id] !== undefined
        ? parseFloat(editedValues[odd.id]) || 0
        : odd.cardValue;
      totalWeight += w;
      weightedSum += w * v;
    }

    return totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : 0;
  };

  // ── Toggle active ──────────────────────────────────
  const handleToggleActive = async (packId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/gacha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId,
          updates: { isActive: !isActive },
        }),
      });

      if (res.ok) {
        setPacks((prev) =>
          prev.map((p) =>
            p.id === packId ? { ...p, isActive: !isActive } : p
          )
        );
      }
    } catch {
      // ignore
    }
  };

  // ── Kill switch ────────────────────────────────────
  const handleKillSwitch = async () => {
    const allActive = packs.every((p) => p.isActive);
    setKillSwitching(true);
    try {
      const res = await fetch("/api/admin/gacha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killSwitch: !allActive }),
      });

      if (res.ok) {
        setPacks((prev) =>
          prev.map((p) => ({ ...p, isActive: !allActive }))
        );
      }
    } catch {
      // ignore
    } finally {
      setKillSwitching(false);
    }
  };

  // ── Save changes for a pack ────────────────────────
  const handleSaveChanges = async (pack: GachaPack) => {
    setSaving(pack.id);
    try {
      // Save pack-level changes
      const priceStr = editedPrices[pack.id];
      const limitStr = editedLimits[pack.id];
      const updates: any = {};

      if (priceStr !== undefined) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) updates.price = price;
      }
      if (limitStr !== undefined) {
        const limit = parseInt(limitStr, 10);
        if (!isNaN(limit) && limit >= 0) updates.dailyLimit = limit;
      }

      if (Object.keys(updates).length > 0) {
        await fetch("/api/admin/gacha", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId: pack.id, updates }),
        });
      }

      // Save odds-level changes
      for (const odd of pack.odds) {
        const weightStr = editedWeights[odd.id];
        const valueStr = editedValues[odd.id];
        const oddsUpdate: any = {};

        if (weightStr !== undefined) {
          const w = parseFloat(weightStr);
          if (!isNaN(w) && w >= 0) oddsUpdate.weight = w;
        }
        if (valueStr !== undefined) {
          const v = parseFloat(valueStr);
          if (!isNaN(v) && v >= 0) oddsUpdate.cardValue = v;
        }

        if (Object.keys(oddsUpdate).length > 0) {
          await fetch("/api/admin/gacha", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oddsId: odd.id, ...oddsUpdate }),
          });
        }
      }

      // Refresh
      await fetchPacks();

      // Clear local edits for this pack
      setEditedPrices((prev) => {
        const next = { ...prev };
        delete next[pack.id];
        return next;
      });
      setEditedLimits((prev) => {
        const next = { ...prev };
        delete next[pack.id];
        return next;
      });
      for (const odd of pack.odds) {
        setEditedWeights((prev) => {
          const next = { ...prev };
          delete next[odd.id];
          return next;
        });
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[odd.id];
          return next;
        });
      }
    } catch {
      console.error("Failed to save changes");
    } finally {
      setSaving(null);
    }
  };

  // ── Check if pack has edits ────────────────────────
  const hasEdits = (pack: GachaPack) => {
    if (editedPrices[pack.id] !== undefined) return true;
    if (editedLimits[pack.id] !== undefined) return true;
    for (const odd of pack.odds) {
      if (editedWeights[odd.id] !== undefined) return true;
      if (editedValues[odd.id] !== undefined) return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading gacha config...</p>
        </div>
      </div>
    );
  }

  const allActive = packs.length > 0 && packs.every((p) => p.isActive);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Gacha Configuration</h1>
            <p className="text-text-secondary text-sm mt-1">
              Manage pack pricing, odds, and activation
            </p>
          </div>

          {/* Kill Switch */}
          <Button
            variant="danger"
            size="lg"
            loading={killSwitching}
            onClick={handleKillSwitch}
            className="shadow-lg shadow-red-600/20"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 0A9 9 0 005.636 18.364" />
            </svg>
            {allActive ? "Pause All Gacha" : "Activate All Gacha"}
          </Button>
        </div>

        {/* ── EV Monitor ─────────────────────────────── */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">EV Monitor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packs.map((pack) => {
              const liveEV = calculateEV(pack);
              const evRatio = pack.price > 0 ? (liveEV / pack.price) * 100 : 0;
              const isHealthy = evRatio >= 60 && evRatio <= 95;

              return (
                <div
                  key={`ev-${pack.id}`}
                  className="p-4 rounded-xl bg-surface-light"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: tierColors[pack.tier] || "#3B82F6" }}
                    >
                      {pack.name}
                    </span>
                    <Badge
                      variant={isHealthy ? "success" : "warning"}
                      size="sm"
                    >
                      {evRatio.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-text-primary">
                      {formatCurrency(liveEV)}
                    </span>
                    <span className="text-xs text-text-secondary">
                      EV / {formatCurrency(pack.price)} price
                    </span>
                  </div>
                  <div className="w-full h-2 bg-background rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(evRatio, 100)}%`,
                        backgroundColor: isHealthy ? "#10B981" : "#F59E0B",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Pack Cards ─────────────────────────────── */}
        <div className="space-y-4">
          {packs.map((pack) => {
            const isExpanded = expandedPack === pack.id;
            const liveEV = calculateEV(pack);
            const currentPrice = editedPrices[pack.id] !== undefined
              ? parseFloat(editedPrices[pack.id]) || pack.price
              : pack.price;
            const currentLimit = editedLimits[pack.id] !== undefined
              ? parseInt(editedLimits[pack.id], 10) || pack.dailyLimit
              : pack.dailyLimit;

            return (
              <Card key={pack.id} padding="sm">
                {/* Pack header row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-light/30 transition-colors rounded-xl"
                  onClick={() =>
                    setExpandedPack(isExpanded ? null : pack.id)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                      style={{
                        backgroundColor: tierColors[pack.tier] || "#3B82F6",
                      }}
                    >
                      {pack.tier[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-text-primary">
                          {pack.name}
                        </h3>
                        <Badge variant={pack.tier === "EPIC" ? "epic" : pack.tier === "RARE" ? "brand" : "success"} size="sm">
                          {pack.tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {formatCurrency(pack.price)} -- Limit: {pack.dailyLimit}/day -- {pack.totalPulls} total pulls
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Active toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(pack.id, pack.isActive);
                      }}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors",
                        pack.isActive ? "bg-[#10B981]" : "bg-surface-light"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                          pack.isActive ? "translate-x-6" : "translate-x-0.5"
                        )}
                      />
                    </button>
                    <span className="text-xs text-text-secondary w-12">
                      {pack.isActive ? "Active" : "Paused"}
                    </span>

                    {/* Expand chevron */}
                    <svg
                      className={cn(
                        "w-5 h-5 text-text-secondary transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border-subtle mt-2">
                    {/* Pack settings row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <Input
                        label="Price ($)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          editedPrices[pack.id] !== undefined
                            ? editedPrices[pack.id]
                            : String(pack.price)
                        }
                        onChange={(e) =>
                          setEditedPrices((prev) => ({
                            ...prev,
                            [pack.id]: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Daily Limit"
                        type="number"
                        min="0"
                        value={
                          editedLimits[pack.id] !== undefined
                            ? editedLimits[pack.id]
                            : String(pack.dailyLimit)
                        }
                        onChange={(e) =>
                          setEditedLimits((prev) => ({
                            ...prev,
                            [pack.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-col justify-center">
                        <p className="text-xs text-text-secondary mb-1">Live EV</p>
                        <p className="text-xl font-bold text-text-primary">
                          {formatCurrency(liveEV)}
                          <span className="text-xs text-text-secondary ml-2">
                            ({currentPrice > 0 ? ((liveEV / currentPrice) * 100).toFixed(1) : 0}% of price)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Odds table */}
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left text-xs text-text-secondary font-semibold uppercase tracking-wider px-3 py-2">Rarity</th>
                            <th className="text-right text-xs text-text-secondary font-semibold uppercase tracking-wider px-3 py-2">Weight</th>
                            <th className="text-right text-xs text-text-secondary font-semibold uppercase tracking-wider px-3 py-2">Probability</th>
                            <th className="text-right text-xs text-text-secondary font-semibold uppercase tracking-wider px-3 py-2">Card Value</th>
                            <th className="text-right text-xs text-text-secondary font-semibold uppercase tracking-wider px-3 py-2">Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pack.odds.map((odd) => {
                            const w = editedWeights[odd.id] !== undefined
                              ? parseFloat(editedWeights[odd.id]) || 0
                              : odd.weight;
                            const v = editedValues[odd.id] !== undefined
                              ? parseFloat(editedValues[odd.id]) || 0
                              : odd.cardValue;
                            const totalW = pack.odds.reduce((sum, o) => {
                              const ow = editedWeights[o.id] !== undefined
                                ? parseFloat(editedWeights[o.id]) || 0
                                : o.weight;
                              return sum + ow;
                            }, 0);
                            const prob = totalW > 0 ? (w / totalW) * 100 : 0;
                            const contribution = totalW > 0 ? (w / totalW) * v : 0;

                            return (
                              <tr
                                key={odd.id}
                                className="border-b border-border-subtle/50"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        backgroundColor:
                                          rarityColors[odd.rarityTier] || "#6B7280",
                                      }}
                                    />
                                    <span className="text-sm font-medium text-text-primary">
                                      {odd.rarityTier}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    className="w-24 text-right bg-surface-light border border-border-subtle rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={
                                      editedWeights[odd.id] !== undefined
                                        ? editedWeights[odd.id]
                                        : String(odd.weight)
                                    }
                                    onChange={(e) =>
                                      setEditedWeights((prev) => ({
                                        ...prev,
                                        [odd.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-sm text-text-secondary text-right font-mono">
                                  {prob.toFixed(1)}%
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="w-24 text-right bg-surface-light border border-border-subtle rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={
                                      editedValues[odd.id] !== undefined
                                        ? editedValues[odd.id]
                                        : String(odd.cardValue)
                                    }
                                    onChange={(e) =>
                                      setEditedValues((prev) => ({
                                        ...prev,
                                        [odd.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-sm text-text-secondary text-right font-mono">
                                  {formatCurrency(contribution)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end">
                      <Button
                        loading={saving === pack.id}
                        disabled={!hasEdits(pack)}
                        onClick={() => handleSaveChanges(pack)}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GachaConfigPage() {
  return (
    <AdminGuard>
      <GachaConfigContent />
    </AdminGuard>
  );
}
