/**
 * Notification Item Component
 * 
 * Renders individual notification items with equipment status display
 */

import React from 'react';
import { Check, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { parseEquipmentAlert, sanitizeDisplayText } from '../utils';

interface NotificationItemProps {
  alert: any;
  user: any;
  isAdmin: boolean;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  onMarkAsRead: (id: string) => void;
  onHideAlert: (id: string) => void;
  pendingMarkIds: Set<string>;
}

export function NotificationItem({
  alert,
  user,
  isAdmin,
  allBookings,
  userBookings,
  allFacilities,
  onMarkAsRead,
  onHideAlert,
  pendingMarkIds,
}: NotificationItemProps) {
  const parsed = parseEquipmentAlert(alert);

  // Resolve actor email
  let actorEmail = '';
  try {
    const m = String(alert.message || alert.details || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/);
    if (m && m[1]) actorEmail = m[1];
  } catch (e) { /* ignore */ }
  if (!actorEmail) actorEmail = user?.email || '';

  const isOwnerAlert = !!(user && String(alert.userId || '').toLowerCase() === String(user.id || '').toLowerCase());

  const titleStr = String(alert.title || '').toLowerCase();
  const msgStr = String(alert.message || alert.details || '').toLowerCase();

  const when = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '';
  
  // Build lead-in message
  const leadIn = buildLeadInMessage({
    alert,
    parsed,
    isAdmin,
    isOwnerAlert,
    actorEmail,
    titleStr,
    msgStr,
  });

  // Build items display
  const itemsDisplay = buildItemsDisplay({
    parsed,
    alert,
    allBookings,
    userBookings,
    allFacilities,
    actorEmail,
  });

  const readPrefix = alert.isRead ? 'READ: ' : '';
  const shouldAppendWhen = Boolean(
    (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) || 
    (parsed.equipmentList && parsed.equipmentList.length > 0)
  );
  
  const fallbackShort = sanitizeDisplayText(parsed.cleaned || String(alert.message || alert.details || ''), isAdmin);
  const smallMessage = `${readPrefix}${leadIn}${shouldAppendWhen && when ? ` at ${when}` : ''}${(!leadIn || leadIn.length === 0) ? ` ${fallbackShort}` : ''}`.trim();

  return (
    <div className={`p-2 rounded-md ${alert.isRead ? 'opacity-70' : ''}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {parsed.visibleTitle}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!alert.isRead && (
              <button
                onClick={() => onMarkAsRead(alert.id)}
                disabled={pendingMarkIds.has(alert.id)}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                title="Mark as read"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onHideAlert(alert.id)}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="Hide notification"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-600 break-words">
          {smallMessage}
        </div>

        {itemsDisplay}
      </div>
    </div>
  );
}

/**
 * Build the lead-in message for the notification
 */
function buildLeadInMessage({
  alert,
  parsed,
  isAdmin,
  isOwnerAlert,
  actorEmail,
  titleStr,
  msgStr,
}: {
  alert: any;
  parsed: ReturnType<typeof parseEquipmentAlert>;
  isAdmin: boolean;
  isOwnerAlert: boolean;
  actorEmail: string;
  titleStr: string;
  msgStr: string;
}): string {
  // For admin users viewing UPDATES
  if (isAdmin && titleStr.includes('equipment or needs request')) {
    try {
      const msgText = String(alert.message || '');
      const updateMatch = msgText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})\s+updated\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})'s\s+equipment\s+request/i);
      if (updateMatch && updateMatch[1] && updateMatch[2]) {
        const adminEmail = updateMatch[1];
        const userEmail = updateMatch[2];
        if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) {
          const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
          const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
          if (allPrepared) return `${adminEmail} marked ${userEmail}'s equipment as prepared`;
          if (allNotAvailable) return `${adminEmail} marked ${userEmail}'s equipment as not available`;
          return `${adminEmail} updated ${userEmail}'s equipment request`;
        }
        return `${adminEmail} updated ${userEmail}'s equipment request`;
      }
    } catch (e) { /* ignore */ }
  }

  // For admin users viewing INITIAL requests
  if (isAdmin && parsed.cleaned && parsed.cleaned.length > 0) {
    return sanitizeDisplayText(parsed.cleaned, true).slice(0, 200);
  }

  // For equipment updates
  try {
    const msgText = String(alert.message || '');
    const cleanedText = String(parsed.cleaned || '');
    const combinedText = msgText + ' ' + cleanedText;

    const updateMatch = combinedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})\s+updated\s+(?:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})'s\s+)?equipment\s+request/i);
    if (updateMatch && updateMatch[1]) {
      const adminEmail = updateMatch[1];
      if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) {
        const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
        const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
        if (allPrepared) return `${adminEmail} marked your equipment as prepared`;
        if (allNotAvailable) return `${adminEmail} marked your equipment as not available`;
        return `${adminEmail} updated your equipment request`;
      }
      return `${adminEmail} updated your equipment request`;
    }
  } catch (e) { /* ignore */ }

  const msgLower = String(alert.message || '').toLowerCase();
  const isInitialSubmission = msgLower.includes('submitted') && !msgLower.includes('updated');
  const actorLabel = isOwnerAlert ? 'An admin' : 'An admin';

  try {
    // For INITIAL submissions
    if (isInitialSubmission && isOwnerAlert) {
      const facilityMatch = String(alert.message || '').match(/equipment request for\s+([^on]+?)\s+on\s+(.+?)\./i);
      if (facilityMatch && facilityMatch[1] && facilityMatch[2]) {
        return `You submitted an equipment request for ${facilityMatch[1].trim()} on ${facilityMatch[2].trim()}`;
      }
      return `You submitted an equipment request`;
    }

    // For UPDATES
    if (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0 && !isInitialSubmission) {
      const allPrepared = parsed.itemsWithStatus.every((it: any) => it.status === 'prepared');
      const allNotAvailable = parsed.itemsWithStatus.every((it: any) => it.status === 'not_available');
      if (allPrepared) return `${actorLabel} marked requested equipment as prepared`;
      if (allNotAvailable) return `${actorLabel} marked requested equipment as not available`;
      return `${actorLabel} updated the equipment request`;
    }

    if (parsed.equipmentList && parsed.equipmentList.length > 0) {
      if (isOwnerAlert && isInitialSubmission) return `You requested equipment: ${parsed.equipmentList.join(', ')}`;
      if (isOwnerAlert) return `Your equipment request: ${parsed.equipmentList.join(', ')}`;
      return `Equipment requested: ${parsed.equipmentList.join(', ')}`;
    }
  } catch (e) { /* ignore */ }

  // Fallbacks
  if (parsed.cleaned && parsed.cleaned.length > 0) {
    return sanitizeDisplayText(parsed.cleaned, isAdmin).slice(0, 200);
  }
  return sanitizeDisplayText(String(alert.message || alert.details || ''), isAdmin).slice(0, 200);
}

