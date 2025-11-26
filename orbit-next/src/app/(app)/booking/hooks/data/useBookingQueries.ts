import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { AVAILABILITY_STALE_TIME, NOTIFICATIONS_STALE_TIME } from '../../config/constants';

/**
 * Hook to fetch facilities
 */
export function useFacilities() {
  return useQuery<any[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facilities");
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch availability data
 */
export function useAvailability(todayDateStr: string, user: any, authLoading: boolean) {
  return useQuery({
    queryKey: ['/api/availability', todayDateStr],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${todayDateStr}`);
      return res.json();
    },
    staleTime: AVAILABILITY_STALE_TIME,
    enabled: !!user && !authLoading,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch user bookings
 */
export function useUserBookings(user: any, authLoading: boolean) {
  return useQuery<any[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      return response.json();
    },
    enabled: !!user && !authLoading,
    staleTime: 0,
  });
}

/**
 * Hook to fetch all approved bookings
 */
export function useAllBookings(user: any, authLoading: boolean) {
  return useQuery<any[]>({
    queryKey: ["/api/bookings/all"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings/all");
      return response.json();
    },
    enabled: !!user && !authLoading,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to fetch notifications
 */
export function useNotifications(user: any, authLoading: boolean) {
  return useQuery<any[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications');
      try { 
        return await res.json(); 
      } catch { 
        return []; 
      }
    },
    enabled: !!user && !authLoading,
    staleTime: NOTIFICATIONS_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
