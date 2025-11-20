import { useMemo } from "react";
import { FacilityBooking } from "@shared/schema";
import { getTimestamp } from "@admin";

export function useBookingLists(
  allBookings: FacilityBooking[],
  pendingBookingsData: unknown,
  filterByFacility: (bookings: FacilityBooking[]) => FacilityBooking[],
  compareFacility: (a: FacilityBooking, b: FacilityBooking) => number
) {
  const activeBookings: FacilityBooking[] = useMemo(() => {
    const base = allBookings.filter(b => b.status === 'approved' && getTimestamp(b.startTime) <= Date.now() && getTimestamp(b.endTime) >= Date.now());
    const filtered = filterByFacility(base);
    return filtered.slice().sort((a, b) => {
      const facilityComparison = compareFacility(a, b);
      if (facilityComparison !== 0) return facilityComparison;
      return getTimestamp(a.startTime) - getTimestamp(b.startTime);
    });
  }, [allBookings, filterByFacility, compareFacility]);

  const upcomingBookings: FacilityBooking[] = useMemo(() => {
    const futureApproved = allBookings.filter(b => b.status === 'approved' && getTimestamp(b.startTime) > Date.now());
    const pendingFuture = Array.isArray(pendingBookingsData) ? pendingBookingsData.filter((b: any) => getTimestamp(b.startTime) > Date.now()) : [];
    const merged = [...futureApproved, ...pendingFuture] as FacilityBooking[];
    const filtered = filterByFacility(merged);
    return filtered.slice().sort((a, b) => {
      const facilityComparison = compareFacility(a, b);
      if (facilityComparison !== 0) return facilityComparison;
      return getTimestamp(a.startTime) - getTimestamp(b.startTime);
    });
  }, [allBookings, pendingBookingsData, filterByFacility, compareFacility]);

  const recentBookings: FacilityBooking[] = useMemo(() => {
    const base = allBookings.filter(b => {
      if (b.status === 'denied') return true;
      if (b.status === 'cancelled' || b.status === 'canceled' || b.status === 'expired' || b.status === 'void') return true;
      if (b.status === 'approved') {
        return getTimestamp(b.endTime) < Date.now();
      }
      return false;
    });
    const filtered = filterByFacility(base);
    return filtered.slice().sort((a, b) => {
      const facilityComparison = compareFacility(a, b);
      if (facilityComparison !== 0) return facilityComparison;
      return getTimestamp(b.createdAt || b.startTime) - getTimestamp(a.createdAt || a.startTime);
    });
  }, [allBookings, filterByFacility, compareFacility]);

  const pendingBookings: FacilityBooking[] = useMemo(() => {
    const base = Array.isArray(pendingBookingsData) ? pendingBookingsData : [];
    const filtered = filterByFacility(base as FacilityBooking[]);
    return filtered.slice().sort((a, b) => {
      const facilityComparison = compareFacility(a, b);
      if (facilityComparison !== 0) return facilityComparison;
      return getTimestamp(a.startTime) - getTimestamp(b.startTime);
    });
  }, [pendingBookingsData, filterByFacility, compareFacility]);

  // Deduplicate scheduled bookings count: union of upcoming (approved future + pending API) and any pending items
  const scheduledCount = useMemo(() => {
    const scheduledSet = new Set<string>();
    try {
      for (const b of upcomingBookings) {
        if (b && b.id) scheduledSet.add(String(b.id));
      }
      for (const b of pendingBookings) {
        if (b && b.id) scheduledSet.add(String(b.id));
      }
    } catch (e) {
      // ignore
    }
    return scheduledSet.size;
  }, [upcomingBookings, pendingBookings]);

  return {
    activeBookings,
    upcomingBookings,
    recentBookings,
    pendingBookings,
    scheduledCount,
  };
}
