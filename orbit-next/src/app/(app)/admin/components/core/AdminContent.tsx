"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/ui";
import { LoadingState, ErrorState, Overview, Sections } from "../index";
import AdminFaqManager from "@/components/faq/AdminFaqManager";
import { CheckEquipmentModal, BanUserModal } from "@/components/modals";
import { formatDateTime } from "@admin";
import { apiRequest } from "@/lib/api";

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
    try {
      // Cancel the booking due to arrival confirmation timeout using the cancel endpoint
      await apiRequest('POST', `/api/bookings/${booking.id}/cancel?reason=arrival_timeout`);

      // Invalidate all booking-related queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/bookings'] });
      
      const label = `${getFacilityName(booking.facilityId)} (${formatDateTime(booking.startTime)})`;
      toast({ 
        title: 'Booking Auto-Cancelled', 
        description: `${label} was cancelled due to no arrival confirmation.`,
        variant: 'destructive'
      });
    } catch (e: any) {
      console.error('Failed to cancel booking on arrival expire:', e);
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to cancel booking due to timeout. Please refresh the page.',
        variant: 'destructive'
      });
    }
  };

  const handleBookingEndExpire = async (booking: any) => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    toast({ title: 'Booking Ended', description: `Booking for ${getUserEmail(booking.userId)} has ended.` });
  };

  switch (selectedView) {
    case "report-schedules":
      return <div className="p-3 sm:p-4 md:p-6"><Sections.ReportSchedulesSection {...props as any} /></div>;
    case "booking-management":
      return (
        <div className="p-3 sm:p-4 md:p-6">
          <Sections.BookingManagementSection
            {...props as any}
            onArrivalExpire={handleArrivalExpire}
            onBookingEndExpire={handleBookingEndExpire}
          />
          <CheckEquipmentModal
            isOpen={props.showEquipmentModal}
            onClose={() => {
              props.setShowEquipmentModal(false);
              props.setEquipmentModalBooking(null);
            }}
            booking={props.equipmentModalBooking}
            onSaveEquipmentStatuses={async (booking, statuses) => {
              console.log('Saving equipment statuses:', { bookingId: booking.id, statuses });
              
              // Determine overall status from individual items
              const preparedCount = Object.values(statuses).filter(s => s === 'prepared').length;
              const notAvailableCount = Object.values(statuses).filter(s => s === 'not_available').length;
              const totalCount = Object.values(statuses).length;
              
              // If all items are prepared, mark as prepared; otherwise not available
              const overallStatus = preparedCount === totalCount ? 'prepared' : 'not_available';
              
              // Create note with individual item statuses
              const note = JSON.stringify({ items: statuses });
              
              console.log('Calling markBookingNeeds with:', {
                bookingId: booking.id,
                status: overallStatus,
                note
              });
              
              // Call the existing mutation and wait for it
              if (typeof props.markBookingNeeds === 'function') {
                await props.markBookingNeeds(booking.id, overallStatus, note);
              } else {
                console.error('markBookingNeeds is not a function!', typeof props.markBookingNeeds);
                throw new Error('markBookingNeeds function not available');
              }
            }}
          />
        </div>
      );
    case "user-management":
      return (
        <div className="p-3 sm:p-4 md:p-6">
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
        </div>
      );
    case "security":
      return (
        <div className="p-3 sm:p-4 md:p-6">
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
        </div>
      );
    case "faq-management":
      return (
        <div className="p-3 sm:p-4 md:p-6">
          <AdminFaqManager />
        </div>
      );
    case "admin-activity-logs":
      return (
        <div className="p-3 sm:p-4 md:p-6">
          <Sections.AdminActivityLogsSection
            {...props as any}
            allBookings={(props as any).allBookings ?? (props as any).adminBookingsData ?? []}
          />
        </div>
      );
    case "settings":
      return (
        <div className="p-3 sm:p-4 md:p-6">
          <Sections.SettingsSection {...props as any} />
        </div>
      );
    default:
      return (
        <div className="p-3 sm:p-4 md:p-6">
          <div className="space-y-4 sm:space-y-6">
            {props.DEBUG_OVERVIEW_SECTIONS.stats && (
              <Overview.StatsCards
                {...props as any}
                onNavigateToBookingManagement={(tab: string) => {
                  setSelectedView("booking-management");
                  setBookingTab(tab);
                }}
                onNavigateToSecurity={() => {
                  setSelectedView("security");
                  setSecurityTab("users");
                }}
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
        </div>
      );
  }

  const mainContent = (() => {
    switch (selectedView) {
      case "booking-management":
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <Sections.BookingManagementSection {...props as any} />
          </div>
        );
      case "user-management":
        return (
          <div className="p-3 sm:p-4 md:p-6">
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
          </div>
        );
      case "security":
        return (
          <div className="p-3 sm:p-4 md:p-6">
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
          </div>
        );
      case "system-alerts":
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <Sections.SystemAlertsSection
              {...props as any}
              allBookings={(props as any).allBookings ?? (props as any).adminBookingsData ?? []}
              booking_alerts={(props as any).alertsData ?? []}
              user_alerts={(props as any).userAlerts ?? []}
              isBookingAlertsLoading={(props as any).alertsLoading ?? false}
              isUserAlertsLoading={(props as any).isUserAlertsLoading ?? false}
              bookingAlertsTotalPages={(props as any).bookingAlertsTotalPages ?? 1}
              userAlertsTotalPages={(props as any).userAlertsTotalPages ?? 1}
              bookingAlertsPage={(props as any).bookingAlertsPage ?? 1}
              userAlertsPage={(props as any).userAlertsPage ?? 1}
              onBookingAlertsPageChange={(props as any).setBookingAlertsPage}
              onUserAlertsPageChange={(props as any).setUserAlertsPage}
              formatAlertMessage={(props as any).formatAlertMessage}
              formatDateTime={(props as any).formatDateTime}
              safeJsonParse={(props as any).safeJsonParse}
              getUserEmail={(props as any).getUserEmail}
              onNavigateToBooking={(props as any).handleNavigateToBookingFromAlert}
              onMarkAlertRead={(props as any).handleMarkAlertRead}
            />
          </div>
        );
      case "faq-management":
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <AdminFaqManager />
          </div>
        );
      case "admin-activity-logs":
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <Sections.AdminActivityLogsSection
              {...props as any}
              allBookings={(props as any).allBookings ?? (props as any).adminBookingsData ?? []}
            />
          </div>
        );
      case "settings":
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <Sections.SettingsSection {...props as any} />
          </div>
        );
      default:
        return (
          <div className="p-3 sm:p-4 md:p-6">
            <div className="space-y-4 sm:space-y-6">
              {props.DEBUG_OVERVIEW_SECTIONS.stats && (
                <Overview.StatsCards
                  {...props as any}
                  onNavigateToBookingManagement={(tab: string) => {
                    setSelectedView("booking-management");
                    setBookingTab(tab);
                  }}
                  onNavigateToSecurity={() => {
                    setSelectedView("security");
                    setSecurityTab("users");
                  }}
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
          </div>
        );
    }
  })();
  
  return mainContent;
}
