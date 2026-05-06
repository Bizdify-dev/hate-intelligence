import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        "bg-2": "#111111",
        "bg-3": "#161616",
        ink: "#f5f5f5",
        "ink-dim": "#a0a0a0",
        "ink-mute": "#6b6b6b",
        line: "#242424",
        "line-2": "#2e2e2e",
        acid: "#c6ff3d",
        "acid-2": "#a8e424",
        red: "#ff3b30",
        amber: "#f5a623",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "2px",
        lg: "2px",
      },
      boxShadow: {
        "acid-glow": "0 0 80px -24px rgba(198, 255, 61, 0.25)",
        "acid-glow-soft": "0 0 40px -12px rgba(198, 255, 61, 0.15)",
      },
      letterSpacing: {
        tightest: "-0.035em",
        tighter: "-0.025em",
        tight: "-0.02em",
        eyebrow: "0.2em",
        section: "0.15em",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        thinking: {
          "0%, 80%, 100%": { opacity: "0.2", transform: "scale(0.7)" },
          "40%": { opacity: "1", transform: "scale(1.1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulse: "pulse 1.8s ease-in-out infinite",
        thinking: "thinking 1.2s ease-in-out infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "slide-up": "slideUp 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
