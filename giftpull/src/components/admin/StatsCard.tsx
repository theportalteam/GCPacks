"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
  color?: string;
  className?: string;
}

/**
 * StatsCard — a reusable dashboard stat card with icon, label, value,
 * and an optional trend indicator. The color prop tints the icon
 * background and glow.
 */
export function StatsCard({
  icon,
  label,
  value,
  trend,
  color = "#d5bbff",
  className,
}: StatsCardProps) {
  const trendColors = {
    up: "text-[#10B981]",
    down: "text-red-400",
    neutral: "text-text-secondary",
  };

  const trendArrows = {
    up: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ),
    down: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    ),
    neutral: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Subtle background glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {value}
          </p>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                trendColors[trend.direction]
              )}
            >
              {trendArrows[trend.direction]}
              <span>{trend.label}</span>
            </div>
          )}
        </div>

        {/* Icon container */}
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{
            backgroundColor: `${color}20`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
