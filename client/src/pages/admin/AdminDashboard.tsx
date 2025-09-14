// src/components/AdminDashboard.tsx
// Fixed icon import naming conflict and syntax error

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BanUserModal from "@/components/modals/BanUserModal";
import UnavailableReasonModal from "@/components/modals/UnavailableReasonModal";
import UserEmailDisplay from "@/components/UserEmailDisplay";
import {
  Shield,
  Dock,
  Calendar,
  Users,
  BarChart3,
  Activity,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  TriangleAlert,
  Settings,
  UserCheck,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Monitor,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, FacilityBooking, SystemAlert, ActivityLog, Facility } from "../../../../shared/schema";
import { Button } from "@/components/ui/button";

// Small countdown component for admin UI
function Countdown({ expiry, onExpire }: { expiry: string | Date | undefined; onExpire?: () => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!expiry) return null;
  const exp = new Date(expiry);
  const diff = Math.max(0, Math.floor((exp.getTime() - now.getTime()) / 1000));
  useEffect(() => {
    if (diff <= 0 && onExpire) onExpire();
  }, [diff]);
  const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
  const seconds = (diff % 60).toString().padStart(2, '0');
  return <span className="font-mono text-xs text-gray-700">{minutes}:{seconds}</span>;
}

export default function AdminDashboard() {

  // Silence unused-import errors during iterative refactor: reference imports in no-op ways
  void useQuery; void useMutation; void useQueryClient;
  void useAuth; void useToast; void apiRequest;
  void Header; void Sidebar; void Tooltip; void TooltipContent; void TooltipProvider; void TooltipTrigger;
  // reference icon values (no-op to avoid unused imports)
  void Dock; void BarChart3; void XCircle; void Monitor; void Settings; void UserCheck; void UserX; void Clock; void ChevronLeft; void ChevronRight; void Eye;
  void UserEmailDisplay;
  // UI components are imported statically at the top to avoid runtime require in the browser
  // Forward-declared placeholders and helpers (populated later by queries)
  const [usersData, setUsersData] = useState<User[] | undefined>(undefined);
  const [activities, setActivities] = useState<ActivityLog[] | undefined>(undefined);
  const [facilities, setFacilities] = useState<Facility[] | undefined>(undefined);
  const [user, setUser] = useState<User | undefined>(undefined);
  // prevent unused variable errors for setters while refactoring
  void setUsersData; void setActivities; void setFacilities; void setUser;
  const usersMap = useMemo(() => new Map<string, User>(), []);

  function getUserEmail(id: any) {
    if (!id) return 'Unknown';
    return usersData?.find(u => u.id === id)?.email || String(id);
  }

  function getFacilityName(id: any) {
    if (!id) return 'Unknown Facility';
    return facilities?.find(f => f.id === id)?.name || String(id);
  }

  function formatDateTime(value: any) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch (_e) {
      return String(value);
    }
  }

  function formatActivityDetails(activity: any) {
    if (!activity) return '';
    return activity.details || activity.message || '';
  }

  // Render a colored badge for booking status
  function renderStatusBadge(statusRaw: any) {
    const s = String(statusRaw || '').toLowerCase();
    let label = (statusRaw && String(statusRaw)) || 'Unknown';
    let classes = 'text-sm font-medium px-2 py-1 rounded-full';

    if (s === 'pending' || s === 'request' || s === 'requested') {
      label = 'Pending';
      classes += ' bg-yellow-100 text-yellow-800';
    } else if (s === 'approved' || s === 'completed' || s === 'completed') {
      // treat approved that have ended as Completed elsewhere; styling for completed/approved
      label = (label === 'approved') ? 'Approved' : label;
      classes += ' bg-green-100 text-green-800';
    } else if (s === 'denied' || s === 'cancelled' || s === 'canceled') {
      label = (s === 'denied') ? 'Denied' : 'Cancelled';
      classes += ' bg-red-100 text-red-800';
    } else if (s === 'expired' || s === 'void') {
      label = 'Expired';
      classes += ' bg-gray-100 text-gray-800';
    } else {
      classes += ' bg-gray-100 text-gray-800';
    }

    return <span className={classes}>{label}</span>;
  }

  // Lightweight UI state and pagination placeholders
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [activeBookingsPage, setActiveBookingsPage] = useState(0);
  const [upcomingBookingsPage, setUpcomingBookingsPage] = useState(0);
  const [approvedAndDeniedBookingsPage, setApprovedAndDeniedBookingsPage] = useState(0);
  const [pendingBookingsDashboardPage, setPendingBookingsDashboardPage] = useState(0);
  const [pendingBookingsPage, setPendingBookingsPage] = useState(0);
  const [bookingUsersPage, setBookingUsersPage] = useState(0);
  const [bannedUsersPage, setBannedUsersPage] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [itemsPerPage] = useState(10);
  // booking tab state intentionally unused here (Tabs handles internal state)
  const [securityTab, setSecurityTab] = useState<string>('booking');
  // Controlled tab state for booking-management so we can programmatically switch tabs from the overview
  const [bookingTab, setBookingTab] = useState<string>('active');
  // Controlled inner-tabs for other sidebar sections so we can set defaults on navigation
  const [userTab, setUserTab] = useState<string>('booking-users');
  const [settingsTab, setSettingsTab] = useState<string>('facilities');
  // Preview tab for system alerts in the dashboard (booking | users)
  const [alertsPreviewTab, setAlertsPreviewTab] = useState<string>('booking');
  // silence unused setters where appropriate
  void setActiveBookingsPage; void setUpcomingBookingsPage; void setApprovedAndDeniedBookingsPage; void setPendingBookingsDashboardPage; void setPendingBookingsPage; void setBookingUsersPage; void setBannedUsersPage; void setActivitiesPage;
  // silence unused page variables to avoid tsc noUnusedLocals failures in iterative edits
  void activitiesPage; void approvedAndDeniedBookingsPage;
  void pendingBookingsDashboardPage;

  // Placeholder lists (populated from queries below)

  // Sidebar
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();

  // Build sidebar consistently using helper
  import("@/lib/sidebarItems").then(m => {
    // nothing - dynamic import keeps TS happy at runtime; actual usage below
    void m;
  });
  // We'll construct using the helper when rendering below
  let sidebarItems: any[] = [];
  try {
    // lazy require to avoid import ordering issues while editing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { makeSidebar } = require('@/lib/sidebarItems');
    const lastItem = (authUser && authUser.role === 'admin') ? { id: 'booking-dashboard', label: 'Booking Dashboard', icon: BarChart3 } : undefined;
    sidebarItems = makeSidebar(!!authUser && authUser.role === 'admin', lastItem, 'admin');
  } catch (e) {
    // fallback to previous static list - only include admin-only divider+link when the user is admin
    sidebarItems = [
      { id: 'overview', label: 'Dashboard', icon: BarChart3 },
      { id: 'booking-management', label: 'Facility Booking Management', icon: Calendar },
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'security', label: 'Admin System Alerts', icon: Shield },
      { id: 'admin-activity-logs', label: 'Admin Activity Logs', icon: BarChart3 },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ];
    if (authUser && authUser.role === 'admin') {
      sidebarItems.push({ id: 'divider-1', type: 'divider' });
      sidebarItems.push({ id: 'booking-dashboard', label: 'Booking Dashboard', icon: BarChart3 });
    }
  }

  const handleSidebarClick = (id: string) => {
    // When navigating to complex sections, ensure their inner tabs default to the requested sub-tab
    if (id === 'user-management') {
      setUserTab('booking-users');
    }
    if (id === 'security') {
      setSecurityTab('booking');
    }
    if (id === 'settings') {
      setSettingsTab('facilities');
    }
    // If admin chooses to create a new booking from the admin sidebar, send them to the booking page
    if (id === 'new-booking') {
      // Use hash '#new' so the Booking page can detect this and open the booking modal automatically
      setLocation('/booking#new');
      return;
    }
    if (id === 'booking-dashboard') {
      // navigate to the student booking dashboard route and request the dashboard view
      setLocation('/booking#dashboard');
      return;
    }
    // Special-case: when navigating to Admin Activity Logs, default to the Booking History tab
    if (id === 'admin-activity-logs') {
      setSettingsTab('history');
      setSelectedView('admin-activity-logs');
      return;
    }
    setSelectedView(id);
  };

  // Modal state
  const [isBanUserModalOpen, setIsBanUserModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [facilityForUnavailable, setFacilityForUnavailable] = useState<any | null>(null);

  // Wire real data using react-query and the project's apiRequest helper
  useAuth(); // ensure user is authenticated
  const { toast } = useToast();

  // Helper to determine if library is currently closed (same hours as booking validation)
  const isLibraryClosedNow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
    const libraryCloseTime = 17 * 60; // 5:00 PM
    return currentTimeInMinutes < libraryOpenTime || currentTimeInMinutes > libraryCloseTime;
  };
  const queryClient = useQueryClient();

  // Admin stats
  const isAdmin = !!authUser && authUser.role === 'admin';

  const { data: statsData = { pendingBookings: 0, systemAlerts: 0 }, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/stats');
      return res.json();
    },
    // Auto-refresh dashboard stats frequently so the admin overview stays up-to-date
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  // System alerts
  const { data: alertsData = [], isLoading: alertsLoading, isError: alertsError } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/alerts');
      return res.json();
    },
    // Poll alerts so system alerts appear in near-real time for admins
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  // Activity logs
  const { data: activitiesData = [], isLoading: activitiesLoading, isError: activitiesError } = useQuery({
    queryKey: ['/api/admin/activity'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/activity');
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  // All bookings (admin view)
  const { data: adminBookingsData = [], isLoading: allBookingsLoading, isError: allBookingsError } = useQuery({
    queryKey: ['/api/admin/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/bookings');
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  // Pending bookings (for booking requests tab)
  const { data: pendingBookingsData = [], isLoading: pendingBookingsLoading, isError: pendingBookingsError } = useQuery({
    queryKey: ['/api/bookings/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings/pending');
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  // Facilities
  const { data: facilitiesData = [], isLoading: facilitiesLoading, isError: facilitiesError } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/facilities');
      return res.json();
    },
  });

  // Admin users
  const { data: usersDataQ = [], isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return res.json();
    },
  });

  // Current authenticated user (for admin email fallbacks)
  const { data: currentUserData } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/user');
      return res.json();
    },
    retry: false,
  });

  // Map query results into the local state used by helper functions
  useEffect(() => { if (Array.isArray(usersDataQ)) setUsersData(usersDataQ); }, [usersDataQ, setUsersData]);
  useEffect(() => { if (Array.isArray(activitiesData)) setActivities(activitiesData); }, [activitiesData, setActivities]);
  useEffect(() => { if (Array.isArray(facilitiesData)) setFacilities(facilitiesData); }, [facilitiesData, setFacilities]);
  useEffect(() => { if (currentUserData) setUser(currentUserData); }, [currentUserData, setUser]);

  // Derived lists used in the UI
  const allBookings: FacilityBooking[] = Array.isArray(adminBookingsData) ? adminBookingsData : [];
  const activeBookings: FacilityBooking[] = allBookings.filter(b => b.status === 'approved' && new Date(b.startTime) <= new Date() && new Date(b.endTime) >= new Date());
  const upcomingBookings: FacilityBooking[] = allBookings.filter(b => b.status === 'approved' && new Date(b.startTime) > new Date());
  const recentBookings: FacilityBooking[] = allBookings
    .filter(b => {
      // include denied bookings; include approved bookings only if they have ended
      if (b.status === 'denied') return true;
      if (b.status === 'approved') {
        try {
          return new Date(b.endTime) < new Date();
        } catch (_e) {
          return false;
        }
      }
      return false;
    })
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingBookings: FacilityBooking[] = Array.isArray(pendingBookingsData) ? pendingBookingsData : [];

  // Mutations
  const approveBookingMutation = useMutation({
    mutationFn: async ({ bookingId, adminResponse }: any) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/approve`, { adminResponse });
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
    },
  });

  const denyBookingMutation = useMutation({
    mutationFn: async ({ bookingId, adminResponse }: any) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/deny`, { adminResponse });
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
    },
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: async ({ bookingId }: any) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/confirm-arrival`);
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  // Reference confirmArrivalMutation to avoid 'declared but its value is never read' during iterative edits
  void confirmArrivalMutation;

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason, duration, customDate }: any) => {
      // duration is required by the server (permanent | 7days | 30days | custom)
      const payload: any = { reason, duration };
      if (duration === 'custom' && customDate) payload.customDate = customDate;

      const res = await apiRequest('POST', `/api/admin/users/${userId}/ban`, payload);
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async ({ userId }: any) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/unban`);
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const toggleFacilityAvailabilityMutation = useMutation({
    mutationFn: async ({ facilityId, available, reason }: any) => {
      // The server expects `isActive` boolean in the payload. Include optional reason when disabling.
      const payload: any = { isActive: available };
      if (!available && reason) payload.reason = reason;
      const res = await apiRequest('PUT', `/api/admin/facilities/${facilityId}/availability`, payload);
      return res.json?.();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: string) => apiRequest('POST', `/api/admin/alerts/${alertId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
  });

  const getBookingUserStatus = (id: any) => {
    return allBookings.some(b => b.userId === id && (b.status === 'approved' || b.status === 'pending'));
  };
  // Map query results to local aliases used by the UI
  const alerts: SystemAlert[] = Array.isArray(alertsData) ? alertsData : [];
  const stats: any = statsData || { pendingBookings: 0, systemAlerts: 0 };
  // silence unused query flags and helpers
  void statsError; void alertsLoading; void alertsError; void activitiesLoading; void activitiesError; void allBookingsLoading; void allBookingsError; void pendingBookingsLoading; void pendingBookingsError; void usersLoading; void usersError; void facilitiesLoading; void facilitiesError; void markAlertReadMutation;

  // Derived booking flags used across the UI
  const bookingsLoading = !!(allBookingsLoading || pendingBookingsLoading);
  const bookingsError = !!(allBookingsError || pendingBookingsError);

  // Helper to toggle facility availability using the mutation
  const toggleFacilityAvailability = async (facility: any | number, available: boolean) => {
    // Accept either facility object or facility id. We want the object to build a prefilled reason.
    let facilityObj: any | undefined = undefined;
    if (typeof facility === 'object') facilityObj = facility;
    else {
      // try to resolve from facilities list
      facilityObj = facilities?.find((f: any) => f.id === facility);
    }

    // If making unavailable, prompt for a reason so it can be shown to users. Prefill with a sensible default.
    let reason: string | undefined = undefined;
    if (!available) {
      // Do not allow making unavailable during open library hours — avoid booking conflicts
      if (!isLibraryClosedNow()) {
        toast({
          title: 'Cannot set unavailable now',
          description: 'Facilities can only be marked unavailable when the library is closed, to avoid booking conflicts overall. This action will only work if the library is closed.',
          variant: 'destructive',
        });
        return;
      }

      // open unavailable reason modal instead of prompt
      setFacilityForUnavailable(facilityObj ?? { id: facility });
      setIsUnavailableModalOpen(true);
      return;
    }

    const facilityId = facilityObj?.id ?? facility;
    toggleFacilityAvailabilityMutation.mutate({ facilityId, available, reason });
  };

  // Icon aliases used in this file
  const AlertTriangle = TriangleAlert;
  const UserIcon = Users;

  const formatAlertMessage = (message: string | null): string => {
    if (!message) return '';
    
    // Handle session ID replacements for alerts
    const uuidRegex = /Session ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
    const match = message.match(uuidRegex);

    // Session-specific alert handling removed; provide a generic fallback for session messages
    if (match || message.includes('The computer session for this user was automatically logged out due to inactivity')) {
      return message.replace('this user', 'a user');
    }

    // Handle user unbanned messages with UUID
    if (message.includes('has been unbanned by admin') && message.includes('-')) {
      const userIdMatch = message.match(/User ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) has been unbanned/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const userEmail = getUserEmail(userId);
        return message.replace(`User ${userId}`, `User ${userEmail}`);
      }
    }

    // Handle "User [UUID] has been unbanned by admin and account access restored" pattern
    if (message.includes('has been unbanned by admin and account access restored')) {
      // First try to match UUID pattern
      const userIdMatch = message.match(/User ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) has been unbanned/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const userEmail = getUserEmail(userId);
        
        // Try to find the corresponding activity log to get the actual admin email
        const relatedActivity = activities?.find(activity => 
          activity.action === "User Unbanned" && 
          activity.details?.includes(userId)
        );
        
        let adminEmail = 'admin';
        if (relatedActivity) {
          // First try to extract admin email from "by [email]" pattern
          const adminEmailMatch = relatedActivity.details?.match(/by ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (adminEmailMatch) {
            adminEmail = adminEmailMatch[1];
          } else {
            // Fallback to admin ID lookup
            const adminIdMatch = relatedActivity.details?.match(/Admin ([a-zA-Z0-9-]+) unbanned user/);
            if (adminIdMatch) {
              const adminId = adminIdMatch[1];
              const adminUser = usersMap.get(adminId);
              adminEmail = adminUser?.email || adminId;
            }
          }
        }
        
        return `User ${userEmail} has been unbanned by ${adminEmail} and account access restored.`;
      }
      
      // Handle email-based messages (no UUID) - extract user email from message
      const emailMatch = message.match(/User ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}) has been unbanned/);
      if (emailMatch) {
        const userEmail = emailMatch[1];
        
        // Find the user by email to get their ID
        const unbannedUser = usersData?.find(u => u.email === userEmail);
        const userId = unbannedUser?.id;
        
        // Try to find the corresponding activity log to get the actual admin email
        const relatedActivity = activities?.find(activity => 
          activity.action === "User Unbanned" && 
          (userId ? activity.details?.includes(userId) : 
           Math.abs(new Date(activity.createdAt).getTime() - Date.now()) < 60000) // Within last minute as fallback
        );
        
        let adminEmail = user?.email || 'admin';
        if (relatedActivity) {
          // First try to extract admin email from "by [email]" pattern
          const adminEmailMatch = relatedActivity.details?.match(/by ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (adminEmailMatch) {
            adminEmail = adminEmailMatch[1];
          } else {
            // Fallback to admin ID lookup
            const adminIdMatch = relatedActivity.details?.match(/Admin ([a-zA-Z0-9-]+) unbanned user/);
            if (adminIdMatch) {
              const adminId = adminIdMatch[1];
              const adminUser = usersMap.get(adminId);
              adminEmail = adminUser?.email || adminId;
            }
          }
        }
        
        return `User ${userEmail} has been unbanned by ${adminEmail} and account access restored.`;
      }
      
      // Fallback for generic case
      const relatedActivity = activities?.find(activity => 
        activity.action === "User Unbanned" && 
        Math.abs(new Date(activity.createdAt).getTime() - Date.now()) < 60000 // Within last minute
      );
      
      let adminEmail = user?.email || 'admin';
      if (relatedActivity) {
        // First try to extract admin email from "by [email]" pattern
        const adminEmailMatch = relatedActivity.details?.match(/by ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (adminEmailMatch) {
          adminEmail = adminEmailMatch[1];
        } else {
          // Fallback to admin ID lookup
          const adminIdMatch = relatedActivity.details?.match(/Admin ([a-zA-Z0-9-]+) unbanned user/);
          if (adminIdMatch) {
            const adminId = adminIdMatch[1];
            const adminUser = usersMap.get(adminId);
            adminEmail = adminUser?.email || adminId;
          }
        }
      }
      
      return message.replace('by admin', `by ${adminEmail}`);
    }

    // Handle user management messages - fix the format for unbanned users
    if (message.includes('unbanned user') && message.includes('by ')) {
      // Extract the admin email at the end
      const byMatch = message.match(/by ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (byMatch) {
        const adminEmail = byMatch[1];
        
        // Try to extract user ID or email being unbanned - multiple patterns
        let userEmail = 'a user';
        
        // Pattern 1: "unbanned user (ID removed)"
        const userIdMatch1 = message.match(/unbanned user \(ID removed\)/);
        if (userIdMatch1) {
          // Try to find the actual user ID in the original message
          const fullUserIdMatch = message.match(/User ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
          if (fullUserIdMatch) {
            const userId = fullUserIdMatch[1];
            userEmail = getUserEmail(userId);
          }
        }
        
        // Pattern 2: "unbanned user [userId]"
        const userIdMatch2 = message.match(/unbanned user ([a-zA-Z0-9-]+) by/);
        if (userIdMatch2) {
          const userId = userIdMatch2[1];
          userEmail = getUserEmail(userId);
        }
        
        return `Admin ${adminEmail} unbanned user ${userEmail}`;
      }
    }

    // Handle banned user messages
    if (message.includes('banned user') && message.includes('by admin')) {
      const userIdMatch = message.match(/User ([a-zA-Z0-9-]+) has been banned/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const userEmail = getUserEmail(userId);
        return message.replace(`User ${userId}`, `User ${userEmail}`);
      }
    }

    // General cleanup - remove session IDs and other technical details
    return message
      .replace(/\(Session ID: [0-9a-f-]+\)/g, '')
      .replace(/\(ID: [0-9a-f-]+\)/g, '')
      .replace(/\(ID removed\)/g, '')
      .trim();
  };

  const handleUnavailableConfirm = (reason?: string) => {
    if (!facilityForUnavailable) return;
    toggleFacilityAvailabilityMutation.mutate({ facilityId: facilityForUnavailable.id, available: false, reason });
    setFacilityForUnavailable(null);
    setIsUnavailableModalOpen(false);
  };

  // Small presentational helpers to standardize card headers and empty states
  const CardHeader = ({ title, subtitle, badges }: { title: string; subtitle?: string; badges?: Array<{ text: string; className?: string }> }) => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {badges?.map((b, i) => (
          <div key={i} className={`${b.className || 'bg-gray-100 text-gray-800'} px-3 py-1 rounded-full text-sm font-medium`}>
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );

  const EmptyState = ({ Icon, message }: { Icon: any; message: string }) => (
    <div className="text-center py-8">
      <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );

  const OverviewTile = ({ title, count, subtitle, onClick, icon }: { title: string; count: number | string; subtitle?: string; onClick?: () => void; icon?: React.ReactNode }) => (
    <button onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 text-left group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-800">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{count}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-gray-100 p-3 rounded-full group-hover:bg-gray-200 transition-colors duration-200">
          {icon}
        </div>
      </div>
    </button>
  );

  const renderContent = () => {
    const errorState = {
      stats: statsError,
      bookings: bookingsError,
      alerts: alertsError,
      activities: activitiesError,
      allBookings: allBookingsError,
      usersData: usersError,
      facilities: facilitiesError,
    };

    const hasError = Object.values(errorState).some(Boolean);

    if (
      statsLoading ||
      bookingsLoading ||
      alertsLoading ||
      activitiesLoading ||
      allBookingsLoading ||
      usersLoading ||
      facilitiesLoading
    ) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading dashboard data...
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <TriangleAlert className="h-8 w-8 mb-2" />
          <h2 className="text-xl font-semibold">
            An error occurred while fetching data.
          </h2>
          <p className="text-sm text-center mt-2">
            **Your Current Role:** `{user?.role || "N/A"}`
          </p>
          <p className="text-sm text-center">
            The dashboard routes require the `admin` role. Please check your
            backend server logs or your Supabase user configuration.
          </p>
          <ul className="text-xs list-disc list-inside mt-4">
            {Object.entries(errorState)
              .filter(([_, isErr]) => isErr)
              .map(([key]) => (
                <li key={key}>Failed to load {key} data.</li>
              ))}
          </ul>
        </div>
      );
    }

    // Booking lists are derived above

    // Computer station and booking user status functions are defined above

    switch (selectedView) {
      /* ORZ / station UI removed (conservative cleanup) */

      case "booking-management":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Facility Booking Management</h2>
                  <p className="text-gray-600 mt-1">Monitor active bookings, pending requests, and booking history</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activeBookings?.length || 0} Active
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {upcomingBookings?.length || 0} Upcoming
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingBookings?.length || 0} Pending
                  </div>
                </div>
              </div>

              <Tabs value={bookingTab} onValueChange={(v) => setBookingTab(v)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active Bookings
                  </TabsTrigger>
                  <TabsTrigger value="pendingList" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Booking Requests
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Currently Active Facility Bookings</h3>
                      <span className="text-sm text-gray-600">{activeBookings?.length || 0} bookings</span>
                    </div>
                    
                    {activeBookings && activeBookings.length > 0 ? (
                      <div className="space-y-3">
                        {activeBookings
                          ?.slice(activeBookingsPage * itemsPerPage, (activeBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-green-100 p-2 rounded-lg">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3" />
                                              <span className="text-xs">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                                {/* removed: admin-facing pending-notice per request */}

                                {/* Arrival confirmation countdown and admin action: if arrivalConfirmationDeadline exists and not yet confirmed, show confirmation countdown and a Confirm button */}
                                {booking.status === 'approved' && (
                                  <div className="text-right text-xs text-gray-500 mt-1">
                                    {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                                      <div className="flex items-center justify-end gap-3">
                                        <div>Confirmation required in: <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); toast({ title: 'Arrival Confirmation Expired', description: `Arrival confirmation window expired for booking ${booking.id}.` }); }} /></div>
                                        <div>
                                          <Button
                                            onClick={() => confirmArrivalMutation.mutate({ bookingId: booking.id })}
                                            variant="outline"
                                            size="sm"
                                            aria-label={`Confirm arrival for booking ${booking.id}`}
                                            className="inline-flex items-center gap-2"
                                          >
                                            Confirm Arrival
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>Time remaining: <Countdown expiry={booking.endTime} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); toast({ title: 'Booking Ended', description: `Booking for ${getUserEmail(booking.userId)} has ended.` }); }} /></div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for active bookings */}
                        {activeBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {activeBookingsPage * itemsPerPage + 1} to {Math.min((activeBookingsPage + 1) * itemsPerPage, activeBookings.length)} of {activeBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={activeBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {activeBookingsPage + 1} of {Math.ceil(activeBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setActiveBookingsPage(prev => (activeBookings && (prev + 1) * itemsPerPage < activeBookings.length ? prev + 1 : prev))}
                                disabled={!activeBookings || (activeBookingsPage + 1) * itemsPerPage >= activeBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No active facility bookings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="pendingList" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Pending Facility Bookings</h3>
                      <span className="text-sm text-gray-600">{upcomingBookings?.length || 0} bookings</span>
                    </div>
                    
                    {upcomingBookings && upcomingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingBookings
                          ?.slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-pink-200 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-pink-100 p-2 rounded-lg">
                                  <Clock className="h-5 w-5 text-pink-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-medium text-gray-500">Participants:</span>
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Starts</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                  Scheduled
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for pending-list (upcoming) bookings */}
                        {upcomingBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                              Showing {upcomingBookingsPage * itemsPerPage + 1} to {Math.min((upcomingBookingsPage + 1) * itemsPerPage, upcomingBookings.length)} of {upcomingBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setUpcomingBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={upcomingBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {upcomingBookingsPage + 1} of {Math.ceil(upcomingBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setUpcomingBookingsPage(prev => (upcomingBookings && (prev + 1) * itemsPerPage < upcomingBookings.length ? prev + 1 : prev))}
                                disabled={!upcomingBookings || (upcomingBookingsPage + 1) * itemsPerPage >= upcomingBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No upcoming facility bookings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="requests" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Booking Requests</h3>
                      <span className="text-sm text-gray-600">{pendingBookings?.length || 0} requests</span>
                    </div>
                    
                    {pendingBookings && pendingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {pendingBookings
                          ?.slice(pendingBookingsPage * itemsPerPage, (pendingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-yellow-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-yellow-100 p-2 rounded-lg">
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Starts</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Request
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      approveBookingMutation.mutate({
                                        bookingId: booking.id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      denyBookingMutation.mutate({
                                        bookingId: booking.id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Deny
                                  </button>
                                </div>
                                {/* removed: admin-facing pending-notice per request */}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for booking requests */}
                        {pendingBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                              Showing {pendingBookingsPage * itemsPerPage + 1} to {Math.min((pendingBookingsPage + 1) * itemsPerPage, pendingBookings.length)} of {pendingBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPendingBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={pendingBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {pendingBookingsPage + 1} of {Math.ceil(pendingBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setPendingBookingsPage(prev => (pendingBookings && (prev + 1) * itemsPerPage < pendingBookings.length ? prev + 1 : prev))}
                                disabled={!pendingBookings || (pendingBookingsPage + 1) * itemsPerPage >= pendingBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Calendar className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No pending facility booking requests</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
              </Tabs>
            </div>
          </div>
        );
      case "user-management":
  const bookingUsers = usersData?.filter(user => getBookingUserStatus(user.id));
  const bannedUsers = usersData?.filter(user => user.status === "banned");

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                  <p className="text-gray-600 mt-1">Manage facility booking users and suspended accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bookingUsers?.length || 0} Booking Users
                  </div>
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bannedUsers?.length || 0} Suspended
                  </div>
                </div>
              </div>

              <Tabs value={userTab} onValueChange={(v: string) => setUserTab(v)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="booking-users" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Booking Users
                  </TabsTrigger>
                  <TabsTrigger value="banned-users" className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    Suspended
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="booking-users" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Facility Booking Users</h3>
                      <span className="text-sm text-gray-600">{bookingUsers?.length || 0} users</span>
                    </div>
                    
                    {bookingUsers && bookingUsers.length > 0 ? (
                      <div className="space-y-3">
                        {bookingUsers
                          ?.slice(bookingUsersPage * itemsPerPage, (bookingUsersPage + 1) * itemsPerPage)
                          .map((userItem: User) => {
                          const userBookings = activeBookings?.filter(booking => booking.userId === userItem.id);
                          return (
                            <div key={userItem.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <UserIcon className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{userItem.email}</h4>
                                    <p className="text-sm text-gray-600">
                                      Active facilities: {userBookings?.map(booking => getFacilityName(booking.facilityId)).join(', ') || 'None'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-medium text-gray-500">Role:</span>
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {userItem.role}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    userItem.status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {userItem.status}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setUserToBan(userItem);
                                      setIsBanUserModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                    Ban User
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Pagination for booking users */}
                        {bookingUsers.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {bookingUsersPage * itemsPerPage + 1} to {Math.min((bookingUsersPage + 1) * itemsPerPage, bookingUsers.length)} of {bookingUsers.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setBookingUsersPage(prev => Math.max(prev - 1, 0))}
                                disabled={bookingUsersPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {bookingUsersPage + 1} of {Math.ceil(bookingUsers.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setBookingUsersPage(prev => (bookingUsers && (prev + 1) * itemsPerPage < bookingUsers.length ? prev + 1 : prev))}
                                disabled={!bookingUsers || (bookingUsersPage + 1) * itemsPerPage >= bookingUsers.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No facility booking users found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ORZ Station Users UI removed */}

                <TabsContent value="banned-users" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Suspended Users</h3>
                      <span className="text-sm text-gray-600">{bannedUsers?.length || 0} users</span>
                    </div>
                    
                    {bannedUsers && bannedUsers.length > 0 ? (
                      <div className="space-y-3">
                        {bannedUsers
                          ?.slice(bannedUsersPage * itemsPerPage, (bannedUsersPage + 1) * itemsPerPage)
                          .map((userItem: User) => (
                          <div key={userItem.id} className="bg-white rounded-lg p-4 border border-red-200 hover:border-red-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-red-100 p-2 rounded-lg">
                                  <UserX className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{userItem.email}</h4>
                                  <p className="text-sm text-gray-600">Account suspended</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Role:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {userItem.role}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {userItem.status}
                                </span>
                                <button
                                  onClick={() => unbanUserMutation.mutate({ userId: userItem.id })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Unban User
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for banned users */}
                        {bannedUsers.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {bannedUsersPage * itemsPerPage + 1} to {Math.min((bannedUsersPage + 1) * itemsPerPage, bannedUsers.length)} of {bannedUsers.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setBannedUsersPage(prev => Math.max(prev - 1, 0))}
                                disabled={bannedUsersPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {bannedUsersPage + 1} of {Math.ceil(bannedUsers.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setBannedUsersPage(prev => (bannedUsers && (prev + 1) * itemsPerPage < bannedUsers.length ? prev + 1 : prev))}
                                disabled={!bannedUsers || (bannedUsersPage + 1) * itemsPerPage >= bannedUsers.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <UserX className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No suspended users</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );
        break;

      case "security": // System alerts
        // Compute badge counts based on selected inner security tab (booking | users)
        const computeSecurityCounts = (tab: string) => {
          if (!alerts) return { unread: 0, total: 0 };

          // Helper filters
          const isComputerAlert = (a: SystemAlert) => {
            const t = (a.title || '').toLowerCase();
            const m = (a.message || '').toLowerCase();
            return t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
          };

          if (tab === 'users') {
            const userAlerts = alerts.filter(a => {
              const t = (a.title || '').toLowerCase();
              const m = (a.message || '').toLowerCase();
              return t.includes('user banned') || t.includes('user unbanned') || t.includes('suspension') || m.includes('banned') || m.includes('unbanned');
            });
            const unread = userAlerts.filter(a => !a.isRead).length || 0;
            return { unread, total: userAlerts.length || 0 };
          }

          // default to booking alerts
          const bookingAlerts = alerts.filter(a => {
            if (a.type === 'booking') return true;
            const t = (a.title || '').toLowerCase();
            const m = (a.message || '').toLowerCase();
            return t.includes('booking cancelled') || t.includes('booking canceled') || t.includes('booking') || m.includes('booking');
          }).filter(a => !isComputerAlert(a));

          const unread = bookingAlerts.filter(a => !a.isRead).length || 0;
          return { unread, total: bookingAlerts.length || 0 };
        };

        const { unread: securityUnread, total: securityTotal } = computeSecurityCounts(securityTab);

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">System Alerts</h2>
                  <p className="text-gray-600 mt-1">Monitor system security alerts and notifications</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    {securityUnread || 0} Unread
                  </div>
                  <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                    {securityTotal || 0} Total
                  </div>
                </div>
              </div>

              <Tabs value={securityTab} onValueChange={(v: string) => setSecurityTab(v)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="booking" onClick={() => setSecurityTab('booking')} className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Booking Alerts
                  </TabsTrigger>
                  <TabsTrigger value="users" onClick={() => setSecurityTab('users')} className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    User Management
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="booking" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Booking System Alerts</h3>
                      <span className="text-sm text-gray-600">
                        {alerts?.filter(a => {
                          if (a.type === 'booking') return true;
                          const t = (a.title || '').toLowerCase();
                          return t.includes('booking cancelled') || t.includes('booking canceled');
                        }).length || 0} alerts
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {alerts?.filter(a => {
                          if (a.type === 'booking') return true;
                          const t = (a.title || '').toLowerCase();
                          return t.includes('booking cancelled') || t.includes('booking canceled');
                        })
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((alert: SystemAlert) => {
                          const isHighPriority = alert.severity === 'critical' || alert.severity === 'high';
                          return (
                            <div key={alert.id} className={`bg-white rounded-lg p-4 border transition-colors duration-200 ${
                              isHighPriority ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-gray-300'
                            } ${alert.isRead ? 'opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                  isHighPriority ? 'bg-red-100' : 'bg-orange-100'
                                }`}>
                                  <AlertTriangle className={`h-5 w-5 ${
                                    isHighPriority ? 'text-red-600' : 'text-orange-600'
                                  }`} />
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {alert.isRead ? `READ: ${alert.message}` : alert.message}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <span className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</span>
                                      {alert.isRead ? (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          Read
                                        </span>
                                      ) : (
                                        <button
                                          className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                          onClick={async () => {
                                            try {
                                              await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                            } catch (e) {}
                                          }}
                                        >
                                          Mark as Read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {(!alerts || alerts.filter(a => {
                      if (a.type === 'booking') return true;
                      const t = (a.title || '').toLowerCase();
                      return t.includes('booking cancelled') || t.includes('booking canceled');
                    }).length === 0) && (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No booking system alerts</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="users" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">User Management Activities</h3>
                      <span className="text-sm text-gray-600">
                        {alerts?.filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          return t.includes('user banned') || t.includes('user unbanned') || 
                                 t.includes('suspension') || m.includes('banned') || m.includes('unbanned');
                        }).length || 0} activities
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {alerts?.filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          return t.includes('user banned') || t.includes('user unbanned') || 
                                 t.includes('suspension') || m.includes('banned') || m.includes('unbanned');
                        })
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((alert: SystemAlert) => {
                          const formattedMessage = formatAlertMessage(alert.message);
                          const isUnbanActivity = (alert.title || '').toLowerCase().includes('unbanned') || 
                                                (alert.message || '').toLowerCase().includes('unbanned');
                          const isBanActivity = (alert.title || '').toLowerCase().includes('banned') && !isUnbanActivity;
                          
                          return (
                            <div key={alert.id} className={`bg-white rounded-lg p-4 border transition-colors duration-200 ${
                              isBanActivity ? 'border-red-200 hover:border-red-300' : 
                              isUnbanActivity ? 'border-green-200 hover:border-green-300' : 
                              'border-gray-200 hover:border-gray-300'
                            } ${alert.isRead ? 'opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                  isBanActivity ? 'bg-red-100' : 
                                  isUnbanActivity ? 'bg-green-100' : 
                                  'bg-blue-100'
                                }`}>
                                  {isBanActivity ? (
                                    <UserX className="h-5 w-5 text-red-600" />
                                  ) : isUnbanActivity ? (
                                    <UserCheck className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <UserIcon className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{formattedMessage}</p>
                                      {isUnbanActivity && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <UserCheck className="h-3 w-3" />
                                          User Restored
                                        </div>
                                      )}
                                      {isBanActivity && (
                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <UserX className="h-3 w-3" />
                                          User Suspended
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <span className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</span>
                                      {alert.isRead ? (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          Read
                                        </span>
                                      ) : (
                                        <button
                                          className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                          onClick={async () => {
                                            try {
                                              await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                            } catch (e) {}
                                          }}
                                        >
                                          Mark as Read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {(!alerts || alerts.filter(a => {
                      const t = (a.title || '').toLowerCase();
                      const m = (a.message || '').toLowerCase();
                      return t.includes('user banned') || t.includes('user unbanned') || 
                             t.includes('suspension') || m.includes('banned') || m.includes('unbanned');
                    }).length === 0) && (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No user management activities</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );
        break;

      case "admin-activity-logs":
        // Prepare lists for the activity logs view
        const successfullyBooked = allBookings.filter(b => b.status === 'approved' && b.arrivalConfirmed && new Date(b.endTime) < new Date());
        const bookingHistory = allBookings.filter(b => ['denied', 'cancelled', 'expired', 'void'].includes(b.status) || (b.status === 'approved' && new Date(b.endTime) < new Date() && !b.arrivalConfirmed));
        const systemActivity = [ ...(activities || []), ...(alerts || []) ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Admin Activity Logs</h2>
                  <p className="text-gray-600 mt-1">Centralized booking and system logs</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">{successfullyBooked.length || 0} Successful</div>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">{bookingHistory.length || 0} History</div>
                  <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">{systemActivity.length || 0} System</div>
                </div>
              </div>

              <Tabs value={settingsTab} onValueChange={(v: string) => setSettingsTab(v)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="success" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Successfully Booked
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-yellow-600" />
                    Booking History
                  </TabsTrigger>
                  <TabsTrigger value="system" className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-600" />
                    System Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="success" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Successfully Booked</h3>
                    {successfullyBooked.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        {successfullyBooked.slice(0, itemsPerPage).map((b: FacilityBooking) => (
                          <div key={b.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{getUserEmail(b.userId)}</h4>
                                <p className="text-sm text-gray-600">{getFacilityName(b.facilityId)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-900">{formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}</p>
                                <p className="text-xs text-gray-500">Participants: {b.participants || 0}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState Icon={CheckCircle} message="No successful bookings found" />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
                    {bookingHistory.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        {bookingHistory.slice(0, itemsPerPage).map((b: FacilityBooking) => (
                          <div key={b.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{getUserEmail(b.userId)}</h4>
                                <p className="text-sm text-gray-600">{getFacilityName(b.facilityId)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-900">{formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}</p>
                                <p className="text-xs text-gray-500">Status: {b.status}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState Icon={BarChart3} message="No booking history records" />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="system" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900">System Activity</h3>
                    {systemActivity.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        {systemActivity.slice(0, itemsPerPage).map((a: any, idx: number) => (
                          <div key={a.id || idx} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{(a.title || a.action) ?? 'System Event'}</p>
                                <p className="text-xs text-gray-600">{a.message || a.details || ''}</p>
                              </div>
                              <div className="text-right text-xs text-gray-500">
                                {a.createdAt ? formatDateTime(a.createdAt) : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState Icon={Activity} message="No system activity found" />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                  <p className="text-gray-600 mt-1">Manage facility availability and system configurations</p>
                </div>
              </div>

              <Tabs value={settingsTab} onValueChange={(v: string) => setSettingsTab(v)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="facilities" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    Facility Management
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="facilities" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Facility Availability Control</h3>
                      <span className="text-sm text-gray-600">{facilities?.length || 0} facilities</span>
                    </div>
                    
                    {facilities && facilities.length > 0 ? (
                      <div className="space-y-3">
                        {facilities.map((facility: Facility) => (
                          <div key={facility.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${facility.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                                  <MapPin className={`h-5 w-5 ${facility.isActive ? 'text-green-600' : 'text-red-600'}`} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{facility.name}</h4>
                                  <p className="text-sm text-gray-600">Capacity: {facility.capacity} people</p>
                                  {facility.description && (
                                    <p className="text-sm text-gray-500 mt-1">{facility.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  facility.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {facility.isActive ? 'Available' : 'Unavailable'}
                                </span>
                                <button
                                  onClick={() => toggleFacilityAvailability(facility, !facility.isActive)}
                                  disabled={toggleFacilityAvailabilityMutation.isPending}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    facility.isActive
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                >
                                  {toggleFacilityAvailabilityMutation.isPending && toggleFacilityAvailabilityMutation.variables?.facilityId === facility.id
                                    ? 'Updating...'
                                    : facility.isActive ? 'Make Unavailable' : 'Make Available'
                                  }
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Settings className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No facilities found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );
        break;

      default: // Dashboard overview
        return (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6">
              <OverviewTile
                title="Active Bookings"
                count={activeBookings?.length || 0}
                subtitle="Currently in progress"
                onClick={() => { setSelectedView("booking-management"); setBookingTab('active'); }}
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
              />

              <OverviewTile
                title="Pending Bookings"
                count={upcomingBookings?.length || 0}
                subtitle="Awaiting approval"
                onClick={() => { setSelectedView("booking-management"); setBookingTab('pendingList'); }}
                icon={<Clock className="h-6 w-6 text-yellow-600" />}
              />

              <OverviewTile
                title="Booking Requests"
                count={pendingBookings?.length || 0}
                subtitle="Requests awaiting review"
                onClick={() => { setSelectedView("booking-management"); setBookingTab('requests'); }}
                icon={<Calendar className="h-6 w-6 text-purple-600" />}
              />

              <OverviewTile
                title="System Alerts"
                count={stats?.systemAlerts || 0}
                subtitle="Requiring attention"
                onClick={() => setSelectedView("security")}
                icon={<TriangleAlert className="h-6 w-6 text-orange-600" />}
              />
            </div>

            {/* Overview Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Pending Bookings</h3>
                    <p className="text-gray-600 text-sm mt-1">Facility booking requests requiring approval</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingBookings?.length || 0} pending
                  </div>
                </div>

                {pendingBookings && pendingBookings.length > 0 ? (
                  <div className="space-y-3">
                    {pendingBookings.slice(0,5).map((booking) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                            <p className="text-sm text-gray-600">{getUserEmail(booking.userId)} • {new Date(booking.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <div>
                            {renderStatusBadge(booking.status)}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={() => { setSelectedView('booking-management'); setBookingTab('pendingList'); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                ) : (
                  <EmptyState Icon={Calendar} message="No pending booking requests" />
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Recent Booking History</h3>
                    <p className="text-gray-600 text-sm mt-1">A quick preview of the most recent booking records</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {recentBookings?.length || 0} records
                  </div>
                </div>

                {recentBookings && recentBookings.length > 0 ? (
                  <div className="space-y-3">
                    {recentBookings.slice(0, 5).map((booking: FacilityBooking) => {
                      const actionTime = booking.createdAt || booking.startTime;
                      // Map status to a more user-friendly label
                      let statusLabel = String(booking.status || '').toLowerCase();
                      if (statusLabel === 'approved') {
                        // If approved and ended, show Completed
                        try {
                          if (new Date(booking.endTime) < new Date()) statusLabel = 'Completed';
                          else statusLabel = 'Approved';
                        } catch (e) {
                          statusLabel = 'Approved';
                        }
                      } else if (statusLabel === 'denied') statusLabel = 'Denied';
                      else if (statusLabel === 'cancelled' || statusLabel === 'canceled') statusLabel = 'Cancelled';
                      else if (statusLabel === 'expired' || statusLabel === 'void') statusLabel = 'Expired';
                      else statusLabel = booking.status || 'Unknown';

                      return (
                        <div key={booking.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                              <p className="text-sm text-gray-600">{getUserEmail(booking.userId)} • {formatDateTime(actionTime)}</p>
                            </div>
                            <div>
                              {/* Use same badge renderer but prefer the computed statusLabel for display */}
                              {renderStatusBadge(statusLabel)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={() => { setSelectedView('admin-activity-logs'); setSettingsTab('history'); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                ) : (
                  <EmptyState Icon={Calendar} message="No recent booking activity" />
                )}
              </div>
            </div>

            {/* Recent System Activity & Recent System Alerts (stacked) */}
            <div className="space-y-6">
              {/* Block 1: Recent System Alerts with two preview tabs */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Recent System Alerts</h3>
                    <p className="text-gray-600 mt-1">Booking and user management alerts</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {alerts?.length || 0} alerts
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAlertsPreviewTab('booking')}
                      className={`px-3 py-1 rounded-lg text-sm ${alertsPreviewTab === 'booking' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Booking Alerts
                    </button>
                    <button
                      onClick={() => setAlertsPreviewTab('users')}
                      className={`px-3 py-1 rounded-lg text-sm ${alertsPreviewTab === 'users' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      User Management Alerts
                    </button>
                  </div>
                </div>

                <div>
                  {alertsPreviewTab === 'booking' ? (
                    <div className="space-y-2">
                      {alerts?.filter(a => {
                        if (a.type === 'booking') return true;
                        const t = (a.title || '').toLowerCase();
                        const m = (a.message || '').toLowerCase();
                        return t.includes('booking') || m.includes('booking');
                      }).slice(0,5).map((alert: SystemAlert) => (
                        <div key={alert.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-150">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                              <p className="text-xs text-gray-600">{formatAlertMessage(alert.message)}</p>
                            </div>
                            <div className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts?.filter(a => {
                        const t = (a.title || '').toLowerCase();
                        const m = (a.message || '').toLowerCase();
                        return t.includes('user') || m.includes('banned') || m.includes('unbanned') || t.includes('suspension');
                      }).slice(0,5).map((alert: SystemAlert) => (
                        <div key={alert.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-150">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                              <p className="text-xs text-gray-600">{formatAlertMessage(alert.message)}</p>
                            </div>
                            <div className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => { setSelectedView('admin-activity-logs'); setSettingsTab('system'); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150"
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>

              {/* Block 2: Recent System Activity (preview of activities) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Recent System Activity</h3>
                    <p className="text-gray-600 mt-1">Monitor system events and user actions</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activities?.length || 0} Events
                  </div>
                </div>

                {activities && activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors duration-150">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-pink-100 p-1.5 rounded-lg">
                              <Activity className="h-3.5 w-3.5 text-pink-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{activity.action}</h4>
                              <p className="text-xs text-gray-600 mt-0.5">{formatActivityDetails(activity)} {activity.userId && `by ${getUserEmail(activity.userId)}`}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={() => { setSelectedView('admin-activity-logs'); setSettingsTab('system'); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                      <Activity className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-xs">No recent system activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <div className="w-64 bg-card shadow-sm">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>
        <div className="flex-1 p-8">{renderContent()}</div>
      </div>
      <BanUserModal
        isOpen={isBanUserModalOpen}
        onClose={() => setIsBanUserModalOpen(false)}
        user={userToBan}
        onBanUser={(userId, reason, duration, customDate) => {
          banUserMutation.mutate({ userId, reason, duration, customDate });
          setIsBanUserModalOpen(false);
        }}
      />

      <UnavailableReasonModal
        isOpen={isUnavailableModalOpen}
        onClose={() => { setIsUnavailableModalOpen(false); setFacilityForUnavailable(null); }}
        facility={facilityForUnavailable}
        onConfirm={handleUnavailableConfirm}
      />
    </div>
  );
}