/**
 * Build the items display (equipment list with statuses)
 */
function buildItemsDisplay({
  parsed,
  alert,
  allBookings,
  userBookings,
  allFacilities,
  actorEmail,
}: {
  parsed: ReturnType<typeof parseEquipmentAlert>;
  alert: any;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  actorEmail: string;
}): React.ReactNode {
  try {
    let inferredItemsWithStatus: typeof parsed.itemsWithStatus | null = null;
    
    // Try to infer from related booking adminResponse
    if ((!parsed.itemsWithStatus || parsed.itemsWithStatus.length === 0) && 
        parsed.equipmentList && parsed.equipmentList.length > 0) {
      inferredItemsWithStatus = inferItemsFromBookings({
        parsed,
        alert,
        allBookings,
        userBookings,
        allFacilities,
        actorEmail,
      });
    }

    const useItems = (parsed.itemsWithStatus && parsed.itemsWithStatus.length > 0) 
      ? parsed.itemsWithStatus 
      : inferredItemsWithStatus;

    if (useItems && useItems.length > 0) {
      return (
        <ul className="mt-2 text-xs text-gray-700 space-y-1">
          {useItems.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {it.status === 'prepared' ? (
                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : it.status === 'not_available' ? (
                <X className="h-3 w-3 text-red-600 flex-shrink-0" />
              ) : (
                <Clock className="h-3 w-3 text-yellow-600 flex-shrink-0" />
              )}
              <span className={
                it.status === 'prepared' 
                  ? 'text-green-700' 
                  : it.status === 'not_available' 
                    ? 'text-red-700' 
                    : 'text-yellow-700'
              }>
                {it.label}
              </span>
            </li>
          ))}
          {parsed.othersText && (
            <li className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                Other details: {parsed.othersText}
              </span>
            </li>
          )}
        </ul>
      );
    } else if (parsed.equipmentList && parsed.equipmentList.length > 0) {
      // Fallback: simple list without statuses
      const titleStr = String(alert.title || '').toLowerCase();
      const msgStr = String(alert.message || alert.details || '').toLowerCase();
      const needsStatus: 'prepared' | 'not_available' | 'pending' = 
        /prepared/.test(titleStr) || msgStr.includes('status: prepared')
          ? 'prepared'
          : (/not available/.test(titleStr) || msgStr.includes('status: not available') 
            ? 'not_available' 
            : 'pending');

      return (
        <ul className="mt-2 text-xs text-gray-700 space-y-1">
          {parsed.equipmentList.map((it: string, idx: number) => (
            <li key={idx} className="flex items-center gap-2">
              {needsStatus === 'prepared' ? (
                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
              ) : needsStatus === 'not_available' ? (
                <X className="h-3 w-3 text-red-600 flex-shrink-0" />
              ) : (
                <Clock className="h-3 w-3 text-yellow-600 flex-shrink-0" />
              )}
              <span className={
                needsStatus === 'prepared' 
                  ? 'text-green-700' 
                  : needsStatus === 'not_available' 
                    ? 'text-red-700' 
                    : 'text-yellow-700'
              }>
                {it}
              </span>
            </li>
          ))}
          {parsed.othersText && (
            <li className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                Other details: {parsed.othersText}
              </span>
            </li>
          )}
        </ul>
      );
    }
  } catch (e) { /* ignore */ }

  return null;
}

