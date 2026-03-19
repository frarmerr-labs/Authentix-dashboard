import type { Config } from "tailwindcss";

/**
 * Tailwind CSS v4 Configuration
 * 
 * Most theme configuration is now in globals.css using @theme directive.
 * This file primarily handles content paths and plugin integration.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
