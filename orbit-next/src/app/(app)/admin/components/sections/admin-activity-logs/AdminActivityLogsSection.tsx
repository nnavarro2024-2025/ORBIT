import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminSearchBar } from '@/components/common';
import { Activity, BarChart3, CheckCircle } from 'lucide-react';
import type { FacilityBooking, User } from '@shared/schema';
import { SuccessTab, HistoryTab, SystemTab } from './tabs/index';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export interface AdminActivityLogsProps {
  settingsTab: string;
  setSettingsTab: (v: string) => void;
  allBookings: FacilityBooking[];
  activities: any[] | undefined;
  alerts: any[] | undefined;
  user: any | null;
  usersMap: Map<string, any>;
  usersData: User[];
  itemsPerPage: number;
  successPage: number;
  setSuccessPage: Setter<number>;
  historyPage: number;
  setHistoryPage: Setter<number>;
  systemPage: number;
  setSystemPage: Setter<number>;
  globalActivitySearch: string;
  setGlobalActivitySearch: Setter<string>;
  successBookingsSearch: string;
  setSuccessBookingsSearch: Setter<string>;
  historyBookingsSearch: string;
  setHistoryBookingsSearch: Setter<string>;
  activityLogsSearch: string;
  setActivityLogsSearch: Setter<string>;
  openPurpose: Record<string, boolean>;
  setOpenPurpose: Setter<Record<string, boolean>>;
  getUserEmail: (id: string) => string;
  getFacilityName: (id: string | number) => string;
  formatDateTime: (d: Date | string | number) => string;
  formatAlertMessage: (raw: string) => string;
  safeJsonParse: (raw: string) => any;
}