/**
 * Infer items with status from booking adminResponse
 */
function inferItemsFromBookings({
  parsed,
  alert,
  allBookings,
  userBookings,
  allFacilities,
  actorEmail,
}: {
  parsed: ReturnType<typeof parseEquipmentAlert>;
  alert: any;
  allBookings: any[];
  userBookings: any[];
  allFacilities: any[];
  actorEmail: string;
}): typeof parsed.itemsWithStatus | null {
  try {
    const mergedBookings = [...(userBookings || []), ...(allBookings || [])];
    const matchEmail = parsed.titleRequesterEmail || actorEmail || '';
    
    const emailMatch = alert.message?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/);
    const extractedEmail = emailMatch ? emailMatch[1] : null;
    
    const candidates = mergedBookings.filter((b: any) => {
      try {
        const ownerEmail = String(b.userEmail || b.user?.email || '').toLowerCase();
        const matchTarget = (matchEmail || extractedEmail || '').toLowerCase();
        return matchTarget && ownerEmail && ownerEmail === matchTarget;
      } catch (e) { 
        return false; 
      }
    });

    let chosen: any = null;
    if (candidates.length === 1) {
      chosen = candidates[0];
    } else if (candidates.length > 1) {
      const msg = String(alert.message || alert.details || '');
      const best = candidates.find((b: any) => {
        try {
          const fac = allFacilities.find((f: any) => f.id === b.facilityId);
          if (!fac) return false;
          return msg.includes(String(fac.name || ''));
        } catch (e) { 
          return false; 
        }
      });
      chosen = best || candidates[0];
    }

    if (chosen) {
      const adminResp = String(chosen.adminResponse || '');
      let structuredFromBooking: any = null;
      
      try {
        const jsonMatch = adminResp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
        if (jsonMatch && jsonMatch[1]) {
          structuredFromBooking = JSON.parse(jsonMatch[1]);
        }
      } catch (e) { /* ignore */ }

      if (structuredFromBooking && structuredFromBooking.items && typeof structuredFromBooking.items === 'object') {
        const mapToken = (rawToken: string) => {
          const raw = String(rawToken || '').replace(/_/g, ' ').trim();
          const lower = raw.toLowerCase();
          if (lower === 'others' || lower === 'other') return null;
          if (lower === 'whiteboard') return 'Whiteboard & Markers';
          if (lower === 'projector') return 'Projector';
          if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
          if (lower === 'hdmi') return 'HDMI Cable';
          if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
          return raw.replace(/[.,;]+$/g, '').trim();
        };

        return Object.keys(structuredFromBooking.items).map((k) => {
          const mapped = mapToken(k);
          if (!mapped) return null;
          const rawVal = (structuredFromBooking.items as any)[k];
          const val = String(rawVal || '').toLowerCase();
          const status: 'prepared' | 'not_available' | 'pending' = 
            val === 'prepared' || val === 'true' || val === 'yes' 
              ? 'prepared' 
              : (val === 'not available' || val === 'not_available' || val === 'false' || val === 'no' 
                ? 'not_available' 
                : 'pending');
          return { label: mapped, status };
        }).filter(Boolean) as Array<{ label: string; status: 'prepared' | 'not_available' | 'pending' }>;
      } else if (/Needs:\s*Prepared/i.test(adminResp)) {
        return parsed.equipmentList.map(label => ({ label, status: 'prepared' as const }));
      } else if (/Needs:\s*Not Available/i.test(adminResp) || /Not Available/i.test(adminResp)) {
        return parsed.equipmentList.map(label => ({ label, status: 'not_available' as const }));
      }
    }
  } catch (e) { /* ignore */ }

  return null;
}
