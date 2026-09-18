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
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
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
