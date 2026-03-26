"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Wallet,
  PlusCircle,
  ArrowDownToLine,
  ArrowRightLeft,
  Link as LinkIcon,
  Package,
  HelpCircle,
  Settings,
  LogOut,
  User,
  Dices,
  ChevronDown,
  Shield,
  Loader2,
  Flame,
  Check,
} from "lucide-react";
import { cn, formatPoints, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function ProfileDropdown() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [open, setOpen] = useState(false);
  const [rollingDaily, setRollingDaily] = useState(false);
  const [dailyResult, setDailyResult] = useState<{
    alreadyClaimed: boolean;
    streakCount: number;
    pointsAwarded: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user as
    | {
        id?: string;
        name?: string | null;
        email?: string;
        isAdmin?: boolean;
        pointsBalance?: number;
        usdcBalance?: number;
      }
    | undefined;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDailyRoll = useCallback(async () => {
    setRollingDaily(true);
    try {
      const res = await fetch("/api/points/daily-login", { method: "POST" });
      const data = await res.json();
      setDailyResult(data);
      if (!data.alreadyClaimed) await updateSession();
    } catch {
      // silently fail
    } finally {
      setRollingDaily(false);
    }
  }, []);

  if (!user) return null;

  const alreadyRolled = dailyResult?.alreadyClaimed === true;
  const streakCount = dailyResult?.streakCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 transition-colors",
          "hover:bg-bg-elevated",
          open && "bg-bg-elevated"
        )}
      >
        <div className="w-7 h-7 bg-primary/20 border border-primary/40 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-text-primary max-w-[100px] truncate">
          {user.name || "User"}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-72 bg-bg-surface border border-bg-border shadow-2xl shadow-black/40 z-50"
          >
            {/* Header: avatar + username */}
            <div className="px-4 py-3 border-b border-bg-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {user.name || "User"}
                  </p>
                  <Link
                    href="/profile"
                    className="text-xs text-primary hover:text-primary-hover transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    View profile &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Points section */}
            <div className="px-4 py-3 border-b border-bg-border">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="text-xs text-text-secondary font-medium">
                    Points balance
                  </span>
                </div>
                <span className="text-sm font-bold text-text-primary">
                  {formatPoints(user.pointsBalance ?? 0)} Points
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={
                  rollingDaily ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : alreadyRolled ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Dices className="w-4 h-4" />
                  )
                }
                disabled={rollingDaily || alreadyRolled}
                onClick={handleDailyRoll}
              >
                {alreadyRolled ? "Rolled today" : "Roll Daily Points"}
              </Button>

              {alreadyRolled && streakCount > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <Flame className="w-3 h-3 text-warning" />
                  <span className="text-[10px] text-warning font-semibold">
                    {streakCount}-day streak
                  </span>
                </div>
              )}

              {dailyResult && !dailyResult.alreadyClaimed && dailyResult.pointsAwarded > 0 && (
                <p className="text-center text-[10px] text-success font-semibold mt-1.5">
                  +{dailyResult.pointsAwarded} points earned!
                </p>
              )}
            </div>

            {/* Wallet section */}
            <div className="px-4 py-3 border-b border-bg-border">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-secondary font-medium">
                    GCPACKS wallet
                  </span>
                </div>
                <span className="text-sm font-bold text-text-primary">
                  {formatCurrency(user.usdcBalance ?? 0)} USDC
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button className="flex flex-col items-center gap-1 px-2 py-2 bg-bg-elevated/50 border border-bg-border hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary">
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/wallet");
                  }}
                  className="flex flex-col items-center gap-1 px-2 py-2 bg-bg-elevated/50 border border-bg-border hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Withdraw</span>
                </button>
                <button className="flex flex-col items-center gap-1 px-2 py-2 bg-bg-elevated/50 border border-bg-border hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Transfer</span>
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="py-1 border-b border-bg-border">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/wallet");
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Manage Wallets
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/profile?tab=activity");
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <Package className="w-4 h-4" />
                My Orders
              </button>
            </div>

            {/* Support + Settings */}
            <div className="py-1 border-b border-bg-border flex">
              <button className="flex items-center gap-2 flex-1 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                <HelpCircle className="w-4 h-4" />
                Support
              </button>
              <button className="flex items-center gap-2 flex-1 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>

            {/* Admin link (if admin) */}
            {user.isAdmin && (
              <div className="py-1 border-b border-bg-border">
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              </div>
            )}

            {/* Logout */}
            <div className="py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-bg-elevated transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
