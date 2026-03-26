"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Shield,
  ShieldCheck,
  Crown,
  Star,
  StarHalf,
  Clock,
  BadgeCheck,
  Copy,
  Check,
  AlertTriangle,
  CreditCard,
  CircleDollarSign,
  Coins,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatPoints, getBrandColor, getBrandDisplayName } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DisputeModal } from "@/components/marketplace/DisputeModal";

type PaymentMethodType = "STRIPE" | "USDC_BASE" | "POINTS";

// Points cost multiplier (100 points = $1)
const POINTS_COST_MULTIPLIER = 100;

interface ListingDetail {
  id: string;
  askingPrice: number;
  suggestedPrice: number;
  status: string;
  disputeStatus: string;
  disputeReason: string | null;
  createdAt: string;
  expiresAt: string;
  seller: {
    id: string;
    name: string | null;
    sellerTier: "NEW" | "VERIFIED" | "POWER";
    sellerRating: number | null;
    totalSales: number;
  };
  buyer?: {
    id: string;
    name: string | null;
  } | null;
  giftCard: {
    id: string;
    brand: string;
    denomination: number;
    fmv: number;
    code?: string;
    status: string;
    verificationStatus: string;
  };
}

const TIER_CONFIG = {
  NEW: {
    label: "New Seller",
    color: "text-text-secondary",
    bgColor: "bg-surface-light",
    borderColor: "border-border-subtle",
    icon: Shield,
  },
  VERIFIED: {
    label: "Verified",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    icon: ShieldCheck,
  },
  POWER: {
    label: "Power Seller",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    icon: Crown,
  },
} as const;

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-text-secondary">No ratings yet</span>;
  }

  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star key={`full-${i}`} className="w-4 h-4 text-warning fill-warning" />
    );
  }
  if (hasHalf) {
    stars.push(
      <StarHalf key="half" className="w-4 h-4 text-warning fill-warning" />
    );
  }
  const emptyCount = 5 - fullStars - (hasHalf ? 1 : 0);
  for (let i = 0; i < emptyCount; i++) {
    stars.push(
      <Star key={`empty-${i}`} className="w-4 h-4 text-text-secondary/30" />
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-sm text-text-secondary ml-1.5">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="h-4 w-32 bg-surface-light rounded-none mb-6 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-surface rounded-card border border-border-subtle p-7 animate-pulse">
            <div className="h-6 w-24 bg-surface-light rounded-full mb-4" />
            <div className="h-8 w-64 bg-surface-light rounded-none mb-4" />
            <div className="h-px w-full bg-surface-light mb-4" />
            <div className="h-10 w-32 bg-surface-light rounded-none mb-6" />
            <div className="bg-surface-light rounded-none p-4 mb-6">
              <div className="h-5 w-full bg-surface rounded-none mb-2" />
              <div className="h-4 w-32 bg-surface rounded-none" />
            </div>
            <div className="h-12 w-full bg-surface-light rounded-none" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-card border border-border-subtle p-5 animate-pulse">
            <div className="h-5 w-24 bg-surface-light rounded-none mb-4" />
            <div className="h-12 w-full bg-surface-light rounded-none mb-3" />
            <div className="h-4 w-32 bg-surface-light rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as
    | { id?: string; pointsBalance?: number; usdcBalance?: number }
    | undefined;

  const listingId = params.listingId as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Purchase modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("STRIPE");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Confirm state
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Code reveal state
  const [codeCopied, setCodeCopied] = useState(false);

  const pointsBalance = user?.pointsBalance ?? 0;
  const usdcBalance = user?.usdcBalance ?? 0;

  // Fetch listing
  const fetchListing = useCallback(async () => {
    setLoading(true);
    try {
      // We re-use the listings endpoint with the listing ID filter
      // For a real app, you'd have a /api/marketplace/listings/[id] endpoint
      // For now, fetch all and find by id
      const res = await fetch(`/api/marketplace/listings`);
      if (!res.ok) throw new Error("Failed to fetch listing");

      const data = await res.json();
      const found = (data.listings ?? []).find(
        (l: ListingDetail) => l.id === listingId
      );

      if (!found) {
        setError("Listing not found");
      } else {
        setListing(found);
      }
    } catch {
      setError("Failed to load listing");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Determine viewer relationship
  const isOwner = listing && user?.id === listing.seller.id;
  const isBuyer = listing && user?.id === listing.buyer?.id;
  const isSold = listing?.status === "SOLD";
  const isActive = listing?.status === "ACTIVE";

  const brandColor = listing ? getBrandColor(listing.giftCard.brand) : "#d5bbff";
  const brandName = listing ? getBrandDisplayName(listing.giftCard.brand) : "";

  const discountPercent = listing
    ? Math.round(
        ((listing.giftCard.denomination - listing.askingPrice) /
          listing.giftCard.denomination) *
          100
      )
    : 0;

  const pointsCost = listing
    ? Math.ceil(listing.askingPrice * POINTS_COST_MULTIPLIER)
    : 0;
  const hasEnoughPoints = pointsBalance >= pointsCost;
  const hasEnoughUsdc = usdcBalance >= (listing?.askingPrice ?? 0);

  // ── Purchase handler ───────────────────────────────
  const handlePurchase = useCallback(async () => {
    if (!listing) return;
    setPurchasing(true);

    try {
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          paymentMethod: selectedPayment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      // Handle Stripe redirect
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setPurchaseSuccess(true);
      // Refresh listing data and session balances
      await fetchListing();
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  }, [listing, selectedPayment, fetchListing, updateSession]);

  // ── Confirm handler ────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!listing) return;
    setConfirming(true);

    try {
      const res = await fetch("/api/marketplace/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to confirm");
      }

      setConfirmed(true);
      await fetchListing();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  }, [listing, fetchListing]);

  // ── Copy code handler ──────────────────────────────
  const handleCopyCode = useCallback(async () => {
    if (!listing?.giftCard.code) return;
    try {
      await navigator.clipboard.writeText(listing.giftCard.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [listing?.giftCard.code]);

  if (loading) return <LoadingSkeleton />;

  if (error && !listing) {
    return (
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-none bg-surface-light flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Listing Not Found
          </h3>
          <p className="text-sm text-text-secondary">
            This listing may have expired or been removed.
          </p>
          <Link href="/marketplace" className="mt-4">
            <Button variant="primary" size="sm">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const tierConfig = TIER_CONFIG[listing.seller.sellerTier];
  const TierIcon = tierConfig.icon;

  return (
    <div className="relative">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ backgroundColor: brandColor }}
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column: Listing details */}
          <div className="lg:col-span-3">
            <Card padding="lg">
              {/* Brand + Status badges */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {brandName}
                </span>
                <div className="flex items-center gap-2">
                  {listing.giftCard.verificationStatus === "VERIFIED" && (
                    <div className="flex items-center gap-1 text-success">
                      <BadgeCheck className="w-4 h-4" />
                      <span className="text-xs font-semibold">Verified</span>
                    </div>
                  )}
                  {isSold && (
                    <Badge variant="epic" size="md">
                      Sold
                    </Badge>
                  )}
                  {listing.disputeStatus === "OPEN" && (
                    <Badge variant="warning" size="md">
                      Dispute Open
                    </Badge>
                  )}
                </div>
              </div>

              {/* Denomination */}
              <h2 className="text-3xl font-bold text-text-primary mb-1">
                {formatCurrency(listing.giftCard.denomination)}{" "}
                <span className="text-lg font-medium text-text-secondary">
                  {brandName} Gift Card
                </span>
              </h2>

              {/* Decorative divider */}
              <div
                className="h-px w-full my-5 opacity-20"
                style={{
                  background: `linear-gradient(to right, transparent, ${brandColor}, transparent)`,
                }}
              />

              {/* Pricing */}
              <div className="flex items-end gap-4 mb-6">
                <div>
                  {discountPercent > 0 && (
                    <p className="text-sm text-text-secondary line-through mb-0.5">
                      {formatCurrency(listing.giftCard.denomination)}
                    </p>
                  )}
                  <p className="text-3xl font-bold text-text-primary">
                    {formatCurrency(listing.askingPrice)}
                  </p>
                </div>
                {discountPercent > 0 && (
                  <Badge variant="success" size="md">
                    {discountPercent}% below FMV
                  </Badge>
                )}
              </div>

              {/* Listing meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Listed {getTimeAgo(listing.createdAt)}
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Expires {new Date(listing.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Card code reveal for buyer (if SOLD) */}
              {isBuyer && isSold && listing.giftCard.code && (
                <div className="bg-surface-light/50 border border-success/20 rounded-none p-5 mb-6">
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-2">
                    Your Card Code
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-text-primary tracking-widest select-all flex-1">
                      {listing.giftCard.code}
                    </code>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-none hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
                      title="Copy code"
                    >
                      {codeCopied ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {codeCopied && (
                    <p className="text-xs text-success mt-2">
                      Copied to clipboard!
                    </p>
                  )}
                </div>
              )}

              {/* Buyer actions (confirm / dispute) */}
              {isBuyer && isSold && !confirmed && listing.disputeStatus === "NONE" && (
                <div className="flex gap-3 mb-6">
                  <Button
                    variant="success"
                    size="md"
                    className="flex-1"
                    loading={confirming}
                    onClick={handleConfirm}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Confirm Card Works
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    className="flex-1"
                    onClick={() => setShowDisputeModal(true)}
                    icon={<AlertTriangle className="w-4 h-4" />}
                  >
                    File Dispute
                  </Button>
                </div>
              )}

              {/* Confirmed notice */}
              {confirmed && (
                <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-none px-4 py-3 mb-6">
                  <Check className="w-5 h-5 text-success" />
                  <p className="text-sm text-success font-medium">
                    Card confirmed! Transaction complete.
                  </p>
                </div>
              )}

              {/* Dispute notice */}
              {listing.disputeStatus === "OPEN" && (
                <div className="flex items-start gap-2.5 bg-warning/10 border border-warning/20 rounded-none px-4 py-3 mb-6">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-warning font-semibold mb-1">
                      Dispute in Progress
                    </p>
                    {listing.disputeReason && (
                      <p className="text-xs text-text-secondary">
                        {listing.disputeReason}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Buy button (for non-owner, active listings) */}
              {isActive && !isOwner && user?.id && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<ShoppingCart className="w-5 h-5" />}
                  onClick={() => setShowPaymentModal(true)}
                >
                  Buy for {formatCurrency(listing.askingPrice)}
                </Button>
              )}

              {/* Not logged in */}
              {isActive && !user?.id && (
                <Link href="/login">
                  <Button variant="primary" size="lg" className="w-full">
                    Sign in to Purchase
                  </Button>
                </Link>
              )}

              {/* Owner notice */}
              {isOwner && isActive && (
                <div className="bg-surface-light/50 border border-border-subtle rounded-none px-4 py-3">
                  <p className="text-sm text-text-secondary">
                    This is your listing. It will expire on{" "}
                    {new Date(listing.expiresAt).toLocaleDateString()}.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right column: Seller info */}
          <div className="lg:col-span-2">
            <Card padding="md">
              <h3 className="text-base font-bold text-text-primary mb-4">
                Seller
              </h3>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-none flex items-center justify-center",
                    tierConfig.bgColor
                  )}
                >
                  <TierIcon className={cn("w-6 h-6", tierConfig.color)} />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">
                    {listing.seller.name || "Anonymous"}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      tierConfig.bgColor,
                      tierConfig.color,
                      tierConfig.borderColor
                    )}
                  >
                    {tierConfig.label}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Rating</span>
                  <RatingStars rating={listing.seller.sellerRating} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    Total Sales
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {listing.seller.totalSales}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="mt-16">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!purchasing) {
            setShowPaymentModal(false);
            setPurchaseSuccess(false);
          }
        }}
        title={purchaseSuccess ? undefined : "Complete Purchase"}
        size="md"
      >
        {purchaseSuccess ? (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/15 border-2 border-success/30 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-1">
              Purchase Complete!
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              {formatCurrency(listing.giftCard.denomination)} {brandName} Gift Card
            </p>
            <p className="text-sm text-text-secondary mb-6">
              View your card code and confirm the card works on the listing page.
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                setShowPaymentModal(false);
                setPurchaseSuccess(false);
                fetchListing();
              }}
            >
              View Card Details
            </Button>
          </div>
        ) : (
          <div>
            {/* Item details */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border-subtle">
              <div
                className="w-12 h-12 rounded-none flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brandColor}20` }}
              >
                <ShoppingCart className="w-6 h-6" style={{ color: brandColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary truncate">
                  {formatCurrency(listing.giftCard.denomination)} {brandName} Gift Card
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName}
                  </span>
                  {discountPercent > 0 && (
                    <Badge variant="success" size="sm">
                      {discountPercent}% OFF
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(listing.askingPrice)}
                </p>
              </div>
            </div>

            {/* Payment method selector */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-text-secondary mb-3">
                Payment Method
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stripe */}
                <button
                  onClick={() => setSelectedPayment("STRIPE")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                    selectedPayment === "STRIPE"
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-none flex items-center justify-center",
                      selectedPayment === "STRIPE" ? "bg-primary/15" : "bg-surface"
                    )}
                  >
                    <CreditCard
                      className={cn(
                        "w-5 h-5",
                        selectedPayment === "STRIPE" ? "text-primary" : "text-text-secondary"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selectedPayment === "STRIPE" ? "text-primary" : "text-text-secondary"
                    )}
                  >
                    Pay with Card
                  </span>
                </button>

                {/* USDC */}
                <button
                  onClick={() => setSelectedPayment("USDC_BASE")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                    selectedPayment === "USDC_BASE"
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-none flex items-center justify-center",
                      selectedPayment === "USDC_BASE" ? "bg-primary/15" : "bg-surface"
                    )}
                  >
                    <CircleDollarSign
                      className={cn(
                        "w-5 h-5",
                        selectedPayment === "USDC_BASE" ? "text-primary" : "text-text-secondary"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selectedPayment === "USDC_BASE" ? "text-primary" : "text-text-secondary"
                    )}
                  >
                    Pay with USDC
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Balance: {formatCurrency(usdcBalance)}
                  </span>
                  {!hasEnoughUsdc && selectedPayment === "USDC_BASE" && (
                    <span className="text-[10px] text-red-400">Insufficient balance</span>
                  )}
                </button>

                {/* Points */}
                <button
                  onClick={() => {
                    if (hasEnoughPoints) setSelectedPayment("POINTS");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-none border-2 transition-all duration-200",
                    selectedPayment === "POINTS"
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border-subtle bg-surface-light/50 hover:border-border-subtle/80 hover:bg-surface-light",
                    !hasEnoughPoints && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={!hasEnoughPoints}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-none flex items-center justify-center",
                      selectedPayment === "POINTS" ? "bg-primary/15" : "bg-surface"
                    )}
                  >
                    <Coins
                      className={cn(
                        "w-5 h-5",
                        selectedPayment === "POINTS" ? "text-primary" : "text-text-secondary"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selectedPayment === "POINTS" ? "text-primary" : "text-text-secondary"
                    )}
                  >
                    Pay with Points
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {formatPoints(pointsCost)} pts required
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    You have: {formatPoints(pointsBalance)}
                  </span>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-surface-light/50 border border-border-subtle rounded-none p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Item</span>
                <span className="text-text-primary font-medium">
                  {formatCurrency(listing.giftCard.denomination)} {brandName}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-text-secondary">Payment</span>
                <span className="text-text-primary font-medium">
                  {selectedPayment === "STRIPE" && "Credit / Debit Card"}
                  {selectedPayment === "USDC_BASE" &&
                    `USDC (${formatCurrency(listing.askingPrice)})`}
                  {selectedPayment === "POINTS" &&
                    `${formatPoints(pointsCost)} Points`}
                </span>
              </div>
              <div className="h-px bg-border-subtle my-3" />
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Total</span>
                <span className="text-lg font-bold text-text-primary">
                  {selectedPayment === "POINTS"
                    ? `${formatPoints(pointsCost)} pts`
                    : formatCurrency(listing.askingPrice)}
                </span>
              </div>
            </div>

            {/* Confirm button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={purchasing}
              disabled={
                purchasing ||
                (selectedPayment === "USDC_BASE" && !hasEnoughUsdc) ||
                (selectedPayment === "POINTS" && !hasEnoughPoints)
              }
              onClick={handlePurchase}
            >
              {purchasing
                ? "Processing..."
                : `Confirm Purchase \u2014 ${
                    selectedPayment === "POINTS"
                      ? `${formatPoints(pointsCost)} pts`
                      : formatCurrency(listing.askingPrice)
                  }`}
            </Button>

            {/* Points earn notice */}
            {selectedPayment !== "POINTS" && (
              <p className="text-center text-xs text-text-secondary mt-3">
                <Coins className="w-3 h-3 inline-block mr-1 text-warning" />
                Earn{" "}
                <span className="text-warning font-semibold">
                  {formatPoints(Math.floor(listing.askingPrice))}
                </span>{" "}
                points with this purchase
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Dispute Modal */}
      {listing && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          listing={{
            id: listing.id,
            askingPrice: listing.askingPrice,
            giftCard: {
              brand: listing.giftCard.brand,
              denomination: listing.giftCard.denomination,
            },
            seller: {
              name: listing.seller.name,
              sellerTier: listing.seller.sellerTier,
            },
          }}
          onDisputeFiled={fetchListing}
        />
      )}
    </div>
  );
}
