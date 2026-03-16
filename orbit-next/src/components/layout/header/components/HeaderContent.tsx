/**
 * HeaderContent Component
 * 
 * Main header content with logo, branding, and actions
 */

import { useEffect, useState } from 'react';
import { NotificationDropdown, UserProfileDropdown } from './';
import { authenticatedFetch } from '@/lib/api';
import { useToast } from '@/hooks/ui';

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
  const { toast } = useToast();
  const [devRole, setDevRole] = useState<string>("student");
  const [isDevRoleSaving, setIsDevRoleSaving] = useState(false);

  useEffect(() => {
    setDevRole(String(user?.role || "student"));
  }, [user?.role]);

  const handleDevRoleChange = async () => {
    if (isDevRoleSaving || !devRole || devRole === String(user?.role || "")) return;

    setIsDevRoleSaving(true);
    try {
      await authenticatedFetch("/dev/role", {
        method: "PATCH",
        body: JSON.stringify({ role: devRole }),
      });

      toast({
        title: "Dev role updated",
        description: `Role changed to ${devRole}. Refreshing...`,
      });

      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Failed to change role",
        description: error?.message || "Unable to update role.",
        variant: "destructive",
      });
      setIsDevRoleSaving(false);
    }
  };

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
            {process.env.NODE_ENV !== "production" && (
              <div className="hidden md:flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
                <label className="text-xs text-gray-600 whitespace-nowrap">Dev: Change Role</label>
                <select
                  className="px-2 py-1 rounded border border-gray-300 text-xs bg-white"
                  value={devRole}
                  onChange={(event) => setDevRole(event.target.value)}
                  disabled={isDevRoleSaving}
                >
                  <option value="student">student</option>
                  <option value="faculty">faculty</option>
                  <option value="admin">admin</option>
                  <option value="authorize_selga">authorize_selga</option>
                  <option value="authorize_bonifacio">authorize_bonifacio</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleDevRoleChange()}
                  disabled={isDevRoleSaving || devRole === String(user?.role || "")}
                  className="px-2 py-1 rounded text-xs bg-gray-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDevRoleSaving ? "Saving..." : "Apply"}
                </button>
              </div>
            )}
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
