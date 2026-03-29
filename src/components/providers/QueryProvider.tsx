'use client';

/**
 * QUERY PROVIDER
 *
 * Wraps the app with TanStack Query's QueryClientProvider.
 * Must be a Client Component because QueryClient is browser-side state.
 *
 * Default query config:
 *   staleTime   30 s  — data considered fresh for 30 seconds after fetch
 *   retry       2     — retry failed queries twice before showing error
 *   refetchOnWindowFocus false — no surprise refetches on tab switch
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures each render context gets its own QueryClient instance
  // (important for SSR correctness — avoids shared state across requests)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,        // 30 seconds
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
