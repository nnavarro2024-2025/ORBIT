import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

type WarningMessage = {
  title: string;
  description: string;
};

type ConflictEntry = {
  id?: string;
  startTime: string | Date;
  endTime: string | Date;
  facilityName?: string;
  facility?: { name?: string | null } | null;
  status?: string;
};

interface ValidationSummaryProps {
  id?: string;
  className?: string;
  warnings?: WarningMessage[];
  conflicts?: ConflictEntry[] | null;
  maxConflictsToShow?: number;
  heading?: string;
  conflictHeading?: string;
  conflictIntro?: string;
  footer?: React.ReactNode;
}

const DEFAULT_HEADING = "Please review the following issues";
const DEFAULT_CONFLICT_HEADING = "Time Conflict Detected";
const DEFAULT_CONFLICT_INTRO = (count: number) =>
  `Your selected time overlaps with ${count} existing booking${count === 1 ? "" : "s"}:`;

const normalizeDate = (value: string | Date | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  id,
  className,
  warnings = [],
  conflicts,
  maxConflictsToShow = 10,
  heading = DEFAULT_HEADING,
  conflictHeading = DEFAULT_CONFLICT_HEADING,
  conflictIntro,
  footer,
}) => {
  const hasConflicts = Array.isArray(conflicts) && conflicts.length > 0;
  const hasWarnings = Array.isArray(warnings) && warnings.length > 0;

  const visibleConflicts = useMemo(() => {
    if (!hasConflicts) return [];
    return conflicts!.slice(0, Math.max(1, maxConflictsToShow));
  }, [conflicts, hasConflicts, maxConflictsToShow]);

  if (!hasConflicts && !hasWarnings) {
    return null;
  }

  const conflictIntroText = hasConflicts
    ? conflictIntro ?? DEFAULT_CONFLICT_INTRO(conflicts!.length)
    : undefined;

  return (
    <div
      id={id}
      className={cn(
        "space-y-3 rounded-lg border border-red-200 bg-red-50 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 text-red-700">
        <TriangleAlert className="h-5 w-5" />
        <span className="font-semibold">{heading}</span>
      </div>

      <div className="space-y-4">
        {hasConflicts && (
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">{conflictHeading}</p>
            {conflictIntroText ? (
              <p className="text-sm text-red-700 mb-3">{conflictIntroText}</p>
            ) : null}

            <div className="space-y-2">
              {visibleConflicts.map((conflict, index) => {
                const startDate = normalizeDate(conflict.startTime);
                const endDate = normalizeDate(conflict.endTime);
                const facilityName = conflict.facility?.name ?? conflict.facilityName ?? null;

                return (
                  <div
                    key={conflict.id ?? `${index}-${startDate?.toISOString() ?? "unknown"}`}
                    className="rounded bg-red-100 p-2 text-xs text-red-800"
                  >
                    <div className="font-medium">
                      {startDate
                        ? format(startDate, "EEE, MMM d, yyyy • h:mm a")
                        : "Unknown start"}
                    </div>
                    <div>
                      {endDate ? format(endDate, "EEE, MMM d, yyyy • h:mm a") : "Unknown end"}
                    </div>
                    {facilityName ? (
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-red-600">
                        {facilityName}
                      </div>
                    ) : null}
                    {conflict.status ? (
                      <div className="mt-1 text-[11px] text-red-600">
                        Status: {conflict.status}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {conflicts!.length > visibleConflicts.length && (
              <p className="text-xs text-red-600 mt-2">
                +{conflicts!.length - visibleConflicts.length} more conflict
                {conflicts!.length - visibleConflicts.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {hasWarnings && (
          <div className="space-y-3">
            {warnings.map((warning, index) => (
              <div key={`${warning.title}-${index}`} className="space-y-1">
                <p className="text-sm font-medium text-red-800">{warning.title}</p>
                <p className="text-sm text-red-700">{warning.description}</p>
              </div>
            ))}
          </div>
        )}

        {footer}
      </div>
    </div>
  );
};

export type { WarningMessage, ConflictEntry };
export default ValidationSummary;
