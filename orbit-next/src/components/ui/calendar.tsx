"use client"

import Calendar, { CalendarType } from "react-calendar"
import "react-calendar/dist/Calendar.css"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { useMemo } from "react"
import { format } from "date-fns"

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ")

const isSameDay = (a?: Date | null, b?: Date | null) => {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | null) => void
  initialFocus?: boolean
  disabled?: (date: Date) => boolean
  className?: string
  calendarType?: CalendarType
  locale?: string
}

function CalendarComponent({
  selected,
  onSelect,
  disabled,
  className,
  calendarType,
  locale,
  ...props
}: CalendarProps) {
  // Map common aliases to react-calendar's internal calendar type strings
  // react-calendar expects: 'gregory' | 'hebrew' | 'islamic' | 'iso8601'
  const aliasMap: Record<string, CalendarType> = {
    // common/legacy aliases
    'US': 'gregory',
    'us': 'gregory',
    'gregory': 'gregory',
    'ISO_8601': 'iso8601',
    'ISO 8601': 'iso8601',
    'iso_8601': 'iso8601',
    'iso8601': 'iso8601',
    'arabic': 'islamic',
    'islamic': 'islamic',
    'hebrew': 'hebrew',
  };

  let normalizedCalendarType: CalendarType = 'gregory'; // default to Sunday-first (gregory)
  if (calendarType) {
    const key = String(calendarType);
    if (key in aliasMap) {
      normalizedCalendarType = aliasMap[key];
    } else if (["gregory", "hebrew", "islamic", "iso8601"].includes(key)) {
      normalizedCalendarType = key as CalendarType;
    } else {
      normalizedCalendarType = 'gregory';
    }
  }

  const normalizedLocale = locale || 'en-US';

  const today = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  const normalizedSelected = useMemo(() => {
    if (!selected) return null
    const normalized = new Date(selected)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }, [selected])

  const tileBaseClasses = "relative group flex items-center justify-center rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors duration-150 h-9 w-9 sm:h-10 sm:w-10"

  const wrapperClasses = classNames(
    "calendar-root rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
    className
  )

  return (
    <ErrorBoundary>
      <Calendar
        className={wrapperClasses}
        prev2Label={null}
        next2Label={null}
        prevLabel="‹"
        nextLabel="›"
        prevAriaLabel="Go to previous month"
        nextAriaLabel="Go to next month"
        onChange={(value) => {
          if (value instanceof Date) {
            onSelect?.(value)
          } else if (Array.isArray(value) && value[0] instanceof Date) {
            onSelect?.(value[0])
          }
        }}
        value={selected}
        tileClassName={({ date, view }) => {
          if (view !== "month") return tileBaseClasses

          const tileDate = new Date(date)
          tileDate.setHours(0, 0, 0, 0)
          const isPast = tileDate < today
          const isSelected = normalizedSelected && isSameDay(tileDate, normalizedSelected)
          const isToday = isSameDay(tileDate, today)

          return classNames(
            tileBaseClasses,
            isPast && "cursor-not-allowed text-gray-400 bg-gray-100/70",
            !isPast && !isSelected && !isToday && "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
            isToday && !isSelected && "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm",
            isSelected && "bg-blue-600 text-white shadow-lg",
            !isPast && "cursor-pointer"
          )
        }}
        tileDisabled={({ date, view }) => {
          if (view === "month") {
            const normalizedDate = new Date(date)
            normalizedDate.setHours(0, 0, 0, 0)
            const isPast = normalizedDate < today
            if (isPast) return true
          }
          return disabled ? disabled(date) : false
        }}
        tileContent={({ date, view }) => {
          if (view === "month") {
            const normalizedDate = new Date(date)
            normalizedDate.setHours(0, 0, 0, 0)
            const isPast = normalizedDate < today
            const isSelected = normalizedSelected && isSameDay(normalizedDate, normalizedSelected)
            const statusLabel = isPast
              ? "Past date – booking not allowed."
              : isSelected
              ? "Selected date."
              : "Available date."

            return (
              <>
                <span className="sr-only">{`${format(date, "MMMM d, yyyy")}: ${statusLabel}`}</span>
                {isPast ? (
                  <span className="pointer-events-none absolute -top-8 left-1/2 hidden min-w-max -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-[10px] text-white shadow-md group-hover:block">
                    Past date – booking not allowed.
                  </span>
                ) : null}
              </>
            )
          }
          return undefined
        }}
        calendarType={normalizedCalendarType}
        locale={normalizedLocale}
        {...props}
      />
    </ErrorBoundary>
  )
}

CalendarComponent.displayName = "Calendar"

export { CalendarComponent as Calendar }
