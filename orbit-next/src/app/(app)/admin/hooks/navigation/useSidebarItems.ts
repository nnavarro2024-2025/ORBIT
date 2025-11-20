"use client";

import { useMemo } from "react";
import { BarChart3, Calendar, Users, Shield, HelpCircle, Settings } from "lucide-react";

type User = {
  id: string;
  role?: string;
  email?: string;
} | null;

export function useSidebarItems(authUser: User, isNavigatingToBooking: boolean) {
  return useMemo(() => {
    let items: any[] = [];
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { makeSidebar } = require('@/lib/config');
      const lastItem = (authUser && authUser.role === 'admin') 
        ? { id: 'booking-dashboard', label: 'Booking Dashboard', icon: BarChart3, isLoading: isNavigatingToBooking } 
        : undefined;
      items = makeSidebar(!!authUser && authUser.role === 'admin', lastItem, 'admin');
    } catch (e) {
      // Fallback to static list
      items = [
        { id: 'overview', label: 'Dashboard', icon: BarChart3 },
        { id: 'booking-management', label: 'Facility Booking Management', icon: Calendar },
        { id: 'user-management', label: 'User Management', icon: Users },
        { id: 'security', label: 'System Alerts', icon: Shield },
        { id: 'faq-management', label: 'FAQ Management', icon: HelpCircle },
        { id: 'admin-activity-logs', label: 'Activity Logs', icon: BarChart3 },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ];
      
      if (authUser && authUser.role === 'admin') {
        items.push({ id: 'divider-1', type: 'divider' });
        items.push({ 
          id: 'booking-dashboard', 
          label: 'Booking Dashboard', 
          icon: BarChart3, 
          isLoading: isNavigatingToBooking 
        });
      }
    }
    
    return items;
  }, [authUser, isNavigatingToBooking]);
}
