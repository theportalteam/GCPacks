import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#131318",
          surface: "#1b1b20",
          elevated: "#2a292f",
          border: "#4b4357",
        },
        primary: {
          DEFAULT: "#d5bbff",
          hover: "#e5d3ff",
          muted: "rgba(213,187,255,0.12)",
          container: "#7d00ff",
        },
        accent: {
          DEFAULT: "#d3fbff",
          muted: "rgba(211,251,255,0.12)",
        },
        success: {
          DEFAULT: "#10B981",
          hover: "#059669",
          muted: "rgba(16,185,129,0.12)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          muted: "rgba(245,158,11,0.12)",
        },
        danger: {
          DEFAULT: "#EF4444",
          muted: "rgba(239,68,68,0.12)",
        },
        rarity: {
          common: "#968da3",
          uncommon: "#10B981",
          rare: "#d5bbff",
          epic: "#7d00ff",
          legendary: "#ffb1c3",
        },
        text: {
          primary: "#e4e1e9",
          secondary: "#cdc2da",
          tertiary: "#968da3",
          inverse: "#131318",
        },
        brand: {
          xbox: "#107C10",
          steam: "#1B2838",
          nintendo: "#E60012",
          playstation: "#003791",
          google: "#4285F4",
          amazon: "#FF9900",
          apple: "#A2AAAD",
          roblox: "#E2231A",
          spotify: "#1DB954",
          netflix: "#E50914",
        },
        "on-primary": "#41008b",
        "on-primary-container": "#e5d3ff",
        tertiary: "#ffb1c3",
        "tertiary-container": "#bd0059",
        outline: "#968da3",
        "outline-variant": "#4b4357",
        // Backward compat aliases used by existing components
        background: "#131318",
        surface: "#1b1b20",
        "surface-light": "#2a292f",
        epic: "#7d00ff",
        "text-primary": "#e4e1e9",
        "text-secondary": "#cdc2da",
        "border-subtle": "rgba(75,67,87,0.8)",
      },
      fontFamily: {
        sans: ['"Manrope"', "system-ui", "sans-serif"],
        headline: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        card: "0px",
        button: "0px",
        badge: "0px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.4)",
        "glow-blue": "0 0 20px rgba(213,187,255,0.25)",
        "glow-purple": "0 0 20px rgba(125,0,255,0.3)",
        "glow-gold": "0 0 20px rgba(255,177,195,0.3)",
        "glow-green": "0 0 20px rgba(16,185,129,0.25)",
        "glow-pink": "0 0 20px rgba(255,177,195,0.3)",
        "glow-cyan": "0 0 20px rgba(211,251,255,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "legendary-border": {
          "0%": { borderColor: "#ffb1c3" },
          "33%": { borderColor: "#7d00ff" },
          "66%": { borderColor: "#d5bbff" },
          "100%": { borderColor: "#ffb1c3" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(213,187,255,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(213,187,255,0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "legendary-border": "legendary-border 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
