"use client";

import { Dispatch, SetStateAction } from "react";
import { CalendarClock, PenSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { ReportSchedule } from "@shared/schema";
import { AdminSearchBar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkeletonTableRows } from "@/components/ui/skeleton-presets";
import { cn } from "@/lib/utils";

export type ScheduleFilter = "all" | "active" | "paused";
export type ScheduleSort = "next-run" | "name";

export interface ReportSchedulesSectionProps {
  scheduleSearchTerm: string;
  onScheduleSearchChange: (value: string) => void;
  scheduleFilter: ScheduleFilter;
  onScheduleFilterChange: (value: ScheduleFilter) => void;
  scheduleSort: ScheduleSort;
  onScheduleSortChange: (value: ScheduleSort) => void;
  reportSchedulesLoading: boolean;
  reportSchedulesError: boolean;
  filteredReportSchedules: ReportSchedule[];
  paginatedReportSchedules: ReportSchedule[];
  schedulePaginationPage: number;
  totalSchedulePages: number;
  onSchedulePaginationPrev: () => void;
  onSchedulePaginationNext: () => void;
  pageSize: number;
  schedulesHasFilters: boolean;
  openCreateScheduleModal: () => void;
  openEditScheduleModal: (schedule: ReportSchedule) => void;
  setDeleteScheduleTarget: Dispatch<SetStateAction<ReportSchedule | null>>;
  scheduleActionLoadingId: string | null;
  handleToggleScheduleActive: (schedule: ReportSchedule, checked?: boolean) => void;
  formatDateTime: (value: any) => string;
  formatScheduleFrequencyText: (
    schedule: { frequency?: string | null; dayOfWeek?: number | null; timeOfDay?: string | null }
  ) => string;
  extractRecipientList: (recipients?: string | null) => string[];
  weekdayLabels: string[];
}

export function ReportSchedulesSection({
  scheduleSearchTerm,
  onScheduleSearchChange,
  scheduleFilter,
  onScheduleFilterChange,
  scheduleSort,
  onScheduleSortChange,
  reportSchedulesLoading,
  reportSchedulesError,
  filteredReportSchedules,
  paginatedReportSchedules,
  schedulePaginationPage,
  totalSchedulePages,
  onSchedulePaginationPrev,
  onSchedulePaginationNext,
  pageSize,
  schedulesHasFilters,
  openCreateScheduleModal,
  openEditScheduleModal,
  setDeleteScheduleTarget,
  scheduleActionLoadingId,
  handleToggleScheduleActive,
  formatDateTime,
  formatScheduleFrequencyText,
  extractRecipientList,
  weekdayLabels,
}: ReportSchedulesSectionProps) {
  const showingStart = schedulePaginationPage * pageSize + 1;
  const showingEnd = Math.min((schedulePaginationPage + 1) * pageSize, filteredReportSchedules.length);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-pink-600" />
                Report Schedules
              </h2>
              <p className="text-sm text-gray-600">
                Automate delivery of admin insights with recurring PDF reports.
              </p>
              <div className="space-y-2">
                <AdminSearchBar
                  value={scheduleSearchTerm}
                  onChange={onScheduleSearchChange}
                  placeholder="Search schedules..."
                  ariaLabel="Search report schedules"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2">
                  <Select value={scheduleFilter} onValueChange={(val: ScheduleFilter) => onScheduleFilterChange(val)}>
                    <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active only</SelectItem>
                      <SelectItem value="paused">Paused only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={scheduleSort} onValueChange={(val: ScheduleSort) => onScheduleSortChange(val)}>
                    <SelectTrigger className="w-full sm:w-[150px]" aria-label="Sort schedules">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="next-run">Next run first</SelectItem>
                      <SelectItem value="name">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={openCreateScheduleModal}
                className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add schedule
              </Button>
            </div>
          </div>
        </div>
      </div>

      {reportSchedulesLoading ? (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <SkeletonTableRows rows={5} />
        </div>
      ) : reportSchedulesError ? (
        <div className="py-10 text-center text-red-600">
          Failed to load report schedules. Please try again.
        </div>
      ) : filteredReportSchedules.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <CalendarClock className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            {schedulesHasFilters
              ? "No schedules match your search criteria. Try adjusting filters or clearing the search field."
              : "No report schedules have been configured yet. Create one to begin automated reporting."}
          </p>
          <div className="mt-4">
            <Button
              onClick={openCreateScheduleModal}
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Create your first schedule
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[220px]">Report name</TableHead>
                  <TableHead className="min-w-[160px]">Frequency</TableHead>
                  <TableHead className="hidden md:table-cell w-[160px]">Next run</TableHead>
                  <TableHead className="hidden lg:table-cell w-[200px]">Recipients</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="w-[150px] text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReportSchedules.map((schedule) => {
                  const nextRun = schedule.nextRunAt ? formatDateTime(schedule.nextRunAt) : "Not set";
                  const lastRun = schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : "—";
                  const recipients = extractRecipientList(schedule.emailRecipients).join(", ") || "—";
                  const isPending = scheduleActionLoadingId === String(schedule.id);

                  return (
                    <TableRow key={schedule.id} className="align-top">
                      <TableCell>
                        <div className="font-medium text-gray-900 truncate" title={schedule.reportType}>
                          {schedule.reportType}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last run <span className="font-medium text-gray-700">{lastRun}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-800">{formatScheduleFrequencyText(schedule)}</div>
                        {schedule.frequency === "weekly" &&
                          schedule.dayOfWeek !== null &&
                          schedule.dayOfWeek !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              Runs on {weekdayLabels[schedule.dayOfWeek] ?? `Day ${schedule.dayOfWeek}`}
                            </div>
                          )}
                        {schedule.timeOfDay && (
                          <div className="text-xs text-gray-500">at {schedule.timeOfDay}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-middle">
                        <div className="text-sm font-medium text-gray-800">{nextRun}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-middle">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">{recipients}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell align-middle">
                        <div className="text-sm text-gray-600 whitespace-pre-wrap break-words min-h-[1.5rem]">
                          {schedule.description || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <Switch
                            checked={schedule.isActive !== false}
                            onCheckedChange={(val) => handleToggleScheduleActive(schedule, val)}
                            disabled={isPending}
                            aria-label={schedule.isActive !== false ? "Pause schedule" : "Activate schedule"}
                            className={cn(
                              "data-[state=checked]:bg-pink-600",
                              isPending && "opacity-50 cursor-not-allowed"
                            )}
                          />
                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                              <span className="text-xs text-gray-500">Updating...</span>
                            </div>
                          ) : (
                            <Badge
                              className={
                                schedule.isActive !== false
                                  ? "bg-pink-50 text-pink-700 border border-pink-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
                              }
                            >
                              {schedule.isActive !== false ? "Active" : "Paused"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Edit schedule"
                            onClick={() => openEditScheduleModal(schedule)}
                            disabled={isPending}
                          >
                            <PenSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Delete schedule"
                            onClick={() => setDeleteScheduleTarget(schedule)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalSchedulePages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {showingStart} - {showingEnd} of {filteredReportSchedules.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSchedulePaginationPrev}
                  disabled={schedulePaginationPage === 0}
                >
                  Previous
                </Button>
                <div className="text-xs text-gray-500">
                  Page {schedulePaginationPage + 1} of {totalSchedulePages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSchedulePaginationNext}
                  disabled={schedulePaginationPage >= totalSchedulePages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
