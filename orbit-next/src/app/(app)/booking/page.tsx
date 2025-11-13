"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BookingModal from "@/components/modals/BookingModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import { Plus, Calendar, Home, Eye, AlertTriangle, BarChart3, Settings, Clock, CheckCircle, Loader2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import FaqList from '@/components/faq/FaqList';
import { useLegacyLocation } from "@/lib/navigation";

export default function BookingDashboard() {
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [scrollToBookingId, setScrollToBookingId] = useState<string | null>(null);
  const [openOthers, setOpenOthers] = useState<Record<string, boolean>>({});
  const [selectedView, setSelectedView] = useState("dashboard");
  const [devForceOpen, setDevForceOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Common hooks used throughout the dashboard
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileSidebarOpen]);

  // Fetch availability once for the dashboard so cards can show next available ranges
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const { data: availabilityDataRaw } = useQuery({
    queryKey: ['/api/availability', todayDateStr],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${todayDateStr}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  // If availability API didn't return data, synthesize a mock availability map so cards can show time frames.
  const generateMockForFacilities = (facList: any[]) => {
    const mockArr: any[] = [];
    for (const f of facList) {
      const slots: any[] = [];
      const dayStart = new Date(); dayStart.setHours(7, 30, 0, 0);
      const slotCount = (19 - 7.5) * 2; // number of 30-min slots
      for (let i = 0; i < slotCount; i++) {
        const s = new Date(dayStart.getTime() + i * 30 * 60 * 1000);
        const e = new Date(s.getTime() + 30 * 60 * 1000);
        const hour = s.getHours();
        const status = (hour >= 11 && hour < 13 && f.id % 2 === 0) ? 'scheduled' : 'available';
        slots.push({ start: s.toISOString(), end: e.toISOString(), status, bookings: status === 'scheduled' ? [{ startTime: s.toISOString(), endTime: e.toISOString(), status: 'approved', id: `mock-${f.id}-${i}` }] : [] });
      }
      // Guarantee at least one future 'available' slot for demo visibility
      try {
        const now = new Date();
        const hasFutureAvailable = slots.some(s => new Date(s.start) > now && s.status === 'available');
        if (!hasFutureAvailable) {
          for (let i = 0; i < slots.length; i++) {
            if (new Date(slots[i].start) > now) {
              slots[i].status = 'available';
              slots[i].bookings = [];
              break;
            }
          }
        }
      } catch (e) {
        // noop
      }
      mockArr.push({ facility: { id: f.id, name: f.name, capacity: f.capacity, isActive: f.isActive }, maxUsageHours: null, slots });
    }
    return new Map<number, any>(mockArr.map((d: any) => [d.facility.id, d]));
  };

  // availabilityMap will be computed after facilities are loaded so we can synthesize
  // mock data for any missing facilities. See below where it's defined.

  // Booking modal state and defaults
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedFacilityForBooking, setSelectedFacilityForBooking] = useState<number | null>(null);
  const [initialStartForBooking, setInitialStartForBooking] = useState<Date | null>(null);
  const [initialEndForBooking, setInitialEndForBooking] = useState<Date | null>(null);
  // whether the initial times were suggested (from availability/grid) or auto-default
  const [initialTimesAreSuggested, setInitialTimesAreSuggested] = useState<boolean>(false);

  // Small Countdown component (lightweight replacement to satisfy usage)
  function Countdown({ expiry, onExpire }: { expiry: string | Date | undefined; onExpire?: () => void }) {
    const [now, setNow] = useState(Date.now());
    
    useEffect(() => {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }, []);
    
    useEffect(() => {
      if (!expiry) return;
      const ms = new Date(expiry).getTime() - now;
      if (ms <= 0) {
        onExpire?.();
        return;
      }
    }, [expiry, now, onExpire]);
    
    if (!expiry) return <span />;
    const diff = Math.max(0, new Date(expiry).getTime() - now);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return (
      <span className="font-mono text-base font-semibold">
        {hours.toString().padStart(2, '0')}:{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    );
  }
  // Sidebar items (include admin-only links)
  let sidebarItems: any[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSidebar } = require('@/lib/sidebarItems');
    const lastItem = (user && user.role === 'admin') ? { id: 'admin-dashboard', label: 'Admin Dashboard', icon: BarChart3 } : undefined;
    sidebarItems = makeSidebar(!!(user && user.role === 'admin'), lastItem, 'booking');
  } catch (e) {
    // fallback - only add divider and admin link if the current user is an admin
    sidebarItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'new-booking', label: 'New Booking', icon: BarChart3 },
      { id: 'my-bookings', label: 'My Bookings', icon: Calendar },
      { id: 'available-rooms', label: 'Available Rooms', icon: Home },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle },
      { id: 'activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'booking-settings', label: 'Guidelines & Policy', icon: Settings },
    ];
    if (user && user.role === 'admin') {
      sidebarItems.push({ id: 'divider-1', type: 'divider' });
      sidebarItems.push({ id: 'admin-dashboard', label: 'Admin Dashboard', icon: BarChart3 });
    }
  }

  // Post-process sidebarItems to ensure Activity Logs appears after Available Rooms
  try {
    const idxAvailable = sidebarItems.findIndex(it => it.id === 'available-rooms');
    const idxActivity = sidebarItems.findIndex(it => it.id === 'activity-logs');
    if (idxActivity !== -1 && idxAvailable !== -1 && idxActivity < idxAvailable) {
      // move activity-logs to just after available-rooms
      const [activityItem] = sidebarItems.splice(idxActivity, 1);
      const insertAt = sidebarItems.findIndex(it => it.id === 'available-rooms');
      sidebarItems.splice(insertAt + 1, 0, activityItem);
    }
  } catch (e) {
    // noop
  }

  // set initial selected view from URL hash (e.g. /booking#dashboard)
  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (hash) {
      // Support a direct '#available-rooms' target
      if (hash === 'available-rooms') {
        setSelectedView('available-rooms');
      } else {
        setSelectedView(hash);
      }
    }

    // If the URL requests a new booking, open the booking modal and prefill sensible times
    if (hash === 'new') {
  // compute default start = now + 1 hour (add 1 minute buffer to avoid race on submit)
  const start = new Date(Date.now() + 60 * 60 * 1000 + 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // default 30 minute booking
      setInitialStartForBooking(start);
      setInitialEndForBooking(end);
      setInitialTimesAreSuggested(false);
      openBookingModal(undefined, start, end);
    }
  }, []);

  const handleSidebarClick = (id: string) => {
    if (id === 'admin-dashboard') {
      setLocation('/admin');
      return;
    }
    if (id === 'booking-dashboard') {
      setLocation('/booking#dashboard');
      return;
    }
    if (id === 'new-booking') {
      openBookingModal();
      setIsMobileSidebarOpen(false);
      return;
    }
    if (id === 'booking-settings') {
      setSelectedView('booking-settings');
      setIsMobileSidebarOpen(false);
      return;
    }
    setSelectedView(id);
    setIsMobileSidebarOpen(false);
  };
  const itemsPerPage = 5; // show first 5 bookings in My Bookings (no pagination)
  // Full Activity Logs notifications page size
  const notificationsPerPage = 10;
  // Full Booking History page size (used by Activity Logs -> Booking view)
  const bookingsPerPage = 10;
  // Activity logs inner tab state
  const [activityTab, setActivityTab] = useState<'booking' | 'notifications'>('booking');
  const [activityBookingPage, setActivityBookingPage] = useState(0);
  const [activityNotificationsPage, setActivityNotificationsPage] = useState(0);

  // Interpret URL hash forms like:
  // - #activity-logs
  // - #activity-logs:notifications
  // - #activity-logs:booking
  // Also handle legacy navigation that used /notifications by leaving that change in Header
  useEffect(() => {
    try {
      const rawHash = window.location.hash?.replace('#', '') || '';
      if (!rawHash) return;
  // Accept either 'activity-logs', 'activity-logs:notifications' or 'activity-logs/notifications'
  const normalized = rawHash.replace('/', ':');
  const parts = normalized.split(':');
      if (parts[0] === 'activity-logs') {
        setSelectedView('activity-logs');
        if (parts[1] === 'notifications') {
          setActivityTab('notifications');
          setActivityNotificationsPage(0);
        } else if (parts[1] === 'booking') {
          setActivityTab('booking');
          setActivityBookingPage(0);
        }
      } else if (parts[0] === 'available-rooms') {
        // Simple top-level view target
        setSelectedView('available-rooms');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Consume one-time openNotificationsOnce flag (set by header/App rewrites) and open
  // Activity Logs -> Notifications when present. This ensures header's 'View all'
  // navigation reliably opens the correct inner tab without forcing a redirect on normal navigation.
  useEffect(() => {
    try {
      const v = sessionStorage.getItem('openNotificationsOnce');
      if (!v) return;
      sessionStorage.removeItem('openNotificationsOnce');
      // open the Activity Logs view and select the notifications tab
      setSelectedView('activity-logs');
      setActivityTab('notifications');
      setActivityNotificationsPage(0);
      // replace history to ensure canonical URL (no repeated flag)
      try { window.history.replaceState({}, '', '/booking#activity-logs:notifications'); } catch (_) {}
    } catch (e) {
      // ignore errors interacting with sessionStorage
    }
  }, []);

  // Consume one-time openAvailableRoomsOnce flag (set by header search navigation)
  useEffect(() => {
    try {
      const v = sessionStorage.getItem('openAvailableRoomsOnce');
      if (!v) return;
      sessionStorage.removeItem('openAvailableRoomsOnce');
      setSelectedView('available-rooms');
      // canonicalize URL to the available-rooms hash
      try { window.history.replaceState({}, '', '/booking#available-rooms'); } catch (_) {}
    } catch (e) {
      // ignore sessionStorage errors
    }
  }, []);

  // If the user reloads the page while at /booking#activity-logs:notifications (and
  // there was no one-time flag set), normalize to /booking#dashboard so reloads
  // land on the dashboard view instead of the notifications tab. This mirrors
  // the admin behavior where a reload normalizes to overview.
  useEffect(() => {
    const isReloadNavigation = () => {
      try {
        const navEntries = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation') as PerformanceNavigationTiming[] : [];
        if (Array.isArray(navEntries) && navEntries[0] && (navEntries[0] as any).type) {
          return (navEntries[0] as any).type === 'reload' || (navEntries[0] as any).type === 'back_forward';
        }
        if ((performance as any).navigation && typeof (performance as any).navigation.type === 'number') {
          return (performance as any).navigation.type === 1;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    try {
      const rawHash = window.location.hash?.replace('#', '') || '';
      if (!rawHash) return;
      const normalized = rawHash.replace('/', ':');
      const parts = normalized.split(':');
      if (parts[0] === 'activity-logs' && parts[1] === 'notifications') {
        // Only redirect on reload (not when user clicked the header)
        const v = sessionStorage.getItem('openNotificationsOnce');
        if (!v && isReloadNavigation()) {
          try {
            const target = '/booking#dashboard';
            if (window.location.pathname + window.location.hash !== target) {
              window.history.replaceState({}, '', target);
            }
          } catch (e) { /* ignore */ }
          setSelectedView('dashboard');
        }
      } else if (parts[0] === 'available-rooms') {
        // If the user reloads while on available-rooms and there was no one-time flag,
        // normalize back to the dashboard view (avoid landing on the rooms view after reload).
        const v = sessionStorage.getItem('openAvailableRoomsOnce');
        if (!v && isReloadNavigation()) {
          try {
            const target = '/booking#dashboard';
            if (window.location.pathname + window.location.hash !== target) {
              window.history.replaceState({}, '', target);
            }
          } catch (e) { /* ignore */ }
          setSelectedView('dashboard');
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);
  
  // Listen for hash changes while mounted so clicking header (which sets the hash) updates the view immediately
  useEffect(() => {
    const onHashChange = () => {
      try {
        const rawHash = window.location.hash?.replace('#', '') || '';
        if (!rawHash) return;
        const normalized = rawHash.replace('/', ':');
        const parts = normalized.split(':');
        if (parts[0] === 'activity-logs') {
          setSelectedView('activity-logs');
          if (parts[1] === 'notifications') {
            setActivityTab('notifications');
            setActivityNotificationsPage(0);
          } else if (parts[1] === 'booking') {
            setActivityTab('booking');
            setActivityBookingPage(0);
          }
        } else if (parts[0] === 'available-rooms') {
          setSelectedView('available-rooms');
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('hashchange', onHashChange);
    const onOpenAvailable = () => { try { setSelectedView('available-rooms'); } catch (e) {} };
    window.addEventListener('openAvailableRooms', onOpenAvailable as EventListener);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('openAvailableRooms', onOpenAvailable as EventListener);
    };
  }, []);
  
  // State for cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any>(null);

  // State for email notifications (moved from ProfileModal)
  // Email notifications UI removed per request

  const updateBookingMutation = useMutation({
    // Ensure the mutation returns the parsed JSON booking object
    mutationFn: async (updatedBooking: any) => {
      // sending updated booking to API
      const res = await apiRequest("PUT", `/api/bookings/${updatedBooking.id}`, updatedBooking);
      // apiRequest returns a Response from queryClient wrapper; read raw text to improve debug visibility
      try {
        const text = await res.text();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return parsed;
          } catch (parseErr) {
            console.warn('[BookingDashboard] updateBookingMutation.mutationFn - failed to parse JSON response', parseErr);
            return text;
          }
        }
        return undefined;
      } catch (e) {
        console.error('[BookingDashboard] updateBookingMutation.mutationFn - error reading response', e);
        return res;
      }
    },
    // Expect the server to return the updated booking object; update cache optimistically
    onSuccess: async (data: any, variables: any) => {
      try {
        // If server returned the updated booking, update the bookings cache
        if (data && data.id) {
          queryClient.setQueryData(["/api/bookings"], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((b: any) => (b.id === data.id ? data : b));
          });
          // If we're currently editing this booking, update that local state too
          setEditingBooking((prev: any) => (prev && prev.id === data.id ? data : prev));
          // Ensure queries are refetched to get latest state
          await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        } else {
          // Fallback: server returned a legacy success payload (no booking object).
          // Fetch the full bookings list and replace the cache so the UI reflects persisted changes.
          try {
            const res = await apiRequest("GET", "/api/bookings");
            const fresh = await res.json();
            if (Array.isArray(fresh)) {
              queryClient.setQueryData(["/api/bookings"], fresh);
            } else {
              await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            }
          } catch (fetchErr) {
            console.warn('[BookingDashboard] onSuccess fallback fetch failed', fetchErr);
            await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          }
        }
      } catch (e) {
        console.warn('[BookingDashboard] updateBookingMutation.onSuccess handler failed', e);
      }

      try {
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      } catch (activityError) {
        console.warn('[BookingDashboard] Failed to invalidate activity logs after booking update', activityError);
      }

      try {
        const snapshot = (data && data.id) ? data : variables;
        const facilityName = snapshot?.facility?.name || snapshot?.facilityName || `Facility #${snapshot?.facilityId ?? snapshot?.facility_id ?? '—'}`;
        const start = snapshot?.startTime ? new Date(snapshot.startTime) : null;
        const end = snapshot?.endTime ? new Date(snapshot.endTime) : null;
        const description = start && end
          ? `${facilityName} • ${format(start, 'MMM d, yyyy h:mm a')} – ${format(end, 'h:mm a')}`
          : `${facilityName} updated successfully.`;

        toast({
          title: 'Booking Updated',
          description,
        });
      } catch (toastError) {
        console.warn('[BookingDashboard] Failed to show update success toast', toastError);
      }
    },
    onError: (error: any) => {
      // Handle specific conflict error, prefer structured payload when available
      // Prefer structured payload; if missing, try to parse it from the error message
      let payload = error && error.payload ? error.payload : null;
      if (!payload && error?.message) {
        try {
          const candidate = error.message.replace(/^\d+:\s*/, '');
          payload = JSON.parse(candidate);
        } catch (e) {
          // ignore
        }
      }

      if (payload && payload.conflictingBookings) {
        const facilityName = error.payload.facility?.name || `Facility ${error.payload.facility?.id || ''}`;
        const conflicts = Array.isArray(payload.conflictingBookings) ? payload.conflictingBookings : [];
        const conflictText = conflicts.length > 0
          ? conflicts.map((c: any) => `${new Date(c.startTime).toLocaleString()} - ${new Date(c.endTime).toLocaleString()}`).join('; ')
          : '';
        toast({
          title: 'Time Slot Unavailable',
          description: `${facilityName} has a conflicting booking${conflictText ? `: ${conflictText}` : ''}`,
          variant: 'destructive'
        });
      } else if (error.message && error.message.includes("time slot is already booked")) {
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot is already booked. Please choose a different time.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking Update Failed",
          description: error.message || "An error occurred while updating your booking.",
          variant: "destructive",
        });
      }
    },
  });

  

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/bookings/${bookingId}/cancel`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] }),
      ]);
      // Notifications and alerts update slightly later; refresh in background.
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "An error occurred while cancelling your booking.",
        variant: "destructive",
      });
    },
  });

  // Function to handle cancellation confirmation
  const handleCancelBooking = (booking: any) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = () => {
    if (bookingToCancel) {
      const bookingSnapshot = bookingToCancel;
      cancelBookingMutation.mutate(bookingToCancel.id, {
        onSuccess: () => {
          const start = new Date(bookingSnapshot.startTime);
          const end = new Date(bookingSnapshot.endTime);
          const now = new Date();
          const facilityName = bookingSnapshot.facility?.name || bookingSnapshot.facilityName || `Facility #${bookingSnapshot.facilityId}`;
          const isActiveWindow = start <= now && now <= end;
          toast({
            title: isActiveWindow ? 'Booking Ended' : 'Booking Cancelled',
            description: `${facilityName} • ${format(start, 'MMM d, yyyy h:mm a')} – ${format(end, 'h:mm a')}`,
          });
          // Close modal only after mutation succeeds and cache is updated
          setShowCancelModal(false);
          setBookingToCancel(null);
        },
        onError: (error: any) => {
          toast({ title: 'Cancellation Failed', description: error?.message || 'An error occurred while cancelling the booking.', variant: 'destructive' });
          // Close modal on error too
          setShowCancelModal(false);
          setBookingToCancel(null);
        }
      });
    }
  };

  // ...existing code...

  const cancelCancelBooking = () => {
    setShowCancelModal(false);
    setBookingToCancel(null);
  };

  // Handler invoked when a pending booking's confirmation window expires
  const handlePendingBookingAutoCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    toast({
      title: 'Booking Auto-Cancelled',
      description: 'Your pending booking was automatically cancelled after the confirmation window.',
      variant: 'destructive'
    });
  };

  // reference the handler to avoid "declared but its value is never read" TypeScript error
  void handlePendingBookingAutoCancel;

  // Mutation for user settings (specifically for email notifications)

  const handleSaveEditBooking = (updatedBooking: any) => {
    // Use mutateAsync so callers can await completion and react to the result
    return updateBookingMutation.mutateAsync(updatedBooking);
  };

  // Handler for email notifications change
  // Email notification setting removed

  // Default to empty arrays to avoid undefined errors
  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facilities");
      return response.json();
    },
  });

  // Build unavailableDatesByFacility: { [facilityId]: [YYYY-MM-DD, ...] }
  const unavailableDatesByFacility: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of facilities) {
      if (Array.isArray(f.unavailableDates)) {
        // Flatten all date ranges to individual days (YYYY-MM-DD)
        const days: string[] = [];
        for (const range of f.unavailableDates) {
          if (range && range.startDate && range.endDate) {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              days.push(d.toISOString().slice(0, 10));
            }
          }
        }
        map[f.id] = days;
      } else {
        map[f.id] = [];
      }
    }
    return map;
  }, [facilities]);

  // Build availabilityMap using server data when available; otherwise generate mock slots
  const availabilityMap = (availabilityDataRaw && availabilityDataRaw.data && availabilityDataRaw.data.length > 0)
    ? new Map<number, any>((availabilityDataRaw.data || []).map((d: any) => [d.facility.id, d]))
    : generateMockForFacilities(facilities || []);

  const { data: userBookingsData = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings");
      return response.json();
    },
    // Refetch every 30s so countdowns stay in sync with server-side expirations
    refetchInterval: 30000,
  });

  // NEW: Get ALL approved bookings to show facility availability to all users
  const { data: allBookingsData = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings/all"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings/all");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds to show real-time availability
  });

  // Ensure userBookings is always an array
  const userBookings = Array.isArray(userBookingsData) ? userBookingsData : [];
  const allBookings = Array.isArray(allBookingsData) ? allBookingsData : [];

  // Notifications for the current user (used in the Activity Logs -> Notification logs tab)
  const { data: notificationsData = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications');
      try { return await res.json(); } catch { return []; }
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Mutation to mark a notification as read from the notification logs tab
  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('POST', `/api/notifications/${id}/read`),
    onSuccess: async () => {
      // Wait for query to refetch before hiding loading state
      await queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // React to top-level route '/notifications' so header links open this tab directly
  const [location, setLocation] = useLegacyLocation();
  useEffect(() => {
    try {
      if (location && location.startsWith('/notifications')) {
        setSelectedView('activity-logs');
        setActivityTab('notifications');
        // Reset pagination to first page when navigated directly
        setActivityNotificationsPage(0);
      }
    } catch (e) {
      // ignore
    }
  }, [location]);

  // Consume one-time openBookingOnce flag and listen for openBooking events
  useEffect(() => {
    const openBookingHandler = (idStr?: string) => {
      try {
        const id = idStr ? String(idStr) : sessionStorage.getItem('openBookingOnce');
        if (!id) return;
        try { sessionStorage.removeItem('openBookingOnce'); } catch (e) {}
        // Instead of opening edit modal, navigate to My Bookings and scroll/highlight the booking
        setSelectedView('my-bookings');
        setScrollToBookingId(String(id));
        // If the booking is already loaded, ensure editingBooking isn't accidentally set
        setEditingBooking(null);
      } catch (e) {}
    };

    const onOpenBookingEvent = () => openBookingHandler();
    window.addEventListener('openBooking', onOpenBookingEvent as EventListener);

    try {
      const id = sessionStorage.getItem('openBookingOnce');
      if (id) openBookingHandler(id);
    } catch (e) {}

    return () => {
      window.removeEventListener('openBooking', onOpenBookingEvent as EventListener);
    };
  }, [userBookings, allBookings]);

  // When scrollToBookingId is set and My Bookings is active, scroll into view and briefly highlight
  useEffect(() => {
    if (!scrollToBookingId) return;
    if (selectedView !== 'my-bookings') return;
    try {
      const el = document.getElementById(`booking-${scrollToBookingId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // add a temporary highlight class
        el.classList.add('ring-2', 'ring-pink-300');
        setTimeout(() => {
          try { el.classList.remove('ring-2', 'ring-pink-300'); } catch (e) {}
        }, 2200);
      }
    } catch (e) {}
    // clear the scroll target after a short delay so repeated clicks still work
    const t = setTimeout(() => setScrollToBookingId(null), 2500);
    return () => clearTimeout(t);
  }, [scrollToBookingId, selectedView]);

  // Function to get current booking status for a facility with library hours validation
  const getFacilityBookingStatus = (facilityId: number) => {
    const now = new Date();
    
  // Check if current time is within library working hours (7:30 AM - 7:00 PM)
    // Respect devForceOpen override for temporary debugging (when true, treat as open)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const libraryOpenTime = 7 * 60 + 30; // 7:30 AM in minutes
  const libraryCloseTime = 19 * 60; // 7:00 PM in minutes
    
    let isWithinLibraryHours = currentTimeInMinutes >= libraryOpenTime && currentTimeInMinutes <= libraryCloseTime;
    if (process.env.NODE_ENV !== 'production' && devForceOpen) {
      isWithinLibraryHours = true;
    }
    
    // Get all active bookings for this facility
    // NOTE: For privacy, pending bookings should only be visible to admins and the booking owner.
    // allBookings contains the global view (approved bookings). userBookings contains the current user's bookings
  // Merge them so that availability shows both approved and pending bookings to everyone
    const mergedBookings = [...allBookings, ...userBookings];
    // Deduplicate by booking id (prefer the first occurrence)
    const seen = new Set<string | number>();
    const deduped = [] as any[];
    for (const b of mergedBookings) {
      if (b && b.id != null && !seen.has(b.id)) {
        seen.add(b.id);
        deduped.push(b);
      }
    }

    // For availability we want other users to see scheduled/pending slots too, so include both statuses
    const facilityBookings = deduped.filter(booking => 
      booking.facilityId === facilityId &&
      (booking.status === "approved" || booking.status === "pending") &&
      new Date(booking.endTime) > now
    );

    // If facility has been set to inactive by an admin, always show unavailable regardless of library hours
    const facility = facilities.find((f) => f.id === facilityId);
    if (facility && facility.isActive === false) {
      return {
        status: "unavailable",
        label: "Unavailable",
        booking: null,
        badgeClass: "bg-red-100 text-red-800"
      };
    }

    // Check if facility is currently booked (active session)
    const currentBooking = facilityBookings.find(booking => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      return now >= start && now <= end && booking.status === "approved";
    });

    if (currentBooking) {
      return {
  status: "booked",
  label: "Currently Booked",
  booking: currentBooking,
  badgeClass: "bg-red-100 text-red-800"
      };
    }

    // If outside library hours, mark as closed (unless already caught by admin-unavailable above)
    if (!isWithinLibraryHours) {
      return {
  status: "closed",
  label: "School Closed",
        booking: null,
        badgeClass: "bg-gray-100 text-gray-800"
      };
    }

    // Check if facility has upcoming approved or pending bookings
    const upcomingBooking = facilityBookings.find(booking => {
      const start = new Date(booking.startTime);
      return start > now && (booking.status === "approved" || booking.status === "pending");
    });

    if (upcomingBooking) {
      return {
        status: "scheduled",
        label: "Scheduled",
        booking: upcomingBooking,
        badgeClass: "bg-yellow-100 text-yellow-800"
      };
    }

    return {
      status: "available",
      label: "Available",
      booking: null,
      badgeClass: "bg-green-100 text-green-800"
    };
  };

  // Helper to determine if school is currently closed (same hours as booking validation)
  const isLibraryClosedNow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
  const libraryCloseTime = 19 * 60; // 7:00 PM
    if (process.env.NODE_ENV !== 'production' && devForceOpen) return false;
    return currentTimeInMinutes < libraryOpenTime || currentTimeInMinutes > libraryCloseTime;
  };

  // ...existing code for sidebar is defined earlier

  const getStats = () => {
    const now = new Date();

    // Active: approved and currently within time window
    const active = userBookings.filter((b) => {
      if (b.status !== "approved") return false;
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return now >= start && now <= end;
    }).length;

    // Upcoming: approved and starts in the future
    const upcoming = userBookings.filter((b) => {
      if (b.status !== "approved") return false;
      const start = new Date(b.startTime);
      return start > now;
    }).length;

    // Pending approval: bookings waiting for admin approval
    const pending = userBookings.filter((b) => b.status === "pending").length;

    return { active, upcoming, pending };
  };

  const stats = getStats();

  // Helper function to open booking modal with a specific facility
  const openBookingModal = async (facilityId?: number, start?: Date, end?: Date) => {
    // Prevent non-faculty users from opening the booking modal for restricted facilities
    try {
      const facility = facilityId ? facilities.find((f) => f.id === facilityId) : undefined;
      const name = facility?.name || '';
  const isRestricted = /board room|boardroom|lounge/i.test(name);
      const userRole = user?.role || 'student';
      const isFacultyOrAdmin = userRole === 'faculty' || userRole === 'admin';
      if (isRestricted && !isFacultyOrAdmin) {
        toast({ title: 'Access Restricted', description: 'Only faculty members may book this facility. Contact an administrator for access.', variant: 'destructive' });
        return; // do not open modal
      }
    } catch (e) {
      // ignore and continue - open modal as fallback
    }
    setSelectedFacilityForBooking(facilityId || null);
    // If no start/end provided, try to pick the first 'available' slot from availabilityMap
    if (!start) {
      const now = new Date();
      const pickFromEntry = (entry: any) => {
        if (!entry || !Array.isArray(entry.slots)) return null;
        return entry.slots.find((s: any) => {
          try {
            return s.status === 'available' && new Date(s.end).getTime() > now.getTime() && new Date(s.start).getTime() >= now.getTime();
          } catch (e) { return false; }
        }) || null;
      };

      try {
        if (facilityId) {
          const entry = availabilityMap.get(facilityId);
          const slot = pickFromEntry(entry);
          if (slot) {
            start = new Date(slot.start);
            end = new Date(slot.end);
          }
        }

        // If still no start, try to find earliest available across the cached availabilityMap
        if (!start) {
          let earliestSlot: any = null;
          for (const [, entry] of availabilityMap) {
            if (!entry || !Array.isArray(entry.slots)) continue;
            for (const s of entry.slots) {
              try {
                if (s.status !== 'available') continue;
                const sStart = new Date(s.start);
                const sEnd = new Date(s.end);
                if (sEnd.getTime() <= now.getTime()) continue;
                if (sStart.getTime() < now.getTime()) continue;
                if (!earliestSlot || new Date(s.start) < new Date(earliestSlot.start)) earliestSlot = s;
              } catch (e) { /* ignore parse errors */ }
            }
          }
          if (earliestSlot) {
            start = new Date(earliestSlot.start);
            end = new Date(earliestSlot.end);
          }
        }

        // If still no start, attempt a fresh fetch for today's availability and re-run the same logic
        if (!start) {
          try {
            const dateStr = todayDateStr;
            const resp = await apiRequest('GET', `/api/availability?date=${dateStr}`);
            const json = await resp.json();
            const dataArr = Array.isArray(json?.data) ? json.data : [];
            if (facilityId) {
              const entry = dataArr.find((d: any) => d.facility && d.facility.id === facilityId);
              const slot = pickFromEntry(entry);
              if (slot) {
                start = new Date(slot.start);
                end = new Date(slot.end);
              }
            }
            if (!start) {
              let earliestSlot: any = null;
              for (const entry of dataArr) {
                if (!entry || !Array.isArray(entry.slots)) continue;
                for (const s of entry.slots) {
                  try {
                    if (s.status !== 'available') continue;
                    const sStart = new Date(s.start);
                    const sEnd = new Date(s.end);
                    if (sEnd.getTime() <= now.getTime()) continue;
                    if (sStart.getTime() < now.getTime()) continue;
                    if (!earliestSlot || new Date(s.start) < new Date(earliestSlot.start)) earliestSlot = s;
                  } catch (e) {}
                }
              }
              if (earliestSlot) {
                start = new Date(earliestSlot.start);
                end = new Date(earliestSlot.end);
              }
            }
          } catch (e) {
            // ignore fetch errors; fall back to standard default
          }
        }
      } catch (e) {
        // fallback to default
      }

      // Fallback: respect 1-hour lead time and round defaults as before
      if (!start) {
        // default to current time + 1 hour (add 1 minute buffer to avoid race on submit)
        start = new Date(Date.now() + 60 * 60 * 1000 + 60 * 1000);
        end = new Date(start.getTime() + 30 * 60 * 1000);
      }
    }

    setInitialStartForBooking(start ?? null);
    setInitialEndForBooking(end ?? null);
    setShowBookingModal(true);
  };

  // Helper function to close booking modal and reset selection
  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedFacilityForBooking(null);
    setInitialStartForBooking(null);
    setInitialEndForBooking(null);
  };

    const getFacilityDisplay = (facilityId: number) => {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return `Facility ${facilityId}`;
    let name = facility.name || `Facility ${facilityId}`;
    
    // Ensure proper facility naming - add "Facility" prefix if missing for Lounge
    const lower = name.toLowerCase();
    if (lower === 'lounge' && !lower.includes('facility')) {
      name = 'Facility Lounge';
    }
    
    if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2')) {
      // Room capacity is 8
    } else if (lower.includes('board room') || lower.includes('boardroom')) {
      // Room capacity is 12
    } else if (lower.includes('lounge')) {
      // Lounge behaves similarly to board room for display purposes
    }
    return name;
  };

  // Helper to determine restricted facilities (faculty-only)
  const isRestrictedFacility = (facility?: any) => {
    if (!facility) return false;
  const name = String(facility.name || '').toLowerCase();
  return name.includes('board room') || name.includes('boardroom') || name.includes('lounge');
  };

  // Helper to format facility name for display
  const formatFacilityName = (name: string) => {
    if (!name) return name;
    const lower = name.toLowerCase();
    // Ensure proper facility naming - add "Facility" prefix if missing for Lounge
    if (lower === 'lounge' && !lower.includes('facility')) {
      return 'Facility Lounge';
    }
    return name;
  };

  // Small presentational badge for facility booking status to keep JSX simple
  const FacilityStatusBadge = ({ facility, bookingStatus }: { facility: any; bookingStatus: any }) => {
    const classes = `px-3 py-1 rounded-full text-sm font-medium ${
      !facility.isActive ? 'bg-red-500 text-white' :
      bookingStatus.status === 'closed' ? 'bg-gray-700 text-white' :
      bookingStatus.status === 'booked' ? 'bg-red-500 text-white' :
      bookingStatus.status === 'scheduled' ? 'bg-yellow-500 text-white' :
      'bg-pink-500 text-white'
    }`;
    return <span className={classes}>{!facility.isActive ? 'Unavailable' : bookingStatus.label}</span>;
  };

  const getFacilityDescriptionByName = (name?: string) => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('collaborative learning room 1')) {
      return 'Quiet study space with 4 tables';
    }
    if                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  (lower.includes('collaborative learning room 2')) {
      return 'Computer lab with workstations';
    }
    if (lower.includes('board room') || lower.includes('boardroom')) {
      return 'Conference room for group meetings';
    }
    if (lower.includes('lounge')) {
      return 'Comfortable lounge area for informal study and relaxation.';
    }
    return 'Comfortable study space for individual or small group use.';
  };

  const getFacilityImageByName = (name?: string) => {
    if (!name) return '/images/facility-overview.jpg';
    const lower = name.toLowerCase();
  if (
    lower.includes('collab 1') ||
    lower.includes('collab1') ||
    lower.includes('collaboration 1') ||
    lower.includes('collaborative learning room 1')
  ) return '/images/collab1.jpg';
  if (
    lower.includes('collab 2') ||
    lower.includes('collab2') ||
    lower.includes('collaboration 2') ||
    lower.includes('collaborative learning room 2')
  ) return '/images/collab2.jpg';
  if (lower.includes('board room') || lower.includes('boardroom')) return '/images/boardroom.jpg';
  if (lower.includes('lounge')) return '/images/lounge.jpg';
  // Add more mappings as needed
    return '/images/facility-overview.jpg';
  };

  const getBookingStatus = (booking: any): { label: string; badgeClass: string } => {
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
  // Treat 'pending' bookings as scheduled/approved for frontend presentation
  // since the system now auto-schedules bookings. Preserve denied/cancelled states.
  const isPending = booking.status === 'pending';
    if (booking.status === "denied") return { label: "Denied", badgeClass: "denied" };
    if (booking.status === "cancelled") return { label: "Cancelled", badgeClass: "cancelled" };
  if (booking.status === "approved" || isPending) {
  if (now < start) return { label: "Scheduled", badgeClass: "bg-yellow-100 text-yellow-800" };
      if (now >= start && now <= end) return { label: "Active", badgeClass: "active" };
      if (now > end) return { label: "Done", badgeClass: "inactive" };
    }
    return { label: booking.status, badgeClass: booking.status };
  };

  const canEditBooking = (booking: any): boolean => {
    // Allow editing for:
    // - pending bookings (system is finalizing scheduling)
    // - approved/scheduled bookings that haven't started yet AND admin hasn't confirmed equipment
    if (!booking) return false;
    try {
      const now = new Date();
      const start = new Date(booking.startTime);
      
      // Check if admin has confirmed/prepared equipment
      const hasAdminResponse = booking.adminResponse && String(booking.adminResponse).trim().length > 0;
      
      // Allow editing pending bookings (unless admin already responded)
      if (booking.status === 'pending' && !hasAdminResponse) return true;
      
      // Allow editing approved bookings that haven't started (unless admin already confirmed equipment)
      if (booking.status === 'approved' && start > now && !hasAdminResponse) return true;
      
      return false;
    } catch (e) {
      return false;
    }
  };

  // Client-side rule matching server: allow cancelling when
  // - booking.status === 'pending'
  // - or booking.status === 'approved' and (start > now || (start <= now && now <= end))
  const canCancelBooking = (booking: any): boolean => {
    if (!booking) return false;
    try {
      const now = new Date();
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      if (booking.status === 'pending') return true;
      if (booking.status === 'approved') {
        // upcoming approved
        if (start > now) return true;
        // active/in-progress approved
        if (start <= now && now <= end) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Small component: render per-facility columns of merged time ranges from /api/availability
  // Availability list columns removed; availability rendering is handled inline above.

  // Helper function to parse equipment data from notification message
  const parseEquipmentFromMessage = (message: string) => {
    const equipmentMarker = message.indexOf('[Equipment:');
    if (equipmentMarker !== -1) {
      try {
        // Extract base message before the equipment marker
        const baseMessage = message.substring(0, equipmentMarker).trim();
        
        // Find the JSON object - look for the closing bracket that matches the opening
        const jsonStart = message.indexOf('{', equipmentMarker);
        if (jsonStart === -1) {
          return { baseMessage, equipment: null };
        }
        
        // Find matching closing brace
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
          const equipmentData = JSON.parse(jsonStr);
          return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
        }
        
        return { baseMessage, equipment: null };
      } catch (e) {
        // If parsing fails, just return the base message without the equipment marker
        const baseMessage = message.substring(0, equipmentMarker).trim();
        return { baseMessage, equipment: null };
      }
    }
    return { baseMessage: message, equipment: null };
  };

  // Helper function to get color for equipment status
  const getEquipmentStatusColor = (status: string) => {
    const normalized = status.toLowerCase().replace(/_/g, ' ');
    if (normalized === 'prepared' || normalized === 'available') {
      return 'bg-green-100 text-green-800';
    } else if (normalized === 'not available') {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const renderContent = () => {
    switch (selectedView) {
      case "my-bookings":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">My Bookings</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your facility reservations</p>
                </div>
                <button
                  onClick={() => openBookingModal()}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  New Booking
                </button>
              </div>

              {userBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h4>
                  <p className="text-gray-600 mb-6">Create your first booking to get started with facility reservations.</p>
                  <button
                    onClick={() => openBookingModal()}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Create your first booking
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings
                                  // Recent Booking (compact preview) — show latest 5 bookings only, no pagination
                                  .slice(0, 5)
                        .map((booking) => {
                    const status = getBookingStatus(booking);
                    const statusColors = {
                      'Active': 'bg-pink-100 text-pink-800 border-pink-200',
                      'Scheduled': 'bg-yellow-50 text-yellow-800 border-yellow-100',
                      'Done': 'bg-gray-100 text-gray-800 border-gray-200',
                      'Denied': 'bg-red-100 text-red-800 border-red-200',
                      'Cancelled': 'bg-gray-50 text-gray-700 border-gray-100'
                    };

                    return (
                      <div id={`booking-${booking.id}`} key={booking.id} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6 hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-2">
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className="bg-pink-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                              <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-pink-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm sm:text-lg text-gray-900 truncate">{getFacilityDisplay(booking.facilityId)}</h4>
                              <p className="text-[10px] sm:text-sm text-gray-600">Room #{booking.facilityId}</p>
                            </div>
                          </div>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-sm font-medium border self-start flex-shrink-0 whitespace-nowrap ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            <span className={`w-2 h-2 rounded-full mr-1 sm:mr-2 inline-block ${
                              status.label === 'Active' ? 'bg-green-500' :
                              status.label === 'Scheduled' ? 'bg-yellow-500' :
                              status.label === 'Done' ? 'bg-gray-500' :
                              status.label === 'Denied' ? 'bg-red-500' :
                              status.label === 'Cancelled' ? 'bg-orange-500' : 'bg-gray-500'
                            }`} />
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Date & Time</p>
                            <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {new Date(booking.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })} - {new Date(booking.endTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            {/* Purpose Box */}
                            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Purpose</p>
                            {booking.purpose ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <Popover>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 flex-shrink-0" />
                                          <p className="text-gray-900 text-xs sm:text-sm">
                                            <span className="font-medium">View details</span>
                                          </p>
                                        </div>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-xs sm:text-sm text-gray-800">Purpose</p>
                                      </div>
                                      <div className="p-3 max-h-48 overflow-y-auto">
                                        <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose}</p>
                                      </div>
                                    </TooltipContent>
                                    <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-xs sm:text-sm text-gray-800">Purpose</p>
                                      </div>
                                      <div className="p-3 max-h-48 overflow-y-auto">
                                        <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose}</p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="text-gray-900 text-xs sm:text-sm break-words">No purpose specified</p>
                            )}
                          </div>

                          {/* Course/Year/Department Box */}
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mt-2">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Course/Year/Department</p>
                            {booking.courseYearDept ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <Popover>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 flex-shrink-0" />
                                          <p className="text-gray-900 text-xs sm:text-sm">
                                            <span className="font-medium">View details</span>
                                          </p>
                                        </div>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-xs sm:text-sm text-gray-800">Course/Year/Department</p>
                                      </div>
                                      <div className="p-3 max-h-48 overflow-y-auto">
                                        <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.courseYearDept}</p>
                                      </div>
                                    </TooltipContent>
                                    <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                      <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-xs sm:text-sm text-gray-800">Course/Year/Department</p>
                                      </div>
                                      <div className="p-3 max-h-48 overflow-y-auto">
                                        <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.courseYearDept}</p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="text-gray-900 text-xs sm:text-sm break-words">No course/year/department specified</p>
                            )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            {/* Equipment / Needs box as its own column */}
                              {booking.equipment && (function() {
                                const eq = booking.equipment;
                                const id = String(booking.id || Math.random());
                                const isOpen = !!openOthers[id];
                                if ((!Array.isArray(eq.items) || eq.items.length === 0) && !(eq.others && String(eq.others).trim().length > 0)) return null;
                                return (
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="text-xs sm:text-sm font-medium text-gray-700">Equipment or Needs</div>
                                      {eq.others && String(eq.others).trim().length > 0 && (
                                        <Popover open={isOpen} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                  <button
                                                    onClick={() => setOpenOthers(prev => ({ ...prev, [id]: !prev[id] }))}
                                                    className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-700 hover:text-pink-600 transition-colors"
                                                    aria-expanded={isOpen}
                                                  >
                                                    <Eye className="h-3 w-3 text-pink-600" />
                                                    <span>View other</span>
                                                  </button>
                                                </PopoverTrigger>
                                              </TooltipTrigger>

                                              <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                                  <p className="font-semibold text-xs sm:text-sm text-gray-800">Other equipment</p>
                                                </div>
                                                <div className="p-3 max-h-48 overflow-y-auto">
                                                  <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{String(eq.others).trim()}</p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>

                                          <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                            <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                              <p className="font-semibold text-xs sm:text-sm text-gray-800">Other equipment</p>
                                            </div>
                                            <div className="p-3 max-h-48 overflow-y-auto">
                                              <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{String(eq.others).trim()}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-2">
                                      {/* Render pre-made items as chips with color based on needs status */}
                                      {Array.isArray(eq.items) && eq.items.length > 0 && eq.items.map((it: string, idx: number) => {
                                        // Parse per-item equipment status from adminResponse JSON
                                        let itemStatus: 'prepared' | 'not_available' | undefined;
                                        try {
                                          const resp = String(booking?.adminResponse || '');
                                          
                                          // First try to extract JSON with per-item statuses
                                          // Look for JSON block starting with {"items":
                                          const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                                          if (jsonMatch) {
                                            const parsed = JSON.parse(jsonMatch[0]);
                                            
                                            if (parsed.items && typeof parsed.items === 'object') {
                                              // Check for exact match or normalized match
                                              const itemKey = String(it).toLowerCase().replace(/\s+/g, '_');
                                              const itemKeyNoUnderscore = String(it).toLowerCase().replace(/_/g, ' ');
                                              
                                              for (const [key, value] of Object.entries(parsed.items)) {
                                                const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '_');
                                                const keyNoUnderscore = String(key).toLowerCase().replace(/_/g, ' ');
                                                
                                                // Match with multiple variations: exact, normalized, with/without underscores
                                                if (normalizedKey === itemKey || 
                                                    key === it || 
                                                    keyNoUnderscore === itemKeyNoUnderscore ||
                                                    String(key).toLowerCase() === String(it).toLowerCase()) {
                                                  const val = String(value).toLowerCase();
                                                  if (val === 'prepared' || val === 'true' || val === 'yes') {
                                                    itemStatus = 'prepared';
                                                  } else if (val === 'not_available' || val === 'not available' || val === 'false' || val === 'no') {
                                                    itemStatus = 'not_available';
                                                  }
                                                  break;
                                                }
                                              }
                                            }
                                          }
                                          
                                          // Fallback: check for global status if no per-item status found
                                          if (!itemStatus) {
                                            const match = resp.match(/Needs:\s*(Prepared|Not Available)/i);
                                            if (match) {
                                              itemStatus = /prepared/i.test(match[1]) ? 'prepared' : 'not_available';
                                            }
                                          }
                                        } catch (e) {
                                          // ignore parse errors
                                        }
                                        
                                        // Apply colors based on status
                                        let chipClass = "text-[10px] sm:text-xs bg-pink-50 text-pink-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-pink-200 whitespace-nowrap";
                                        if (itemStatus === 'prepared') {
                                          chipClass = "text-[10px] sm:text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-green-200 whitespace-nowrap";
                                        } else if (itemStatus === 'not_available') {
                                          chipClass = "text-[10px] sm:text-xs bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-red-200 whitespace-nowrap";
                                        }
                                        
                                        return (
                                          <span key={`eq-${id}-${idx}`} className={chipClass}>{it}</span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Group Size</p>
                            <p className="font-semibold text-gray-900">
                              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium">
                                <svg className="h-3 w-3 text-gray-600 flex-shrink-0" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4" /></svg>
                                <span>{booking.participants != null ? booking.participants : 1}</span>
                                <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">participant{booking.participants != null && booking.participants > 1 ? 's' : ''}</span>
                              </span>
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                              {(() => {
                                const facility = facilities.find(f => f.id === booking.facilityId);
                                if (!facility) return '';
                                // Use actual facility capacity from database
                                return `Max capacity: ${facility.capacity || 8}`;
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="text-[11px] sm:text-sm text-gray-500">
                            <div className="mb-2">Booked on {new Date(booking.createdAt || booking.startTime).toLocaleDateString()}</div>
                            {/* Arrival-confirmation: if an arrivalConfirmationDeadline exists and arrival not yet confirmed, show confirmation countdown in Active Booking; otherwise show time remaining */}
                            {getBookingStatus(booking).label === 'Active' && booking.userId === user?.id && (
                              <div className="mt-2">
                                {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                    <span className="text-[10px] sm:text-xs font-medium text-amber-700 whitespace-nowrap">Confirm in:</span>
                                    <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => {
                                      // Refresh bookings so expired arrivals are re-evaluated
                                      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
                                      toast({ title: 'Arrival Confirmation Expired', description: `Your booking for ${getFacilityDisplay(booking.facilityId)} was not confirmed and may be cancelled.` });
                                    }} />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg shadow-sm">
                                    <span className="text-[10px] sm:text-xs font-medium text-green-700 whitespace-nowrap">Time remaining:</span>
                                    <Countdown expiry={booking.endTime} onExpire={() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
                                      toast({ title: 'Booking Ended', description: `Your booking for ${getFacilityDisplay(booking.facilityId)} has ended.` });
                                    }} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            {canEditBooking(booking) && (
                              <button
                                onClick={() => {
                                  // Edit clicked for booking - handled by opening modal
                                  setEditingBooking(booking);
                                  setShowEditBookingModal(true);
                                }}
                                className="flex-1 sm:flex-none px-3 py-1.5 bg-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors duration-200 whitespace-nowrap"
                              >
                                Edit
                              </button>
                            )}
                            {/* Single action button: Cancel (or End when active) */}
                            {canCancelBooking(booking) && booking.userId === user?.id && (
                              <button
                                onClick={() => handleCancelBooking(booking)}
                                disabled={cancelBookingMutation.status === 'pending'}
                                className={`flex-1 sm:flex-none px-3 py-1.5 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${cancelBookingMutation.status === 'pending' ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}
                              >
                                {cancelBookingMutation.status === 'pending' ? (
                                  <>
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    <span className="hidden sm:inline">Processing...</span>
                                  </>
                                ) : (
                                  getBookingStatus(booking).label === 'Active' ? 'End Booking' : 'Cancel'
                                )}
                              </button>
                            )}
                            {!canEditBooking(booking) && !canCancelBooking(booking) && !(booking.userId === user?.id && getBookingStatus(booking).label === 'Active') && (
                              <span className="text-gray-400 text-[11px] sm:text-sm">No actions available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Show 'View all' which redirects to Activity Logs -> Booking (no pagination) */}
                  {userBookings.length > itemsPerPage && (
                    <div className="pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => {
                            try {
                              // Navigate to Activity Logs -> Booking tab
                              try { sessionStorage.setItem('openActivityBookingOnce', '1'); } catch (_) {}
                              window.location.hash = 'activity-logs:booking';
                              setSelectedView('activity-logs');
                              setActivityTab('booking');
                            } catch (e) {
                              // fallback: set state
                              setSelectedView('activity-logs');
                              setActivityTab('booking');
                            }
                          }}
                          className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200"
                        >
                          View All →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        );

      case "activity-logs":
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
                <p className="text-sm text-gray-600 mt-1">View booking history and notification logs</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActivityTab('booking')}
                  className={`px-3 py-2 rounded whitespace-nowrap text-sm ${activityTab === 'booking' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Booking History
                </button>
                <button
                  onClick={() => setActivityTab('notifications')}
                  className={`px-3 py-2 rounded whitespace-nowrap text-sm ${activityTab === 'notifications' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Notification Logs
                </button>
              </div>
            </div>

            {activityTab === 'booking' ? (
              <div className="space-y-4">
                {userBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No booking history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userBookings
                      .slice(activityBookingPage * 10, (activityBookingPage + 1) * 10)
                      .map((booking) => {
                      const id = String(booking.id || Math.random());
                      const eq = booking.equipment || {};
                      const items = Array.isArray(eq.items) ? eq.items : [];
                      const hasOthers = eq.others && String(eq.others).trim().length > 0;
                      return (
                      <div key={booking.id} className="relative grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start">
                        {/* Mobile-only status badge at top right */}
                        <div className="absolute top-3 right-3 md:hidden flex items-center gap-2">
                          {(() => {
                            const status = getBookingStatus(booking);
                            const statusColors = {
                              'Active': 'bg-pink-100 text-pink-800',
                              'Scheduled': 'bg-yellow-50 text-yellow-800',
                              'Done': 'bg-gray-100 text-gray-800',
                              'Denied': 'bg-red-100 text-red-800'
                            };
                            return (
                              <>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                  {status.label}
                                </span>
                                <button
                                  onClick={() => setSelectedView("my-bookings")}
                                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        {/* Column 1: facility, date/time, participants, purpose */}
                        <div className="col-span-1 min-w-0 pr-24 md:pr-0">
                          <div className="flex items-start gap-3">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
                              <Calendar className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-gray-900 text-sm truncate">{getFacilityDisplay(booking.facilityId)}</h4>
                              <p className="text-xs text-gray-600 truncate">{format(new Date(booking.startTime), 'EEE, MMM d')} • {format(new Date(booking.startTime), 'hh:mm a')}</p>
                              {booking.participants && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                                    <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4" /></svg>
                                    <span>{booking.participants}</span>
                                    <span className="text-[10px]">participant{booking.participants > 1 ? 's' : ''}</span>
                                  </span>
                                </div>
                              )}
                              <div className="text-[11px] text-gray-800 mt-2">
                            {(booking.purpose || '').length > 30 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <Popover>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <button className="flex items-center gap-1 text-[11px] text-gray-700" aria-expanded={false}>
                                          <Eye className="h-3 w-3 text-pink-600" />
                                          <span className="text-gray-700">View purpose</span>
                                        </button>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                      </div>
                                      <div className="p-4 max-h-48 overflow-y-auto">
                                        <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{booking.purpose}</p>
                                      </div>
                                    </TooltipContent>
                                    <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                      </div>
                                      <div className="p-3">
                                        <p className="text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose || 'No purpose specified'}</p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="text-[11px] text-gray-800"><span className="font-medium">Purpose:&nbsp;</span><span className="font-normal">{booking.purpose || 'No purpose specified'}</span></p>
                            )}
                          </div>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Equipment / Needs only */}
                        <div className="col-span-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <span>Equipment or Needs</span>
                            {hasOthers && (
                              <TooltipProvider>
                                <Tooltip>
                                  <Popover open={!!openOthers[id]} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <Eye className="h-3 w-3 text-pink-600 flex-shrink-0" />
                                          <p className="text-[11px] text-gray-800 font-medium">View other</p>
                                        </div>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                      </div>
                                      <div className="p-3">
                                        <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{String(eq.others).trim()}</p>
                                      </div>
                                    </TooltipContent>
                                    <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                      </div>
                                      <div className="p-3">
                                        <p className="text-sm text-gray-900 break-words whitespace-pre-wrap font-normal">{String(eq.others).trim()}</p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {items.map((it: string, idx: number) => {
                              // Parse per-item equipment status from adminResponse JSON
                              let itemStatus: 'prepared' | 'not_available' | undefined;
                              try {
                                const resp = String(booking?.adminResponse || '');
                                
                                // First try to extract JSON with per-item statuses
                                // Look for JSON block starting with {"items":
                                const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                                if (jsonMatch) {
                                  const parsed = JSON.parse(jsonMatch[0]);
                                  if (parsed.items && typeof parsed.items === 'object') {
                                    // Check for exact match or normalized match
                                    const itemKey = String(it).toLowerCase().replace(/\s+/g, '_');
                                    const itemKeyNoUnderscore = String(it).toLowerCase().replace(/_/g, ' ');
                                    
                                    for (const [key, value] of Object.entries(parsed.items)) {
                                      const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '_');
                                      const keyNoUnderscore = String(key).toLowerCase().replace(/_/g, ' ');
                                      
                                      // Match with multiple variations: exact, normalized, with/without underscores
                                      if (normalizedKey === itemKey || 
                                          key === it || 
                                          keyNoUnderscore === itemKeyNoUnderscore ||
                                          String(key).toLowerCase() === String(it).toLowerCase()) {
                                        const val = String(value).toLowerCase();
                                        if (val === 'prepared' || val === 'true' || val === 'yes') {
                                          itemStatus = 'prepared';
                                        } else if (val === 'not_available' || val === 'not available' || val === 'false' || val === 'no') {
                                          itemStatus = 'not_available';
                                        }
                                        break;
                                      }
                                    }
                                  }
                                }
                                
                                // Fallback: check for global status if no per-item status found
                                if (!itemStatus) {
                                  const match = resp.match(/Needs:\s*(Prepared|Not Available)/i);
                                  if (match) {
                                    itemStatus = /prepared/i.test(match[1]) ? 'prepared' : 'not_available';
                                  }
                                }
                              } catch (e) {
                                // ignore parse errors
                              }
                              
                              // Apply colors based on status
                              let chipClass = "text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded-full border border-pink-200";
                              if (itemStatus === 'prepared') {
                                chipClass = "text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200";
                              } else if (itemStatus === 'not_available') {
                                chipClass = "text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full border border-red-200";
                              }
                              
                              return (
                                <span key={`act-eq-${id}-${idx}`} className={chipClass}>{it}</span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 3: empty for future use */}
                        <div className="col-span-1 hidden md:block" />

                        {/* Column 4: status badge (right aligned) + view button - Desktop only */}
                        <div className="col-span-1 hidden md:flex items-start justify-end">
                          {(() => {
                            const status = getBookingStatus(booking);
                            const statusColors = {
                              'Active': 'bg-pink-100 text-pink-800',
                              'Scheduled': 'bg-yellow-50 text-yellow-800',
                              'Done': 'bg-gray-100 text-gray-800',
                              'Denied': 'bg-red-100 text-red-800'
                            };
                            return (
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                  {status.label}
                                </span>
                                <button
                                  onClick={() => setSelectedView("my-bookings")}
                                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {notificationsData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No notifications</p>
                  </div>
                ) : (
                  notificationsData.slice(activityNotificationsPage * notificationsPerPage, (activityNotificationsPage + 1) * notificationsPerPage).map((n: any) => {
                    const { baseMessage, equipment } = parseEquipmentFromMessage(n.message);
                    
                    return (
                      <div key={n.id} className={`p-3 sm:p-4 rounded-md bg-white border ${n.isRead ? 'opacity-70' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{n.title}</div>
                            <div className="text-xs text-gray-600 mt-1 break-words">{baseMessage}</div>
                            {equipment && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(equipment).map(([key, value]: [string, any]) => {
                                  const displayKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                  return (
                                    <span
                                      key={key}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}
                                    >
                                      {displayKey}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:ml-4 shrink-0">
                            <div className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</div>
                            {!n.isRead && (
                              <button 
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-wait flex items-center gap-1 whitespace-nowrap" 
                                onClick={() => markNotificationReadMutation.mutate(n.id)}
                                disabled={markNotificationReadMutation.status === 'pending'}
                              >
                                {markNotificationReadMutation.status === 'pending' ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="hidden sm:inline">Reading...</span>
                                  </>
                                ) : (
                                  'Mark Read'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {/* Pagination footer for Activity Logs */}
              <div className="pt-4 border-t border-gray-100 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {activityTab === 'booking' ? (
                  // Compact summary for Recent Booking booking history (no pagination)
                  <p className="text-[11px] sm:text-sm text-gray-600">Showing {Math.min(bookingsPerPage, userBookings.length)} of {userBookings.length} bookings</p>
                ) : (
                  <p className="text-[11px] sm:text-sm text-gray-600">Showing {activityNotificationsPage * notificationsPerPage + 1} to {Math.min((activityNotificationsPage + 1) * notificationsPerPage, notificationsData.length)} of {notificationsData.length} notifications</p>
                )}

                <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                  {/* Hide Prev/Next for recent bookings compact view */}
                  {activityTab === 'booking' ? null : (
                    <>
                      <button onClick={() => setActivityNotificationsPage(p => Math.max(0, p - 1))} disabled={activityNotificationsPage === 0} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors">Prev</button>
                      <button onClick={() => setActivityNotificationsPage(p => ((p + 1) * notificationsPerPage < notificationsData.length ? p + 1 : p))} disabled={(activityNotificationsPage + 1) * notificationsPerPage >= notificationsData.length} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors">Next</button>
                    </>
                  )}
                </div>
              </div>
          </div>
        );

      case "faqs":
        return (
          <div className="bg-white/0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Frequently Asked Questions</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Find quick answers about booking policies, facilities, and support.</p>
              </div>
              <FaqList />
            </div>
          </div>
        );

      case "available-rooms":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Available Study Rooms</h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Browse and book available facilities</p>

                  {/* counts/legend removed as requested */}

                  {(isLibraryClosedNow() || facilities.some(f => getFacilityBookingStatus(f.id).status === 'closed')) && (
                    <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-100">
                      If you request a booking outside school hours, the system will schedule it automatically and notify you of any changes.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Book Room button removed as requested */}
                  {/* Dev-only: temporary toggle to force library open for debugging availability UI */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Dev: Force Open</label>
                      <button onClick={() => setDevForceOpen(v => !v)} className={`px-2 py-1 rounded text-sm ${devForceOpen ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {devForceOpen ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
                {facilities
                  .filter((f) => {
                    const restricted = isRestrictedFacility(f);
                    const allowedByRole = (user?.role === 'faculty' || user?.role === 'admin');
                    return !(restricted && !allowedByRole);
                  })
                  .map((facility) => {
                  const bookingStatus = getFacilityBookingStatus(facility.id);
                  // Immediate availability for same-day booking
                  const isAvailableForBooking = facility.isActive && bookingStatus.status === "available";
                  const isOwnerOrAdmin = (user?.role === 'admin') || (bookingStatus.booking && bookingStatus.booking.userId === user?.id);
                  // Allow users to submit booking requests even when school is closed; these will be reviewed
                  // by staff and are subject to approval and scheduling validation.
                  const canRequestBooking = facility.isActive && (bookingStatus.status === "available" || bookingStatus.status === "closed");
                  
                  return (
                    <div
                      key={facility.id}
                      className={`group bg-white border rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
                        isAvailableForBooking
                          ? (isRestrictedFacility(facility) && !(user?.role === 'faculty' || user?.role === 'admin') ? 'border-gray-200 bg-white opacity-95' : 'border-gray-200 hover:shadow-lg cursor-pointer hover:border-pink-200')
                          : 'border-gray-100 bg-gray-50 opacity-80'
                      }`}
                      onClick={() => { if (!isRestrictedFacility(facility) || (user?.role === 'faculty' || user?.role === 'admin')) { if (isAvailableForBooking) openBookingModal(facility.id); } else { /* ignore clicks for restricted users */ } }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center relative">
                        {isAvailableForBooking ? (
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <FacilityStatusBadge facility={facility} bookingStatus={bookingStatus} />
                          </div>
                        ) : null}

                        {(facility.image || facility.imageUrl || getFacilityImageByName(facility.name)) ? (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                            <img
                              src={facility.image ? `/images/${facility.image}` : (facility.imageUrl || getFacilityImageByName(facility.name))}
                              alt={facility.name}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                isAvailableForBooking ? 'group-hover:scale-105' : 'grayscale'
                              }`}
                              style={{ objectPosition: 'center', width: '100%', height: '100%' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList?.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                                  <Calendar className={`h-8 w-8 ${isAvailableForBooking ? 'text-gray-400' : 'text-gray-300'}`} />
                                </div>
                                <p className={`text-sm ${isAvailableForBooking ? 'text-gray-500' : 'text-gray-400'}`}>
                                  No image available
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                              <Calendar className={`h-8 w-8 ${isAvailableForBooking ? 'text-gray-400' : 'text-gray-300'}`} />
                            </div>
                            <p className={`text-sm ${isAvailableForBooking ? 'text-gray-500' : 'text-gray-400'}`}>
                              No image available
                            </p>
                          </div>
                        )}
                      </div>

                        <div className="p-6 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-lg mb-1 transition-colors ${
                            isAvailableForBooking
                              ? 'text-gray-900 group-hover:text-pink-700' 
                              : 'text-gray-500'
                          }`}>
                            {formatFacilityName(facility.name)}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatus.badgeClass}`}>
                            {bookingStatus.label}
                          </span>
                        </div>
                        
                        {/* Show next available merged range from availability API at the top for other users */}
                        {(!isOwnerOrAdmin && facility.isActive) && (() => {
                          try {
                            const entry = availabilityMap.get(facility.id);
                            if (!entry || !Array.isArray(entry.slots)) return null;
                            // merge contiguous slots with same status
                            const slots = entry.slots;
                            const ranges: any[] = [];
                            if (slots.length > 0) {
                              let cur = { start: slots[0].start, end: slots[0].end, status: slots[0].status };
                              for (let i = 1; i < slots.length; i++) {
                                const s = slots[i];
                                if (s.status === cur.status && new Date(s.start).getTime() === new Date(cur.end).getTime()) {
                                  cur.end = s.end;
                                } else {
                                  ranges.push(cur);
                                  cur = { start: s.start, end: s.end, status: s.status };
                                }
                              }
                              ranges.push(cur);
                            }

                            // find next available range that starts after now
                            const now = new Date();
                            const nextAvailable = ranges.find(r => r.status === 'available' && new Date(r.end) > now && new Date(r.start) >= now);
                            if (!nextAvailable) return null;
                            return (
                              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-green-800 font-medium">Next available booking</div>
                                  <div className="text-sm font-semibold text-gray-900">{format(new Date(nextAvailable.start), 'EEE, MMM d')} • {format(new Date(nextAvailable.start), 'hh:mm a')} - {format(new Date(nextAvailable.end), 'hh:mm a')}</div>
                                </div>
                                <div>
                                  <button onClick={(e) => { e.stopPropagation(); const start = new Date(nextAvailable.start); const end = new Date(start.getTime() + 30 * 60000); const restricted = isRestrictedFacility(facility); const userRole = user?.role || 'student'; const allowed = userRole === 'faculty' || userRole === 'admin'; if (restricted && !allowed) { toast({ title: 'Access Restricted', description: 'Only faculty members may book this facility. Contact an administrator for access.', variant: 'destructive' }); return; } setSelectedFacilityForBooking(facility.id); setInitialStartForBooking(start); setInitialEndForBooking(end); setInitialTimesAreSuggested(true); openBookingModal(facility.id, start, end); }} className="bg-pink-600 text-white px-3 py-1 rounded-lg text-sm">Book Now</button>
                                </div>
                              </div>
                            );
                          } catch (e) { return null; }
                        })()}

                        <p className={`text-sm leading-relaxed mb-1 flex-grow ${
                          isAvailableForBooking ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          {getFacilityDescriptionByName(facility.name)}
                        </p>

                        {/* Show detailed booking info for all users (times, next-available hint). */}
                        {bookingStatus.booking && bookingStatus.status !== 'available' && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              {bookingStatus.booking?.status === 'pending' ? 'Pending booking:' :
                               bookingStatus.status === 'booked' ? 'Currently in use until:' :
                               bookingStatus.status === 'scheduled' ? 'Next booking:' :
                              'Scheduled:'}
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {bookingStatus.status === 'booked' ? (
                                new Date(bookingStatus.booking.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })
                              ) : (
                                <>
                                  {format(new Date(bookingStatus.booking.startTime), 'EEE, MMM d')} • {format(new Date(bookingStatus.booking.startTime), 'hh:mm a')} - {format(new Date(bookingStatus.booking.endTime), 'hh:mm a')}
                                </>
                              )}
                            </p>
                            {bookingStatus.status === 'booked' && (
                              <>
                                <p className="text-xs text-gray-500 mt-1">
                                  Room is currently occupied
                                </p>
                                {bookingStatus.booking?.endTime && (
                                  (() => {
                                    try {
                                      const end = new Date(bookingStatus.booking.endTime);
                                      const entry = availabilityMap.get(facility.id);
                                      if (entry && Array.isArray(entry.slots)) {
                                        // find the next available slot that begins at or after the booking end
                                        const next = entry.slots.find((s: any) => s.status === 'available' && new Date(s.start) >= end);
                                        const display = next ? new Date(next.start) : end;
                                        return (
                                          <p className="text-xs text-green-600 font-medium mt-1">
                                            Next available: {display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          </p>
                                        );
                                      }
                                      // fallback to end time
                                      return (
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                          Next available: {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                      );
                                    } catch (e) {
                                      return null;
                                    }
                                  })()
                                )}
                              </>
                            )}
                            {bookingStatus.status === 'scheduled' && bookingStatus.booking?.endTime && (
                              (() => {
                                try {
                                  const end = new Date(bookingStatus.booking.endTime);
                                  const entry = availabilityMap.get(facility.id);
                                  if (entry && Array.isArray(entry.slots)) {
                                    // find the next available slot that begins at or after the booking end
                                    const next = entry.slots.find((s: any) => s.status === 'available' && new Date(s.start) >= end);
                                    const display = next ? new Date(next.start) : end;
                                    return (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Next available: {display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </p>
                                    );
                                  }
                                  // fallback to end time
                                  return (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Next available: {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </p>
                                  );
                                } catch (e) {
                                  return null;
                                }
                              })()
                            )}
                            {bookingStatus.booking?.status === 'pending' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Scheduled automatically; you'll be notified of any changes.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-auto">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isAvailableForBooking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className={`text-sm font-medium ${isAvailableForBooking ? 'text-green-700' : 'text-gray-500'}`}>
                                {(() => `Up to ${facility.capacity || 8} people`)()}
                              </span>
                            </div>

                            <div className="flex flex-col items-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); const restricted = isRestrictedFacility(facility); const userRole = user?.role || 'student'; const allowed = userRole === 'faculty' || userRole === 'admin'; if (restricted && !allowed) { toast({ title: 'Access Restricted', description: 'Only faculty members may book this facility. Contact an administrator for access.', variant: 'destructive' }); return; } if (isAvailableForBooking) openBookingModal(facility.id); if (bookingStatus.status === 'closed') openBookingModal(facility.id); }}
                                disabled={!canRequestBooking || (isRestrictedFacility(facility) && !(user?.role === 'faculty' || user?.role === 'admin'))}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm flex-shrink-0 ${
                                  isAvailableForBooking
                                    ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                    : (bookingStatus.status === 'closed' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                }`}
                              >
                                {isAvailableForBooking ? 'Book Now' : bookingStatus.status === 'closed' ? 'Request Booking' : 'Unavailable'}
                              </button>

                              {bookingStatus.status === 'closed' && (
                                <p className="text-xs text-gray-500 mt-2 text-right max-w-xs">
                                  If requested outside school hours, the system will schedule it automatically and notify you of any changes.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No facilities available</h4>
                  <p className="text-gray-600">There are currently no facilities available for booking.</p>
                </div>
              ) : (() => {
                const availableRooms = facilities.filter(f => 
                  f.isActive && getFacilityBookingStatus(f.id).status === "available"
                );
                
                if (availableRooms.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-red-500" />
                      </div>
                      {isLibraryClosedNow() ? (
                            <>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">School Closed</h4>
                              <p className="text-gray-600">The school is currently closed. Please return during normal operating hours (7:30 AM – 7:00 PM).</p>
                            </>
                          ) : (
                            <>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">All rooms are currently booked</h4>
                              <p className="text-gray-600">All facilities are currently in use, scheduled, or otherwise unavailable. Please check back later or contact school staff for assistance.</p>
                            </>
                          )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Availability grid (per-date slot view) */}
              <AvailabilityGrid
                onSelectRange={(fid: number, s: string, e: string) => {
                  const start = new Date(s);
                  const end = new Date(e);
                  setSelectedFacilityForBooking(fid);
                  setInitialStartForBooking(start);
                  setInitialEndForBooking(end);
                  openBookingModal(fid, start, end);
                }}
                unavailableDatesByFacility={unavailableDatesByFacility}
              />
            </div>
        );

      case "booking-settings":
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Booking Guidelines & Policy</h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Review facility booking guidelines, policies, and usage rules</p>
            </div>

            <div className="space-y-6">
              {/* Email notifications control removed */}

              <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                <h4 className="font-medium text-pink-900 mb-2">Booking Guidelines</h4>
                <div className="text-sm text-pink-800 space-y-3">
                  <div>
                    <h5 className="font-semibold text-pink-900 mb-1">Overview</h5>
                    <p>Use this system to reserve facilities for academic work, meetings, and approved events. Follow these guidelines to ensure fair access and a smooth experience for all users.</p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-pink-900 mb-1">Booking Windows & Lead Time</h5>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Request bookings at least 30 minutes before the desired start time.</li>
                      <li>Bookings are generally available during school hours: 7:30 AM – 7:00 PM. Requests outside these hours will be reviewed by staff.</li>
                      <li>Some facilities may require additional lead time—check the facility details before requesting.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-pink-900 mb-1">Eligibility & Capacity</h5>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Only registered university users may create bookings.</li>
                      <li>Enter the expected number of participants and do not exceed the facility’s maximum capacity.</li>
                      <li>If your event requires special equipment or setup, request it when creating the booking so staff can plan accordingly.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-pink-900 mb-1">Cancellations & Changes</h5>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Cancel at least 30 minutes before the start time whenever possible to free space for others.</li>
                      <li>To change a booking, edit the reservation—if the requested changes conflict with existing bookings, staff will contact you to reschedule.</li>
                      <li>No-shows or repeated late cancellations may result in temporary booking restrictions.</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-pink-900 mb-1">Conduct & Responsibilities</h5>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Keep noise levels appropriate for a study environment and respect other users.</li>
                      <li>Leave the space clean and return furniture/equipment to its original arrangement.</li>
                      <li>Report any damage or issues to staff immediately via the contact details listed in the facility information.</li>
                    </ul>
                  </div>

                  <div className="bg-pink-100 p-3 rounded border border-pink-300 mt-4">
                    <p className="font-semibold text-pink-900">Tip</p>
                    <p className="text-pink-800">Popular slots fill quickly. Book early and add a reminder to your calendar to avoid missing your reservation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:border-pink-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Active Bookings</p>
                    <p className="text-3xl font-bold text-pink-600 mt-1">{stats.active}</p>
                    <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                  </div>
                  <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                    <CheckCircle className="h-6 w-6 text-pink-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:border-pink-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Scheduled Bookings</p>
                      <p className="text-3xl font-bold text-pink-600 mt-1">{stats.upcoming}</p>
                      <p className="text-xs text-gray-500 mt-1">Approved and scheduled</p>
                    </div>
                  <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                    <Clock className="h-6 w-6 text-pink-600" />
                  </div>
                </div>
              </button>

              
            </div>

            {/* Quick actions removed (use sidebar / available rooms) */}

            {/* Available Rooms (full view content copied from the available-rooms case) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Available Study Rooms</h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Browse and book available facilities</p>

                  {(isLibraryClosedNow() || facilities.some(f => getFacilityBookingStatus(f.id).status === 'closed')) && (
                    <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-100">
                      If you request a booking outside school hours, the system will schedule it automatically and notify you of any changes.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Book Room button removed as requested */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Dev: Force Open</label>
                      <button onClick={() => setDevForceOpen(v => !v)} className={`px-2 py-1 rounded text-sm ${devForceOpen ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {devForceOpen ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
                {facilities
                  .filter((f) => {
                    const restricted = isRestrictedFacility(f);
                    const allowedByRole = (user?.role === 'faculty' || user?.role === 'admin');
                    return !(restricted && !allowedByRole);
                  })
                  .map((facility) => {
                  const bookingStatus = getFacilityBookingStatus(facility.id);
                  const isAvailableForBooking = facility.isActive && bookingStatus.status === "available";
                  const isOwnerOrAdmin = (user?.role === 'admin') || (bookingStatus.booking && bookingStatus.booking.userId === user?.id);
                  const canRequestBooking = facility.isActive && (bookingStatus.status === "available" || bookingStatus.status === "closed");
                  
                  return (
                    <div
                      key={facility.id}
                      className={`group bg-white border rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
                        isAvailableForBooking
                          ? 'border-gray-200 hover:shadow-lg cursor-pointer hover:border-pink-200'
                          : 'border-gray-100 bg-gray-50 opacity-80'
                      }`}
                      onClick={() => isAvailableForBooking && openBookingModal(facility.id)}
                    >
                      <div className="aspect-video bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center relative">
                          {isAvailableForBooking ? (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                              <FacilityStatusBadge facility={facility} bookingStatus={bookingStatus} />
                              {/* Owner cancel button intentionally removed from image overlay to avoid duplicated visuals.
                                  End/cancel actions remain available in the booking details area and confirm dialogs. */}
                            </div>
                          ) : null}
                        {(facility.image || facility.imageUrl || getFacilityImageByName(facility.name)) ? (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                            <img
                              src={facility.image ? `/images/${facility.image}` : (facility.imageUrl || getFacilityImageByName(facility.name))}
                              alt={facility.name}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                isAvailableForBooking ? 'group-hover:scale-105' : 'grayscale'
                              }`}
                              style={{ objectPosition: 'center', width: '100%', height: '100%', aspectRatio: '16/9', minHeight: '180px', maxHeight: '320px' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList?.remove('hidden');
                              }}
                            />
                          </div>
                        ) : null}
                        {!(facility.image || facility.imageUrl || getFacilityImageByName(facility.name)) && (
                          <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                              <Calendar className={`h-8 w-8 ${isAvailableForBooking ? 'text-gray-400' : 'text-gray-300'}`} />
                            </div>
                            <p className={`text-sm ${isAvailableForBooking ? 'text-gray-500' : 'text-gray-400'}`}>
                              No image available
                            </p>
                          </div>
                        )}
                      </div>

                        <div className="p-6 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-lg mb-1 transition-colors ${
                            isAvailableForBooking
                              ? 'text-gray-900 group-hover:text-pink-700' 
                              : 'text-gray-500'
                          }`}>
                            {formatFacilityName(facility.name)}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatus.badgeClass}`}>
                            {bookingStatus.label}
                          </span>
                        </div>
                        {(!isOwnerOrAdmin && facility.isActive) && (() => {
                          try {
                            const entry = availabilityMap.get(facility.id);
                            if (!entry || !Array.isArray(entry.slots)) return null;
                            const slots = entry.slots;
                            const ranges: any[] = [];
                            if (slots.length > 0) {
                              let cur = { start: slots[0].start, end: slots[0].end, status: slots[0].status };
                              for (let i = 1; i < slots.length; i++) {
                                const s = slots[i];
                                if (s.status === cur.status && new Date(s.start).getTime() === new Date(cur.end).getTime()) {
                                  cur.end = s.end;
                                } else {
                                  ranges.push(cur);
                                  cur = { start: s.start, end: s.end, status: s.status };
                                }
                              }
                              ranges.push(cur);
                            }

                            const now = new Date();
                            const nextAvailable = ranges.find(r => r.status === 'available' && new Date(r.end) > now && new Date(r.start) >= now);
                            if (!nextAvailable) return null;
                            return (
                              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-green-800 font-medium">Next available booking</div>
                                  <div className="text-sm font-semibold text-gray-900">{format(new Date(nextAvailable.start), 'EEE, MMM d')} • {format(new Date(nextAvailable.start), 'hh:mm a')} - {format(new Date(nextAvailable.end), 'hh:mm a')}</div>
                                </div>
                                <div>
                                  <button onClick={(e) => { e.stopPropagation(); const start = new Date(nextAvailable.start); const end = new Date(start.getTime() + 30 * 60000); setSelectedFacilityForBooking(facility.id); setInitialStartForBooking(start); setInitialEndForBooking(end); setInitialTimesAreSuggested(true); openBookingModal(facility.id, start, end); }} className="bg-pink-600 text-white px-3 py-1 rounded-lg text-sm">Book Now</button>
                                </div>
                              </div>
                            );
                          } catch (e) { return null; }
                        })()}

                        <p className={`text-sm leading-relaxed mb-1 flex-grow ${
                          isAvailableForBooking ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          {getFacilityDescriptionByName(facility.name)}
                        </p>

                        {bookingStatus.booking && bookingStatus.status !== 'available' && (user?.role === 'admin' || bookingStatus.booking.userId === user?.id) && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                     {bookingStatus.booking?.status === 'pending' ? 'Pending booking:' :
                       bookingStatus.status === 'booked' ? 'Currently in use until:' :
                       bookingStatus.status === 'scheduled' ? 'Next booking:' :
                      'Scheduled:'}
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {bookingStatus.status === 'booked' ? (
                                new Date(bookingStatus.booking.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })
                              ) : (
                                <>
                                  {format(new Date(bookingStatus.booking.startTime), 'EEE, MMM d')} • {format(new Date(bookingStatus.booking.startTime), 'hh:mm a')} - {format(new Date(bookingStatus.booking.endTime), 'hh:mm a')}
                                </>
                              )}
                            </p>
                            {bookingStatus.status === 'booked' && (
                              <>
                                <p className="text-xs text-gray-500 mt-1">
                                  Room is currently occupied
                                </p>
                                {bookingStatus.booking?.endTime && (
                                  (() => {
                                    try {
                                      const end = new Date(bookingStatus.booking.endTime);
                                      const entry = availabilityMap.get(facility.id);
                                      if (entry && Array.isArray(entry.slots)) {
                                        // find the next available slot that begins at or after the booking end
                                        const next = entry.slots.find((s: any) => s.status === 'available' && new Date(s.start) >= end);
                                        const display = next ? new Date(next.start) : end;
                                        return (
                                          <p className="text-xs text-green-600 font-medium mt-1">
                                            Next available: {display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          </p>
                                        );
                                      }
                                      // fallback to end time
                                      return (
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                          Next available: {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                      );
                                    } catch (e) {
                                      return null;
                                    }
                                  })()
                                )}
                              </>
                            )}
                            {bookingStatus.status === 'scheduled' && bookingStatus.booking?.endTime && (
                              (() => {
                                try {
                                  const end = new Date(bookingStatus.booking.endTime);
                                  const entry = availabilityMap.get(facility.id);
                                  if (entry && Array.isArray(entry.slots)) {
                                    // find the next available slot that begins at or after the booking end
                                    const next = entry.slots.find((s: any) => s.status === 'available' && new Date(s.start) >= end);
                                    const display = next ? new Date(next.start) : end;
                                    return (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Next available: {display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </p>
                                    );
                                  }
                                  // fallback to end time
                                  return (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Next available: {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </p>
                                  );
                                } catch (e) {
                                  return null;
                                }
                              })()
                            )}
                            {bookingStatus.booking?.status === 'pending' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Scheduled automatically; you'll be notified of any changes.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-auto">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isAvailableForBooking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className={`text-sm font-medium ${isAvailableForBooking ? 'text-green-700' : 'text-gray-500'}`}>
                                {(() => `Up to ${facility.capacity || 8} people`)()}
                              </span>
                            </div>

                            <div className="flex flex-col items-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); if (isAvailableForBooking) openBookingModal(facility.id); if (bookingStatus.status === 'closed') openBookingModal(facility.id); }}
                                disabled={!canRequestBooking}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm flex-shrink-0 ${
                                  isAvailableForBooking
                                    ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                    : (bookingStatus.status === 'closed' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                }`}
                              >
                                {isAvailableForBooking ? 'Book Now' : bookingStatus.status === 'closed' ? 'Request Booking' : 'Unavailable'}
                              </button>

                              {bookingStatus.status === 'closed' && (
                                <p className="text-xs text-gray-500 mt-2 text-right max-w-xs">
                                  If requested outside school hours, the system will schedule it automatically and notify you of any changes.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No facilities available</h4>
                  <p className="text-gray-600">There are currently no facilities available for booking.</p>
                </div>
              ) : (() => {
                const availableRooms = facilities.filter(f => 
                  f.isActive && getFacilityBookingStatus(f.id).status === "available"
                );
                
                if (availableRooms.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-red-500" />
                      </div>
                      {isLibraryClosedNow() ? (
                            <>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">School Closed</h4>
                              <p className="text-gray-600">The school is currently closed. Please return during normal operating hours (7:30 AM – 7:00 PM).</p>
                            </>
                          ) : (
                            <>
                              <h4 className="text-lg font-medium text-gray-900 mb-2">All rooms are currently booked</h4>
                              <p className="text-gray-600">All facilities are currently in use, scheduled, or otherwise unavailable. Please check back later or contact school staff for assistance.</p>
                            </>
                          )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Availability grid (per-date slot view) */}
              <AvailabilityGrid
                onSelectRange={(fid: number, s: string, e: string) => {
                  const start = new Date(s);
                  const end = new Date(e);
                  setSelectedFacilityForBooking(fid);
                  setInitialStartForBooking(start);
                  setInitialEndForBooking(end);
                  openBookingModal(fid, start, end);
                }}
                unavailableDatesByFacility={unavailableDatesByFacility}
              />
            </div>

            {/* Recent Booking */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recent Booking</h3>
                  <p className="text-gray-600 text-sm mt-1">Your latest facility reservations</p>
                </div>
                <button
                  onClick={() => setSelectedView("my-bookings")}
                  className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200"
                >
                  View All →
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setActivityTab('booking')}
                  className={`px-3 py-1 rounded ${activityTab === 'booking' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Booking History
                </button>
                <button
                  onClick={() => setActivityTab('notifications')}
                  className={`px-3 py-1 rounded ${activityTab === 'notifications' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Notification Logs
                </button>
              </div>

              {activityTab === 'booking' ? (
                <div className="space-y-4">
                  {userBookings.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No booking history</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userBookings
                        // Recent Booking (compact preview) — show latest 5 bookings only, no pagination
                        .slice(0, 5)
                        .map((booking) => {
                          const id = String(booking.id || Math.random());
                          const eq = booking.equipment || {};
                          const items = Array.isArray(eq.items) ? eq.items : [];
                          const hasOthers = eq.others && String(eq.others).trim().length > 0;
                          return (
                            <div key={booking.id} className="relative grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start">
                              {/* Mobile-only status badge at top right */}
                              <div className="absolute top-3 right-3 md:hidden flex items-center gap-2">
                                {(() => {
                                  const status = getBookingStatus(booking);
                                  const statusColors = {
                                    'Active': 'bg-pink-100 text-pink-800',
                                    'Scheduled': 'bg-yellow-50 text-yellow-800',
                                    'Done': 'bg-gray-100 text-gray-800',
                                    'Denied': 'bg-red-100 text-red-800'
                                  };
                                  return (
                                    <>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                        {status.label}
                                      </span>
                                      <button
                                        onClick={() => setSelectedView("my-bookings")}
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Column 1: facility, date/time, participants, purpose */}
                              <div className="col-span-1 min-w-0 pr-24 md:pr-0">
                                <div className="flex items-start gap-3">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{getFacilityDisplay(booking.facilityId)}</h4>
                                    <p className="text-xs text-gray-600 truncate">{format(new Date(booking.startTime), 'EEE, MMM d')} • {format(new Date(booking.startTime), 'hh:mm a')}</p>
                                    {booking.participants && (
                                      <div className="mt-1">
                                        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                                          <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4" /></svg>
                                          <span>{booking.participants}</span>
                                          <span className="text-[10px]">participant{booking.participants > 1 ? 's' : ''}</span>
                                        </span>
                                      </div>
                                    )}
                                    <div className="text-[11px] text-gray-800 mt-2">
                                      {(booking.purpose || '').length > 30 ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <Popover>
                                              <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                      <button className="flex items-center gap-1 text-[11px] text-gray-700" aria-expanded={false}>
                                                        <Eye className="h-3 w-3 text-pink-600" />
                                                        <span className="text-gray-700">View purpose</span>
                                                      </button>
                                                </PopoverTrigger>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                                </div>
                                                <div className="p-4 max-h-48 overflow-y-auto">
                                                  <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{booking.purpose}</p>
                                                </div>
                                              </TooltipContent>
                                              <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                                </div>
                                                <div className="p-3">
                                                  <p className="text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose || 'No purpose specified'}</p>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <p className="text-[11px] text-gray-800"><span className="font-medium">Purpose:&nbsp;</span><span className="font-normal">{booking.purpose || 'No purpose specified'}</span></p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Equipment / Needs */}
                              <div className="col-span-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <span>Equipment or Needs</span>
                                  {hasOthers && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <Popover open={!!openOthers[id]} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                                          <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                              <div className="flex items-center gap-2 cursor-help">
                                                <Eye className="h-3 w-3 text-pink-600 flex-shrink-0" />
                                                <p className="text-[11px] text-gray-800 font-medium">View other</p>
                                              </div>
                                            </PopoverTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                            </div>
                                            <div className="p-3">
                                              <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{String(eq.others).trim()}</p>
                                            </div>
                                          </TooltipContent>
                                          <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-sm text-gray-900 break-words whitespace-pre-wrap font-normal">{String(eq.others).trim()}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                  {items.map((it: string, idx: number) => (
                                    <span key={`act-eq-${id}-${idx}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">{it}</span>
                                  ))}
                                </div>
                              </div>

                              {/* Column 3: empty for future use */}
                              <div className="col-span-1 hidden md:block" />

                              {/* Column 4: status badge (right aligned) + view button - Desktop only */}
                              <div className="col-span-1 hidden md:flex items-start justify-end">
                                {(() => {
                                  const status = getBookingStatus(booking);
                                  const statusColors = {
                                    'Active': 'bg-pink-100 text-pink-800',
                                    'Scheduled': 'bg-yellow-50 text-yellow-800',
                                    'Done': 'bg-gray-100 text-gray-800',
                                    'Denied': 'bg-red-100 text-red-800'
                                  };
                                  return (
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                        {status.label}
                                      </span>
                                      <button
                                        onClick={() => setSelectedView("my-bookings")}
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {notificationsData.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">No notifications</p>
                    </div>
                  ) : (
                    // Recent Booking compact preview: show first `itemsPerPage` notifications (no pagination)
                    notificationsData.slice(0, itemsPerPage).map((n: any) => {
                      const { baseMessage, equipment } = parseEquipmentFromMessage(n.message);
                      
                      return (
                        <div key={n.id} className={`p-3 sm:p-4 rounded-md bg-white border ${n.isRead ? 'opacity-70' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900">{n.title}</div>
                              <div className="text-xs text-gray-600 mt-1 break-words">{baseMessage}</div>
                              {equipment && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {Object.entries(equipment).map(([key, value]: [string, any]) => {
                                    const displayKey = key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                    return (
                                      <span
                                        key={key}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}
                                      >
                                        {displayKey}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:ml-4 shrink-0">
                              <div className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</div>
                              {!n.isRead && (
                                <button 
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-wait flex items-center gap-1 whitespace-nowrap" 
                                  onClick={() => markNotificationReadMutation.mutate(n.id)}
                                  disabled={markNotificationReadMutation.status === 'pending'}
                                >
                                  {markNotificationReadMutation.status === 'pending' ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span className="hidden sm:inline">Reading...</span>
                                    </>
                                  ) : (
                                    'Mark Read'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                {activityTab === 'booking' ? (
                  // Compact summary for Recent Booking booking history (no pagination)
                  <p className="text-sm text-gray-600">Showing {Math.min(itemsPerPage, userBookings.length)} of {userBookings.length} bookings</p>
                ) : (
                  // Compact summary for Recent Booking notifications preview (no pagination)
                  <p className="text-sm text-gray-600">Showing {Math.min(itemsPerPage, notificationsData.length)} of {notificationsData.length} notifications</p>
                )}

                <div className="flex items-center gap-2">
                  {/* Recent Booking compact preview: no Prev/Next controls here */}
                  {null}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
      
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-16"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        {/* Mobile Sidebar - Drawer style */}
        <div
          className={`lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r z-40 overflow-y-auto transition-transform duration-300 ease-in-out ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        {/* Main Content - Responsive margins */}
        <div className="flex-1 lg:ml-64 ml-0 container mx-auto px-4 sm:px-6 py-4 sm:py-8">{renderContent()}</div>
      </div>
      <BookingModal
        isOpen={showBookingModal}
        onClose={closeBookingModal}
        facilities={facilities}
        selectedFacilityId={selectedFacilityForBooking}
        initialStartTime={initialStartForBooking}
        initialEndTime={initialEndForBooking}
        showSuggestedSlot={initialTimesAreSuggested}
      />
      <EditBookingModal
        isOpen={showEditBookingModal}
        onClose={() => setShowEditBookingModal(false)}
        booking={editingBooking}
        facilities={facilities}
        onSave={handleSaveEditBooking}
      />
      
      {/* Cancellation Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    {bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'End Booking' : 'Cancel Booking'}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1">
                    {bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'Ending this active booking will immediately free the facility for others.' : 'This action cannot be undone.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          
          {bookingToCancel && (
            <div className="py-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Booking Details:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Facility:</span> {bookingToCancel.facilityName || (bookingToCancel.facilityId ? getFacilityDisplay(bookingToCancel.facilityId) : '')}</p>
                  <p><span className="font-medium">Date:</span> {new Date(bookingToCancel.startTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                  <p><span className="font-medium">Time:</span> {new Date(bookingToCancel.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })} - {new Date(bookingToCancel.endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}</p>
                  {bookingToCancel.courseYearDept && (
                    <p><span className="font-medium">Course & Year/Department:</span> {bookingToCancel.courseYearDept}</p>
                  )}
                </div>
              </div>
              {/* Purpose */}
              {bookingToCancel.purpose ? (
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">Purpose</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{bookingToCancel.purpose}</div>
                </div>
              ) : null}

              {/* Equipment / Needs */}
              {(bookingToCancel.equipment && ((Array.isArray(bookingToCancel.equipment.items) && bookingToCancel.equipment.items.length > 0) || (bookingToCancel.equipment.others && String(bookingToCancel.equipment.others).trim().length > 0))) ? (
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">Equipment / Needs</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(bookingToCancel.equipment.items) && bookingToCancel.equipment.items.map((it: string, idx: number) => (
                      <span key={`cancel-eq-${idx}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">{it}</span>
                    ))}
                    {bookingToCancel.equipment.others && String(bookingToCancel.equipment.others).trim().length > 0 ? (
                      <div className="w-full text-sm text-gray-700 mt-2">Others: {bookingToCancel.equipment.others}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              
              <p className="text-sm text-gray-700 mb-6">
                {bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ?
                  'Are you sure you want to end this active booking? This will immediately free up the facility.' :
                  'Are you sure you want to cancel this booking? This action cannot be undone and may affect other users waiting for this time slot.'
                }
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={cancelCancelBooking}
                  variant="outline"
                  className="flex-1"
                  disabled={cancelBookingMutation.status === 'pending'}
                >
                  Keep Booking
                </Button>
                <Button
                  onClick={confirmCancelBooking}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={cancelBookingMutation.status === 'pending'}
                >
                  {cancelBookingMutation.status === 'pending' ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'Ending...' : 'Cancelling...'}
                    </span>
                  ) : (
                    bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'Yes, End Booking' : 'Yes, Cancel Booking'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}