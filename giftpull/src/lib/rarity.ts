export const RARITY_CONFIG = {
  COMMON: {
    label: "Common",
    color: "#968da3",
    bgMuted: "rgba(150,141,163,0.12)",
    borderClass: "border-rarity-common",
    textClass: "text-rarity-common",
    glow: "none",
    animationIntensity: "low",
  },
  UNCOMMON: {
    label: "Uncommon",
    color: "#10B981",
    bgMuted: "rgba(16,185,129,0.12)",
    borderClass: "border-rarity-uncommon",
    textClass: "text-rarity-uncommon",
    glow: "shadow-glow-green",
    animationIntensity: "medium",
  },
  RARE: {
    label: "Rare",
    color: "#d5bbff",
    bgMuted: "rgba(213,187,255,0.12)",
    borderClass: "border-rarity-rare",
    textClass: "text-rarity-rare",
    glow: "shadow-glow-blue",
    animationIntensity: "high",
  },
  EPIC: {
    label: "Epic",
    color: "#7d00ff",
    bgMuted: "rgba(125,0,255,0.12)",
    borderClass: "border-rarity-epic",
    textClass: "text-rarity-epic",
    glow: "shadow-glow-purple",
    animationIntensity: "very-high",
  },
  LEGENDARY: {
    label: "Legendary",
    color: "#ffb1c3",
    bgMuted: "rgba(255,177,195,0.12)",
    borderClass: "border-rarity-legendary",
    textClass: "text-rarity-legendary",
    glow: "shadow-glow-pink",
    animationIntensity: "max",
  },
} as const;

export type RarityTier = keyof typeof RARITY_CONFIG;

export function getRarityConfig(tier: RarityTier) {
  return RARITY_CONFIG[tier];
}
