import { BookingTab, SYSTEM_ALERTS_TAB_BOOKING, type BookingTabProps } from './booking';
import { UserTab, SYSTEM_ALERTS_TAB_USERS, type UserTabProps } from './user';

export const SYSTEM_ALERTS_TABS = [
  SYSTEM_ALERTS_TAB_BOOKING,
  SYSTEM_ALERTS_TAB_USERS,
] as const;

export type SystemAlertsTab = typeof SYSTEM_ALERTS_TABS[number];

export { BookingTab, UserTab };
export type { BookingTabProps, UserTabProps };
export { SYSTEM_ALERTS_TAB_BOOKING, SYSTEM_ALERTS_TAB_USERS };
