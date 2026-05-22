import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1440px" }
    },
    extend: {
      colors: {
        // shadcn 标准变量
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        // LawLink 自定义色板（UI-DESIGN §二）
        ll: {
          base: "#0A0E1A",
          elevated: "#111727",
          overlay: "#1A2238",
          accent: "#5B8DEF",
          "accent-hover": "#7BA5F5",
          cyan: "#4FD1C5",
          violet: "#9B7BF7",
          success: "#4ADE80",
          warning: "#FBBF24",
          danger: "#F87171",
          info: "#60A5FA",
          "sev-low": "#4ADE80",
          "sev-medium": "#FBBF24",
          "sev-high": "#FB923C",
          "sev-blocking": "#F87171"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "PingFang SC", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SF Mono", "Consolas", "monospace"],
        serif: ["var(--font-serif)", "Noto Serif SC", "serif"]
      },
      boxShadow: {
        "ll-card": "0 0 0 1px hsl(var(--border))",
        "ll-glow": "0 0 24px -4px rgba(91, 141, 239, 0.35)"
      },
      backgroundImage: {
        "ll-radial":
          "radial-gradient(circle at 100% 0%, rgba(91, 141, 239, 0.05) 0%, transparent 50%)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
