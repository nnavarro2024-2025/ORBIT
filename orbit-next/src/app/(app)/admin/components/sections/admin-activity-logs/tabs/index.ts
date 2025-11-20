export { SuccessTab, ADMIN_ACTIVITY_LOGS_TAB_SUCCESS, type SuccessTabProps } from './success';
export { HistoryTab, ADMIN_ACTIVITY_LOGS_TAB_HISTORY, type HistoryTabProps } from './history';
export { SystemTab, ADMIN_ACTIVITY_LOGS_TAB_SYSTEM, type SystemTabProps } from './system';

export const ADMIN_ACTIVITY_LOGS_TABS = {
  success: 'success',
  history: 'history',
  system: 'system',
} as const;

export type AdminActivityLogsTab = typeof ADMIN_ACTIVITY_LOGS_TABS[keyof typeof ADMIN_ACTIVITY_LOGS_TABS];
