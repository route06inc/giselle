import typographyPlugin from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";
import type { PluginAPI } from "tailwindcss/types/config";

const config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"./services/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			fontFamily: {
				rosart: ["var(--font-rosart)", "Times New Roman", "serif"],
				avenir: ["Avenir", "Arial", "sans-serif"],
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				black: {
					100: "hsl(var(--black_100))",
					80: "hsl(var(--black_80))",
					70: "hsl(var(--black_70))",
					50: "hsl(var(--black_50))",
					40: "hsl(var(--black_40))",
					30: "hsl(var(--black_30))",
					"-30": "hsl(var(--black_-30))",
					"-50": "hsl(var(--black_-50))",
					"-70": "hsl(var(--black_-70))",
				},
				white: {
					DEFAULT: "hsl(var(--white))",
				},
				green: {
					DEFAULT: "hsl(var(--green))",
				},
				red: {
					50: "hsl(var(--red_50))",
				},
				rosepine: {
					base: "hsl(var(--rosepine_base))",
					surface: "hsl(var(--rosepine_surface))",
					overlay: "hsl(var(--rosepine_overlay))",
					muted: "hsl(var(--rosepine_muted))",
					subtle: "hsl(var(--rosepine_subtle))",
					text: "hsl(var(--rosepine_text))",
					love: "hsl(var(--rosepine_love))",
					gold: "hsl(var(--rosepine_gold))",
					rose: "hsl(var(--rosepine_rose))",
					pine: "hsl(var(--rosepine_pine))",
					foam: "hsl(var(--rosepine_foam))",
					iris: "hsl(var(--rosepine_iris))",
					highlightLow: "hsl(var(--rosepine_highlightLow))",
					highlightMed: "hsl(var(--rosepine_highlightMed))",
					highlightHigh: "hsl(var(--rosepine_highlightHigh))",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"caret-blink": {
					"0%,70%,100%": { opacity: "1" },
					"20%,50%": { opacity: "0" },
				},
				"follow-through-overlap-spin": {
					"0%": { transform: "rotate(0deg)" },
					"40%": { transform: "rotate(-400deg)" },
					"60%": { transform: "rotate(-300deg)" },
					"80%": { transform: "rotate(-370deg)" },
					"100%": { transform: "rotate(-360deg)" },
				},
				"pop-pop": {
					"0%": {
						transform: "translateY(0)",
						fill: "hsl(var(--black_40))",
					},
					"33.3333%": {
						transform: "translateY(-4px)",
						fill: "hsl(var(--black_30))",
					},
					"44.4444%": {
						transform: "translateY(0px)",
						fill: "hsl(var(--black_40))",
					},
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"caret-blink": "caret-blink 1.25s ease-out infinite",
				"follow-through-spin":
					"follow-through-overlap-spin 1.75s ease-out infinite",
				"ticktock-bounce": "ticktock-bounce 1.5s steps(2, jump-none) infinite",
			},
			typography: (theme: PluginAPI["theme"]) => ({
				giselle: {
					css: {
						"--tw-prose-body": theme("colors.black[30]"),
						"--tw-prose-headings": theme("colors.black[30]"),
						"--tw-prose-lead": theme("colors.black[30]"),
						"--tw-prose-links": theme("colors.black[30]"),
						"--tw-prose-bold": theme("colors.black[30]"),
						"--tw-prose-counters": theme("colors.black[30]"),
						"--tw-prose-bullets": theme("colors.black[30]"),
						"--tw-prose-hr": theme("colors.black[30]"),
						"--tw-prose-quotes": theme("colors.black[30]"),
						"--tw-prose-quote-borders": theme("colors.black[30]"),
						"--tw-prose-captions": theme("colors.black[30]"),
						"--tw-prose-code": theme("colors.black[30]"),
						"--tw-prose-pre-code": theme("colors.black[30]"),
						"--tw-prose-pre-bg": theme("colors.black[80]"),
						"--tw-prose-th-borders": theme("colors.black[30]"),
						"--tw-prose-td-borders": theme("colors.black[30]"),
					},
				},
			}),
		},
	},
	plugins: [animatePlugin, typographyPlugin],
} satisfies Config;

export default config;
