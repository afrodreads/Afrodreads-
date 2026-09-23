import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#F4C60A",
          "yellow-dark": "#C99F06",
          black: "#0B0B0C",
          white: "#FFFFFF",
          gray: "#18181A",
        },
        surface: {
          DEFAULT: "#000000",
          raised: "#161111",
          sunken: "#0d0909",
        },
        line: {
          DEFAULT: "#2e2525",
          strong: "#857676",
        },
        ink: {
          DEFAULT: "#fff8e7",
          muted: "#c2b6a6",
        },
        amarelo: {
          DEFAULT: "#f1bb09",
          on: "#000000",
          text: "#f1bb09",
          soft: "#2e2400",
        },
        roxo: {
          DEFAULT: "#650c63",
          on: "#fae9f6",
          text: "#e59be2",
          soft: "#2a0a29",
        },
        marrom: {
          DEFAULT: "#791d00",
          text: "#f08a62",
          soft: "#2e1006",
        },
        folha: {
          DEFAULT: "#8fbf99",
          soft: "#1f3325",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        serif: ["var(--font-instrument-serif)", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "ad-sm": "8px",
        "ad-md": "16px",
        "ad-lg": "24px",
        "ad-pill": "999px",
      },
      animation: {
        "fade-up": "fade-up 0.8s ease-out forwards",
        marquee: "marquee 22s linear infinite",
        "stripe-scroll": "stripe-scroll 20s linear infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "stripe-scroll": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "200px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
