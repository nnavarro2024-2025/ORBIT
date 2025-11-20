export { USER_MANAGEMENT_TAB_BOOKING_USERS, BookingUsersTab, type BookingUsersTabProps } from './booking-users';
export { USER_MANAGEMENT_TAB_BANNED_USERS, BannedUsersTab, type BannedUsersTabProps } from './banned-users';

export const USER_MANAGEMENT_TABS = [
  'booking-users',
  'banned-users',
] as const;

export type UserManagementTab = typeof USER_MANAGEMENT_TABS[number];
