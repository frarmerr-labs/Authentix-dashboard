/**
 * GET /api/fonts
 *
 * Proxies the Google Fonts Developer API (v1) to keep the API key server-side.
 * Returns all available font families sorted by popularity, shaped for the
 * certificate designer's font picker.
 *
 * Fields returned from the API:
 *   family       — font family name
 *   category     — sans-serif | serif | display | handwriting | monospace
 *   variants     — available weight/style variants (e.g. "100", "regular", "700italic")
 *   subsets      — supported script subsets (e.g. "latin", "cyrillic", "arabic")
 *   menu         — lightweight font file URL for rendering the family name in the picker
 *   axes         — variable font axes (only for variable fonts, requires capability=VF)
 *   version      — font version string (for cache busting)
 *   lastModified — ISO date of last update
 *
 * Response is cached for 24 hours via HTTP headers so the browser/CDN won't
 * re-fetch on every page load.
 *
 * Falls back to an empty list (not an error) if the API key is not configured,
 * so the font picker degrades gracefully to the bundled CERTIFICATE_FONTS list.
 */

import { NextResponse } from "next/server";

export interface GoogleFontAxis {
  tag: string;          // e.g. "wght", "wdth", "ital"
  start: number;        // min value
  end: number;          // max value
}

export interface GoogleFont {
  family: string;
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  variants: string[];   // e.g. ["100", "300", "regular", "700", "700italic"]
  subsets: string[];    // e.g. ["latin", "latin-ext", "cyrillic"]
  menu: string;         // tiny font file URL for rendering the family name as a preview
  axes?: GoogleFontAxis[]; // only present for variable fonts
  version: string;      // e.g. "v32"
  lastModified: string; // e.g. "2022-09-22"
}

const GOOGLE_FONTS_API = "https://www.googleapis.com/webfonts/v1/webfonts";

// Module-level cache: avoids redundant fetches within the same serverless
// function instance lifetime (typically seconds–minutes on Vercel).
let cachedFonts: GoogleFont[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { fonts: [], source: "fallback" },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  }

  if (cachedFonts && Date.now() < cacheExpiry) {
    return NextResponse.json(
      { fonts: cachedFonts, source: "cache" },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }

  try {
    // capability=VF returns variable font axes alongside regular data
    const url = `${GOOGLE_FONTS_API}?key=${encodeURIComponent(apiKey)}&sort=popularity&capability=VF`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`Google Fonts API responded ${res.status}`);
    }

    const raw = await res.json() as {
      items: Array<{
        family: string;
        category: string;
        variants: string[];
        subsets: string[];
        menu: string;
        axes?: Array<{ tag: string; start: number; end: number }>;
        version: string;
        lastModified: string;
      }>;
    };

    const fonts: GoogleFont[] = (raw.items ?? []).map((item) => ({
      family: item.family,
      category: item.category as GoogleFont["category"],
      variants: item.variants,
      subsets: item.subsets ?? [],
      menu: item.menu ?? "",
      ...(item.axes?.length ? { axes: item.axes } : {}),
      version: item.version ?? "",
      lastModified: item.lastModified ?? "",
    }));

    cachedFonts = fonts;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    return NextResponse.json(
      { fonts, source: "api" },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch (err) {
    console.error("[/api/fonts] Failed to fetch Google Fonts:", err);
    if (cachedFonts) {
      return NextResponse.json(
        { fonts: cachedFonts, source: "stale-cache" },
        { headers: { "Cache-Control": "public, max-age=600" } }
      );
    }
    return NextResponse.json(
      { fonts: [], source: "error" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
