import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";

interface ActivityLogsSectionProps {
  activityTab: "booking" | "notifications";
  onActivityTabChange: (tab: "booking" | "notifications") => void;
  activitySearchTerm: string;
  onSearchTermChange: (value: string) => void;
  activityBookingPage: number;
  setActivityBookingPage: Dispatch<SetStateAction<number>>;
  activityNotificationsPage: number;
  setActivityNotificationsPage: Dispatch<SetStateAction<number>>;
  bookingsPerPage: number;
  notificationsPerPage: number;
  userBookings: any[];
  notificationsData: any[];
  isUserBookingsLoading: boolean;
  isUserBookingsFetching: boolean;
  isNotificationsLoading: boolean;
  isNotificationsFetching: boolean;
  openOthers: Record<string, boolean>;
  setOpenOthers: Dispatch<SetStateAction<Record<string, boolean>>>;
  getBookingStatus: (booking: any) => { label: string; badgeClass: string };
  getFacilityDisplay: (facilityId: number) => string;
  parseEquipmentFromMessage: (message: string) => { baseMessage: string; equipment: any };
  onNavigateToBookingDetails: (bookingId: string) => void;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
  markNotificationReadPending: boolean;
}

const NOTIFICATIONS_BATCH_SIZE = 10;

export function ActivityLogsSection({
  notificationsData,
  isNotificationsLoading,
  isNotificationsFetching,
  parseEquipmentFromMessage,
  onMarkNotificationRead,
}: ActivityLogsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(NOTIFICATIONS_BATCH_SIZE);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // On first render/reload, mark all current notifications as "seen" so they lose pink highlight
  useEffect(() => {
    if (notificationsData.length > 0) {
      // Mark all initially loaded notification ids as seen after a brief delay (simulates "reload unhighlight")
      const timer = setTimeout(() => {
        setSeenIds(new Set(notificationsData.map((n: any) => String(n.id))));
        // Also mark unread ones as read on the server
        notificationsData.forEach((n: any) => {
          if (!n.readAt) {
            onMarkNotificationRead(String(n.id)).catch(() => {});
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notificationsData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll - load more when sentinel is visible
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < notificationsData.length) {
          setVisibleCount((prev) => Math.min(prev + NOTIFICATIONS_BATCH_SIZE, notificationsData.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, notificationsData.length]);

  const visibleNotifications = notificationsData.slice(0, visibleCount);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Notification Logs</h3>
          <p className="text-sm text-gray-600 mt-1">Your latest notifications and activity updates</p>
        </div>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {(isNotificationsLoading || isNotificationsFetching) ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonListItem key={index} />
            ))}
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm">No notifications yet</p>
          </div>
        ) : (
          visibleNotifications.map((notification: any) => {
            const isNew = !notification.readAt && !seenIds.has(String(notification.id));
            return (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors duration-700 ${
                  isNew
                    ? "border-pink-200 bg-pink-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
                        notification.type === "BOOKING_APPROVED"
                          ? "bg-green-100 text-green-800"
                          : notification.type === "BOOKING_DENIED"
                          ? "bg-red-100 text-red-800"
                          : notification.type === "BOOKING_CANCELLED"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {notification.type?.replace(/_/g, " ") || "Notification"}
                    </span>
                    {isNew && (
                      <span className="text-[10px] text-pink-600 font-medium uppercase tracking-wide">
                        New
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {notification.title || "Notification"}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">
                    {(notification.message || "").split("\n").map((line: string, idx: number) => (
                      <span key={idx} className="block">
                        {(() => {
                          const { baseMessage, equipment } = parseEquipmentFromMessage(line);
                          const equipmentItems = equipment && typeof equipment === "object"
                            ? Array.isArray(equipment.items)
                              ? equipment.items
                              : Object.keys(equipment).filter((key) => key !== "others")
                            : [];
                          return (
                            <>
                              {baseMessage}
                              {equipmentItems.length > 0 ? (
                                <span className="mt-2 block">
                                  <span className="block text-[11px] font-semibold text-gray-700">
                                    Equipment requested:
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-1.5">
                                    {equipmentItems.map((itemKey: string) => (
                                      <span
                                        key={itemKey}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {itemKey.replace(/_/g, " ")}
                                      </span>
                                    ))}
                                  </span>
                                </span>
                              ) : null}
                              {equipment && equipment.others ? (
                                <span className="mt-2 block">
                                  <span className="block text-[11px] font-semibold text-gray-700">
                                    Other notes:
                                  </span>
                                  <span className="text-xs text-gray-600 mt-1 block whitespace-pre-wrap break-words">
                                    {String(equipment.others)}
                                  </span>
                                </span>
                              ) : null}
                            </>
                          );
                        })()}
                      </span>
                    ))}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    {format(new Date(notification.createdAt), "EEE, MMM d • hh:mm a")}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Scroll sentinel for infinite scroll */}
        {visibleCount < notificationsData.length && (
          <div ref={scrollSentinelRef} className="py-4 text-center">
            <p className="text-xs text-gray-400">Loading more notifications...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4">
        <p className="text-[11px] sm:text-sm text-gray-600">
          Showing {Math.min(visibleCount, notificationsData.length)} of {notificationsData.length} notification{notificationsData.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
