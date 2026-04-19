/**
 * GET /api/fonts
 *
 * Proxies the Google Fonts Developer API (v1) to keep the API key server-side.
 * Returns all available font families sorted by popularity, shaped for the
 * certificate designer's font picker.
 *
 * Response is cached for 24 hours via HTTP headers so the browser/CDN won't
 * re-fetch on every page load.
 *
 * Falls back to an empty list (not an error) if the API key is not configured,
 * so the font picker degrades gracefully to the bundled CERTIFICATE_FONTS list.
 */

import { NextResponse } from "next/server";

export interface GoogleFont {
  family: string;
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  variants: string[]; // e.g. ["100", "300", "regular", "700", "italic"]
}

const GOOGLE_FONTS_API =
  "https://www.googleapis.com/webfonts/v1/webfonts";

// Module-level cache: avoids redundant fetches within the same serverless
// function instance lifetime (typically seconds–minutes on Vercel).
let cachedFonts: GoogleFont[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  if (!apiKey) {
    // No key configured — return empty so client falls back to bundled list
    return NextResponse.json(
      { fonts: [], source: "fallback" },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  }

  // Return in-process cache if still valid
  if (cachedFonts && Date.now() < cacheExpiry) {
    return NextResponse.json(
      { fonts: cachedFonts, source: "cache" },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }

  try {
    const url = `${GOOGLE_FONTS_API}?key=${encodeURIComponent(apiKey)}&sort=popularity`;
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // Next.js data cache — revalidate after 24h
    });

    if (!res.ok) {
      throw new Error(`Google Fonts API responded ${res.status}`);
    }

    const raw = await res.json() as {
      items: Array<{
        family: string;
        category: string;
        variants: string[];
      }>;
    };

    const fonts: GoogleFont[] = (raw.items ?? []).map((item) => ({
      family: item.family,
      category: item.category as GoogleFont["category"],
      variants: item.variants,
    }));

    cachedFonts = fonts;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    return NextResponse.json(
      { fonts, source: "api" },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch (err) {
    console.error("[/api/fonts] Failed to fetch Google Fonts:", err);
    // Return stale cache rather than erroring the client
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
