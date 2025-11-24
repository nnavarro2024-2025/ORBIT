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
  setUserToUnban: (user: any | null) => void;
  setIsUnbanUserModalOpen: (open: boolean) => void;
  setUnbannedUserEmail: (email: string) => void;
  setIsUnbanSuccessModalOpen: (open: boolean) => void;
  setGlobalSystemAlertsSearch: (value: string) => void;
  setBookingAlertsPage: (page: number) => void;
  setUserAlertsPage: (page: number) => void;
  setFacilityForUnavailable: (facility: any) => void;
  setIsUnavailableModalOpen: (open: boolean) => void;
  setIsScheduleReportModalOpen: (open: boolean) => void;
  setScheduleToEdit: (schedule: any) => void;
  setDeleteScheduleTarget: (schedule: any) => void;
  setScheduleActionLoadingId: (id: string | null) => void;
  setSchedulePaginationPage: (page: number) => void;
  setScheduleSearchTerm: (term: string) => void;
  schedulePaginationPage: number;
  markAlertReadMutation: UseMutationResult<any, any, any, any>;
  banUserMutation: UseMutationResult<any, any, any, any>;
  unbanUserMutation: UseMutationResult<any, any, any, any>;
  toggleFacilityAvailabilityMutation: UseMutationResult<any, any, any, any>;
  toggleScheduleActiveMutation: UseMutationResult<any, any, any, any>;
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
  setUserToUnban,
  setIsUnbanUserModalOpen,
  setUnbannedUserEmail,
  setIsUnbanSuccessModalOpen,
  setGlobalSystemAlertsSearch,
  setBookingAlertsPage,
  setUserAlertsPage,
  setFacilityForUnavailable,
  setIsUnavailableModalOpen,
  setIsScheduleReportModalOpen,
  setScheduleToEdit,
  setDeleteScheduleTarget,
  setScheduleActionLoadingId,
  setSchedulePaginationPage,
  setScheduleSearchTerm,
  schedulePaginationPage,
  markAlertReadMutation,
  banUserMutation,
  unbanUserMutation,
  toggleFacilityAvailabilityMutation,
  toggleScheduleActiveMutation,
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

  const handleBanUser = useCallback((userId: string, reason: string, duration: string, customDate?: string) => {
    banUserMutation.mutate({ userId, reason, duration, customDate });
    setIsBanUserModalOpen(false);
    setUserToBan(null);
  }, [banUserMutation, setIsBanUserModalOpen, setUserToBan]);

  const handleUnbanUserClick = useCallback((userId: string) => {
    // Find the user from the users list to get their email
    const user = (window as any).__adminUsers?.find((u: any) => String(u.id) === String(userId));
    if (user) {
      setUserToUnban({ id: userId, email: user.email });
      setIsUnbanUserModalOpen(true);
    }
  }, [setUserToUnban, setIsUnbanUserModalOpen]);

  const handleUnbanUser = useCallback((userId: string) => {
    const user = (window as any).__adminUsers?.find((u: any) => String(u.id) === String(userId));
    unbanUserMutation.mutate(
      { userId },
      {
        onSuccess: () => {
          setIsUnbanUserModalOpen(false);
          setUserToUnban(null);
          if (user?.email) {
            setUnbannedUserEmail(user.email);
            setIsUnbanSuccessModalOpen(true);
          }
        },
      }
    );
  }, [unbanUserMutation, setIsUnbanUserModalOpen, setUserToUnban, setUnbannedUserEmail, setIsUnbanSuccessModalOpen]);

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
  const userManagementAlerts = useMemo(() => {
    return alerts.filter((a: SystemAlert) => {
      if (a.type === 'user') return true;
      const title = (a.title || '').toLowerCase();
      const message = (a.message || '').toLowerCase();
      return (
        title.includes('equipment') ||
        title.includes('needs') ||
        message.includes('equipment') ||
        message.includes('needs')
      );
    });
  }, [alerts]);

  // Report schedule handlers
  const openCreateScheduleModal = useCallback(() => {
    setScheduleToEdit(null);
    setIsScheduleReportModalOpen(true);
  }, [setScheduleToEdit, setIsScheduleReportModalOpen]);

  const openEditScheduleModal = useCallback(
    (schedule: any) => {
      setScheduleToEdit(schedule);
      setIsScheduleReportModalOpen(true);
    },
    [setScheduleToEdit, setIsScheduleReportModalOpen]
  );

  const handleToggleScheduleActive = useCallback(
    (schedule: any, checked?: boolean) => {
      const newActiveState = checked ?? !schedule.isActive;
      setScheduleActionLoadingId(schedule.id);
      toggleScheduleActiveMutation.mutate(
        { id: schedule.id, isActive: newActiveState },
        {
          onSettled: () => {
            setScheduleActionLoadingId(null);
          },
        }
      );
    },
    [toggleScheduleActiveMutation, setScheduleActionLoadingId]
  );

  const handleScheduleSearchChange = useCallback(
    (value: string) => {
      setScheduleSearchTerm(value);
      setSchedulePaginationPage(0);
    },
    [setScheduleSearchTerm, setSchedulePaginationPage]
  );

  const handleSchedulePaginationPrev = useCallback(() => {
    setSchedulePaginationPage(Math.max(0, schedulePaginationPage - 1));
  }, [setSchedulePaginationPage, schedulePaginationPage]);

  const handleSchedulePaginationNext = useCallback(() => {
    setSchedulePaginationPage(schedulePaginationPage + 1);
  }, [setSchedulePaginationPage, schedulePaginationPage]);

  return {
    handleNavigateToBookingFromAlert,
    handleMarkAlertRead,
    handleSystemAlertsSearchChange,
    handleUserManagementSearchChange,
    handleBanUserClick,
    handleBanUser,
    handleUnbanUserClick,
    handleUnbanUser,
    toggleFacilityAvailability,
    formatAlertMessage,
    getBookingUserStatus,
    getActorEmail,
    alerts,
    userManagementAlerts,
    openCreateScheduleModal,
    openEditScheduleModal,
    handleToggleScheduleActive,
    handleScheduleSearchChange,
    handleSchedulePaginationPrev,
    handleSchedulePaginationNext,
  };
}
