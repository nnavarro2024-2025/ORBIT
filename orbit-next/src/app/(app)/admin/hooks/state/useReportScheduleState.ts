import { useState, useMemo } from "react";
import type { ReportSchedule } from "@shared/schema";

export type ScheduleFilter = "all" | "active" | "paused";
export type ScheduleSort = "next-run" | "name";

export function useReportScheduleState() {
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [scheduleSort, setScheduleSort] = useState<ScheduleSort>("next-run");
  const [schedulePaginationPage, setSchedulePaginationPage] = useState(0);
  const [scheduleToEdit, setScheduleToEdit] = useState<ReportSchedule | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ReportSchedule | null>(null);
  const [scheduleActionLoadingId, setScheduleActionLoadingId] = useState<string | null>(null);

  const pageSize = 10;

  return {
    scheduleSearchTerm,
    setScheduleSearchTerm,
    scheduleFilter,
    setScheduleFilter,
    scheduleSort,
    setScheduleSort,
    schedulePaginationPage,
    setSchedulePaginationPage,
    scheduleToEdit,
    setScheduleToEdit,
    deleteScheduleTarget,
    setDeleteScheduleTarget,
    scheduleActionLoadingId,
    setScheduleActionLoadingId,
    pageSize,
  };
}

export function useReportScheduleFiltering(
  reportSchedules: ReportSchedule[],
  scheduleSearchTerm: string,
  scheduleFilter: ScheduleFilter,
  scheduleSort: ScheduleSort,
  schedulePaginationPage: number,
  pageSize: number
) {
  const normalizedSearch = scheduleSearchTerm.toLowerCase().trim();

  const filteredReportSchedules = useMemo(() => {
    let filtered = reportSchedules;

    // Apply search filter
    if (normalizedSearch) {
      filtered = filtered.filter(
        (s) =>
          s.reportType?.toLowerCase().includes(normalizedSearch) ||
          s.description?.toLowerCase().includes(normalizedSearch) ||
          s.emailRecipients?.toLowerCase().includes(normalizedSearch)
      );
    }

    // Apply status filter
    if (scheduleFilter === "active") {
      filtered = filtered.filter((s) => s.isActive);
    } else if (scheduleFilter === "paused") {
      filtered = filtered.filter((s) => !s.isActive);
    }

    // Apply sorting
    if (scheduleSort === "next-run") {
      filtered = [...filtered].sort((a, b) => {
        if (!a.nextRunAt) return 1;
        if (!b.nextRunAt) return -1;
        return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
      });
    } else if (scheduleSort === "name") {
      filtered = [...filtered].sort((a, b) => {
        const nameA = a.reportType || "";
        const nameB = b.reportType || "";
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [reportSchedules, normalizedSearch, scheduleFilter, scheduleSort]);

  const paginatedReportSchedules = useMemo(() => {
    const start = schedulePaginationPage * pageSize;
    const end = start + pageSize;
    return filteredReportSchedules.slice(start, end);
  }, [filteredReportSchedules, schedulePaginationPage, pageSize]);

  const totalSchedulePages = Math.ceil(filteredReportSchedules.length / pageSize);
  const schedulesHasFilters = normalizedSearch.length > 0 || scheduleFilter !== "all";

  return {
    filteredReportSchedules,
    paginatedReportSchedules,
    totalSchedulePages,
    schedulesHasFilters,
  };
}
