import { useEffect, useRef } from 'react';
import { safeJsonParse } from '@admin';

export function useEquipmentHydration(
  adminBookingsData: any[] | undefined,
  pendingBookingsData: any[] | undefined,
  setNeedsStatusById: (updater: (prev: Record<string, 'prepared' | 'not_available'>) => Record<string, 'prepared' | 'not_available'>) => void,
  setBookingItemStatus: (updater: (prev: Record<string, Record<string, 'prepared'|'not_available'>>) => Record<string, Record<string, 'prepared'|'not_available'>>) => void,
) {
  const prevAdminBookingsDataRef = useRef<any[] | undefined>(undefined);
  const prevPendingBookingsDataRef = useRef<any[] | undefined>(undefined);

  useEffect(() => {
    if (!adminBookingsData && !pendingBookingsData) return;

    const prevAdmin = prevAdminBookingsDataRef.current;
    const prevPending = prevPendingBookingsDataRef.current;
    const adminChanged = !prevAdmin || (Array.isArray(adminBookingsData) && (
      prevAdmin.length !== adminBookingsData.length ||
      !prevAdmin.every((b: any, i: number) => String(b?.id) === String(adminBookingsData[i]?.id))
    ));
    const pendingChanged = !prevPending || (Array.isArray(pendingBookingsData) && (
      prevPending.length !== pendingBookingsData.length ||
      !prevPending.every((b: any, i: number) => String(b?.id) === String(pendingBookingsData[i]?.id))
    ));

    if (!adminChanged && !pendingChanged) return;

    if (adminChanged && Array.isArray(adminBookingsData)) prevAdminBookingsDataRef.current = adminBookingsData;
    if (pendingChanged && Array.isArray(pendingBookingsData)) prevPendingBookingsDataRef.current = pendingBookingsData;

    try {
      const derived: Record<string, 'prepared' | 'not_available'> = {};
      const all = Array.isArray(adminBookingsData) ? adminBookingsData.concat(pendingBookingsData || []) : (pendingBookingsData || []);
      (all || []).forEach((b: any) => {
        try {
          const resp = String(b?.adminResponse || '');
          const m = resp.match(/Needs:\s*(Prepared|Not Available)/i);
          if (m) {
            const s = /prepared/i.test(m[1]) ? 'prepared' : 'not_available';
            if (b?.id) derived[b.id] = s as 'prepared' | 'not_available';
          }
        } catch {}
      });

      setNeedsStatusById(prev => {
        try {
          const derivedKeys = Object.keys(derived);
          if (derivedKeys.length === 0) return prev;
          let hasChanges = false;
          for (const k of derivedKeys) {
            if (prev[k] !== derived[k]) { hasChanges = true; break; }
          }
          if (!hasChanges) return prev;
          return { ...prev, ...derived };
        } catch { return prev; }
      });
    } catch {}
  }, [adminBookingsData, pendingBookingsData, setNeedsStatusById]);

  useEffect(() => {
    if (!adminBookingsData && !pendingBookingsData) return;

    const prevAdmin = prevAdminBookingsDataRef.current;
    const prevPending = prevPendingBookingsDataRef.current;
    const adminChanged = !prevAdmin || (Array.isArray(adminBookingsData) && (
      prevAdmin.length !== adminBookingsData.length ||
      !prevAdmin.every((b: any, i: number) => String(b?.id) === String(adminBookingsData[i]?.id))
    ));
    const pendingChanged = !prevPending || (Array.isArray(pendingBookingsData) && (
      prevPending.length !== pendingBookingsData.length ||
      !prevPending.every((b: any, i: number) => String(b?.id) === String(pendingBookingsData[i]?.id))
    ));

    if (!adminChanged && !pendingChanged) return;

    try {
      const map: Record<string, Record<string, 'prepared'|'not_available'>> = {};
      const all = Array.isArray(adminBookingsData) ? adminBookingsData.concat(pendingBookingsData || []) : (pendingBookingsData || []);
      (all || []).forEach((b: any) => {
        try {
          const resp = String(b?.adminResponse || '');
          const m1 = resp.match(/Needs:\s*(\{[\s\S]*\})/i);
          const m2 = resp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
          const jsonTxt = (m1 && m1[1]) ? m1[1] : (m2 && m2[1]) ? m2[1] : null;
          if (!jsonTxt) return;
          const parsed: any = safeJsonParse(jsonTxt);
          if (parsed && parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items)) {
            const per: Record<string, 'prepared'|'not_available'> = {};
            for (const [k, v] of Object.entries(parsed.items)) {
              const val = String(v).toLowerCase().includes('prepared') ? 'prepared' : (String(v).toLowerCase().includes('not') ? 'not_available' : undefined);
              if (val) per[String(k).replace(/_/g, ' ')] = val as any;
            }
            if (Object.keys(per).length > 0 && b?.id) map[b.id] = per;
          }
        } catch {}
      });

      setBookingItemStatus(prev => {
        try {
          if (Object.keys(map).length === 0) return prev;
          let hasChanges = false;
          const next: Record<string, Record<string, 'prepared'|'not_available'>> = {};
          for (const bid of Object.keys(map)) {
            const existing = prev[bid] || {};
            const incoming = map[bid] || {};
            const existingKeys = Object.keys(existing).sort();
            const incomingKeys = Object.keys(incoming).sort();

            let bookingChanged = false;
            if (existingKeys.length !== incomingKeys.length) {
              bookingChanged = true;
            } else {
              for (let i = 0; i < existingKeys.length; i++) {
                const key = existingKeys[i];
                if (key !== incomingKeys[i] || existing[key] !== incoming[key]) { bookingChanged = true; break; }
              }
            }

            if (bookingChanged) { hasChanges = true; next[bid] = incoming; } else { next[bid] = existing; }
          }
          for (const bid of Object.keys(prev)) {
            if (!map[bid]) next[bid] = prev[bid];
          }
          if (!hasChanges) return prev;
          return next;
        } catch { return prev; }
      });
    } catch {}
  }, [adminBookingsData, pendingBookingsData, setBookingItemStatus]);
}
