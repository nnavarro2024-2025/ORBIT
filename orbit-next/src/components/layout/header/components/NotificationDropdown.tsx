/**
 * Notification Dropdown Component
 * 
 * Displays notifications in a dropdown menu with mark as read functionality
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkeletonListItem } from '@/components/ui/skeleton-presets';
import { useToast } from '@/hooks/ui';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  user: any;
  isAdmin: boolean;
  alertsData: any[];
  alertsLoading: boolean;
  hiddenAlertIds: Set<string>;
  hiddenAlertIdsVersion: number;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  onMarkAsRead: (id: string) => Promise<void>;
  onHideAlert: (id: string) => void;
}

export function NotificationDropdown({
  user,
  isAdmin,
  alertsData,
  alertsLoading,
  hiddenAlertIds,
  hiddenAlertIdsVersion,
  allBookings,
  userBookings,
  allFacilities,
  onMarkAsRead,
  onHideAlert,
}: NotificationDropdownProps) {
  const { toast } = useToast();
  const [pendingMarkIds, setPendingMarkIds] = useState<Set<string>>(new Set());

  // Calculate unread count
  const unreadCount = useMemo(() => {
    if (!Array.isArray(alertsData)) return 0;
    return alertsData.filter((a: any) => !a.isRead && !hiddenAlertIds.has(a.id)).length;
  }, [alertsData, hiddenAlertIdsVersion]);

  // Get visible alerts (filtered and sorted)
  const visibleAlerts = useMemo(() => {
    if (!Array.isArray(alertsData)) return [];
    return alertsData
      .filter((a: any) => !hiddenAlertIds.has(a.id))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [alertsData, hiddenAlertIdsVersion]);

  const handleMarkAsRead = useCallback(async (alertId: string) => {
    setPendingMarkIds((prev) => {
      if (!alertId || prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });

    try {
      await onMarkAsRead(alertId);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
      toast({
        title: "Mark as read failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingMarkIds((prev) => {
        if (!prev.has(alertId)) return prev;
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [onMarkAsRead, toast]);

  const handleViewAll = useCallback(() => {
    try {
      if (isAdmin) {
        window.location.hash = '#activity-logs:notifications';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

      // Navigate to Activity Logs → Notification Logs tab in booking dashboard
      const newHash = '#activity-logs:notifications';
      const currentPath = window.location.pathname;
      
      if (currentPath.includes('/booking')) {
        window.location.hash = newHash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.href = '/booking' + newHash;
      }
    } catch (e) {
      // Fallback
      if (isAdmin) {
        window.location.href = '/admin#activity-logs:notifications';
      } else {
        window.location.href = '/booking#activity-logs:notifications';
      }
    }
  }, [isAdmin]);

  return (
    <DropdownMenu key="notifications-dropdown" modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
              {unreadCount}
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
              <NotificationItem
                key={alert.id}
                alert={alert}
                user={user}
                isAdmin={isAdmin}
                allBookings={allBookings}
                userBookings={userBookings}
                allFacilities={allFacilities}
                onMarkAsRead={handleMarkAsRead}
                onHideAlert={onHideAlert}
                pendingMarkIds={pendingMarkIds}
              />
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
            <div className="text-xs text-gray-500 mt-2">Check the Notification Logs for older items.</div>
            <div className="mt-3">
              <button
                onClick={handleViewAll}
                className="text-sm text-pink-600 hover:text-pink-700"
              >
                View Notification Logs
              </button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
