import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatUSDC(amount: number): string {
  return `${amount.toFixed(2)} USDC`;
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-US").format(points) + " pts";
}

export function formatDiscount(original: number, sale: number): string {
  const pct = Math.round(((original - sale) / original) * 100);
  return `${pct}% OFF`;
}

export function formatEV(ev: number, cost: number): string {
  const pct = (((ev - cost) / cost) * 100).toFixed(1);
  return `+${pct}% EV`;
}

export function generateFakeCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    COMMON: "#968da3",
    UNCOMMON: "#10B981",
    RARE: "#d5bbff",
    EPIC: "#7d00ff",
    LEGENDARY: "#ffb1c3",
  };
  return colors[rarity] || colors.COMMON;
}

export function getRarityBorderClass(rarity: string): string {
  const classes: Record<string, string> = {
    COMMON: "border-rarity-common",
    UNCOMMON: "border-rarity-uncommon",
    RARE: "border-rarity-rare",
    EPIC: "border-rarity-epic",
    LEGENDARY: "border-rarity-legendary",
  };
  return classes[rarity] || classes.COMMON;
}

export function getBrandColor(brand: string): string {
  const colors: Record<string, string> = {
    XBOX: "#107C10",
    STEAM: "#1B2838",
    NINTENDO: "#E60012",
    PLAYSTATION: "#003791",
    GOOGLE_PLAY: "#4285F4",
    AMAZON: "#FF9900",
    APPLE: "#A2AAAD",
    ROBLOX: "#E2231A",
    SPOTIFY: "#1DB954",
    NETFLIX: "#E50914",
  };
  return colors[brand] || "#d5bbff";
}

export function getBrandDisplayName(brand: string): string {
  const names: Record<string, string> = {
    XBOX: "Xbox",
    STEAM: "Steam",
    NINTENDO: "Nintendo eShop",
    PLAYSTATION: "PlayStation Store",
    GOOGLE_PLAY: "Google Play",
    AMAZON: "Amazon",
    APPLE: "Apple/iTunes",
    ROBLOX: "Roblox",
    SPOTIFY: "Spotify",
    NETFLIX: "Netflix",
  };
  return names[brand] || brand;
}

export function getBrandLogo(brand: string): string | undefined {
  const logos: Record<string, string> = {
    XBOX: "/brands/xbox.svg",
    STEAM: "/brands/steam.svg",
    NINTENDO: "/brands/nintendo.svg",
    PLAYSTATION: "/brands/playstation.svg",
    GOOGLE_PLAY: "/brands/google-play.svg",
    AMAZON: "/brands/amazon.svg",
    APPLE: "/brands/apple.svg",
    ROBLOX: "/brands/roblox.svg",
    SPOTIFY: "/brands/spotify.svg",
    NETFLIX: "/brands/netflix.svg",
  };
  return logos[brand];
}