export function AdminActivityLogsSection(props: AdminActivityLogsProps) {
  const {
    settingsTab,
    setSettingsTab,
    allBookings,
    activities,
    alerts,
    user,
    usersMap,
    usersData,
    itemsPerPage,
    successPage,
    setSuccessPage,
    historyPage,
    setHistoryPage,
    systemPage,
    setSystemPage,
    globalActivitySearch,
    setGlobalActivitySearch,
    successBookingsSearch,
    setSuccessBookingsSearch,
    historyBookingsSearch,
    setHistoryBookingsSearch,
    activityLogsSearch,
    setActivityLogsSearch,
    openPurpose,
    setOpenPurpose,
    getUserEmail,
    getFacilityName,
    formatDateTime,
    formatAlertMessage,
    safeJsonParse,
  } = props;

  const successfullyBooked = allBookings.filter(
    (b) => b.status === 'approved' && b.arrivalConfirmed && new Date(b.endTime) < new Date()
  );
  const bookingHistory = allBookings.filter(
    (b) =>
      ['denied', 'cancelled', 'expired', 'void'].includes(b.status) ||
      (b.status === 'approved' && new Date(b.endTime) < new Date() && !b.arrivalConfirmed)
  );

  const trimmedSuccessSearch = successBookingsSearch.trim().toLowerCase();
  const trimmedHistorySearch = historyBookingsSearch.trim().toLowerCase();

  const filteredSuccessfullyBooked = trimmedSuccessSearch
    ? successfullyBooked.filter((b) => {
        try {
          const haystack = [
            getUserEmail(b.userId),
            getFacilityName(b.facilityId),
            b.purpose,
            b.status,
            String(b.participants || ''),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(trimmedSuccessSearch);
        } catch (e) {
          return false;
        }
      })
    : successfullyBooked;

  const filteredBookingHistory = trimmedHistorySearch
    ? bookingHistory.filter((b) => {
        try {
          const haystack = [
            getUserEmail(b.userId),
            getFacilityName(b.facilityId),
            b.purpose,
            b.status,
            String(b.participants || ''),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(trimmedHistorySearch);
        } catch (e) {
          return false;
        }
      })
    : bookingHistory;

  const successCountDisplay = trimmedSuccessSearch
    ? `${filteredSuccessfullyBooked.length}/${successfullyBooked.length}`
    : `${successfullyBooked.length}`;
  const historyCountDisplay = trimmedHistorySearch
    ? `${filteredBookingHistory.length}/${bookingHistory.length}`
    : `${bookingHistory.length}`;

  const combinedActivity = [...(activities || []), ...(alerts || [])];
  const seenIds = new Set<string>();
  const systemActivityRaw = combinedActivity
    .filter((item: any) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const systemActivity = (() => {
    const searchTerm = activityLogsSearch.trim().toLowerCase();
    if (!searchTerm) return systemActivityRaw;
    return systemActivityRaw.filter((item: any) => {
      try {
        const title = String(item.title || item.action || '').toLowerCase();
        if (title.includes(searchTerm)) return true;
        const details = String(item.message || item.details || '').toLowerCase();
        if (details.includes(searchTerm)) return true;
        if (item.userId) {
          const userEmail = getUserEmail(item.userId)?.toLowerCase() || '';
          if (userEmail.includes(searchTerm)) return true;
        }
        const emailMatch = (item.message || item.details || '').match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        );
        if (emailMatch) {
          for (const email of emailMatch) if (email.toLowerCase().includes(searchTerm)) return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });
  })();

  const statusClass = (statusRaw: any) => {
    const s = String(statusRaw || '').toLowerCase();
    if (s === 'pending' || s === 'request' || s === 'requested') return 'text-green-600';
    if (s === 'approved' || s === 'completed') return 'text-green-600';
    if (s === 'denied' || s === 'cancelled' || s === 'canceled') return 'text-red-600';
    if (s === 'expired' || s === 'void') return 'text-gray-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Activity Logs</h2>
                <p className="text-xs sm:text-sm text-gray-600">Centralized booking and system logs — detailed view for auditing and troubleshooting</p>
                <AdminSearchBar
                  value={globalActivitySearch}
                  onChange={(term) => {
                    setGlobalActivitySearch(term);
                    setSuccessBookingsSearch(term);
                    setHistoryBookingsSearch(term);
                    setActivityLogsSearch(term);
                    setSuccessPage(0);
                    setHistoryPage(0);
                    setSystemPage(0);
                    const lower = term.trim().toLowerCase();
                    if (lower) {
                      const successMatches = successfullyBooked.filter((b) => {
                        try {
                          const haystack = [
                            getUserEmail(b.userId),
                            getFacilityName(b.facilityId),
                            b.purpose,
                            b.status,
                            String(b.participants || ''),
                          ]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase();
                          return haystack.includes(lower);
                        } catch {
                          return false;
                        }
                      }).length;
                      const historyMatches = bookingHistory.filter((b) => {
                        try {
                          const haystack = [
                            getUserEmail(b.userId),
                            getFacilityName(b.facilityId),
                            b.purpose,
                            b.status,
                            String(b.participants || ''),
                          ]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase();
                          return haystack.includes(lower);
                        } catch {
                          return false;
                        }
                      }).length;
                      const systemMatches = systemActivityRaw.filter((item: any) => {
                        try {
                          const title = String(item.title || item.action || '').toLowerCase();
                          const details = String(item.message || item.details || '').toLowerCase();
                          const userEmail = item.userId ? (getUserEmail(item.userId) || '').toLowerCase() : '';
                          return title.includes(lower) || details.includes(lower) || userEmail.includes(lower);
                        } catch {
                          return false;
                        }
                      }).length;
                      if (successMatches > 0) setSettingsTab('success');
                      else if (historyMatches > 0) setSettingsTab('history');
                      else if (systemMatches > 0) setSettingsTab('system');
                    }
                  }}
                  placeholder="Search logs..."
                  ariaLabel="Activity logs search"
                  className="pt-1"
                />
              </div>
            </div>
            <div className="flex flex-row flex-wrap gap-2 items-center">
              <div className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center" title={`Filtered/Total: ${successCountDisplay}`}>{successCountDisplay} Successful</div>
              <div className="bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center" title={`Filtered/Total: ${historyCountDisplay}`}>{historyCountDisplay} History</div>
              <div className="bg-gray-100 text-gray-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{systemActivity.length || 0} System</div>
            </div>
          </div>
        </div>
        <Tabs value={settingsTab} onValueChange={(v: string) => setSettingsTab(v)} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-2">
            <TabsTrigger value="success" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="truncate">Successfully Booked</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
              <BarChart3 className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <span className="truncate">Booking History</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
              <Activity className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <span className="truncate">System Activity</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="success" className="space-y-2 mt-6 md:mt-0">
            <SuccessTab
              filteredSuccessfullyBooked={filteredSuccessfullyBooked}
              successPage={successPage}
              setSuccessPage={setSuccessPage}
              itemsPerPage={itemsPerPage}
              openPurpose={openPurpose}
              setOpenPurpose={setOpenPurpose}
              getUserEmail={getUserEmail}
              getFacilityName={getFacilityName}
              formatDateTime={formatDateTime}
              statusClass={statusClass}
            />
          </TabsContent>
          <TabsContent value="history" className="space-y-2 mt-6 md:mt-0">
            <HistoryTab
              filteredBookingHistory={filteredBookingHistory}
              historyPage={historyPage}
              setHistoryPage={setHistoryPage}
              itemsPerPage={itemsPerPage}
              openPurpose={openPurpose}
              setOpenPurpose={setOpenPurpose}
              getUserEmail={getUserEmail}
              getFacilityName={getFacilityName}
              formatDateTime={formatDateTime}
              statusClass={statusClass}
            />
          </TabsContent>
          <TabsContent value="system" className="space-y-4 mt-6 md:mt-0">
            <SystemTab
              systemActivity={systemActivity}
              systemPage={systemPage}
              setSystemPage={setSystemPage}
              itemsPerPage={itemsPerPage}
              getUserEmail={getUserEmail}
              getFacilityName={getFacilityName}
              formatDateTime={formatDateTime}
              formatAlertMessage={formatAlertMessage}
              safeJsonParse={safeJsonParse}
              allBookings={allBookings}
              usersMap={usersMap}
              usersData={usersData}
              user={user}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminActivityLogsSection;
