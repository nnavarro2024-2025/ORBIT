import { useEffect, useRef } from 'react';
import type { User, ActivityLog, Facility, FacilityBooking } from '@/shared/schema';

export function useAdminDataSync(
  params: {
    usersDataQ: any[] | undefined;
    activitiesData: any[] | undefined;
    facilitiesData: any[] | undefined;
    adminBookingsData: any[] | undefined;
    currentUserData: any | undefined;
  },
  setters: {
    setUsersData: (users: User[] | undefined) => void;
    setActivities: (activities: ActivityLog[] | undefined) => void;
    setFacilities: (facilities: Facility[] | undefined) => void;
    setUnavailableDatesByFacility: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void | ((next: Record<string, string[]>) => void);
    setUser: (user: any) => void;
  }
) {
  const {
    usersDataQ,
    activitiesData,
    facilitiesData,
    adminBookingsData,
    currentUserData,
  } = params;

  const {
    setUsersData,
    setActivities,
    setFacilities,
    setUnavailableDatesByFacility,
    setUser,
  } = setters;

  const prevUsersDataQRef = useRef<any[] | undefined>(undefined);
  const prevActivitiesDataRef = useRef<any[] | undefined>(undefined);
  const prevFacilitiesDataRef = useRef<any[] | undefined>(undefined);
  const prevAdminBookingsDataRef = useRef<any[] | undefined>(undefined);
  const prevCurrentUserDataRef = useRef<any | undefined>(undefined);

  useEffect(() => {
    try {
      if (!Array.isArray(usersDataQ)) return;
      const prevData = prevUsersDataQRef.current;
      const hasChanged = !prevData || prevData.length !== usersDataQ.length ||
        !prevData.every((u: any, i: number) => String(u?.id) === String(usersDataQ[i]?.id));
      if (!hasChanged) return;
      prevUsersDataQRef.current = usersDataQ;
      setUsersData(usersDataQ as any);
    } catch {}
  }, [usersDataQ, setUsersData]);

  useEffect(() => {
    try {
      if (!Array.isArray(activitiesData)) return;
      const prev = prevActivitiesDataRef.current;
      const hasChanged = !prev || prev.length !== activitiesData.length ||
        !prev.every((a: any, i: number) => String(a?.id) === String(activitiesData[i]?.id));
      if (!hasChanged) return;
      prevActivitiesDataRef.current = activitiesData;
      setActivities(activitiesData as any);
    } catch {}
  }, [activitiesData, setActivities]);

  useEffect(() => {
    try {
      if (!Array.isArray(facilitiesData)) return;

      const prevFacilities = prevFacilitiesDataRef.current;
      const facilitiesChanged = !prevFacilities || prevFacilities.length !== facilitiesData.length ||
        !prevFacilities.every((f: any, i: number) => String(f?.id) === String(facilitiesData[i]?.id));

      const prevAdmin = prevAdminBookingsDataRef.current;
      const adminChanged = !prevAdmin || (Array.isArray(adminBookingsData) && (
        prevAdmin.length !== adminBookingsData.length ||
        !prevAdmin.every((b: any, i: number) => String(b?.id) === String(adminBookingsData[i]?.id))
      ));

      if (!facilitiesChanged && !adminChanged) return;

      prevFacilitiesDataRef.current = facilitiesData;
      if (adminChanged && Array.isArray(adminBookingsData)) {
        prevAdminBookingsDataRef.current = adminBookingsData;
      }

      setFacilities(facilitiesData as any);

      const newUnavailable: Record<string, string[]> = {};
      for (const f of facilitiesData) {
        if (Array.isArray((f as any).unavailableDates)) {
          const dates: string[] = [];
          for (const range of (f as any).unavailableDates) {
            if (range && range.startDate && range.endDate) {
              const start = new Date(range.startDate);
              const end = new Date(range.endDate);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dates.push(`${yyyy}-${mm}-${dd}`);
              }
            }
          }
          newUnavailable[(f as any).id] = dates;
        }
      }

      try {
        if (Array.isArray(adminBookingsData)) {
          for (const b of adminBookingsData) {
            try {
              if (!b) continue;
              const status = String((b as any).status || '').toLowerCase();
              if (status !== 'approved' && status !== 'pending') continue;
              const facilityId = (b as any).facilityId;
              const st = new Date((b as any).startTime);
              if (Number.isNaN(st.getTime())) continue;
              const yyyy = st.getFullYear();
              const mm = String(st.getMonth() + 1).padStart(2, '0');
              const dd = String(st.getDate()).padStart(2, '0');
              const dateKey = `${yyyy}-${mm}-${dd}`;
              const key = String(facilityId);
              if (!newUnavailable[key]) newUnavailable[key] = [];
              if (!newUnavailable[key].includes(dateKey)) newUnavailable[key].push(dateKey);
            } catch {}
          }
        }
      } catch {}

      setUnavailableDatesByFacility(() => newUnavailable);
    } catch {}
  }, [facilitiesData, adminBookingsData, setFacilities, setUnavailableDatesByFacility]);

  useEffect(() => {
    try {
      if (!currentUserData) return;
      const prev = prevCurrentUserDataRef.current;
      const hasChanged = !prev || String((currentUserData as any)?.id) !== String(prev?.id) ||
        String((currentUserData as any)?.email) !== String(prev?.email);
      if (!hasChanged) return;
      prevCurrentUserDataRef.current = currentUserData;
      setUser(currentUserData);
    } catch {}
  }, [currentUserData, setUser]);
}
