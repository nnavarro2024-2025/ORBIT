/**
 * Header-specific hooks
 * 
 * Custom hooks for managing header functionality like
 * alert visibility, search, and notification state.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useNotifications } from '@/hooks/data';
import { parseEquipmentAlert } from '../utils';

const EMPTY_ARRAY: any[] = [];

interface UseHeaderAlertsOptions {
  user: any;
  isAdmin: boolean;
  isOnBookingDashboard: boolean;
}

/**
 * Hook to manage alert visibility and persistence
 */
export function useAlertVisibility(userId: string | undefined) {
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<string>>(new Set());
  const [hiddenAlertIdsVersion, setHiddenAlertIdsVersion] = useState(0);

  const hiddenStorageKey = useMemo(
    () => userId ? `orbit:hiddenAlerts:${userId}` : null,
    [userId]
  );

  // Load persisted hidden alert IDs from localStorage
  useEffect(() => {
    if (!hiddenStorageKey) return;

    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const nextSet = new Set<string>();
      for (const value of parsed) {
        if (typeof value === "string") {
          nextSet.add(value);
        }
      }

      setHiddenAlertIds((prev) => {
        if (prev.size === nextSet.size) {
          let identical = true;
          for (const value of nextSet) {
            if (!prev.has(value)) {
              identical = false;
              break;
            }
          }
          if (identical) return prev;
        }
        setHiddenAlertIdsVersion(v => v + 1);
        return nextSet;
      });
    } catch (error) {
      // Ignore malformed JSON entries
    }
  }, [hiddenStorageKey]);

  const persistHiddenIds = useCallback((nextSet: Set<string>) => {
    try {
      if (!hiddenStorageKey) return;
      localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(nextSet)));
    } catch (e) { /* ignore */ }
  }, [hiddenStorageKey]);

  const hideAlert = useCallback((id: string) => {
    setHiddenAlertIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistHiddenIds(next);
      return next;
    });
    setHiddenAlertIdsVersion(v => v + 1);
  }, [persistHiddenIds]);

  return {
    hiddenAlertIds,
    hiddenAlertIdsVersion,
    hideAlert,
  };
}

/**
 * Hook to manage and filter alerts based on user role and context
 */
export function useHeaderAlerts({ user, isAdmin, isOnBookingDashboard }: UseHeaderAlertsOptions) {
  const {
    adminAlerts,
    userAlerts,
    ownerAdminAlerts,
    isLoadingAdminAlerts: adminLoading,
    isLoadingUserAlerts: userLoading,
    markAsRead,
  } = useNotifications({ 
    enabled: !!user, 
    isAdmin: isAdmin && !isOnBookingDashboard 
  });

  // For non-admin users, only show alerts explicitly targeted to them
  const userAlertsFiltered = useMemo(() => {
    return Array.isArray(userAlerts) && user 
      ? userAlerts.filter((a: any) => a.userId === user.id) 
      : [];
  }, [userAlerts, user?.id]);

  // Compute visible alerts based on context
  const alertsData = useMemo(() => {
    // If admin is on booking dashboard, show user notifications
    if (isOnBookingDashboard && isAdmin) {
      const base = Array.isArray(userAlertsFiltered) ? userAlertsFiltered.slice() : [];
      return deduplicateAlerts(base);
    }
    
    // Admins on admin dashboard see admin alerts
    if (isAdmin && !isOnBookingDashboard) {
      return adminAlerts || [];
    }

    // Non-admin users: their filtered alerts + relevant owner admin alerts
    const base = Array.isArray(userAlertsFiltered) ? userAlertsFiltered.slice() : [];
    
    try {
      const ownerEmail = String(user?.email || '').toLowerCase();
      if (ownerAdminAlerts && Array.isArray(ownerAdminAlerts) && ownerAdminAlerts.length > 0 && ownerEmail) {
        const relevant = ownerAdminAlerts.filter((a: any) => {
          try {
            const hay = String(a.message || a.details || a.title || '').toLowerCase();
            if (ownerEmail && hay.includes(ownerEmail)) return true;
            const parsed = parseEquipmentAlert(a);
            if (parsed && parsed.titleRequesterEmail && String(parsed.titleRequesterEmail).toLowerCase() === ownerEmail) {
              return true;
            }
          } catch (e) { /* ignore */ }
          return false;
        });
        
        const existingIds = new Set(base.map((x: any) => x.id));
        for (const r of relevant) {
          if (!existingIds.has(r.id)) base.push(r);
        }
      }
    } catch (e) { /* ignore */ }
    
    return deduplicateAlerts(base);
  }, [isAdmin, isOnBookingDashboard, adminAlerts, userAlertsFiltered, ownerAdminAlerts, user?.email]);

  const alertsLoading = (isAdmin && !isOnBookingDashboard) ? adminLoading : userLoading;

  return {
    alertsData,
    alertsLoading,
    markAsRead,
  };
}

