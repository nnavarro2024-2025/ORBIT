import { useCallback, useMemo, useState } from "react";
import type { FacilityBooking } from "@shared/schema";

export type GetFacilityName = (id: any) => string;

export function useFacilityFilters(
  facilities: any[] | undefined,
  getFacilityName: GetFacilityName
) {
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [facilitySort, setFacilitySort] = useState<"asc" | "desc">("desc");

  const facilityOptions = useMemo(() => {
    const list = (facilities || []).map((f: any) => ({ id: String(f.id), name: String(f.name || `Facility ${f.id}`) }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities]);

  const filterByFacility = useCallback(
    (bookings: FacilityBooking[]) => {
      if (facilityFilter === "all") return bookings;
      const target = facilityFilter;
      return bookings.filter(b => String(b.facilityId) === String(target));
    },
    [facilityFilter]
  );

  const compareFacility = useCallback(
    (a: FacilityBooking, b: FacilityBooking) => {
      const aName = String(getFacilityName(a.facilityId) || "").trim();
      const bName = String(getFacilityName(b.facilityId) || "").trim();
      const aEmpty = !aName;
      const bEmpty = !bName;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const comparison = aName.toLowerCase().localeCompare(bName.toLowerCase(), undefined, { sensitivity: 'base' });
      return facilitySort === 'asc' ? comparison : -comparison;
    },
    [facilitySort, getFacilityName]
  );

  const toggleFacilitySort = useCallback(() => {
    setFacilitySort(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  return {
    facilityFilter,
    setFacilityFilter,
    facilitySort,
    setFacilitySort,
    toggleFacilitySort,
    facilityOptions,
    filterByFacility,
    compareFacility,
  };
}
