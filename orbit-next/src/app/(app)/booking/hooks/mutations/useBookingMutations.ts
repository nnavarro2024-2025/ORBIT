import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { format } from 'date-fns';

/**
 * Hook for updating bookings
 */
export function useUpdateBooking(toast: any, setEditingBooking: any) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updatedBooking: any) => {
      const res = await apiRequest("PUT", `/api/bookings/${updatedBooking.id}`, updatedBooking);
      try {
        const text = await res.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return parsed;
          } catch (parseErr) {
            console.warn('[BookingDashboard] updateBookingMutation.mutationFn - failed to parse JSON response', parseErr);
            return text;
          }
        }
        return undefined;
      } catch (e) {
        console.error('[BookingDashboard] updateBookingMutation.mutationFn - error reading response', e);
        return res;
      }
    },
    onSuccess: async (data: any, variables: any) => {
      try {
        if (data && data.id) {
          queryClient.setQueryData(["/api/bookings"], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((b: any) => (b.id === data.id ? data : b));
          });
          setEditingBooking((prev: any) => (prev && prev.id === data.id ? data : prev));
          await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        } else {
          try {
            const res = await apiRequest("GET", "/api/bookings");
            const fresh = await res.json();
            if (Array.isArray(fresh)) {
              queryClient.setQueryData(["/api/bookings"], fresh);
            } else {
              await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            }
          } catch (fetchErr) {
            console.warn('[BookingDashboard] onSuccess fallback fetch failed', fetchErr);
            await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          }
        }
      } catch (e) {
        console.warn('[BookingDashboard] updateBookingMutation.onSuccess handler failed', e);
      }

      try {
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      } catch (activityError) {
        console.warn('[BookingDashboard] Failed to invalidate activity logs after booking update', activityError);
      }

      try {
        const snapshot = (data && data.id) ? data : variables;
        const facilityName = snapshot?.facility?.name || snapshot?.facilityName || `Facility #${snapshot?.facilityId ?? snapshot?.facility_id ?? '—'}`;
        const start = snapshot?.startTime ? new Date(snapshot.startTime) : null;
        const end = snapshot?.endTime ? new Date(snapshot.endTime) : null;
        const description = start && end
          ? `${facilityName} • ${format(start, 'MMM d, yyyy h:mm a')} – ${format(end, 'h:mm a')}`
          : `${facilityName} updated successfully.`;

        toast({
          title: 'Booking Updated',
          description,
        });
      } catch (toastError) {
        console.warn('[BookingDashboard] Failed to show update success toast', toastError);
      }
    },
    onError: (error: any) => {
      let payload = error && error.payload ? error.payload : null;
      if (!payload && error?.message) {
        try {
          const candidate = error.message.replace(/^\d+:\s*/, '');
          payload = JSON.parse(candidate);
        } catch (e) {
          // ignore
        }
      }

      if (payload && payload.conflictingBookings) {
        const facilityName = error.payload.facility?.name || `Facility ${error.payload.facility?.id || ''}`;
        const conflicts = Array.isArray(payload.conflictingBookings) ? payload.conflictingBookings : [];
        const conflictText = conflicts.length > 0
          ? conflicts.map((c: any) => `${new Date(c.startTime).toLocaleString()} - ${new Date(c.endTime).toLocaleString()}`).join('; ')
          : '';
        toast({
          title: 'Time Slot Unavailable',
          description: `${facilityName} has a conflicting booking${conflictText ? `: ${conflictText}` : ''}`,
          variant: 'destructive'
        });
      } else if (error.message && error.message.includes("time slot is already booked")) {
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot is already booked. Please choose a different time.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking Update Failed",
          description: error.message || "An error occurred while updating your booking.",
          variant: "destructive",
        });
      }
    },
  });
}

/**
 * Hook for cancelling bookings
 */
export function useCancelBooking(toast: any) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/bookings/${bookingId}/cancel`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] }),
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "An error occurred while cancelling your booking.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for marking notifications as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => apiRequest('POST', `/api/notifications/${id}/read`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });
}
