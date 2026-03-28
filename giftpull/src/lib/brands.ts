export const BRAND_CONFIG = {
  XBOX: { label: "Xbox", color: "#107C10", icon: "🎮", logo: "/brands/xbox.svg" },
  STEAM: { label: "Steam", color: "#1B2838", icon: "🎮", logo: "/brands/steam.svg" },
  NINTENDO: { label: "Nintendo", color: "#E60012", icon: "🎮", logo: "/brands/nintendo.svg" },
  PLAYSTATION: { label: "PlayStation", color: "#003791", icon: "🎮", logo: "/brands/playstation.svg" },
  GOOGLE_PLAY: { label: "Google Play", color: "#4285F4", icon: "📱", logo: "/brands/google-play.svg" },
  AMAZON: { label: "Amazon", color: "#FF9900", icon: "📦", logo: "/brands/amazon.svg" },
  APPLE: { label: "Apple", color: "#A2AAAD", icon: "🍎", logo: "/brands/apple.svg" },
  ROBLOX: { label: "Roblox", color: "#E2231A", icon: "🎮", logo: "/brands/roblox.svg" },
  SPOTIFY: { label: "Spotify", color: "#1DB954", icon: "🎵", logo: "/brands/spotify.svg" },
  NETFLIX: { label: "Netflix", color: "#E50914", icon: "🎬", logo: "/brands/netflix.svg" },
} as const;

export type GiftCardBrand = keyof typeof BRAND_CONFIG;

export function getBrandConfig(brand: GiftCardBrand) {
  return BRAND_CONFIG[brand];
}

export function getBrandLogo(brand: string): string | undefined {
  return BRAND_CONFIG[brand as GiftCardBrand]?.logo;
}
