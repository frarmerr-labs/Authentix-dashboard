/**
 * PERFORMANCE SMOKE TESTS
 *
 * Measures Time to First Byte (TTFB) and DOM Content Loaded on key public
 * pages. These tests act as a budget gate: if a page regresses significantly
 * in load time, CI fails before it reaches production.
 *
 * Thresholds are intentionally generous for a dev/CI environment (no CDN,
 * cold Node process). Tighten them once you have a staging environment with
 * production-like infrastructure.
 *
 * Metrics captured via the Navigation Timing Level 2 API — no extra packages
 * required.
 */

import { test, expect } from "@playwright/test";

interface NavTimings {
  ttfb: number;
  domContentLoaded: number;
  load: number;
}

async function getNavTimings(
  page: import("@playwright/test").Page
): Promise<NavTimings> {
  return page.evaluate(() => {
    const [entry] = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    if (!entry) return { ttfb: 0, domContentLoaded: 0, load: 0 };
    return {
      ttfb: Math.round(entry.responseStart - entry.requestStart),
      domContentLoaded: Math.round(
        entry.domContentLoadedEventEnd - entry.startTime
      ),
      load: Math.round(entry.loadEventEnd - entry.startTime),
    };
  });
}

// ── Budgets (milliseconds) ────────────────────────────────────────────────────
// These are intentionally relaxed for local/CI cold starts.
// Tighten once a warm staging environment is available.

const BUDGETS = {
  ttfb: 1500,           // Time to First Byte
  domContentLoaded: 4000, // DOMContentLoaded
  load: 6000,           // Full page load
};

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Performance smoke tests", () => {
  test("Login page meets load budget", async ({ page }) => {
    await page.goto("/login");
    const timings = await getNavTimings(page);

    console.log("[perf] /login", timings);

    expect(timings.ttfb, `TTFB exceeded ${BUDGETS.ttfb}ms`).toBeLessThan(
      BUDGETS.ttfb
    );
    expect(
      timings.domContentLoaded,
      `DOMContentLoaded exceeded ${BUDGETS.domContentLoaded}ms`
    ).toBeLessThan(BUDGETS.domContentLoaded);
  });

  test("Signup page meets load budget", async ({ page }) => {
    await page.goto("/signup");
    const timings = await getNavTimings(page);

    console.log("[perf] /signup", timings);

    expect(timings.ttfb, `TTFB exceeded ${BUDGETS.ttfb}ms`).toBeLessThan(
      BUDGETS.ttfb
    );
    expect(
      timings.domContentLoaded,
      `DOMContentLoaded exceeded ${BUDGETS.domContentLoaded}ms`
    ).toBeLessThan(BUDGETS.domContentLoaded);
  });

  test("Root redirect meets TTFB budget", async ({ page }) => {
    const response = await page.goto("/");
    // Accept any redirect chain — just measure the initial response latency.
    const status = response?.status() ?? 0;
    expect([200, 301, 302, 307, 308]).toContain(status);

    const timings = await getNavTimings(page);
    console.log("[perf] /", timings);

    expect(timings.ttfb, `TTFB exceeded ${BUDGETS.ttfb}ms`).toBeLessThan(
      BUDGETS.ttfb
    );
  });
});
