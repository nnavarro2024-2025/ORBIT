"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  setUserTab: (tab: string) => void;
  setSecurityTab: (tab: string) => void;
  setSettingsTab: (tab: string) => void;
  setSelectedView: (view: string) => void;
  setLocation: (path: string) => void;
  setIsNavigatingToBooking: (value: boolean) => void;
};

export function useSidebarClickHandler({
  setUserTab,
  setSecurityTab,
  setSettingsTab,
  setSelectedView,
  setLocation,
  setIsNavigatingToBooking,
}: Props) {
  const queryClient = useQueryClient();

  return useCallback(async (id: string) => {
    // Set default tabs for complex sections
    if (id === 'user-management') {
      setUserTab('booking-users');
    }
    if (id === 'security') {
      setSecurityTab('booking');
    }
    if (id === 'settings') {
      setSettingsTab('facilities');
    }
    
    // Handle new booking navigation
    if (id === 'new-booking') {
      setLocation('/booking#new');
      return;
    }
    
    // Handle booking dashboard navigation
    if (id === 'booking-dashboard') {
      setIsNavigatingToBooking(true);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/facilities"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/bookings/all"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/availability"] }),
        ]);
        setLocation('/booking#dashboard');
      } catch (error) {
        console.error('Error invalidating queries:', error);
        setLocation('/booking#dashboard');
      } finally {
        setIsNavigatingToBooking(false);
      }
      return;
    }
    
    // Handle admin activity logs
    if (id === 'admin-activity-logs') {
      setSettingsTab('history');
      setSelectedView('admin-activity-logs');
      return;
    }
    
    setSelectedView(id);
  }, [setUserTab, setSecurityTab, setSettingsTab, setSelectedView, setLocation, setIsNavigatingToBooking, queryClient]);
}
