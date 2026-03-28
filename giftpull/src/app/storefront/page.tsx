"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, SlidersHorizontal, ShoppingBag, PackageOpen } from "lucide-react";
import { cn, getBrandDisplayName } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { StorefrontCard } from "@/components/storefront/StorefrontCard";
import { BundleCard } from "@/components/storefront/BundleCard";
import { BrandFilter } from "@/components/storefront/BrandFilter";
import type { StorefrontCardData } from "@/components/storefront/StorefrontCard";
import type { BundleData } from "@/components/storefront/BundleCard";

type SortOption = "price_asc" | "price_desc" | "discount_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount_desc", label: "Biggest Discount" },
];

function SkeletonCard() {
  return (
    <div className="bg-bg-surface rounded-card border border-bg-border p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-20 bg-bg-elevated rounded-full" />
        <div className="h-5 w-16 bg-bg-elevated rounded-full" />
      </div>
      <div className="h-6 w-48 bg-bg-elevated rounded-none mb-4" />
      <div className="h-px w-full bg-bg-elevated mb-4" />
      <div className="flex items-end justify-between mb-5">
        <div className="h-8 w-24 bg-bg-elevated rounded-none" />
      </div>
      <div className="h-10 w-full bg-bg-elevated rounded-none" />
    </div>
  );
}

function SkeletonBundle() {
  return (
    <div className="bg-bg-surface rounded-card border border-bg-border p-5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 bg-bg-elevated rounded-none" />
        <div>
          <div className="h-5 w-32 bg-bg-elevated rounded-none mb-1" />
          <div className="h-3 w-48 bg-bg-elevated rounded-none" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-8 w-full bg-bg-elevated rounded-none" />
        <div className="h-8 w-full bg-bg-elevated rounded-none" />
      </div>
      <div className="h-10 w-full bg-bg-elevated rounded-none" />
    </div>
  );
}

export default function StorefrontPage() {
  const [cards, setCards] = useState<StorefrontCardData[]>([]);
  const [bundles, setBundles] = useState<BundleData[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("price_asc");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch cards
  useEffect(() => {
    setLoadingCards(true);
    fetch("/api/storefront/cards")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cards");
        return res.json();
      })
      .then((data) => {
        setCards(data.cards ?? data ?? []);
      })
      .catch(() => {
        setCards([]);
      })
      .finally(() => setLoadingCards(false));
  }, []);

  // Fetch bundles
  useEffect(() => {
    setLoadingBundles(true);
    fetch("/api/storefront/bundles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch bundles");
        return res.json();
      })
      .then((data) => {
        setBundles(data.bundles ?? data ?? []);
      })
      .catch(() => {
        setBundles([]);
      })
      .finally(() => setLoadingBundles(false));
  }, []);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Brand filter
    if (selectedBrand) {
      result = result.filter((c) => c.brand === selectedBrand);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const brandName = getBrandDisplayName(c.brand).toLowerCase();
        const denomStr = `$${c.denomination}`;
        return (
          brandName.includes(query) ||
          denomStr.includes(query) ||
          c.brand.toLowerCase().includes(query)
        );
      });
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.listedPrice ?? a.denomination) - (b.listedPrice ?? b.denomination));
        break;
      case "price_desc":
        result.sort((a, b) => (b.listedPrice ?? b.denomination) - (a.listedPrice ?? a.denomination));
        break;
      case "discount_desc":
        result.sort(
          (a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
        );
        break;
    }

    return result;
  }, [cards, selectedBrand, searchQuery, sortBy]);

  return (
    <div className="relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-headline font-black uppercase tracking-tighter italic text-text-primary">
              Gift Card Storefront
            </h1>
          </div>
          <p className="text-text-secondary ml-[52px]">
            Browse discounted gift cards from top brands
          </p>
        </div>

        {/* Brand Filter */}
        <div className="mb-6">
          <BrandFilter
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
          />
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search by brand or amount..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={cn(
                  "bg-bg-elevated border border-bg-border rounded-none px-4 py-2.5 text-sm text-text-primary",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                  "transition-all duration-200 cursor-pointer appearance-none pr-8"
                )}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {loadingCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-none bg-bg-elevated flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              No cards found
            </h3>
            <p className="text-sm text-text-secondary text-center max-w-xs">
              {searchQuery || selectedBrand
                ? "Try adjusting your filters or search query."
                : "Check back soon for new gift card listings."}
            </p>
            {(searchQuery || selectedBrand) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBrand(null);
                }}
                className="mt-4 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCards.map((card) => (
              <StorefrontCard key={card.id} card={card} />
            ))}
          </div>
        )}

        {/* Bundles Section */}
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-none bg-epic/10 flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-epic" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold uppercase tracking-tight text-text-primary">Bundles</h2>
              <p className="text-sm text-text-secondary">
                Save more with curated gift card bundles
              </p>
            </div>
          </div>

          {loadingBundles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBundle key={i} />
              ))}
            </div>
          ) : bundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-bg-surface/50 rounded-card border border-bg-border">
              <PackageOpen className="w-10 h-10 text-text-secondary mb-3" />
              <p className="text-sm text-text-secondary">
                No bundles available right now. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom accent */}
        <div className="mt-16">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