/**
 * Deduplicate alerts by title + first message line
 */
function deduplicateAlerts(alerts: any[]): any[] {
  try {
    const groups: Record<string, any> = {};
    for (const a of alerts) {
      try {
        const firstLine = String(a.message || a.details || '').split('\n')[0].trim();
        const key = `${a.title || ''}||${firstLine}`;
        const existing = groups[key];
        if (!existing) {
          groups[key] = a;
        } else {
          const existingTime = new Date(existing.createdAt).getTime();
          const thisTime = new Date(a.createdAt).getTime();
          if (thisTime > existingTime) {
            groups[key] = a;
          }
        }
      } catch (e) {
        groups[`__${a.id}`] = groups[`__${a.id}`] || a;
      }
    }
    return Object.values(groups).sort(
      (x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
    );
  } catch (e) {
    return alerts;
  }
}

/**
 * Hook to manage search functionality
 */
export function useHeaderSearch(user: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const userIsAuthenticated = !!user;

  const { data: allFacilities = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/facilities');
      return await res.json();
    },
    staleTime: 30_000,
    enabled: userIsAuthenticated,
  });

  const { data: allBookings = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/bookings/all'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings/all');
      return await res.json();
    },
    staleTime: 30_000,
    enabled: userIsAuthenticated,
  });

  const { data: userBookings = EMPTY_ARRAY } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings');
      return await res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const facilityResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return (allFacilities || [])
      .filter((f: any) => String(f.name || '').toLowerCase().includes(term))
      .slice(0, 10);
  }, [allFacilities, searchTerm]);

  const bookingResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    
    const merged = [...(userBookings || []), ...(allBookings || [])];
    const filtered = merged.filter((b: any) => {
      try {
        const email = String(b.userEmail || b.userEmailAddress || b.user?.email || '').toLowerCase();
        const matches = (email.includes(term) || String(b.purpose || '').toLowerCase().includes(term));
        if (!matches) return false;
        
        const isAdmin = !!(user && user.role === 'admin');
        const isOwner = user && (
          email === String(user.email || '').toLowerCase() || 
          String(b.userId || '').toLowerCase() === String(user.id || '').toLowerCase()
        );
        return isAdmin || isOwner;
      } catch (e) { 
        return false; 
      }
    });

    const ownerBookings = (user && Array.isArray(userBookings)) 
      ? userBookings.filter((b: any) => {
          try {
            const email = String(b.userEmail || b.user?.email || '').toLowerCase();
            return email === String(user.email || '').toLowerCase() || 
                   String(b.userId || '').toLowerCase() === String(user.id || '').toLowerCase();
          } catch (e) { 
            return false; 
          }
        })
      : [];

    const combined: any[] = [];
    const seen = new Set<string | number>();
    
    for (const b of ownerBookings) {
      if (!seen.has(b.id)) { 
        combined.push(b); 
        seen.add(b.id); 
      }
    }
    for (const b of filtered) {
      if (!seen.has(b.id)) { 
        combined.push(b); 
        seen.add(b.id); 
      }
    }

    return combined.slice(0, 10);
  }, [allBookings, userBookings, searchTerm, user]);

  return {
    searchTerm,
    setSearchTerm,
    showSearchResults,
    setShowSearchResults,
    facilityResults,
    bookingResults,
    allFacilities,
    allBookings,
    userBookings,
  };
}
