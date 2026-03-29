import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // OpenTelemetry: activate when @vercel/otel is installed
    try {
      const { registerOTel } = await import("@vercel/otel");
      registerOTel({
        serviceName: process.env.OTEL_SERVICE_NAME ?? "authentix-dashboard",
      });
    } catch {
      // @vercel/otel not installed — tracing disabled but app runs normally
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
