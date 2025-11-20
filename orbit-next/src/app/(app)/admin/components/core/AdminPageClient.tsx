"use client";

import { Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/data";
import { AdminLayout, AdminContent } from "../index";
import { formatDateTime, formatDate, formatTime, WEEKDAY_LABELS, safeJsonParse, formatScheduleFrequencyText, extractRecipientList } from "@admin";
import { useLegacyLocation } from "@/lib/utils";
import { useAdminState } from "@admin/hooks/state";
import { useAdminNavigation, useSidebarItems, useSidebarClickHandler } from "@admin/hooks/navigation";
import { useAdminQueries, useAdminDataSync, useAdminDataManagement } from "@admin/hooks/data";
import { useInvalidateOnAdminChange, useAdminHandlers, useModalHandlers } from "@admin/hooks/effects";
import { PIE_CHART_COLORS, FACILITY_BAR_COLORS, WEEKLY_LINE_COLORS, ENABLE_QUICK_ACTIONS, DEBUG_MINIMAL_RENDER, DEBUG_OVERVIEW_SECTIONS, DEBUG_ANALYTICS_CHARTS, ANY_ANALYTICS_ENABLED } from "@admin/config";

// Moved into `core/` for structural clarity. No logic changes.
function AdminDashboardInner() {
  if (DEBUG_MINIMAL_RENDER) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Admin Dashboard (debug stub)</h1>
        <p className="text-sm text-gray-500 mt-2">Full dashboard temporarily disabled while isolating the render loop.</p>
      </div>
    );
  }

  const state = useAdminState();
  const {
    setSelectedView, setSecurityTab, setSettingsTab, setLocation: _unusedSetLocation,
    isExportingPdf, setIsExportingPdf, setUnavailableDatesByFacility,
  } = state as any;

  const { user: authUser } = useAuth();
  const [location, setLocation] = useLegacyLocation();

  useAdminNavigation({ location, setSelectedView, setSecurityTab });
  const sidebarItems = useSidebarItems(authUser, state.isNavigatingToBooking);
  const handleSidebarClick = useSidebarClickHandler({
    setUserTab: state.setUserTab,
    setSecurityTab,
    setSettingsTab,
    setSelectedView,
    setLocation,
    setIsNavigatingToBooking: state.setIsNavigatingToBooking,
  });

  const queryClient = useQueryClient();
  const { user: authUserFull, isLoading: authLoading } = useAuth();
  const effectiveUser = authUserFull || authUser;
  const authReady = !!effectiveUser && !authLoading;
  const isAdmin = authReady && effectiveUser.role === 'admin';

  const queries = useAdminQueries({ isAdmin });
  const { usersData: usersDataQ, activitiesData, facilitiesData, adminBookingsData, currentUserData, reportSchedulesData } = queries as any;

  const authUserId = authUser?.id ?? null;
  useInvalidateOnAdminChange(authUserId, isAdmin, queryClient);

  useAdminDataSync(
    { usersDataQ, activitiesData, facilitiesData, adminBookingsData, currentUserData },
    { setUsersData: state.setUsersData, setActivities: state.setActivities, setFacilities: state.setFacilities, setUnavailableDatesByFacility, setUser: state.setUser }
  );

  const allBookings = Array.isArray(adminBookingsData) ? adminBookingsData : [];

  const dataManagement = useAdminDataManagement({
    allBookings,
    pendingBookingsData: (queries as any).pendingBookingsData,
    facilitiesData,
    facilities: state.facilities || [],
    reportSchedulesData,
    adminBookingsData,
    getFacilityName: state.getFacilityName,
    formatDateTime,
    setUnavailableDatesByFacility,
  });

  const handlers = useAdminHandlers({
    setSelectedView,
    setBookingTab: state.setBookingTab,
    setLocation,
    setGlobalUserManagementSearch: state.setGlobalUserManagementSearch,
    setBookingUsersPage: state.setBookingUsersPage,
    setBannedUsersPage: state.setBannedUsersPage,
    setUserToBan: state.setUserToBan,
    setIsBanUserModalOpen: state.setIsBanUserModalOpen,
    setGlobalSystemAlertsSearch: state.setGlobalSystemAlertsSearch,
    setBookingAlertsPage: state.setBookingAlertsPage,
    setUserAlertsPage: state.setUserAlertsPage,
    setFacilityForUnavailable: state.setFacilityForUnavailable,
    setIsUnavailableModalOpen: state.setIsUnavailableModalOpen,
    markAlertReadMutation: (dataManagement as any).markAlertReadMutation,
    unbanUserMutation: (dataManagement as any).unbanUserMutation,
    toggleFacilityAvailabilityMutation: (dataManagement as any).toggleFacilityAvailabilityMutation,
    getUserEmail: state.getUserEmail,
    allBookings,
    facilities: state.facilities,
    alertsData: (queries as any).alertsData,
  });

  const modalHandlers = useModalHandlers({
    facilityForUnavailable: state.facilityForUnavailable,
    setFacilityForUnavailable: state.setFacilityForUnavailable,
    setIsUnavailableModalOpen: state.setIsUnavailableModalOpen,
    setUnavailableDatesByFacility,
    toggleFacilityAvailabilityMutation: (dataManagement as any).toggleFacilityAvailabilityMutation,
    adminBookingsData,
    getFacilityName: state.getFacilityName,
    getUserEmail: state.getUserEmail,
    isExportingPdf,
    setIsExportingPdf,
  });

  return (
    <AdminLayout
      mobileSidebarOpen={state.mobileSidebarOpen}
      setMobileSidebarOpen={state.setMobileSidebarOpen}
      sidebarItems={sidebarItems}
      selectedView={state.selectedView}
      handleSidebarClick={handleSidebarClick}
    >
      <AdminContent
        {...state as any}
        {...queries as any}
        {...dataManagement as any}
        {...handlers as any}
        {...modalHandlers as any}
        setLocation={setLocation}
        selectedView={state.selectedView}
        setSelectedView={state.setSelectedView}
        setBookingTab={state.setBookingTab}
        setSettingsTab={state.setSettingsTab}
        setSecurityTab={state.setSecurityTab}
        mobileSidebarOpen={state.mobileSidebarOpen}
        setMobileSidebarOpen={state.setMobileSidebarOpen}
        sidebarItems={sidebarItems}
        handleSidebarClick={handleSidebarClick}
        user={state.user}
        formatDateTime={formatDateTime}
        formatDate={formatDate}
        formatTime={formatTime}
        safeJsonParse={safeJsonParse}
        WEEKDAY_LABELS={WEEKDAY_LABELS}
        formatScheduleFrequencyText={formatScheduleFrequencyText}
        extractRecipientList={extractRecipientList}
        PIE_CHART_COLORS={PIE_CHART_COLORS}
        FACILITY_BAR_COLORS={FACILITY_BAR_COLORS}
        WEEKLY_LINE_COLORS={WEEKLY_LINE_COLORS}
        ENABLE_QUICK_ACTIONS={ENABLE_QUICK_ACTIONS}
        DEBUG_OVERVIEW_SECTIONS={DEBUG_OVERVIEW_SECTIONS}
        DEBUG_ANALYTICS_CHARTS={DEBUG_ANALYTICS_CHARTS}
        ANY_ANALYTICS_ENABLED={ANY_ANALYTICS_ENABLED}
      />
    </AdminLayout>
  );
}

export default function AdminPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminDashboardInner />
    </Suspense>
  );
}
