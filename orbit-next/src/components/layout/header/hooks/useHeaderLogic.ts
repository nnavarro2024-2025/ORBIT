/**
 * useHeaderLogic Hook
 * 
 * Manages header state and handlers
 */

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/config";
import { useAuth } from "@/hooks/data";
import { useToast } from "@/hooks/ui";
import { useLegacyLocation } from "@/lib/utils";
import { useHeaderAlerts, useAlertVisibility, useHeaderSearch } from './useHeaderAlerts';
import { useQueryClient } from "@tanstack/react-query";

export function useHeaderLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLegacyLocation();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Determine user role and context
  const isAdmin = !!(user && user.role === 'admin');
  const isOnBookingDashboard = pathname?.startsWith('/booking');

  // Use custom hooks for alert management
  const { hiddenAlertIds, hiddenAlertIdsVersion, hideAlert } = useAlertVisibility(user?.id);
  
  const { alertsData, alertsLoading, markAsRead } = useHeaderAlerts({
    user,
    isAdmin,
    isOnBookingDashboard,
  });

  const {
    allFacilities,
    allBookings,
    userBookings,
  } = useHeaderSearch(user);

  // Logout handler - comprehensive cleanup to prevent back button access
  const handleLogout = useCallback(async () => {
    try {
      // Clear all client-side caches and storage
      // 1. Clear React Query cache to remove all cached data
      queryClient.clear();
      
      // 2. Clear session storage to remove any session data
      try {
        sessionStorage.clear();
      } catch (e) {
        console.error("Error clearing sessionStorage:", e);
      }
      
      // 3. Clear all cookies and auth data
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      
      // 4. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
        toast({
          title: "Logout Error",
          description: "There was an error logging out. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // 5. Show success message
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      // 6. Disable back button by replacing history state
      // This prevents the browser back button from showing cached pages
      window.history.pushState(null, "", window.location.href);
      window.addEventListener('popstate', () => {
        window.history.pushState(null, "", window.location.href);
      });
      
      // 7. Force a hard redirect (clears page cache)
      // Use window.location to trigger full page refresh (not Next.js navigation)
      // This ensures the page is re-fetched from server with new auth state
      window.location.href = "/login";
      
    } catch (err) {
      console.error("Logout error:", err);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, setLocation, queryClient]);

  return {
    user,
    isAdmin,
    alertsData,
    alertsLoading,
    hiddenAlertIds,
    hiddenAlertIdsVersion,
    allFacilities,
    allBookings,
    userBookings,
    markAsRead,
    hideAlert,
    handleLogout,
  };
}
