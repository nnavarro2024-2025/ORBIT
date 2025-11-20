import { format } from 'date-fns';
import { SCROLL_HIGHLIGHT_DURATION, SCROLL_RESET_DELAY } from '../../config/constants';

/**
 * Create activity tab change handler
 */
export function createActivityTabChangeHandler(setActivityTab: (tab: 'booking' | 'notifications') => void) {
  return (tab: 'booking' | 'notifications') => {
    setActivityTab(tab);
  };
}

/**
 * Create activity search change handler
 */
export function createActivitySearchChangeHandler(
  setActivitySearchTerm: (term: string) => void,
  setActivityBookingPage: (page: number) => void,
  setActivityNotificationsPage: (page: number) => void
) {
  return (value: string) => {
    setActivitySearchTerm(value);
    setActivityBookingPage(0);
    setActivityNotificationsPage(0);
  };
}

/**
 * Create navigate to booking details handler
 */
export function createNavigateToBookingDetailsHandler(
  setSelectedView: (view: string) => void,
  setScrollToBookingId: (id: string | null) => void
) {
  return (bookingId: string) => {
    setSelectedView('my-bookings');
    setScrollToBookingId(bookingId);
    try { 
      window.location.hash = 'my-bookings'; 
    } catch (_) {}
  };
}

/**
 * Create mark notification read handler
 */
export function createMarkNotificationReadHandler(markNotificationReadMutation: any) {
  return async (notificationId: string) => {
    if (!notificationId) return;
    await markNotificationReadMutation.mutateAsync(notificationId);
  };
}

/**
 * Create cancel booking handler
 */
export function createCancelBookingHandler(
  setBookingToCancel: (booking: any) => void,
  setShowCancelModal: (value: boolean) => void
) {
  return (booking: any) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };
}

/**
 * Create confirm cancel booking handler
 */
export function createConfirmCancelBookingHandler(
  bookingToCancel: any,
  cancelBookingMutation: any,
  getFacilityDisplay: (id: number) => string,
  toast: any,
  setShowCancelModal: (value: boolean) => void,
  setBookingToCancel: (booking: any) => void
) {
  return () => {
    if (bookingToCancel) {
      const bookingSnapshot = bookingToCancel;
      cancelBookingMutation.mutate(bookingToCancel.id, {
        onSuccess: () => {
          const start = new Date(bookingSnapshot.startTime);
          const end = new Date(bookingSnapshot.endTime);
          const now = new Date();
          const facilityName = bookingSnapshot.facility?.name || bookingSnapshot.facilityName || `Facility #${bookingSnapshot.facilityId}`;
          const isActiveWindow = start <= now && now <= end;
          toast({
            title: isActiveWindow ? 'Booking Ended' : 'Booking Cancelled',
            description: `${facilityName} • ${format(start, 'MMM d, yyyy h:mm a')} – ${format(end, 'h:mm a')}`,
          });
          setShowCancelModal(false);
          setBookingToCancel(null);
        },
        onError: (error: any) => {
          toast({ 
            title: 'Cancellation Failed', 
            description: error?.message || 'An error occurred while cancelling the booking.', 
            variant: 'destructive' 
          });
          setShowCancelModal(false);
          setBookingToCancel(null);
        }
      });
    }
  };
}

/**
 * Create cancel cancel booking handler (close modal without action)
 */
export function createCancelCancelBookingHandler(
  setShowCancelModal: (value: boolean) => void,
  setBookingToCancel: (booking: any) => void
) {
  return () => {
    setShowCancelModal(false);
    setBookingToCancel(null);
  };
}

/**
 * Create save edit booking handler
 */
export function createSaveEditBookingHandler(updateBookingMutation: any) {
  return (updatedBooking: any) => {
    return updateBookingMutation.mutateAsync(updatedBooking);
  };
}

/**
 * Create edit booking handler
 */
export function createEditBookingHandler(
  setEditingBooking: (booking: any) => void,
  setShowEditBookingModal: (value: boolean) => void
) {
  return (booking: any) => {
    setEditingBooking(booking);
    setShowEditBookingModal(true);
  };
}

/**
 * Create view all booking history handler
 */
export function createViewAllBookingHistoryHandler(
  setSelectedView: (view: string) => void,
  setActivityTab: (tab: 'booking' | 'notifications') => void
) {
  return () => {
    try { 
      sessionStorage.setItem('openActivityBookingOnce', '1'); 
    } catch (_) {}
    setSelectedView('activity-logs');
    setActivityTab('booking');
    try { 
      window.location.hash = 'activity-logs:booking'; 
    } catch (_) {}
  };
}

/**
 * Create arrival countdown expire handler
 */
export function createArrivalCountdownExpireHandler(
  queryClient: any,
  getFacilityDisplay: (id: number) => string,
  toast: any
) {
  return (booking: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    toast({
      title: 'Arrival Confirmation Expired',
      description: `Your booking for ${getFacilityDisplay(booking.facilityId)} was not confirmed and may be cancelled.`
    });
  };
}

/**
 * Create active countdown expire handler
 */
export function createActiveCountdownExpireHandler(
  queryClient: any,
  getFacilityDisplay: (id: number) => string,
  toast: any
) {
  return (booking: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    toast({
      title: 'Booking Ended',
      description: `Your booking for ${getFacilityDisplay(booking.facilityId)} has ended.`
    });
  };
}

/**
 * Hook for handling scroll to booking with highlight
 */
export function useScrollToBookingEffect(
  scrollToBookingId: string | null,
  selectedView: string,
  setScrollToBookingId: (id: string | null) => void
) {
  if (!scrollToBookingId) return;
  if (selectedView !== 'my-bookings') return;
  
  try {
    const el = document.getElementById(`booking-${scrollToBookingId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-pink-300');
      setTimeout(() => {
        try { 
          el.classList.remove('ring-2', 'ring-pink-300'); 
        } catch (e) {}
      }, SCROLL_HIGHLIGHT_DURATION);
    }
  } catch (e) {}
  
  const t = setTimeout(() => setScrollToBookingId(null), SCROLL_RESET_DELAY);
  return () => clearTimeout(t);
}
