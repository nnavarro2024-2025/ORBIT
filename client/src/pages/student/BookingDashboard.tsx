import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BookingModal from "@/components/modals/BookingModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import { Plus, Calendar, Home, Eye, Users, MapPin, AlertTriangle, BarChart3, Settings, Clock, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function BookingDashboard() {
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [openOthers, setOpenOthers] = useState<Record<string, boolean>>({});
  const [selectedView, setSelectedView] = useState("dashboard");
  // Common hooks used throughout the dashboard
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Booking modal state and defaults
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedFacilityForBooking, setSelectedFacilityForBooking] = useState<number | null>(null);
  const [initialStartForBooking, setInitialStartForBooking] = useState<Date | null>(null);
  const [initialEndForBooking, setInitialEndForBooking] = useState<Date | null>(null);

  // Small Countdown component (lightweight replacement to satisfy usage)
  function Countdown({ expiry, onExpire }: { expiry: string | Date | undefined; onExpire?: () => void }) {
    useEffect(() => {
      if (!expiry) return;
      const ms = new Date(expiry).getTime() - Date.now();
      if (ms <= 0) {
        onExpire?.();
        return;
      }
      const t = setTimeout(() => onExpire?.(), ms);
      return () => clearTimeout(t);
    }, [expiry]);
    if (!expiry) return <span />;
    const diff = Math.max(0, new Date(expiry).getTime() - Date.now());
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
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
      { id: 'activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'booking-settings', label: 'Booking Settings', icon: Settings },
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
    if (hash) setSelectedView(hash);

    // If the URL requests a new booking, open the booking modal and prefill sensible times
    if (hash === 'new') {
  // compute default start = now + 1 hour (add 1 minute buffer to avoid race on submit)
  const start = new Date(Date.now() + 60 * 60 * 1000 + 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // default 30 minute booking
      setInitialStartForBooking(start);
      setInitialEndForBooking(end);
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
      return;
    }
    if (id === 'booking-settings') {
      setSelectedView('booking-settings');
      return;
    }
    setSelectedView(id);
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
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
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
    onSuccess: (data: any) => {
      try {
        // If server returned the updated booking, update the bookings cache
        if (data && data.id) {
          queryClient.setQueryData(["/api/bookings"], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((b: any) => (b.id === data.id ? data : b));
          });
          // If we're currently editing this booking, update that local state too
          setEditingBooking((prev: any) => (prev && prev.id === data.id ? data : prev));
        } else {
          // Fallback: server returned a legacy success payload (no booking object).
          // Fetch the full bookings list and replace the cache so the UI reflects persisted changes.
          (async () => {
            try {
              const res = await apiRequest("GET", "/api/bookings");
              const fresh = await res.json();
              if (Array.isArray(fresh)) {
                queryClient.setQueryData(["/api/bookings"], fresh);
              } else {
                queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
              }
            } catch (fetchErr) {
              console.warn('[BookingDashboard] onSuccess fallback fetch failed', fetchErr);
              queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            }
          })();
        }
      } catch (e) {
        console.warn('[BookingDashboard] updateBookingMutation.onSuccess handler failed', e);
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
    onSuccess: () => {
      // Cache invalidation handled here; toast is shown per-mutation in the confirm flow
      // Give admin dashboard a nudge by invalidating potential shared caches
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
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
          // Show context-aware toast: 'Ended' for active bookings, otherwise 'Cancelled'
          const start = new Date(bookingSnapshot.startTime);
          const end = new Date(bookingSnapshot.endTime);
          const now = new Date();
          const isActive = bookingSnapshot.status === 'approved' ? (start <= now && now <= end) : (start <= now && now <= end);
          if (isActive) {
            toast({ title: 'Booking Ended', description: 'Your active booking has been ended.' });
          } else {
            toast({ title: 'Booking Cancelled', description: 'Your booking has been cancelled.' });
          }
        },
        onError: (error: any) => {
          toast({ title: 'Cancellation Failed', description: error?.message || 'An error occurred while cancelling the booking.', variant: 'destructive' });
        }
      });
      setShowCancelModal(false);
      setBookingToCancel(null);
    }
  };

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

  // ✅ Default to empty arrays to avoid undefined errors
  const { data: facilities = [] } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facilities");
      return response.json();
    },
  });

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

  // ✅ Ensure userBookings is always an array
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // React to top-level route '/notifications' so header links open this tab directly
  const [location, setLocation] = useLocation();
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

  // Function to get current booking status for a facility with library hours validation
  const getFacilityBookingStatus = (facilityId: number) => {
    const now = new Date();
    
    // Check if current time is within library working hours (7:30 AM - 5:00 PM)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const libraryOpenTime = 7 * 60 + 30; // 7:30 AM in minutes
    const libraryCloseTime = 17 * 60; // 5:00 PM in minutes
    
    const isWithinLibraryHours = currentTimeInMinutes >= libraryOpenTime && currentTimeInMinutes <= libraryCloseTime;
    
    // Get all active bookings for this facility
    // NOTE: For privacy, pending bookings should only be visible to admins and the booking owner.
    // allBookings contains the global view (approved bookings). userBookings contains the current user's bookings
    // Merge them so that the owner can see their own pending requests while other users do not see them.
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

    const facilityBookings = deduped.filter(booking => 
      booking.facilityId === facilityId &&
      // include approved bookings for everyone
      (
        booking.status === "approved" ||
        // include pending only if the current user is admin or the owner of the pending request
        (booking.status === "pending" && (user?.role === 'admin' || booking.userId === user?.id))
      ) &&
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

    // Check if facility has upcoming approved bookings
    const upcomingBooking = facilityBookings.find(booking => {
      const start = new Date(booking.startTime);
      return start > now && booking.status === "approved";
    });

    if (upcomingBooking) {
      return {
        status: "scheduled",
        label: "Scheduled",
        booking: upcomingBooking,
        badgeClass: "bg-yellow-100 text-yellow-800"
      };
    }

    // Check if facility has pending bookings
    const pendingBooking = facilityBookings.find(booking => booking.status === "pending");
    
    if (pendingBooking) {
      return {
        status: "pending",
        label: "Pending Request",
        booking: pendingBooking,
  badgeClass: "bg-pink-100 text-pink-800"
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
  const libraryCloseTime = 17 * 60; // 5:00 PM
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
  const openBookingModal = (facilityId?: number, start?: Date, end?: Date) => {
    setSelectedFacilityForBooking(facilityId || null);
    // If no start/end provided, compute sensible defaults that satisfy the 1-hour lead-time requirement
    if (!start) {
      // default to current time + 1 hour (add 1 minute buffer to avoid race on submit)
      start = new Date(Date.now() + 60 * 60 * 1000 + 60 * 1000);
      end = new Date(start.getTime() + 30 * 60 * 1000);
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
    const name = facility.name || `Facility ${facilityId}`;
    const lower = name.toLowerCase();
    if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2')) {
      // Room capacity is 8
    } else if (lower.includes('board room') || lower.includes('boardroom')) {
      // Room capacity is 12
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
    if (lower.includes('collaborative learning room 2')) {
      return 'Computer lab with workstations';
    }
    if (lower.includes('board room') || lower.includes('boardroom')) {
      return 'Conference room for group meetings';
    }
    return 'Comfortable study space for individual or small group use.';
  };

  const getFacilityImageByName = (name?: string) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    
    // For now, we'll use your uploaded facility image for all rooms
    // You can add more specific images later for different room types
    if (lower.includes('collaborative learning') || 
        lower.includes('collaraborative learning') || // Handle the typo in facility names
        lower.includes('board room') || 
        lower.includes('boardroom')) {
      return '/images/facility-overview.jpg';
    }
    
    return null; // Fallback to default placeholder
  };

  const getBookingStatus = (booking: any): { label: string; badgeClass: string } => {
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    if (booking.status === "pending") return { label: "Pending Request", badgeClass: "pending" };
    if (booking.status === "denied") return { label: "Denied", badgeClass: "denied" };
    if (booking.status === "cancelled") return { label: "Cancelled", badgeClass: "cancelled" };
    if (booking.status === "approved") {
      if (now < start) return { label: "Pending", badgeClass: "pending" };
      if (now >= start && now <= end) return { label: "Active", badgeClass: "active" };
      if (now > end) return { label: "Done", badgeClass: "inactive" };
    }
    return { label: booking.status, badgeClass: booking.status };
  };

  const canEditBooking = (booking: any): boolean => {
    const status = getBookingStatus(booking).label;
    return status === 'Pending Request';
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

  const renderContent = () => {
    switch (selectedView) {
      case "my-bookings":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">My Bookings</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage your facility reservations</p>
                </div>
                <button
                  onClick={() => openBookingModal()}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
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
                      'Pending': 'bg-pink-50 text-pink-700 border-pink-100',
                      'Pending Request': 'bg-pink-50 text-pink-700 border-pink-100',
                      'Done': 'bg-gray-100 text-gray-800 border-gray-200',
                      'Denied': 'bg-red-100 text-red-800 border-red-200',
                      'Cancelled': 'bg-gray-50 text-gray-700 border-gray-100'
                    };

                    return (
                      <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <div className="bg-pink-100 p-3 rounded-lg">
                              <Calendar className="h-6 w-6 text-pink-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{getFacilityDisplay(booking.facilityId)}</h4>
                              <p className="text-sm text-gray-600">Room #{booking.facilityId}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-0.5 rounded-full text-sm font-medium border ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            <span className={`w-2 h-2 rounded-full mr-2 inline-block ${
                              status.label === 'Active' ? 'bg-green-500' :
                              status.label === 'Pending' || status.label === 'Pending Request' ? 'bg-yellow-500' :
                              status.label === 'Done' ? 'bg-gray-500' :
                              status.label === 'Denied' ? 'bg-red-500' :
                              status.label === 'Cancelled' ? 'bg-orange-500' : 'bg-gray-500'
                            }`} />
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Date & Time</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
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

                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Purpose</p>
                              {(booking.purpose || '').length > 30 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <Popover>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-help">
                                            <Eye className="h-4 w-4 text-pink-600 flex-shrink-0" />
                                            <p className="text-gray-900 text-sm">
                                              <span className="font-medium">Purpose</span>
                                            </p>
                                          </div>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                        </div>
                                        <div className="p-3">
                                          <p className="text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose || 'No purpose specified'}</p>
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
                                <p className="text-gray-900 text-sm">
                                  <span className="font-medium">Purpose:&nbsp;</span>
                                  <span className="font-normal">{booking.purpose || 'No purpose specified'}</span>
                                </p>
                              )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            {/* Equipment / Needs box as its own column */}
                              {booking.equipment && (function() {
                                const eq = booking.equipment;
                                const id = String(booking.id || Math.random());
                                const isOpen = !!openOthers[id];
                                if ((!Array.isArray(eq.items) || eq.items.length === 0) && !(eq.others && String(eq.others).trim().length > 0)) return null;
                                return (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs font-medium text-gray-700">Equipment or Needs</div>
                                      {eq.others && String(eq.others).trim().length > 0 && (
                                        <Popover open={isOpen} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                  <button
                                                    onClick={() => setOpenOthers(prev => ({ ...prev, [id]: !prev[id] }))}
                                                    className="flex items-center gap-1 text-[11px] text-gray-700"
                                                    aria-expanded={isOpen}
                                                  >
                                                    <Eye className="h-3 w-3 text-pink-600" />
                                                    <span className="text-gray-700">View other</span>
                                                  </button>
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
                                            </Tooltip>
                                          </TooltipProvider>

                                          <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-sm text-gray-900 leading-5 break-words font-normal">{String(eq.others).trim()}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                      {/* Render pre-made items as chips */}
                                      {Array.isArray(eq.items) && eq.items.length > 0 && eq.items.map((it: string, idx: number) => (
                                        <span key={`eq-${id}-${idx}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">{it}</span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Group Size</p>
                            <p className="font-semibold text-gray-900">
                              <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                                <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4" /></svg>
                                <span>{booking.participants != null ? booking.participants : 1}</span>
                                <span className="text-xs text-gray-600">participant{booking.participants != null && booking.participants > 1 ? 's' : ''}</span>
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              {(() => {
                                const facility = facilities.find(f => f.id === booking.facilityId);
                                if (!facility) return '';
                                // Use actual facility capacity from database
                                return `Max capacity: ${facility.capacity || 8}`;
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            Booked on {new Date(booking.createdAt || booking.startTime).toLocaleDateString()}
                            {/* Arrival-confirmation: if an arrivalConfirmationDeadline exists and arrival not yet confirmed, show confirmation countdown in Active Booking; otherwise show time remaining */}
                            {getBookingStatus(booking).label === 'Active' && booking.userId === user?.id && (
                              <div className="text-xs text-gray-500 mt-1">
                                {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                                  <div>
                                    Confirmation required in: <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => {
                                      // Refresh bookings so expired arrivals are re-evaluated
                                      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
                                      toast({ title: 'Arrival Confirmation Expired', description: `Your booking for ${getFacilityDisplay(booking.facilityId)} was not confirmed and may be cancelled.` });
                                    }} />
                                  </div>
                                ) : (
                                  <div>
                                    Time remaining: <Countdown expiry={booking.endTime} onExpire={() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
                                      toast({ title: 'Booking Ended', description: `Your booking for ${getFacilityDisplay(booking.facilityId)} has ended.` });
                                    }} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditBooking(booking) && (
                              <button
                                onClick={() => {
                                  // Edit clicked for booking - handled by opening modal
                                  setEditingBooking(booking);
                                  setShowEditBookingModal(true);
                                }}
                                className="px-3 py-1.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors duration-200"
                              >
                                Edit
                              </button>
                            )}
                            {/* Single action button: Cancel (or End when active) */}
                            {canCancelBooking(booking) && booking.userId === user?.id && (
                              <button
                                onClick={() => handleCancelBooking(booking)}
                                disabled={cancelBookingMutation.status === 'pending'}
                                className={`px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors duration-200 ${cancelBookingMutation.status === 'pending' ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}
                              >
                                {getBookingStatus(booking).label === 'Active' ? 'End Booking' : 'Cancel'}
                              </button>
                            )}
                            {!canEditBooking(booking) && !canCancelBooking(booking) && !(booking.userId === user?.id && getBookingStatus(booking).label === 'Active') && (
                              <span className="text-gray-400 text-sm">No actions available</span>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
                <p className="text-sm text-gray-600 mt-1">View booking history and notification logs</p>
              </div>
              <div className="flex items-center gap-2">
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
                      <div key={booking.id} className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start">
                        {/* Column 1: facility, date/time, participants, purpose */}
                        <div className="col-span-1 min-w-0">
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

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {items.map((it: string, idx: number) => (
                              <span key={`act-eq-${id}-${idx}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">{it}</span>
                            ))}
                          </div>
                        </div>

                        {/* Column 3: empty for future use */}
                        <div className="col-span-1" />

                        {/* Column 4: status badge (right aligned) + view button */}
                        <div className="col-span-1 flex items-start justify-end">
                          {(() => {
                            const status = getBookingStatus(booking);
                            const statusColors = {
                              'Active': 'bg-pink-100 text-pink-800',
                              'Pending': 'bg-pink-50 text-pink-700',
                              'Pending Request': 'bg-pink-50 text-pink-700',
                              'Done': 'bg-gray-100 text-gray-800',
                              'Denied': 'bg-red-100 text-red-800'
                            };
                            return (
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
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
                  notificationsData.slice(activityNotificationsPage * notificationsPerPage, (activityNotificationsPage + 1) * notificationsPerPage).map((n: any) => (
                    <div key={n.id} className={`p-3 rounded-md bg-white border ${n.isRead ? 'opacity-70' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{n.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{n.message}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                          {!n.isRead && (
                            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded" onClick={() => markNotificationReadMutation.mutate(n.id)}>Mark Read</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {/* Pagination footer for Activity Logs */}
              <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                {activityTab === 'booking' ? (
                  // Compact summary for Recent Booking booking history (no pagination)
                  <p className="text-sm text-gray-600">Showing {Math.min(bookingsPerPage, userBookings.length)} of {userBookings.length} bookings</p>
                ) : (
                  <p className="text-sm text-gray-600">Showing {activityNotificationsPage * notificationsPerPage + 1} to {Math.min((activityNotificationsPage + 1) * notificationsPerPage, notificationsData.length)} of {notificationsData.length} notifications</p>
                )}

                <div className="flex items-center gap-2">
                  {/* Hide Prev/Next for recent bookings compact view */}
                  {activityTab === 'booking' ? null : (
                    <>
                      <button onClick={() => setActivityNotificationsPage(p => Math.max(0, p - 1))} disabled={activityNotificationsPage === 0} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Prev</button>
                      <button onClick={() => setActivityNotificationsPage(p => ((p + 1) * notificationsPerPage < notificationsData.length ? p + 1 : p))} disabled={(activityNotificationsPage + 1) * notificationsPerPage >= notificationsData.length} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Next</button>
                    </>
                  )}
                </div>
              </div>
          </div>
        );

      case "available-rooms":
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Available Study Rooms</h2>
                  <p className="text-gray-600 mt-1">Browse and book available facilities</p>

                  {/* counts/legend removed as requested */}

                  {(isLibraryClosedNow() || facilities.some(f => getFacilityBookingStatus(f.id).status === 'closed')) && (
                    <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-100">
                      If you request a booking outside school hours, staff will review and confirm or reschedule it.
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openBookingModal()}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 shadow-sm"
                >
                  <Plus className="h-5 w-5" />
                  Book Room
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map((facility) => {
                  const bookingStatus = getFacilityBookingStatus(facility.id);
                  // Immediate availability for same-day booking
                  const isAvailableForBooking = facility.isActive && bookingStatus.status === "available";
                  // Allow users to submit booking requests even when school is closed; these will be reviewed
                  // by staff and are subject to approval and scheduling validation.
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

                              {/* End/Cancel button for bookings the user may cancel (matches server rules) */}
                              {bookingStatus.booking && bookingStatus.booking.userId === user?.id && canCancelBooking(bookingStatus.booking) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelBooking({
                                      id: bookingStatus.booking.id,
                                      facilityName: facility.name,
                                      startTime: bookingStatus.booking.startTime,
                                      endTime: bookingStatus.booking.endTime,
                                    });
                                  }}
                                  className="ml-3 inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded"
                                >
                                  End
                                </button>
                              )}
                            </div>
                          ) : null}
                        {(facility.imageUrl || getFacilityImageByName(facility.name)) ? (
                          <img
                            src={facility.imageUrl || getFacilityImageByName(facility.name)}
                            alt={facility.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              isAvailableForBooking ? 'group-hover:scale-105' : 'grayscale'
                            }`}
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList?.remove('hidden');
                            }}
                          />
                        ) : null}
                        {!(facility.imageUrl || getFacilityImageByName(facility.name)) && (
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
                            {facility.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatus.badgeClass}`}>
                            {bookingStatus.label}
                          </span>
                        </div>
                        
                        <p className={`text-sm leading-relaxed mb-1 flex-grow ${
                          isAvailableForBooking ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          {getFacilityDescriptionByName(facility.name)}
                        </p>

                        {/* Show booking details if facility is booked or scheduled */}
                        {bookingStatus.booking && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                     {bookingStatus.status === 'booked' ? 'Currently in use until:' :
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
                              <p className="text-xs text-gray-500 mt-1">
                                Room is currently occupied
                              </p>
                            )}
                            {bookingStatus.status === 'scheduled' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Next available: {new Date(bookingStatus.booking.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            )}
                            {bookingStatus.status === 'pending' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Waiting for admin approval
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
                                  If requested outside school hours, staff will review and confirm or reschedule your booking.
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
                              <p className="text-gray-600">The school is currently closed. Please return during normal operating hours (7:30 AM – 5:00 PM).</p>
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
            </div>
        );

      case "booking-settings":
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Booking Settings</h3>
              <p className="text-gray-600 mt-1">Manage your booking preferences and facility reservation settings</p>
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
                      <li>Bookings are generally available during school hours: 7:30 AM – 5:00 PM. Requests outside these hours will be reviewed by staff.</li>
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
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-pink-300 text-left group"
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
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-pink-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Pending Bookings</p>
                    <p className="text-3xl font-bold text-pink-600 mt-1">{stats.upcoming}</p>
                    <p className="text-xs text-gray-500 mt-1">Approved and scheduled</p>
                  </div>
                  <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                    <Clock className="h-6 w-6 text-pink-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("my-bookings")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-pink-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Booking Requests</p>
                    <p className="text-3xl font-bold text-pink-600 mt-1">{stats.pending}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                    <Calendar className="h-6 w-6 text-pink-600" />
                  </div>
                </div>
              </button>
            </div>

            {/* Quick actions removed (use sidebar / available rooms) */}

            {/* Available Rooms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">Available Rooms</h3>
                  {!isLibraryClosedNow() && (
                    <button
                      onClick={() => openBookingModal()}
                      className="inline-flex items-center gap-2 px-2 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      New Booking
                    </button>
                  )}
                  <div className="text-gray-600 text-sm mt-1">
                    {facilities.length === 0 ? (
                      "No facilities found"
                    ) : (() => {
                      const availableCount = facilities.filter(f => f.isActive && getFacilityBookingStatus(f.id).status === "available").length;

                      if (availableCount === facilities.length) {
                        return "All rooms are available for booking";
                      }

                      if (availableCount === 0) {
                        if (isLibraryClosedNow()) {
                          return (
                            <div>
                              <div>School is currently closed. You can still request a booking; school staff will review and confirm or reschedule it.</div>
                              <div className="mt-2">
                                <button onClick={() => openBookingModal()} className="inline-flex items-center px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm">Request Booking</button>
                              </div>
                            </div>
                          );
                        }
                        return "All rooms are currently booked or unavailable";
                      }

                      return `${availableCount} of ${facilities.length} rooms available for booking`;
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedView("available-rooms")}
                  className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200"
                >
                  View All →
                </button>
              </div>

              {facilities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm">No rooms are available at this time.</p>
                  <p className="text-gray-500 text-xs mt-1">Check back later or try a different time</p>
                </div>
              ) : (() => {
                const availableRooms = facilities.filter(f => 
                  f.isActive && getFacilityBookingStatus(f.id).status === "available"
                );
                
                if (availableRooms.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                        <Calendar className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-gray-600 text-sm">All rooms are currently booked</p>
                      <p className="text-gray-500 text-xs mt-1">Check back later when sessions end</p>
                    </div>
                  );
                }
                return null;
              })() ? null : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities
                    .slice(0, itemsPerPage)
                    .map((facility) => {
                    const bookingStatus = getFacilityBookingStatus(facility.id);
                    const isAvailableForBooking = facility.isActive && bookingStatus.status === "available";
                    
                    return (
                      <div key={facility.id} className={`bg-gray-50 rounded-lg p-4 transition-colors duration-200 group ${
                        isAvailableForBooking
                          ? 'hover:bg-gray-100 cursor-pointer' 
                          : 'opacity-60 cursor-not-allowed'
                      }`} onClick={() => isAvailableForBooking && openBookingModal(facility.id)}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg shadow-sm transition-shadow duration-200 ${
                            isAvailableForBooking
                              ? 'bg-white group-hover:shadow-md' 
                              : 'bg-gray-200'
                          }`}>
                            <MapPin className={`h-5 w-5 ${isAvailableForBooking ? 'text-gray-600' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              bookingStatus.status === 'available' ? 'bg-green-500' :
                              bookingStatus.status === 'booked' ? 'bg-red-500' :
                              bookingStatus.status === 'scheduled' ? 'bg-yellow-500' :
                              'bg-pink-500'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              bookingStatus.status === 'available' ? 'text-green-600' :
                              bookingStatus.status === 'booked' ? 'text-red-600' :
                              bookingStatus.status === 'scheduled' ? 'text-yellow-600' :
                              'text-pink-600'
                            }`}>
                              {bookingStatus.label}
                            </span>
                          </div>
                        </div>

                        <h4 className={`font-medium mb-1 ${isAvailableForBooking ? 'text-gray-900' : 'text-gray-500'}`}>
                          {facility.name}
                        </h4>
                        <p className={`text-sm mb-2 line-clamp-2 ${isAvailableForBooking ? 'text-gray-600' : 'text-gray-400'}`}>
                          {facility.isActive ? getFacilityDescriptionByName(facility.name) : (facility.unavailableReason || 'This room has been marked unavailable by staff.')}
                        </p>

                        {/* Show booking details for non-available rooms */}
                        {bookingStatus.booking && (
                          <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">
                              {bookingStatus.status === 'booked' ? 'Currently in use until:' :
                               bookingStatus.status === 'scheduled' ? 'Next booking:' : 
                               'Scheduled:'}
                            </p>
                            <p className="text-xs font-medium text-gray-900">
                              {bookingStatus.status === 'booked' ? (
                                new Date(bookingStatus.booking.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })
                              ) : bookingStatus.status === 'scheduled' ? (
                                `${new Date(bookingStatus.booking.startTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })} - ${new Date(bookingStatus.booking.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}`
                              ) : (
                                new Date(bookingStatus.booking.startTime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })
                              )}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1 text-xs flex-1 ${isAvailableForBooking ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Users className="h-3 w-3" />
                            <span>Capacity: {facility.capacity}</span>
                          </div>
                          {isAvailableForBooking ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingModal(facility.id);
                              }}
                              className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200 flex-shrink-0"
                            >
                              Book Now →
                            </button>
                          ) : (
                            <span className={`font-medium text-sm flex-shrink-0 ${
                              bookingStatus.status === 'booked' ? 'text-red-500' :
                              bookingStatus.status === 'scheduled' ? 'text-yellow-500' :
                              'text-pink-600'
                            }`}>
                              {bookingStatus.status === 'booked' ? 'In Use' :
                               bookingStatus.status === 'scheduled' ? 'Scheduled' :
                               bookingStatus.status === 'pending' ? 'Pending' : 'Unavailable'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                            <div key={booking.id} className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start">
                              <div className="col-span-1 min-w-0">
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

                              <div className="col-span-1" />

                              <div className="col-span-1 flex items-start justify-end">
                                {(() => {
                                  const status = getBookingStatus(booking);
                                  const statusColors = {
                                    'Active': 'bg-pink-100 text-pink-800',
                                    'Pending': 'bg-pink-50 text-pink-700',
                                    'Pending Request': 'bg-pink-50 text-pink-700',
                                    'Done': 'bg-gray-100 text-gray-800',
                                    'Denied': 'bg-red-100 text-red-800'
                                  };
                                  return (
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status.label as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
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
                    notificationsData.slice(0, itemsPerPage).map((n: any) => (
                      <div key={n.id} className={`p-3 rounded-md bg-white border ${n.isRead ? 'opacity-70' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm text-gray-900">{n.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{n.message}</div>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
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
      <Header />
      <div className="flex flex-1 relative">
  <div className="w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>
        <div className="flex-1 ml-64 container mx-auto px-6 py-8">{renderContent()}</div>
      </div>
      <BookingModal
        isOpen={showBookingModal}
        onClose={closeBookingModal}
        facilities={facilities}
        selectedFacilityId={selectedFacilityForBooking}
        initialStartTime={initialStartForBooking}
        initialEndTime={initialEndForBooking}
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
                  <p><span className="font-medium">Facility:</span> {bookingToCancel.facilityName}</p>
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
                </div>
              </div>
              
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
                >
                  Keep Booking
                </Button>
                <Button
                  onClick={confirmCancelBooking}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={cancelBookingMutation.status === 'pending'}
                >
                  {cancelBookingMutation.status === 'pending' ? (bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'Ending...' : 'Cancelling...') : (bookingToCancel && (new Date(bookingToCancel.startTime) <= new Date() && new Date() <= new Date(bookingToCancel.endTime)) ? 'Yes, End Booking' : 'Yes, Cancel Booking')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}