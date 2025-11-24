import React, { useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EmptyState } from '../../../common/EmptyState';
import type { FacilityBooking, User } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const ADMIN_ACTIVITY_LOGS_TAB_SYSTEM = 'system' as const;

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export type SystemTabProps = {
  systemActivity: any[];
  systemPage: number;
  setSystemPage: Setter<number>;
  itemsPerPage: number;
  getUserEmail: (id: string) => string;
  getFacilityName: (id: string | number) => string;
  formatDateTime: (d: Date | string | number) => string;
  formatAlertMessage: (raw: string) => string;
  safeJsonParse: (raw: string) => any;
  allBookings: FacilityBooking[];
  usersMap: Map<string, any>;
  usersData: User[];
  user: any | null;
};

export function SystemTab({
  systemActivity,
  systemPage,
  setSystemPage,
  itemsPerPage,
  getUserEmail,
  getFacilityName,
  formatDateTime,
  formatAlertMessage,
  safeJsonParse,
  allBookings,
  usersMap,
  usersData,
  user,
}: SystemTabProps) {
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
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900">System Activity</h3>
      <p className="text-sm text-gray-500 mt-1">Combined system alerts and activity logs for security and operational events.</p>
      {systemActivity.length > 0 ? (
        <>
          <div className="space-y-2 mt-3">
            {systemActivity
              .slice(systemPage * itemsPerPage, (systemPage + 1) * itemsPerPage)
              .map((a: any, idx: number) => {
                const parseEquipmentFromMessage = (message: string) => {
                  const equipmentMarker = message.indexOf('[Equipment:');
                  if (equipmentMarker !== -1) {
                    try {
                      const baseMessage = message.substring(0, equipmentMarker).trim();
                      const jsonStart = message.indexOf('{', equipmentMarker);
                      if (jsonStart === -1) {
                        return { baseMessage, equipment: null };
                      }
                      let depth = 0;
                      let jsonEnd = -1;
                      for (let i = jsonStart; i < message.length; i++) {
                        if (message[i] === '{') depth++;
                        if (message[i] === '}') {
                          depth--;
                          if (depth === 0) {
                            jsonEnd = i + 1;
                            break;
                          }
                        }
                      }
                      if (jsonEnd !== -1) {
                        const jsonStr = message.substring(jsonStart, jsonEnd);
                        const equipmentData = safeJsonParse(jsonStr);
                        // If items is an array, return it as-is for proper rendering
                        if (equipmentData && Array.isArray((equipmentData as any).items)) {
                          return { baseMessage, equipment: (equipmentData as any).items };
                        }
                        return { baseMessage, equipment: equipmentData || null };
                      }
                      return { baseMessage, equipment: null };
                    } catch (e) {
                      const baseMessage = message.substring(0, equipmentMarker).trim();
                      return { baseMessage, equipment: null };
                    }
                  }
                  return { baseMessage: message, equipment: null };
                };

                const getEquipmentStatusColor = (status: string) => {
                  const normalized = status.toLowerCase().replace(/_/g, ' ');
                  if (normalized === 'prepared' || normalized === 'available') return 'bg-green-100 text-green-800';
                  if (normalized === 'not available') return 'bg-red-100 text-red-800';
                  if (normalized === 'requested' || normalized === 'pending') return 'bg-yellow-100 text-yellow-800';
                  return 'bg-gray-100 text-gray-800';
                };

                return (
                  (() => {
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
                          actorEmail = (found as any)?.email || '';
                        }
                      }
                    } catch (e) {
                      actorEmail = '';
                    }
                    if (!actorEmail) actorEmail = user?.email || '';

                    let visibleTitle = String(a.title || a.action || '');
                    try {
                      if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) {
                        visibleTitle = 'Equipment or Needs Request';
                      }
                    } catch (e) {}
                    let appendedEmail: string | null = null;
                    try {
                      const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
                      if (m && m[1]) {
                        appendedEmail = m[1];
                        visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
                      }
                    } catch (e) {
                      appendedEmail = null;
                    }

                    const rawMsg = a.message || a.details || '';
                    let formatted = formatAlertMessage(rawMsg);
                    let appendedIsTarget = false;
                    if (appendedEmail) appendedIsTarget = true;

                    try {
                      if (/needs request/i.test(visibleTitle)) {
                        const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
                        const rawEmails = (String(formatted).match(emailRegex) || []);
                        const uniq: string[] = [];
                        for (const e of rawEmails) if (!uniq.includes(e)) uniq.push(e);

                        let targetEmail = '';
                        if (appendedIsTarget && appendedEmail && appendedEmail.toLowerCase() !== actorEmail.toLowerCase()) targetEmail = appendedEmail;
                        if (!targetEmail) {
                          for (const e of uniq) {
                            if (actorEmail && e.toLowerCase() === String(actorEmail).toLowerCase()) continue;
                            targetEmail = e; break;
                          }
                        }
                        if (!targetEmail && uniq.length > 0) targetEmail = uniq[0];

                        let rest = String(formatted).replace(emailRegex, '').trim();
                        rest = rest.replace(/^[:\-\s,]+/, '').trim();
                        if (!/^(requested|requested equipment|requested equipment:)/i.test(rest)) {
                          rest = `requested equipment: ${rest}`.trim();
                        }
                        if (targetEmail) formatted = `${targetEmail} ${rest}`.trim();
                        if (!actorEmail && appendedEmail && appendedEmail !== targetEmail) actorEmail = appendedEmail;
                      }
                    } catch (e) {}

                    try {
                      const needsMatch = (a.message || a.details || '').toString().match(/Needs:\s*(\{[\s\S]*\})/i);
                      if (needsMatch && needsMatch[1]) {
                        let needsObj: any = null;
                        const jsonText = needsMatch[1];
                        needsObj = safeJsonParse(jsonText);
                        if (needsObj && Array.isArray(needsObj.items)) {
                          let othersTextFromItems = '';
                          const mappedItems = needsObj.items
                            .map((s: string) => {
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
                            })
                            .filter(Boolean) as string[];
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
                          const equipmentText = joinWithAnd(mappedItems);
                          const buildWithOthers = (items: string[]) => {
                            if (!items || items.length === 0) return 'others';
                            if (items.length === 1) return `${items[0]} and others`;
                            const head = items.slice(0, -1).join(', ');
                            const last = items[items.length - 1];
                            return `${head}, ${last} and others`;
                          };
                          const replacement = othersText
                            ? mappedItems.length
                              ? `Needs: ${buildWithOthers(mappedItems)}`
                              : `Needs: others`
                            : `Needs: ${equipmentText}`;
                          try {
                            formatted = String(formatted).replace(/Needs:\s*\{[\s\S]*\}\s*/i, replacement).trim();
                          } catch (e) {}
                        }
                      }
                    } catch (e) {}

                    try {
                      const eqMatch = (a.message || a.details || '').toString().match(/Requested equipment:\s*([^\[]+)/i);
                      if (eqMatch && eqMatch[1]) {
                        const rawList = String(eqMatch[1]).trim();
                        const parts = rawList.split(/[,;]+/).map((s) => String(s).trim()).filter(Boolean);
                        let othersText = '';
                        const mapped = parts
                          .map((it) => {
                            const raw = String(it).trim();
                            const lower = raw.toLowerCase();
                            if (lower.includes('others')) {
                              const trailing = raw.replace(/.*?others[:\s-]*/i, '').trim();
                              if (trailing && !othersText) othersText = trailing;
                              return null;
                            }
                            if (lower === 'whiteboard') return 'Whiteboard & Markers';
                            if (lower === 'projector') return 'Projector';
                            if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
                            if (lower === 'hdmi') return 'HDMI Cable';
                            if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
                            return raw;
                          })
                          .filter(Boolean) as string[];
                        for (let i = mapped.length - 1; i >= 0; i--) {
                          if (/others/i.test(String(mapped[i]))) mapped.splice(i, 1);
                          else mapped[i] = String(mapped[i]).replace(/[.,;]+$/g, '').trim();
                        }
                        const extrasMatch = rawList.match(/Others?:\s*(.*)$/i);
                        if (!othersText && extrasMatch && extrasMatch[1]) othersText = String(extrasMatch[1]).trim();
                        const equipmentItems = mapped;
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

                        let replacement = '';
                        if (othersText) {
                          if (equipmentItems.length === 0) replacement = `requested equipment: others`;
                          else replacement = `requested equipment: ${buildWithOthers(equipmentItems)}`;
                        } else {
                          replacement = `requested equipment: ${joinWithAnd(equipmentItems)}`;
                        }
                        try {
                          formatted = String(formatted).replace(/Requested equipment:\s*([^\[]+)/i, replacement).trim();
                        } catch (e) {}
                      }
                    } catch (e) {}

                    try {
                      formatted = String(formatted).replace(/,\s*(and\s+)?others(\b)/i, ' and others$2');
                      formatted = String(formatted)
                        .replace(/,?\s*Others?:\s*[^,\]]+/i, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                      formatted = formatted.replace(/,\s*and\s+others/i, ' and others');
                    } catch (e) {}
                    try {
                      formatted = formatted.replace(/^Admin\b[:\s,-]*/i, '');
                    } catch (e) {}
                    if (actorEmail) {
                      try {
                        const esc = String(actorEmail).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        formatted = String(formatted).replace(new RegExp(esc, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
                      } catch (e) {}
                    }

                    let targetEmail = '';
                    try {
                      const m = (a.message || a.details || '').toString().match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                      if (m) targetEmail = m[1];
                    } catch (e) {}

                    let extractedBookingId: string | null = null;
                    try {
                      const bidMatch = (a.message || a.details || '').toString().match(/booking\s+([0-9a-zA-Z-]{6,64})/i);
                      if (bidMatch) extractedBookingId = bidMatch[1];
                    } catch (e) {
                      extractedBookingId = null;
                    }

                    let lookedUpBooking: FacilityBooking | undefined;
                    if (extractedBookingId) {
                      try {
                        lookedUpBooking = allBookings.find((b) => String(b.id) === String(extractedBookingId));
                      } catch (e) {
                        lookedUpBooking = undefined;
                      }
                    }

                    const title = String((a.title || a.action || '')).toLowerCase();
                    const isRequest = title.includes('request') || title.includes('requested') || title.includes('new booking');
                    const isApproved = title.includes('approve') || title.includes('approved');
                    const isDenied = title.includes('deny') || title.includes('denied');
                    const isCancelled = title.includes('cancel');
                    const isArrival = title.includes('arrival') || title.includes('confirmed');

                    const activityTime =
                      (a as any).createdAt || (a as any).created_at || (a as any).timestamp || (a as any).time || (a as any).date || (a as any).updatedAt || (a as any).updated_at;

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
                      } else {
                        if (actorEmail && !/^\s*\S+@/.test(subLine)) subLine = `${actorEmail} ${subLine}`.trim();
                      }
                    } catch (e) {}

                    try {
                      const actionLower = String((a.title || a.action || '')).toLowerCase();
                      const isEquipmentAction = /equipment|needs/i.test(actionLower) || /needs request/i.test(visibleTitle.toLowerCase());
                      const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}:\d{2}/.test(subLine);
                      if (isEquipmentAction && activityTime && !hasDateLike) {
                        const t = formatDateTime(activityTime);
                        if (t) subLine = `${subLine} at ${t}`.trim();
                      }
                    } catch (e) {}

                    const { baseMessage, equipment } = parseEquipmentFromMessage(a.message || a.details || '');
                    const displaySubLine = equipment ? baseMessage : subLine;

                    return (
                      <div 
                        key={a.id || idx} 
                        className="bg-white rounded-md p-3 border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                        onClick={() => handleActivityClick(a)}
                      >
                        <div className="flex flex-col gap-2 md:hidden">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-gray-900 flex-1 break-words">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</p>
                            <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                              {activityTime ? formatDateTime(activityTime) : a.createdAt ? formatDateTime(a.createdAt) : ''}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 break-words">{displaySubLine}</p>
                          {equipment && (
                            <div className="flex flex-wrap gap-1.5">
                              {Array.isArray(equipment)
                                ? (equipment as any[]).map((item, idx) => {
                                    const itemName = String(item).replace(/_/g, ' ');
                                    return (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {itemName}
                                      </span>
                                    );
                                  })
                                : Object.entries(equipment).map(([key, value]: [string, any]) => {
                                    const displayKey = key
                                      .split('_')
                                      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                      .join(' ');
                                    return (
                                      <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}>
                                        {displayKey}
                                      </span>
                                    );
                                  })}
                            </div>
                          )}
                          {a.source && <div className="text-xs text-gray-400">Source: {a.source}</div>}
                        </div>

                        <div className="hidden md:flex items-start justify-between gap-3">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-sm text-gray-900">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</p>
                            <p className="text-xs text-gray-600 mt-1">{displaySubLine}</p>
                            {equipment && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Array.isArray(equipment)
                                  ? (equipment as any[]).map((item, idx) => {
                                      const itemName = String(item).replace(/_/g, ' ');
                                      return (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                          {itemName}
                                        </span>
                                      );
                                    })
                                  : Object.entries(equipment).map(([key, value]: [string, any]) => {
                                      const displayKey = key
                                        .split('_')
                                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                        .join(' ');
                                      return (
                                        <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}>
                                          {displayKey}
                                        </span>
                                      );
                                    })}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">{a.source ? `Source: ${a.source}` : ''}</div>
                          </div>
                          <div className="w-44 text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                            <div className="w-full">{activityTime ? formatDateTime(activityTime) : a.createdAt ? formatDateTime(a.createdAt) : ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                );
              })}
          </div>

          {systemActivity.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {systemPage * itemsPerPage + 1} to {Math.min((systemPage + 1) * itemsPerPage, systemActivity.length)} of {systemActivity.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSystemPage((prev) => Math.max(Number(prev) - 1, 0))}
                  disabled={systemPage === 0}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
                  {systemPage + 1} of {Math.ceil(systemActivity.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setSystemPage((prev) => (systemActivity && (Number(prev) + 1) * itemsPerPage < systemActivity.length ? Number(prev) + 1 : Number(prev)))}
                  disabled={!systemActivity || (systemPage + 1) * itemsPerPage >= systemActivity.length}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState Icon={Activity} message="No system activity found" />
      )}

      {/* Activity Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Activity Details</DialogTitle>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-6 pt-4">
              {/* Title/Action */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 mt-0.5">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Action / Event</h3>
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {selectedActivity.title || selectedActivity.action || 'System Event'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Timestamp */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Timestamp</h3>
                <p className="text-base">
                  {formatDateTime(
                    selectedActivity.createdAt ||
                    selectedActivity.created_at ||
                    selectedActivity.timestamp ||
                    selectedActivity.time ||
                    selectedActivity.date ||
                    selectedActivity.updatedAt ||
                    selectedActivity.updated_at
                  )}
                </p>
              </div>

              <Separator />

              {/* User/Actor */}
              {selectedActivity.userId && (
                <>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">User</h3>
                    <p className="text-base font-mono break-all">
                      {getUserEmail(selectedActivity.userId) || selectedActivity.userId}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Full Message/Details */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Details</h3>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  {formatAlertMessage(selectedActivity.message || selectedActivity.details || 'No additional details available')}
                </p>
              </div>

              {/* Source */}
              {selectedActivity.source && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Source</h3>
                    <p className="text-sm">{selectedActivity.source}</p>
                  </div>
                </>
              )}

              {/* Type/Severity */}
              {(selectedActivity.type || selectedActivity.severity) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    {selectedActivity.type && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Type</h3>
                        <Badge variant="outline">{selectedActivity.type}</Badge>
                      </div>
                    )}
                    {selectedActivity.severity && (
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Severity</h3>
                        <Badge 
                          variant={
                            selectedActivity.severity === 'critical' ? 'destructive' :
                            selectedActivity.severity === 'high' ? 'destructive' :
                            selectedActivity.severity === 'medium' ? 'secondary' :
                            'outline'
                          }
                        >
                          {selectedActivity.severity}
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ID */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Activity ID: <span className="font-mono">{selectedActivity.id}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

