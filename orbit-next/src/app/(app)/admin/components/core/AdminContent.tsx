"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/ui";
import { LoadingState, ErrorState, Overview, Sections } from "../index";
import AdminFaqManager from "@/components/faq/AdminFaqManager";
import { formatDateTime } from "@admin";

// NOTE: This file was moved into `core/` for clearer separation of high-level orchestrator components.
// No behavioral changes.

type AdminContentProps = Record<string, any>;

export function AdminContent(props: AdminContentProps) {
  const {
    selectedView,
    setSelectedView,
    setBookingTab,
    setSettingsTab,
    setSecurityTab,
    setLocation,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarItems,
    handleSidebarClick,
    user,
    allBookingsError,
    alertsError,
    activitiesError,
    usersError,
    facilitiesError,
    allBookingsLoading,
    alertsLoading,
    activitiesLoading,
    usersLoading,
    facilitiesLoading,
    adminBookingsData,
    alertsData,
    activitiesData,
    usersDataQ,
    facilitiesData,
    getFacilityName,
    getUserEmail,
  } = props;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const errorState = {
    bookings: allBookingsError,
    alerts: alertsError,
    activities: activitiesError,
    allBookings: allBookingsError,
    usersData: usersError,
    facilities: facilitiesError,
  };

  const hasError = Object.values(errorState).some(Boolean);

  const isInitialLoading = (
    (allBookingsLoading && (!adminBookingsData || adminBookingsData.length === 0)) ||
    (alertsLoading && (!alertsData || alertsData.length === 0)) ||
    (activitiesLoading && (!activitiesData || activitiesData.length === 0)) ||
    (usersLoading && (!usersDataQ || usersDataQ.length === 0)) ||
    (facilitiesLoading && (!facilitiesData || facilitiesData.length === 0))
  );

  if (isInitialLoading) {
    return (
      <LoadingState
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        sidebarItems={sidebarItems}
        selectedView={selectedView}
        handleSidebarClick={handleSidebarClick}
      />
    );
  }

  if (hasError) {
    return <ErrorState errorState={errorState} user={user} />;
  }

  const handleArrivalExpire = async (booking: any) => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    try {
      const label = `${getFacilityName(booking.facilityId)} (${formatDateTime(booking.startTime)})`;
      toast({ title: 'Arrival Confirmation Expired', description: `Arrival confirmation window expired for ${label}.` });
    } catch (e) {
      toast({ title: 'Arrival Confirmation Expired', description: 'Arrival confirmation window expired for a booking.' });
    }
  };

  const handleBookingEndExpire = async (booking: any) => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    toast({ title: 'Booking Ended', description: `Booking for ${getUserEmail(booking.userId)} has ended.` });
  };

  switch (selectedView) {
    case "report-schedules":
      return <Sections.ReportSchedulesSection {...props as any} />;
    case "booking-management":
      return (
        <Sections.BookingManagementSection
          {...props as any}
          onArrivalExpire={handleArrivalExpire}
          onBookingEndExpire={handleBookingEndExpire}
        />
      );
    case "user-management":
      return (
        <Sections.UserManagementSection
          users={(props as any).usersData ?? (props as any).usersDataQ ?? []}
          activeBookings={(props as any).activeBookings ?? (props as any).allBookings ?? (props as any).adminBookingsData ?? []}
          itemsPerPage={(props as any).itemsPerPage}
          bookingUsersPage={(props as any).bookingUsersPage}
          onBookingUsersPageChange={(props as any).setBookingUsersPage}
          bannedUsersPage={(props as any).bannedUsersPage}
          onBannedUsersPageChange={(props as any).setBannedUsersPage}
          userTab={(props as any).userTab}
          onUserTabChange={(props as any).setUserTab}
          globalSearch={(props as any).globalUserManagementSearch ?? ''}
          onGlobalSearchChange={(props as any).handleUserManagementSearchChange ?? (props as any).setGlobalUserManagementSearch}
          getBookingUserStatus={(props as any).getBookingUserStatus}
          getFacilityName={(props as any).getFacilityName}
          onRequestBan={(props as any).handleBanUserClick}
          onRequestUnban={(props as any).handleUnbanUserClick}
        />
      );
    case "security":
      return (
        <Sections.SystemAlertsSection
          alerts={(props as any).alerts ?? (props as any).alertsData ?? []}
          globalSearch={(props as any).globalSystemAlertsSearch ?? ''}
          onGlobalSearchChange={(props as any).handleSystemAlertsSearchChange ?? (props as any).setGlobalSystemAlertsSearch}
          securityTab={(props as any).securityTab}
          onSecurityTabChange={(props as any).setSecurityTab}
          bookingAlertsPage={(props as any).bookingAlertsPage}
          onBookingAlertsPageChange={(props as any).setBookingAlertsPage}
          userAlertsPage={(props as any).userAlertsPage}
          onUserAlertsPageChange={(props as any).setUserAlertsPage}
          formatAlertMessage={(props as any).formatAlertMessage}
          formatDateTime={(props as any).formatDateTime}
          safeJsonParse={(props as any).safeJsonParse}
          getUserEmail={(props as any).getUserEmail}
          onNavigateToBooking={(props as any).handleNavigateToBookingFromAlert}
          onMarkAlertRead={(props as any).handleMarkAlertRead}
        />
      );
    case "faq-management":
      return <AdminFaqManager />;
    case "admin-activity-logs":
      return (
        <Sections.AdminActivityLogsSection
          {...props as any}
          allBookings={(props as any).allBookings ?? (props as any).adminBookingsData ?? []}
        />
      );
    case "settings":
      return <Sections.SettingsSection {...props as any} />;
    default:
      return (
        <div className="space-y-4 sm:space-y-6">
          {props.DEBUG_OVERVIEW_SECTIONS.stats && (
            <Overview.StatsCards
              {...props as any}
              onNavigateToBookingManagement={(tab: string) => {
                setSelectedView("booking-management");
                setBookingTab(tab);
              }}
              onNavigateToSecurity={() => setSelectedView("security")}
            />
          )}

          {props.DEBUG_OVERVIEW_SECTIONS.quickActions && props.ENABLE_QUICK_ACTIONS && (
            <Overview.QuickActionsBar {...props as any} />
          )}

            {props.DEBUG_OVERVIEW_SECTIONS.analytics && props.ANY_ANALYTICS_ENABLED && (
            <Overview.AnalyticsCharts {...props as any} />
          )}

          {props.DEBUG_OVERVIEW_SECTIONS.availability && (
            <Overview.AvailabilityPreview {...props as any} />
          )}

          {props.DEBUG_OVERVIEW_SECTIONS.scheduled && (
            <Overview.BookingPreviews
              {...props as any}
              onNavigateToBookingManagement={(tab: string) => {
                setSelectedView('booking-management');
                setBookingTab(tab);
              }}
              onNavigateToActivityLogs={(tab: string) => {
                setSelectedView('admin-activity-logs');
                setSettingsTab(tab);
              }}
              setLocation={setLocation}
            />
          )}

          {props.DEBUG_OVERVIEW_SECTIONS.alerts && (
            <div className="space-y-6">
              <Overview.AlertsPreview
                {...props as any}
                onNavigateToSecurity={(tab: string) => {
                  setSelectedView('security');
                  setSecurityTab(tab);
                }}
              />

              <Overview.ActivityPreview
                {...props as any}
                onNavigateToActivityLogs={(tab: string) => {
                  setSelectedView('admin-activity-logs');
                  setSettingsTab(tab);
                }}
              />
            </div>
          )}
        </div>
      );
  }
}
