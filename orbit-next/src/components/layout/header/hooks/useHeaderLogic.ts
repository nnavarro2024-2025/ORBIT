/**
 * useHeaderLogic Hook
 * 
 * Manages header state and handlers
 */

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/config";
import { useAuth } from "@/hooks/data";
import { useToast } from "@/hooks/ui";
import { useLegacyLocation } from "@/lib/utils";
import { useHeaderAlerts, useAlertVisibility, useHeaderSearch } from './useHeaderAlerts';

export function useHeaderLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLegacyLocation();
  const pathname = usePathname();

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

  // Logout handler
  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      toast({
        title: "Logout Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/login");
    }
  }, [toast, setLocation]);

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
