import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getDateRange } from "@admin";

export function useFacilityMutations(
  setUnavailableDatesByFacility: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
) {
  const queryClient = useQueryClient();

  const toggleFacilityAvailabilityMutation = useMutation({
    mutationFn: async ({ facilityId, available, reason, startDate, endDate }: any) => {
      const payload: any = { isActive: available };
      if (available === true) {
        payload.clearUnavailable = true;
      }
      if (reason) payload.reason = reason;
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      console.log('[AdminDashboard] Sending PUT /api/admin/facilities/:facilityId/availability', { facilityId, payload });
      const res = await apiRequest('PUT', `/api/admin/facilities/${facilityId}/availability`, payload);
      return res.json?.();
    },
    onSuccess: async (_data, variables) => {
      if (variables && !variables.available && variables.startDate) {
        setUnavailableDatesByFacility(prev => {
          const prevDates = prev[variables.facilityId] || [];
          const newDates = [
            ...prevDates,
            ...(variables.startDate && variables.endDate
              ? getDateRange(variables.startDate, variables.endDate)
              : variables.startDate ? [variables.startDate] : []),
          ];
          return { ...prev, [variables.facilityId]: Array.from(new Set(newDates)) };
        });
      } else if (variables && variables.available === true) {
        setUnavailableDatesByFacility(prev => ({ ...prev, [variables.facilityId]: [] }));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/facilities'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/availability'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: string) => apiRequest('POST', `/api/admin/alerts/${alertId}/read`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  return {
    toggleFacilityAvailabilityMutation,
    markAlertReadMutation,
  };
}
