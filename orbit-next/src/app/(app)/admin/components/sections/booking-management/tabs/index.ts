export {
  BOOKING_MANAGEMENT_TAB_ACTIVE,
  ActiveBookingsTab,
  type ActiveBookingsTabProps,
} from './active';

export {
  BOOKING_MANAGEMENT_TAB_SCHEDULED,
  ScheduledBookingsTab,
  type ScheduledBookingsTabProps,
} from './scheduled';

import { BOOKING_MANAGEMENT_TAB_ACTIVE } from './active';
import { BOOKING_MANAGEMENT_TAB_SCHEDULED } from './scheduled';

export const BOOKING_MANAGEMENT_TABS = {
  active: BOOKING_MANAGEMENT_TAB_ACTIVE,
  scheduled: BOOKING_MANAGEMENT_TAB_SCHEDULED,
} as const;

export type BookingManagementTab = typeof BOOKING_MANAGEMENT_TABS[keyof typeof BOOKING_MANAGEMENT_TABS];
