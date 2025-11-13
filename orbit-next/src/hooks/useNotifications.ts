"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

// Stable empty array to prevent unnecessary re-renders
const EMPTY_ARRAY: any[] = [];

interface UseNotificationsOptions {
  enabled: boolean;
  isAdmin: boolean;
}

interface UseNotificationsResult {
  adminAlerts: any[];
  userAlerts: any[];
  ownerAdminAlerts: any[];
  isLoadingAdminAlerts: boolean;
  isLoadingUserAlerts: boolean;
  markAsRead: (alertId: string) => Promise<void>;
}

export function useNotifications({ enabled, isAdmin }: UseNotificationsOptions): UseNotificationsResult {
  const queryClient = useQueryClient();

  const adminAlertsQuery = useQuery({
    queryKey: ["/api/admin/alerts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/alerts");
      try {
        return await res.json();
      } catch {
        return [];
      }
    },
    enabled: enabled && isAdmin,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const userAlertsQuery = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      try {
        return await res.json();
      } catch {
        return [];
      }
    },
    enabled: enabled && !isAdmin,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const ownerAdminAlertsQuery = useQuery({
    queryKey: ["/api/admin/alerts", "for-owner"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/alerts");
        return await res.json();
      } catch {
        return [];
      }
    },
    enabled: enabled && !isAdmin,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const endpoint = isAdmin ? `/api/admin/alerts/${alertId}/read` : `/api/notifications/${alertId}/read`;
      // Use apiRequest which handles authentication - don't try to read response body
      try {
        await apiRequest("POST", endpoint);
      } catch (error: any) {
        // If error is about body stream, ignore it - the request likely succeeded
        if (error?.message?.includes('body stream already read')) {
          console.warn('[markAsRead] Ignoring body stream error, request likely succeeded');
          return { success: true };
        }
        throw error;
      }
      return { success: true };
    },
    onMutate: async (alertId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/alerts"] });
      await queryClient.cancelQueries({ queryKey: ["/api/notifications"] });

      const prevAdmin = queryClient.getQueryData<any[]>(["/api/admin/alerts"]);
      const prevUser = queryClient.getQueryData<any[]>(["/api/notifications"]);

      const updateList = (list: any[] | undefined) => {
        if (!Array.isArray(list)) return list;
        return list
          .map((alert) => (alert?.id === alertId ? { ...alert, isRead: true } : alert))
          .filter((alert) => {
            // Hide equipment notifications once marked as read
            if (alert?.id === alertId && alert?.isRead && alert?.title && 
                (alert.title.includes('Equipment') || alert.title.includes('Needs'))) {
              return false;
            }
            return true;
          });
      };

      queryClient.setQueryData(["/api/admin/alerts"], (old: any) => updateList(old));
      queryClient.setQueryData(["/api/notifications"], (old: any) => updateList(old));

      return { prevAdmin, prevUser };
    },
    onError: (_error, _alertId, context) => {
      if (context?.prevAdmin) {
        queryClient.setQueryData(["/api/admin/alerts"], context.prevAdmin);
      }
      if (context?.prevUser) {
        queryClient.setQueryData(["/api/notifications"], context.prevUser);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const markAsRead = async (alertId: string) => {
    await markAsReadMutation.mutateAsync(alertId);
  };

  return {
    adminAlerts: adminAlertsQuery.data ?? EMPTY_ARRAY,
    userAlerts: userAlertsQuery.data ?? EMPTY_ARRAY,
    ownerAdminAlerts: ownerAdminAlertsQuery.data ?? EMPTY_ARRAY,
    isLoadingAdminAlerts: adminAlertsQuery.isLoading,
    isLoadingUserAlerts: userAlertsQuery.isLoading,
    markAsRead,
  };
}
