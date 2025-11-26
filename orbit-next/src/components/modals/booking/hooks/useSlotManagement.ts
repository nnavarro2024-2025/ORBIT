/**
 * useSlotManagement.ts
 * 
 * Custom hook for managing slot holds, refresh timers, and slot availability.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { format } from 'date-fns';

export interface SerializedSlotHold {
  id: string;
  facilityId?: number;
  startTime?: string;
  endTime?: string;
  expiresAt: string;
}

export interface ConflictEntry {
  id: number;
  startTime: string;
  endTime: string;
  facilityName: string;
  status: string;
}

export interface LockedSlot {
  holdId: string;
  facilityId: number;
  startTime: string;
  endTime: string;
  expiresAt: string;
}

export function useSlotManagement(isOpen: boolean, selectedFacilityName?: string) {
  const [lockedSlot, setLockedSlot] = useState<LockedSlot | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [holdConflicts, setHoldConflicts] = useState<ConflictEntry[] | null>(null);
  
  const holdRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHoldRequestRef = useRef(0);
  const failedHoldSignatureRef = useRef<string | null>(null);
  const latestHoldIdRef = useRef<string | null>(null);

  const clearHoldRefreshTimer = useCallback(() => {
    if (holdRefreshTimeoutRef.current) {
      clearTimeout(holdRefreshTimeoutRef.current);
      holdRefreshTimeoutRef.current = null;
    }
  }, []);

  const releaseHold = useCallback(
    async (holdId?: string) => {
      clearHoldRefreshTimer();
      const targetHoldId = holdId ?? latestHoldIdRef.current;
      latestHoldIdRef.current = null;
      setLockedSlot(null);
      if (!targetHoldId) return;
      
      try {
        await apiRequest("DELETE", `/api/booking-holds?holdId=${encodeURIComponent(targetHoldId)}`);
      } catch (error) {
        console.warn("[useSlotManagement] Failed to release slot hold", error);
      }
    },
    [clearHoldRefreshTimer]
  );

  const scheduleHoldRefresh = useCallback(
    (hold: SerializedSlotHold, ensureSlotHoldFn: () => Promise<void>) => {
      clearHoldRefreshTimer();
      const expiresAtMs = new Date(hold.expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) return;
      
      const refreshDelay = Math.max(expiresAtMs - Date.now() - 15_000, 5_000);
      
      holdRefreshTimeoutRef.current = setTimeout(async () => {
        try {
          const resp = await apiRequest("PATCH", "/api/booking-holds", { holdId: hold.id });
          const data = await resp.json();
          const refreshed: SerializedSlotHold | undefined = data?.hold;
          
          if (!refreshed) throw new Error("Missing slot hold data");
          
          latestHoldIdRef.current = refreshed.id;
          failedHoldSignatureRef.current = null;
          
          setLockedSlot((prev) => {
            if (!prev) {
              return {
                holdId: refreshed.id,
                facilityId: refreshed.facilityId ?? hold.facilityId ?? 0,
                startTime: refreshed.startTime ?? hold.startTime ?? "",
                endTime: refreshed.endTime ?? hold.endTime ?? "",
                expiresAt: refreshed.expiresAt,
              };
            }
            if (prev.holdId === refreshed.id) {
              return { ...prev, expiresAt: refreshed.expiresAt };
            }
            return { ...prev, holdId: refreshed.id, expiresAt: refreshed.expiresAt };
          });
          
          scheduleHoldRefresh({
            id: refreshed.id,
            facilityId: refreshed.facilityId ?? hold.facilityId,
            startTime: refreshed.startTime ?? hold.startTime,
            endTime: refreshed.endTime ?? hold.endTime,
            expiresAt: refreshed.expiresAt,
          }, ensureSlotHoldFn);
        } catch (error) {
          console.warn("[useSlotManagement] Failed to refresh slot hold", error);
          clearHoldRefreshTimer();
          latestHoldIdRef.current = null;
          setLockedSlot(null);
          setHoldConflicts(null);
          setLockError("Slot hold expired. Attempting to reacquire...");
          failedHoldSignatureRef.current = null;
          await ensureSlotHoldFn();
        }
      }, refreshDelay);
    },
    [clearHoldRefreshTimer]
  );

  const acquireSlotHold = useCallback(
    async (
      facilityId: number,
      startTime: Date,
      endTime: Date,
      ensureSlotHoldFn: () => Promise<void>
    ): Promise<boolean> => {
      const normalizedStart = new Date(startTime);
      const normalizedEnd = new Date(endTime);
      const desiredSignature = `${facilityId}|${normalizedStart.toISOString()}|${normalizedEnd.toISOString()}`;
      const currentSignature = lockedSlot
        ? `${lockedSlot.facilityId}|${lockedSlot.startTime}|${lockedSlot.endTime}`
        : null;

      if (lockedSlot && currentSignature === desiredSignature) {
        if (!holdRefreshTimeoutRef.current) {
          scheduleHoldRefresh({
            id: lockedSlot.holdId,
            facilityId: lockedSlot.facilityId,
            startTime: lockedSlot.startTime,
            endTime: lockedSlot.endTime,
            expiresAt: lockedSlot.expiresAt,
          }, ensureSlotHoldFn);
        }
        return true;
      }

      if (failedHoldSignatureRef.current === desiredSignature) {
        return false;
      }

      clearHoldRefreshTimer();
      const requestId = Date.now();
      latestHoldRequestRef.current = requestId;

      try {
        const resp = await apiRequest("POST", "/api/booking-holds", {
          holdId: lockedSlot?.holdId,
          facilityId,
          startTime: normalizedStart.toISOString(),
          endTime: normalizedEnd.toISOString(),
        });
        const data = await resp.json();
        
        if (latestHoldRequestRef.current !== requestId) return false;
        
        const hold: SerializedSlotHold | undefined = data?.hold;
        if (!hold) throw new Error("Missing slot hold data");

        latestHoldIdRef.current = hold.id;
        failedHoldSignatureRef.current = null;
        setHoldConflicts(null);
        setLockError(null);
        
        setLockedSlot({
          holdId: hold.id,
          facilityId: hold.facilityId ?? facilityId,
          startTime: hold.startTime ?? normalizedStart.toISOString(),
          endTime: hold.endTime ?? normalizedEnd.toISOString(),
          expiresAt: hold.expiresAt,
        });
        
        scheduleHoldRefresh({
          id: hold.id,
          facilityId: hold.facilityId ?? facilityId,
          startTime: hold.startTime ?? normalizedStart.toISOString(),
          endTime: hold.endTime ?? normalizedEnd.toISOString(),
          expiresAt: hold.expiresAt,
        }, ensureSlotHoldFn);
        
        return true;
      } catch (error: any) {
        if (latestHoldRequestRef.current !== requestId) return false;

        const previousHoldId = lockedSlot?.holdId;
        latestHoldIdRef.current = null;
        setLockedSlot(null);
        
        if (previousHoldId) {
          try {
            await apiRequest("DELETE", `/api/booking-holds?holdId=${encodeURIComponent(previousHoldId)}`);
          } catch (releaseError) {
            console.warn("[useSlotManagement] Failed to release previous hold", releaseError);
          }
        }

        failedHoldSignatureRef.current = desiredSignature;
        let errorMessage = "Unable to reserve the selected time slot.";
        let conflicts: ConflictEntry[] | null = null;

        const payload = error?.payload;
        if (payload) {
          if (payload.message) errorMessage = payload.message;
          
          if (Array.isArray(payload.conflictingBookings)) {
            const facilityName = selectedFacilityName || `Facility ${facilityId}`;
            conflicts = payload.conflictingBookings.map((booking: any) => ({
              id: booking.id,
              startTime: booking.startTime,
              endTime: booking.endTime,
              facilityName,
              status: booking.status,
            }));
          }
          
          if (payload.conflictingHoldExpiresAt) {
            const expiresAt = new Date(payload.conflictingHoldExpiresAt);
            if (!Number.isNaN(expiresAt.getTime())) {
              errorMessage = `Another user is currently holding this slot until ${format(expiresAt, "MMM d, yyyy h:mm a")}.`;
            }
          }
        } else if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }

        setHoldConflicts(conflicts);
        setLockError(errorMessage);
        return false;
      }
    },
    [lockedSlot, selectedFacilityName, scheduleHoldRefresh, clearHoldRefreshTimer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      failedHoldSignatureRef.current = null;
      void releaseHold();
    };
  }, [releaseHold]);

  // Release hold when modal closes
  useEffect(() => {
    if (!isOpen) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      void releaseHold();
    }
  }, [isOpen, releaseHold]);

  return {
    lockedSlot,
    lockError,
    holdConflicts,
    acquireSlotHold,
    releaseHold,
    clearHoldRefreshTimer,
  };
}
