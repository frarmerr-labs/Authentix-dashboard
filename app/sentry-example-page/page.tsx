"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryExamplePage() {
  const [hasThrownError, setHasThrownError] = useState(false);

  const throwError = () => {
    setHasThrownError(true);
    throw new Error("Sentry Example Frontend Error");
  };

  const triggerApiError = async () => {
    const res = await fetch("/api/sentry-example-api");
    const data = await res.json();
    if (!res.ok) {
      Sentry.captureMessage(`API error: ${JSON.stringify(data)}`, "error");
    }
    alert(JSON.stringify(data));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sentry Example</h1>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        Use these buttons to verify Sentry is capturing errors correctly.
        Check your{" "}
        <a
          href="https://authentix.sentry.io/issues/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Sentry Issues
        </a>{" "}
        after triggering.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={throwError}
          disabled={hasThrownError}
          className="rounded-md bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Throw Frontend Error
        </button>

        <button
          onClick={triggerApiError}
          className="rounded-md bg-orange-600 px-4 py-2 text-white text-sm font-medium hover:bg-orange-700"
        >
          Trigger API Route Error
        </button>
      </div>

      {hasThrownError && (
        <p className="text-red-500 text-sm">
          Error thrown — check Sentry Issues dashboard.
        </p>
      )}
    </main>
  );
}
