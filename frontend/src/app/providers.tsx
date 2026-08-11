"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { usePathname } from "next/navigation";

const FULLSCREEN_ROUTES = ["/auth"];

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchInterval: 8000,
            retry: 1,
          },
        },
      })
  );

  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      {isFullscreen ? children : <AppShell>{children}</AppShell>}
    </QueryClientProvider>
  );
}
