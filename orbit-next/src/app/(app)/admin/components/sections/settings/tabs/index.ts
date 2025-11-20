export {
  SETTINGS_TAB_FACILITIES,
  FacilitiesTab,
  type FacilitiesTabProps,
} from './facilities';

import { SETTINGS_TAB_FACILITIES } from './facilities';

export const SETTINGS_TABS = {
  facilities: SETTINGS_TAB_FACILITIES,
} as const;

export type SettingsTab = typeof SETTINGS_TABS[keyof typeof SETTINGS_TABS];
