/**
 * HeaderContent Component
 * 
 * Main header content with logo, branding, and actions
 */

import { NotificationDropdown, UserProfileDropdown } from './';

interface HeaderContentProps {
  user: any;
  isAdmin: boolean;
  alertsData: any;
  alertsLoading: boolean;
  hiddenAlertIds: Set<string>;
  hiddenAlertIdsVersion: number;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  onMobileToggle?: () => void;
  onMarkAsRead: (alertId: string) => Promise<void>;
  onHideAlert: (alertId: string) => void;
  onLogout: () => void;
}

export function HeaderContent({
  user,
  isAdmin,
  alertsData,
  alertsLoading,
  hiddenAlertIds,
  hiddenAlertIdsVersion,
  allBookings,
  userBookings,
  allFacilities,
  onMobileToggle,
  onMarkAsRead,
  onHideAlert,
  onLogout,
}: HeaderContentProps) {
  return (
    <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      {/* Logo and branding */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={onMobileToggle}
          className="p-2 rounded-md text-gray-700 hover:bg-gray-100 sm:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </button>
        <img
          src="/orbit-logo.png"
          alt="ORBIT Logo"
          className="h-10 w-auto object-contain"
        />
        <span className="font-bold text-xl sm:text-2xl tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent truncate">
          ORBIT
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {user && (
          <>
            <NotificationDropdown
              user={user}
              isAdmin={isAdmin}
              alertsData={alertsData}
              alertsLoading={alertsLoading}
              hiddenAlertIds={hiddenAlertIds}
              hiddenAlertIdsVersion={hiddenAlertIdsVersion}
              allBookings={allBookings}
              userBookings={userBookings}
              allFacilities={allFacilities}
              onMarkAsRead={onMarkAsRead}
              onHideAlert={onHideAlert}
            />
            <UserProfileDropdown
              user={user}
              onLogout={onLogout}
            />
          </>
        )}
      </div>
    </div>
  );
}
