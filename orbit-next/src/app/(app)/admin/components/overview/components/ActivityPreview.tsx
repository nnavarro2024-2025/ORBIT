import React, { useState } from "react";
import { Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FacilityBooking, User } from "@shared/schema";
import type { ActivityPreviewProps } from "../../admin/types";
import { EmptyState } from "./EmptyState";
import { getEquipmentStatusColor } from "./helpers";

export function ActivityPreview({ activities, user, usersMap, usersData, allBookings, getUserEmail, getFacilityName, formatDateTime, formatAlertMessage, safeJsonParse, onNavigateToActivityLogs }: ActivityPreviewProps) {
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-xl font-bold text-gray-900">Recent System Activity</h3>
          <p className="text-xs sm:text-base text-gray-600 mt-1">Monitor system events and user actions</p>
        </div>
        <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">{activities?.length || 0} Events</div>
      </div>

      {activities && activities.length > 0 ? (
        <div className="space-y-2">
          {activities.slice(0, 5).map((a: any, idx: number) => {
            let actorEmail = '';
            try {
              if (a.userId) actorEmail = getUserEmail(a.userId);
              if (!actorEmail) {
                const details = String(a.details || a.message || '');
                const match = details.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                if (match) actorEmail = match[1];
              }
              if (!actorEmail) {
                const details = String(a.details || a.message || '');
                const adminIdMatch = details.match(/Admin\s+([0-9a-f-]{8,36})/i);
                if (adminIdMatch) {
                  const id = adminIdMatch[1];
                  const found = usersMap.get(id) || (usersData || []).find((u: User) => String(u.id) === String(id));
                  actorEmail = found?.email || '';
                }
              }
            } catch (_e) { actorEmail = ''; }
            if (!actorEmail) actorEmail = user?.email || '';

            let visibleTitle = String(a.title || a.action || '');
            try { if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) visibleTitle = 'Equipment or Needs Request'; } catch {}

            const rawMsg = a.message || a.details || '';
            let formatted = formatAlertMessage(rawMsg);

            try {
              const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
              if (m && m[1]) {
                visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
              }
            } catch {}

            try {
              const needsMatch = (rawMsg || '').toString().match(/Needs:\s*(\{[\s\S]*\})/i);
              if (needsMatch && needsMatch[1]) {
                const needsObj = safeJsonParse(needsMatch[1]);
                if (needsObj && Array.isArray(needsObj.items)) {
                  let othersTextFromItems = '';
                  const mappedItems = needsObj.items.map((s: string) => {
                    const raw = String(s).replace(/_/g, ' ').trim();
                    const lower = raw.toLowerCase();
                    if (lower.includes('others')) {
                      const trailing = raw.replace(/.*?others[:\s-]*/i, '').trim();
                      if (trailing && !othersTextFromItems) othersTextFromItems = trailing;
                      return null;
                    }
                    if (lower === 'whiteboard') return 'Whiteboard & Markers';
                    if (lower === 'projector') return 'Projector';
                    if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
                    if (lower === 'hdmi') return 'HDMI Cable';
                    if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
                    return raw;
                  }).filter(Boolean) as string[];

                  for (let i = mappedItems.length - 1; i >= 0; i--) {
                    if (/others/i.test(String(mappedItems[i]))) mappedItems.splice(i, 1);
                    else mappedItems[i] = String(mappedItems[i]).replace(/[.,;]+$/g, '').trim();
                  }

                  const others = needsObj.others ? String(needsObj.others).trim() : '';
                  const othersText = othersTextFromItems || others || '';
                  const joinWithAnd = (arr: string[]) => {
                    if (!arr || arr.length === 0) return '';
                    if (arr.length === 1) return arr[0];
                    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
                    return `${arr.slice(0, -1).join(', ')} and ${arr.slice(-1)[0]}`;
                  };
                  const buildWithOthers = (items: string[]) => {
                    if (!items || items.length === 0) return 'others';
                    if (items.length === 1) return `${items[0]} and others`;
                    const head = items.slice(0, -1).join(', ');
                    const last = items[items.length - 1];
                    return `${head}, ${last} and others`;
                  };

                  const replacement = othersText ? (mappedItems.length ? `Needs: ${buildWithOthers(mappedItems)}` : `Needs: others`) : `Needs: ${joinWithAnd(mappedItems)}`;
                  try { formatted = String(formatted).replace(/Needs:\s*\{[\s\S]*\}\s*/i, replacement).trim(); } catch {}
                }
              }
            } catch {}

            let targetEmail = '';
            try { const match = (a.message || a.details || '').toString().match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/); if (match) targetEmail = match[1]; } catch {}

            let extractedBookingId: string | null = null;
            try { const bidMatch = (a.message || a.details || '').toString().match(/booking\s+([0-9a-zA-Z-]{6,64})/i); if (bidMatch) extractedBookingId = bidMatch[1]; } catch { extractedBookingId = null; }

            let lookedUpBooking: FacilityBooking | undefined;
            if (extractedBookingId) { try { lookedUpBooking = allBookings.find((b: FacilityBooking) => String(b.id) === String(extractedBookingId)); } catch { lookedUpBooking = undefined; } }

            const title = String((a.title || a.action || '')).toLowerCase();
            const isRequest = title.includes('request') || title.includes('requested') || title.includes('new booking');
            const isApproved = title.includes('approve') || title.includes('approved');
            const isDenied = title.includes('deny') || title.includes('denied');
            const isCancelled = title.includes('cancel');
            const isArrival = title.includes('arrival') || title.includes('confirmed');

            let subLine = formatted;
            try {
              if (isRequest) {
                if (targetEmail && !/^\s*\S+@/.test(subLine)) subLine = `${targetEmail} ${subLine}`.trim();
              } else if (isApproved || isDenied || isCancelled || isArrival) {
                if (isArrival && lookedUpBooking) {
                  const who = getUserEmail(lookedUpBooking.userId);
                  const where = getFacilityName(lookedUpBooking.facilityId);
                  const when = `${formatDateTime(lookedUpBooking.startTime)} to ${formatDateTime(lookedUpBooking.endTime)}`;
                  subLine = `${actorEmail} confirmed arrival for ${who} at ${where} from ${when}`;
                } else if (actorEmail && !subLine.toLowerCase().startsWith(actorEmail.toLowerCase())) {
                  subLine = `${actorEmail} ${subLine}`.trim();
                }
              } else if (actorEmail && !/^\s*\S+@/.test(subLine)) {
                subLine = `${actorEmail} ${subLine}`.trim();
              }
            } catch {}

            try {
              const actionLower = String((a.title || a.action || '')).toLowerCase();
              const isEquipmentAction = /equipment|needs/i.test(actionLower) || /needs request/i.test(visibleTitle.toLowerCase());
              const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}:\d{2}/.test(subLine);
              if (isEquipmentAction && a.createdAt && !hasDateLike) {
                const timestamp = formatDateTime(a.createdAt);
                if (timestamp) subLine = `${subLine} at ${timestamp}`.trim();
              }
            } catch {}

            const { baseMessage, equipment } = ((): { baseMessage: string; equipment: any } => {
              const match = (a.message || a.details || '').toString().match(/\[Equipment:\s*(\{.*\})\]/i);
              if (match) { try { const baseMessage = (a.message || a.details || '').substring(0, (a.message || a.details || '').indexOf(match[0])).trim(); const obj = JSON.parse(match[1]); return { baseMessage, equipment: obj.items || {} }; } catch { /* noop */ } }
              return { baseMessage: subLine, equipment: null };
            })();

            const displaySubLine = equipment ? baseMessage : subLine;

            return (
              <div key={a.id || idx} onClick={() => handleActivityClick(a)} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</h4>
                    <p className="text-xs text-gray-600 mt-1 break-words">{displaySubLine}</p>
                    {equipment && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(equipment).map(([key, value]: [string, any]) => {
                          const displayKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                          return (
                            <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}>{displayKey}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 ml-4">{a.createdAt ? formatDateTime(a.createdAt) : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState Icon={Activity} message="No recent system activity" />
      )}

      <div className="pt-4 border-t border-gray-200 flex justify-end">
        <button onClick={() => onNavigateToActivityLogs('system')} className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors duration-150">View All</button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Activity Details</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Action</h4>
                <p className="text-base font-semibold text-gray-900">{selectedActivity.title || selectedActivity.action || 'System Event'}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Timestamp</h4>
                <p className="text-sm text-gray-900">{selectedActivity.createdAt ? formatDateTime(selectedActivity.createdAt) : 'N/A'}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Details</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {formatAlertMessage(selectedActivity.message || selectedActivity.details || 'No details available')}
                </p>
              </div>
              {selectedActivity.userId && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">User</h4>
                    <p className="text-sm text-gray-900">{getUserEmail(selectedActivity.userId)}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
