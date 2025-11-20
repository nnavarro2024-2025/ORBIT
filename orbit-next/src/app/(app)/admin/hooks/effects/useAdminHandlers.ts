"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { User, SystemAlert, FacilityBooking } from "@shared/schema";
import { formatAlertMessage as formatAlertMessageBase } from "@admin";

type UseAdminHandlersProps = {
  setSelectedView: (view: string) => void;
  setBookingTab: (tab: string) => void;
  setLocation: (path: string) => void;
  setGlobalUserManagementSearch: (value: string) => void;
  setBookingUsersPage: (page: number) => void;
  setBannedUsersPage: (page: number) => void;
  setUserToBan: (user: User | null) => void;
  setIsBanUserModalOpen: (open: boolean) => void;
  setGlobalSystemAlertsSearch: (value: string) => void;
  setBookingAlertsPage: (page: number) => void;
  setUserAlertsPage: (page: number) => void;
  setFacilityForUnavailable: (facility: any) => void;
  setIsUnavailableModalOpen: (open: boolean) => void;
  markAlertReadMutation: UseMutationResult<any, any, any, any>;
  unbanUserMutation: UseMutationResult<any, any, any, any>;
  toggleFacilityAvailabilityMutation: UseMutationResult<any, any, any, any>;
  getUserEmail: (id: any) => string;
  allBookings: FacilityBooking[];
  facilities: any[] | undefined;
  alertsData: SystemAlert[];
};

export function useAdminHandlers({
  setSelectedView,
  setBookingTab,
  setLocation,
  setGlobalUserManagementSearch,
  setBookingUsersPage,
  setBannedUsersPage,
  setUserToBan,
  setIsBanUserModalOpen,
  setGlobalSystemAlertsSearch,
  setBookingAlertsPage,
  setUserAlertsPage,
  setFacilityForUnavailable,
  setIsUnavailableModalOpen,
  markAlertReadMutation,
  unbanUserMutation,
  toggleFacilityAvailabilityMutation,
  getUserEmail,
  allBookings,
  facilities,
  alertsData,
}: UseAdminHandlersProps) {
  const queryClient = useQueryClient();

  const handleNavigateToBookingFromAlert = useCallback((bookingId: string | null) => {
    try {
      setSelectedView('booking-management');
      setBookingTab('pendingList');
      if (bookingId) {
        setLocation(`/booking#id-${bookingId}`);
      }
    } catch {}
  }, [setSelectedView, setBookingTab, setLocation]);

  const handleMarkAlertRead = useCallback(async (alert: SystemAlert) => {
    if (!alert || alert.isRead) return;
    try {
      queryClient.setQueryData(['/api/admin/alerts'], (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as SystemAlert[]).map((item) => item.id === alert.id ? { ...item, isRead: true } : item);
      });
      await markAlertReadMutation.mutateAsync(alert.id);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    }
  }, [markAlertReadMutation, queryClient]);

  const handleSystemAlertsSearchChange = useCallback((value: string) => {
    setGlobalSystemAlertsSearch(value);
    setBookingAlertsPage(0);
    setUserAlertsPage(0);
  }, [setGlobalSystemAlertsSearch, setBookingAlertsPage, setUserAlertsPage]);

  const handleUserManagementSearchChange = useCallback((value: string) => {
    setGlobalUserManagementSearch(value);
    setBookingUsersPage(0);
    setBannedUsersPage(0);
  }, [setGlobalUserManagementSearch, setBookingUsersPage, setBannedUsersPage]);

  const handleBanUserClick = useCallback((user: User) => {
    setUserToBan(user);
    setIsBanUserModalOpen(true);
  }, [setUserToBan, setIsBanUserModalOpen]);

  const handleUnbanUserClick = useCallback((userId: string) => {
    unbanUserMutation.mutate({ userId });
  }, [unbanUserMutation]);

  const toggleFacilityAvailability = useCallback(async (facility: any | number, available: boolean) => {
    let facilityObj: any | undefined = undefined;
    if (typeof facility === 'object') {
      facilityObj = facility;
    } else {
      facilityObj = facilities?.find((f: any) => f.id === facility);
    }
    if (!available) {
      setFacilityForUnavailable(facilityObj ?? { id: facility });
      setIsUnavailableModalOpen(true);
      return;
    }
    const facilityId = facilityObj?.id ?? facility;
    toggleFacilityAvailabilityMutation.mutate({ facilityId, available, reason: undefined });
  }, [facilities, setFacilityForUnavailable, setIsUnavailableModalOpen, toggleFacilityAvailabilityMutation]);

  const formatAlertMessage = useCallback((message: string | null): string => {
    return formatAlertMessageBase(message, (id: string) => getUserEmail(id));
  }, [getUserEmail]);

  const getBookingUserStatus = useCallback((id: any) => {
    return allBookings.some(b => b.userId === id && (b.status === 'approved' || b.status === 'pending'));
  }, [allBookings]);

  const getActorEmail = useCallback((activityOrUserId: any) => {
    if (!activityOrUserId) return '';
    if (typeof activityOrUserId === 'object') {
      const a = activityOrUserId;
      if (a.userId) return getUserEmail(a.userId);
      const match = String(a.details || a.message || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) return match[1];
      return '';
    }
    return getUserEmail(activityOrUserId);
  }, [getUserEmail]);

  const alerts: SystemAlert[] = Array.isArray(alertsData) ? alertsData : [];
  const userManagementAlerts = useMemo(() => alerts.filter((a: SystemAlert) => a.type === 'user'), [alerts]);

  return {
    handleNavigateToBookingFromAlert,
    handleMarkAlertRead,
    handleSystemAlertsSearchChange,
    handleUserManagementSearchChange,
    handleBanUserClick,
    handleUnbanUserClick,
    toggleFacilityAvailability,
    formatAlertMessage,
    getBookingUserStatus,
    getActorEmail,
    alerts,
    userManagementAlerts,
  };
}
