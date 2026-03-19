"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Coins,
  DollarSign,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPoints, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "/storefront", label: "Storefront" },
  { href: "/gacha", label: "Gacha Packs" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user as
    | { name?: string | null; email?: string; isAdmin?: boolean; pointsBalance?: number; usdcBalance?: number }
    | undefined;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-bg-border bg-bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary via-epic to-warning bg-clip-text text-transparent">
              GiftPull
            </span>
          </Link>

          {/* Center: Nav Links (desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                {link.href === "/leaderboard" && (
                  <Trophy className="w-3.5 h-3.5 text-warning" />
                )}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Auth area (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" && (
              <div className="w-32 h-8 bg-bg-elevated rounded-lg animate-pulse" />
            )}

            {status === "authenticated" && user && (
              <>
                {/* Points balance */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface rounded-lg border border-bg-border">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-text-primary">
                    {formatPoints(user.pointsBalance ?? 0)}
                  </span>
                </div>

                {/* USDC balance */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface rounded-lg border border-bg-border">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-text-primary">
                    {formatCurrency(user.usdcBalance ?? 0)}
                  </span>
                </div>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                      "hover:bg-bg-elevated",
                      dropdownOpen && "bg-bg-elevated"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-text-primary max-w-[100px] truncate">
                      {user.name || "User"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-text-secondary transition-transform",
                        dropdownOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-bg-border rounded-xl shadow-xl shadow-black/30 py-1 z-50">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      {user.isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin
                        </Link>
                      )}
                      <div className="my-1 border-t border-bg-border" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-bg-elevated transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {status === "unauthenticated" && (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-bg-border bg-bg/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                {link.label}
              </Link>
            ))}

            {status === "authenticated" && user && (
              <>
                <div className="pt-3 mt-3 border-t border-bg-border space-y-2">
                  <div className="flex items-center gap-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-text-primary">
                        {formatPoints(user.pointsBalance ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium text-text-primary">
                        {formatCurrency(user.usdcBalance ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-bg-elevated transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </>
            )}

            {status === "unauthenticated" && (
              <div className="pt-3 mt-3 border-t border-bg-border flex gap-2 px-4">
                <Link href="/login" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button variant="primary" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
