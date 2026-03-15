import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/config";

export interface PasswordStatus {
  passwordSetupRequired: boolean;
  email: string;
  role: string;
}

/**
 * Hook to check if the current user needs to set up a password
 * OPTIMIZED: Checks only once on mount, no background refetching
 */
export function usePasswordStatus() {
  return useQuery<PasswordStatus | null>({
    queryKey: ["/api/auth/password-status"],
    queryFn: async () => {
      // Wait for auth session to be available
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session yet, return null to indicate not authenticated
        return null;
      }

      try {
        const response = await apiRequest("GET", "/api/auth/password-status");
        if (!response.ok) {
          console.error("[usePasswordStatus] Failed to fetch password status:", response.status);
          return null;
        }
        return response.json();
      } catch (error: any) {
        console.error("[usePasswordStatus] Error:", error?.message);
        return null;
      }
    },
    staleTime: Infinity, // Never consider stale - prevents auto-refetch
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus
    refetchOnReconnect: false, // Disable auto-refetch on reconnect
    refetchOnMount: false, // Disable auto-refetch on hook mount
    refetchInterval: false, // Disable polling
  });
}

