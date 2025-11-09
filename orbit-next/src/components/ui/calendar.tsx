"use client"

import Calendar, { CalendarType } from "react-calendar"
import "react-calendar/dist/Calendar.css"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

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
      // Log unexpected values to help debugging runtime errors
      // eslint-disable-next-line no-console
      console.warn(`Calendar: received unsupported calendarType='${key}', falling back to 'gregory'`);
      normalizedCalendarType = 'gregory';
    }
  }

  const normalizedLocale = locale || 'en-US';
  // Debug: log runtime values to help trap unexpected calendarType values
  // (this will appear in the browser console when the component mounts/renders)
  // eslint-disable-next-line no-console
  console.debug('Calendar wrapper props ->', { calendarType, normalizedCalendarType, locale: normalizedLocale, props });

  return (
    <ErrorBoundary>
      <Calendar
        onChange={(value) => {
          if (value instanceof Date) {
            onSelect?.(value)
          } else if (Array.isArray(value) && value[0] instanceof Date) {
            onSelect?.(value[0])
          }
        }}
        value={selected}
    tileDisabled={disabled ? ({ date }) => disabled(date) : undefined}
    calendarType={normalizedCalendarType}
    locale={normalizedLocale}
        className={className}
        {...props}
      />
    </ErrorBoundary>
  )
}

CalendarComponent.displayName = "Calendar"

export { CalendarComponent as Calendar }
