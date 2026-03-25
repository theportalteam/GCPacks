"use client";

import React, { useState, useEffect } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card } from "@/components/ui/Card";
import { cn, formatCurrency, formatPoints } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalRevenue: number;
  gachaPullsToday: number;
  activeListings: number;
  pointsInCirculation: number;
}

// ── Icons ──────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GachaIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

// ── Placeholder data for chart-like sections ───────────

const revenueByDay = [
  { label: "Mon", value: 1240, max: 3200 },
  { label: "Tue", value: 1890, max: 3200 },
  { label: "Wed", value: 2100, max: 3200 },
  { label: "Thu", value: 1650, max: 3200 },
  { label: "Fri", value: 3200, max: 3200 },
  { label: "Sat", value: 2800, max: 3200 },
  { label: "Sun", value: 2350, max: 3200 },
];

const pullsByTier = [
  { label: "Starter", value: 45, color: "#968da3" },
  { label: "Standard", value: 120, color: "#d5bbff" },
  { label: "Premium", value: 78, color: "#7d00ff" },
  { label: "Ultra", value: 32, color: "#ffb1c3" },
];

const topBrands = [
  { label: "Xbox", value: 34, color: "#107C10" },
  { label: "Steam", value: 28, color: "#1B2838" },
  { label: "Roblox", value: 22, color: "#E2231A" },
  { label: "PlayStation", value: 18, color: "#003087" },
  { label: "Nintendo", value: 12, color: "#E60012" },
];

// ── Page Component ─────────────────────────────────────

function AdminDashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStats(data);
      } catch {
        setError("Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Admin Dashboard</h1>
            <p className="text-text-secondary text-sm mt-1">
              Platform overview and analytics
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/admin/inventory">
              <button className="px-4 py-2 bg-surface hover:bg-surface-light text-text-primary text-sm font-semibold rounded-xl border border-border-subtle transition-colors">
                Inventory
              </button>
            </a>
            <a href="/admin/gacha">
              <button className="px-4 py-2 bg-surface hover:bg-surface-light text-text-primary text-sm font-semibold rounded-xl border border-border-subtle transition-colors">
                Gacha Config
              </button>
            </a>
            <a href="/admin/users">
              <button className="px-4 py-2 bg-surface hover:bg-surface-light text-text-primary text-sm font-semibold rounded-xl border border-border-subtle transition-colors">
                Users
              </button>
            </a>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            icon={<UsersIcon />}
            label="Total Users"
            value={formatPoints(stats?.totalUsers ?? 0)}
            color="#d5bbff"
          />
          <StatsCard
            icon={<RevenueIcon />}
            label="Total Revenue"
            value={formatCurrency(stats?.totalRevenue ?? 0)}
            color="#10B981"
          />
          <StatsCard
            icon={<GachaIcon />}
            label="Pulls Today"
            value={formatPoints(stats?.gachaPullsToday ?? 0)}
            color="#7d00ff"
          />
          <StatsCard
            icon={<ListingsIcon />}
            label="Active Listings"
            value={formatPoints(stats?.activeListings ?? 0)}
            color="#ffb1c3"
          />
          <StatsCard
            icon={<PointsIcon />}
            label="Points in Circulation"
            value={formatPoints(stats?.pointsInCirculation ?? 0)}
            color="#EF4444"
          />
        </div>

        {/* ── Charts / Stats Sections ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Day */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-text-primary mb-5">
              Revenue by Day (Sample)
            </h3>
            <div className="flex items-end gap-3 h-48">
              {revenueByDay.map((day) => (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-text-secondary font-mono">
                    {formatCurrency(day.value)}
                  </span>
                  <div className="w-full relative bg-surface-light rounded-t-lg overflow-hidden" style={{ height: "100%" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${(day.value / day.max) * 100}%`,
                        background: "linear-gradient(to top, #d5bbff, #7d00ff)",
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Pulls by Tier */}
          <Card>
            <h3 className="text-lg font-semibold text-text-primary mb-5">
              Pulls by Tier (Sample)
            </h3>
            <div className="space-y-4">
              {pullsByTier.map((tier) => {
                const maxVal = Math.max(...pullsByTier.map((t) => t.value));
                const pct = (tier.value / maxVal) * 100;
                return (
                  <div key={tier.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-text-primary font-medium">
                        {tier.label}
                      </span>
                      <span className="text-sm text-text-secondary font-mono">
                        {tier.value}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: tier.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Top Brands ─────────────────────────────── */}
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-5">
            Top Brands (Sample)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {topBrands.map((brand, idx) => (
              <div
                key={brand.label}
                className="flex flex-col items-center p-4 rounded-xl bg-surface-light"
              >
                <div
                  className="w-10 h-10 rounded-xl mb-2 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: brand.color }}
                >
                  {brand.label[0]}
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {brand.label}
                </span>
                <span className="text-2xl font-bold text-text-primary mt-1">
                  {brand.value}%
                </span>
                <span className="text-xs text-text-secondary">of sales</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
