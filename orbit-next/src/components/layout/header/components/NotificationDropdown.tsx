/**
 * Notification Dropdown Component
 * 
 * Displays the 5 latest notifications in a dropdown
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkeletonListItem } from '@/components/ui/skeleton-presets';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  user: any;
  isAdmin: boolean;
  alertsData: any[];
  alertsLoading: boolean;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  onMarkAsRead: (alertId: string) => Promise<void>;
}

export function NotificationDropdown({
  user,
  isAdmin,
  alertsData,
  alertsLoading,
  allBookings,
  userBookings,
  allFacilities,
  onMarkAsRead,
}: NotificationDropdownProps) {
  const markedRef = useRef<Set<string>>(new Set());

  // Count all unread notifications (not just visible ones)
  const unreadCount = useMemo(() => {
    if (!Array.isArray(alertsData)) return 0;
    return alertsData.filter((a: any) => !a.isRead).length;
  }, [alertsData]);

  // Mark all visible unread notifications as read when dropdown opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open && Array.isArray(alertsData)) {
      alertsData
        .filter((a: any) => !a.isRead && !markedRef.current.has(a.id))
        .forEach((a: any) => {
          markedRef.current.add(a.id);
          onMarkAsRead(String(a.id)).catch(() => {});
        });
    }
  }, [alertsData, onMarkAsRead]);

  // Show only the 5 latest notifications
  const visibleAlerts = useMemo(() => {
    if (!Array.isArray(alertsData)) return [];
    return [...alertsData]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [alertsData]);

  const handleViewAll = useCallback(() => {
    try {
      if (isAdmin) {
        window.location.hash = '#activity-logs:notifications';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

      const newHash = '#activity-logs:notifications';
      const currentPath = window.location.pathname;
      
      if (currentPath.includes('/booking')) {
        window.location.hash = newHash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.href = '/booking' + newHash;
      }
    } catch (e) {
      if (isAdmin) {
        window.location.href = '/admin#activity-logs:notifications';
      } else {
        window.location.href = '/booking#activity-logs:notifications';
      }
    }
  }, [isAdmin]);

  return (
    <DropdownMenu key="notifications-dropdown" modal={false} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-2">
        <DropdownMenuLabel className="font-medium p-2">Notifications</DropdownMenuLabel>
        {alertsLoading ? (
          <div className="p-3 space-y-2">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ) : visibleAlerts.length > 0 ? (
          <div className="space-y-2">
            {visibleAlerts.map((alert: any) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <NotificationItem
                  alert={alert}
                  user={user}
                  isAdmin={isAdmin}
                  allBookings={allBookings}
                  userBookings={userBookings}
                  allFacilities={allFacilities}
                />
              </div>
            ))}

            {alertsData.length > 5 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleViewAll}
                  className="w-full text-left text-sm text-pink-600 hover:text-pink-700 px-2 py-2 rounded"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="text-sm text-gray-700">No notifications</div>
            <div className="text-xs text-gray-500 mt-2">Check the Activity Logs for older items.</div>
            <div className="mt-3">
              <button
                onClick={handleViewAll}
                className="text-sm text-pink-600 hover:text-pink-700"
              >
                View Activity Logs
              </button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
