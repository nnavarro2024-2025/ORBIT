import { useMemo } from "react";
import { FacilityBooking, Facility } from "@shared/schema";
import { getTimestamp, getIsoWeekLabel, formatIsoWeekLabel } from "@admin";

type DepartmentChartDatum = { name: string; value: number };
type FacilityUtilizationDatum = { name: string; hours: number; bookings: number };
type WeeklyTrendDatum = { week: string; total: number; approved: number; pending: number };

function abbreviateFacilityName(name: string | null | undefined): string {
  if (!name) return 'N/A';
  const str = String(name).trim();
  if (str.toLowerCase().includes('laboratory') || str.toLowerCase().includes('lab')) return 'Lab';
  if (str.toLowerCase().includes('multifunction')) return 'MF Hall';
  if (str.toLowerCase().includes('conference') || str.toLowerCase().includes('conf')) return 'Conf Rm';
  if (str.toLowerCase().includes('classroom')) return 'Classroom';
  if (str.toLowerCase().includes('auditorium') || str.toLowerCase().includes('audi')) return 'Audi';
  if (str.length > 15) return str.slice(0, 12) + '...';
  return str;
}

export function useAnalyticsData(
  allBookings: FacilityBooking[],
  facilities: Facility[],
  getFacilityName: (id: string) => string | null
) {
  const departmentChartData = useMemo<DepartmentChartDatum[]>(() => {
    if (!allBookings.length) return [];
    const counts = new Map<string, number>();
    for (const booking of allBookings) {
      const facilityId = booking?.facilityId;
      const facilityName = getFacilityName(String(facilityId || 'unknown')) || 'Unspecified';
      const displayName = abbreviateFacilityName(facilityName);
      counts.set(displayName, (counts.get(displayName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [allBookings, facilities]);

  const facilityUtilizationData = useMemo<FacilityUtilizationDatum[]>(() => {
    if (!allBookings.length) return [];
    const map = new Map<string, FacilityUtilizationDatum>();
    for (const booking of allBookings) {
      const start = booking?.startTime ? new Date(booking.startTime) : null;
      const end = booking?.endTime ? new Date(booking.endTime) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
      const facilityId = booking?.facilityId ?? `unknown-${booking.id}`;
      const key = String(facilityId);
      const facilityName = getFacilityName(String(facilityId)) || `Facility ${key}`;
      const displayName = abbreviateFacilityName(facilityName);
      const current = map.get(key) ?? { name: displayName, hours: 0, bookings: 0 };
      current.hours += hours;
      current.bookings += 1;
      current.name = displayName; // ensure latest friendly name
      map.set(key, current);
    }
    return Array.from(map.values())
      .filter(item => item.hours > 0 || item.bookings > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10)
      .map(item => ({ ...item, hours: Math.round(item.hours * 10) / 10 }));
  }, [allBookings, facilities]);

  const weeklyTrendData = useMemo<WeeklyTrendDatum[]>(() => {
    if (!allBookings.length) return [];
    const bucket = new Map<string, { total: number; approved: number; pending: number }>();
    for (const booking of allBookings) {
      if (!booking?.startTime) continue;
      const start = new Date(booking.startTime);
      if (Number.isNaN(start.getTime())) continue;
      const weekLabel = getIsoWeekLabel(start);
      const entry = bucket.get(weekLabel) ?? { total: 0, approved: 0, pending: 0 };
      entry.total += 1;
      const status = String(booking.status || '').toLowerCase();
      if (status === 'approved') entry.approved += 1;
      if (status === 'pending') entry.pending += 1;
      bucket.set(weekLabel, entry);
    }
    const sorted = Array.from(bucket.entries()).sort((a, b) => {
      const [aYear, aWeek] = a[0].split('-W').map(Number);
      const [bYear, bWeek] = b[0].split('-W').map(Number);
      return aYear === bYear ? aWeek - bWeek : aYear - bYear;
    });
    const trimmed = sorted.slice(-12);
    return trimmed.map(([week, counts]) => ({
      week: formatIsoWeekLabel(week),
      total: counts.total,
      approved: counts.approved,
      pending: counts.pending,
    }));
  }, [allBookings]);

  return {
    departmentChartData,
    facilityUtilizationData,
    weeklyTrendData,
  };
}
