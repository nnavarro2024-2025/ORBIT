import { WEEKDAY_LABELS } from '../helpers';

export const SCHEDULE_FREQUENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export function toInputDateTimeValue(value: Date | string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

export function formatScheduleFrequencyText(schedule: { frequency?: string | null; dayOfWeek?: number | null; timeOfDay?: string | null }) {
  const frequency = String(schedule.frequency || '').toLowerCase();
  if (!frequency) return '—';
  const base = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  if (frequency === 'weekly' && schedule.dayOfWeek !== undefined && schedule.dayOfWeek !== null) {
    const index = Number(schedule.dayOfWeek);
    const dayLabel = WEEKDAY_LABELS[index] ?? `Day ${index}`;
    return `${base} on ${dayLabel}`;
  }
  if (frequency === 'custom' && schedule.timeOfDay) {
    return `${base} at ${schedule.timeOfDay}`;
  }
  return base;
}

export function extractRecipientList(recipients?: string | null) {
  if (!recipients) return [] as string[];
  return recipients
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}
