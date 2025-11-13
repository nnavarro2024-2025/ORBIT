"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const DISABLE_TOASTS_TEMPORARILY = true;
const DISABLE_TOOLTIPS_TEMPORARILY = true;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {DISABLE_TOOLTIPS_TEMPORARILY ? children : <TooltipProvider>{children}</TooltipProvider>}
      {!DISABLE_TOASTS_TEMPORARILY && <Toaster />}
    </QueryClientProvider>
  );
}
