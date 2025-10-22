// src/components/AdminDashboard.tsx
// Fixed icon import naming conflict and syntax error

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
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
  X,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { User, FacilityBooking, SystemAlert, ActivityLog, Facility } from "../../../../shared/schema";
import { Button } from "@/components/ui/button";
import AvailabilityGrid from '@/components/AvailabilityGrid';

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
  const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const seconds = (diff % 60).toString().padStart(2, '0');
  return <span className="font-mono text-lg font-semibold text-green-700">{hours}:{minutes}:{seconds}</span>;
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

  // Keep a map of users for quick lookup (populated after queries update usersData)
  useEffect(() => {
    try {
      usersMap.clear();
      (usersData || []).forEach((u: User) => usersMap.set(String(u.id), u));
    } catch (e) {
      // ignore
    }
  }, [usersData]);

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

  function formatTime(value: any) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_e) {
      return String(value);
    }
  }

  function formatDate(value: any) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString();
    } catch (_e) {
      return String(value);
    }
  }


  // Render a colored badge for booking status
  // Render a colored badge for booking status.
  // Treat 'pending' bookings as scheduled in the UI (server remains canonical).
  function renderStatusBadge(statusRaw: any) {
    const s = String(statusRaw || '').toLowerCase();
    let label = (statusRaw && String(statusRaw)) || 'Unknown';
    let classes = 'text-sm font-medium px-2 py-1 rounded-full';

    if (s === 'pending' || s === 'request' || s === 'requested') {
      // Present pending as scheduled to the user (auto-scheduled server-side flow)
      label = 'Scheduled';
      classes += ' bg-green-100 text-green-800';
    } else if (s === 'approved' || s === 'completed') {
      label = (s === 'approved') ? 'Approved' : 'Completed';
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
  // per-tab pagination state for Admin Activity Logs
  const [successPage, setSuccessPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [systemPage, setSystemPage] = useState(0);
  const [bookingAlertsPage, setBookingAlertsPage] = useState(0);
  const [userAlertsPage, setUserAlertsPage] = useState(0);
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
  
  // Loading state for navigation to booking dashboard
  const [isNavigatingToBooking, setIsNavigatingToBooking] = useState(false);
  
  // silence unused setters where appropriate
  void setActiveBookingsPage; void setUpcomingBookingsPage; void setApprovedAndDeniedBookingsPage; void setPendingBookingsDashboardPage; void setPendingBookingsPage; void setBookingUsersPage; void setBannedUsersPage; void setActivitiesPage;
  // silence unused page variables to avoid tsc noUnusedLocals failures in iterative edits
  void activitiesPage; void approvedAndDeniedBookingsPage;
  void pendingBookingsDashboardPage;

  // Placeholder lists (populated from queries below)

  // Sidebar
  const { user: authUser } = useAuth();
  const [location, setLocation] = useLocation();

  // If the route is '/admin/alerts', open the Admin System Alerts view and select the Booking tab.
  useEffect(() => {
    try {
      const path = typeof location === 'string' ? location : (window?.location?.pathname || '');
      if (path && path.startsWith('/admin/alerts')) {
        setSelectedView('security');
        setSecurityTab('booking');
      }
    } catch (e) {
      // ignore
    }
  }, [location]);

  // Also accept hash-style navigation (e.g. /admin#activity:notifications) which
  // header links may use — open Security -> Booking tab when requested.
  useEffect(() => {
    const isReloadNavigation = () => {
      try {
        // modern NavigationTiming
        const navEntries = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation') as PerformanceNavigationTiming[] : [];
        if (Array.isArray(navEntries) && navEntries[0] && (navEntries[0] as any).type) {
          return (navEntries[0] as any).type === 'reload' || (navEntries[0] as any).type === 'back_forward';
        }
        // fallback (deprecated) API
        if ((performance as any).navigation && typeof (performance as any).navigation.type === 'number') {
          // 1 === TYPE_RELOAD
          return (performance as any).navigation.type === 1;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    const handleHash = () => {
      try {
        const rawHash = window.location.hash?.replace('#', '') || '';
        if (!rawHash) return;
        // Accept patterns like 'activity:notifications' or 'activity/notifications'
        const normalized = rawHash.replace('/', ':');
        const parts = normalized.split(':');
        if (parts[0] === 'activity' && parts[1] === 'notifications') {
          setSelectedView('security');
          setSecurityTab('booking');
          // Only normalize the URL to the overview if this navigation was a reload
          // (we don't want to replace the URL when a user clicked the bell).
          if (isReloadNavigation()) {
            try {
              const overviewTarget = '/admin#overview';
              if (window.location.pathname + window.location.hash !== overviewTarget) {
                window.history.replaceState({}, '', overviewTarget);
              }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    // Run once on mount
    handleHash();
    // Listen for future hash changes
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // If App set a one-time flag for admin alerts, open the Security->Booking tab once
  // then replace the URL to the main admin overview so reloads land on the dashboard.
  useEffect(() => {
    try {
      const flag = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('openAdminAlertsOnce') : null;
      if (flag === '1') {
        try { sessionStorage.removeItem('openAdminAlertsOnce'); } catch (_) {}
        setSelectedView('security');
        setSecurityTab('booking');
        try {
          // Only normalize the URL to the overview if this was a reload navigation
          const navEntries = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation') as PerformanceNavigationTiming[] : [];
          const isReload = (Array.isArray(navEntries) && navEntries[0] && (navEntries[0] as any).type && ((navEntries[0] as any).type === 'reload' || (navEntries[0] as any).type === 'back_forward'))
            || ((performance as any).navigation && (performance as any).navigation.type === 1);
          if (isReload) {
            const target = '/admin#overview';
            if (window.location.pathname + window.location.hash !== target) {
              window.history.replaceState({}, '', target);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

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
    const lastItem = (authUser && authUser.role === 'admin') ? { id: 'booking-dashboard', label: 'Booking Dashboard', icon: BarChart3, isLoading: isNavigatingToBooking } : undefined;
    sidebarItems = makeSidebar(!!authUser && authUser.role === 'admin', lastItem, 'admin');
  } catch (e) {
    // fallback to previous static list - only include admin-only divider+link when the user is admin
    sidebarItems = [
      { id: 'overview', label: 'Dashboard', icon: BarChart3 },
      { id: 'booking-management', label: 'Facility Bookings', icon: Calendar },
      { id: 'user-management', label: 'User Management', icon: Users },
      { id: 'security', label: 'System Alerts', icon: Shield },
      { id: 'admin-activity-logs', label: 'Activity Logs', icon: BarChart3 },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ];
    if (authUser && authUser.role === 'admin') {
      sidebarItems.push({ id: 'divider-1', type: 'divider' });
      sidebarItems.push({ id: 'booking-dashboard', label: 'Booking Dashboard', icon: BarChart3, isLoading: isNavigatingToBooking });
    }
  }

  const handleSidebarClick = async (id: string) => {
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
      // Show loading state and invalidate all related queries to force fresh data load
      setIsNavigatingToBooking(true);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/facilities"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/bookings/all"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/availability"] }),
        ]);
        
        // navigate to the student booking dashboard route and request the dashboard view
        setLocation('/booking#dashboard');
      } catch (error) {
        console.error('Error invalidating queries:', error);
        // Still navigate even if invalidation fails
        setLocation('/booking#dashboard');
      } finally {
        setIsNavigatingToBooking(false);
      }
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
  // Track which booking's Popover is open (persisted until user clicks away)
  const [openOthers, setOpenOthers] = useState<Record<string, boolean>>({});
  // Track which booking's Purpose popover is open
  const [openPurpose, setOpenPurpose] = useState<Record<string, boolean>>({});

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
  const libraryCloseTime = 19 * 60; // 7:00 PM
    return currentTimeInMinutes < libraryOpenTime || currentTimeInMinutes > libraryCloseTime;
  };
  const queryClient = useQueryClient();

  // Track which bookings are currently being updated so buttons show loading/disabled state
  const [updatingNeedsIds, setUpdatingNeedsIds] = useState<Set<string>>(new Set());
  // Local map to track admin-updated needs status so UI reflects updates immediately
  const [needsStatusById, setNeedsStatusById] = useState<Record<string, 'prepared' | 'not_available'>>({});
  // Per-booking, per-item equipment status map: bookingId -> { itemLabel: 'prepared'|'not_available' }
  const [bookingItemStatus, setBookingItemStatus] = useState<Record<string, Record<string, 'prepared' | 'not_available'>>>({});

  // Equipment check modal state
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentModalBooking, setEquipmentModalBooking] = useState<null | any>(null);
  const [equipmentModalItemStatuses, setEquipmentModalItemStatuses] = useState<Record<string, 'prepared' | 'not_available' | undefined>>({});

  const markBookingNeeds = async (bookingId: string, status: 'prepared' | 'not_available', note?: string) => {
    try {
      setUpdatingNeedsIds(prev => new Set(prev).add(bookingId));
  await updateNeedsMutation.mutateAsync({ bookingId, status, note });
  // optimistically record the status so UI updates immediately
  setNeedsStatusById(prev => ({ ...prev, [bookingId]: status }));
  // Try to surface a user-friendly booking label instead of a raw UUID
    try {
    const bookingObj = (allBookings || []).find((b: any) => String(b.id) === String(bookingId));
    const bookingLabel = bookingObj ? `${getFacilityName(bookingObj.facilityId)} (${formatDateTime(bookingObj.startTime)})` : 'booking';
    // Map internal status keys to user-friendly labels
    const statusLabelMap: Record<string, string> = {
      prepared: 'Prepared',
      not_available: 'Not available',
      'not-available': 'Not available',
      'not available': 'Not available'
    };
    const statusLabel = statusLabelMap[String(status)] || String(status);
    toast({ title: 'Updated', description: `Marked needs as ${statusLabel} for ${bookingLabel}`, variant: 'default' });
  } catch (e) {
    toast({ title: 'Updated', description: `Marked needs as ${status} for booking`, variant: 'default' });
  }
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setUpdatingNeedsIds(prev => {
        const copy = new Set(prev);
        copy.delete(bookingId);
        return copy;
      });
    }
  };

  // Attempt to extract an items list from a booking record. Support multiple shapes:
  // - booking.equipment.items + booking.equipment.others
  // - booking.adminResponse containing a JSON block like `Needs: { ... }`
  // - legacy free-text 'Requested equipment: ...'
  const parseEquipmentItemsFromBooking = (booking: any): string[] => {
    try {
      const out: string[] = [];
      // 1) canonical booking.equipment shape
      const eq = booking?.equipment || null;
      if (eq) {
        if (Array.isArray(eq.items)) {
          for (const i of eq.items) {
            const t = String(i || '').replace(/_/g, ' ').trim();
            if (!/^others[:\s]*$/i.test(t) && t.length) out.push(t);
          }
        }
        if (eq.others && String(eq.others).trim()) out.push(String(eq.others).trim());
      }

      // 2) adminResponse JSON block e.g. `Needs: { "items": [...], "others": "..." }`
      if (out.length === 0 && booking?.adminResponse) {
        try {
          const resp = String(booking.adminResponse || '');
          // First try: direct JSON block immediately after Needs:
          let m = resp.match(/Needs:\s*(\{[\s\S]*\})/i);
          // Second try: some server flows append an overall marker then an em-dash and a JSON note:
          // e.g. `Needs: Prepared — {"items":{...}}` or `Needs: Not Available - { ... }`
          if (!m) {
            m = resp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
          }
          if (m && m[1]) {
            const tryParse = (txt: string) => {
              try {
                return JSON.parse(txt);
              } catch (e) {
                try {
                  return JSON.parse(txt.replace(/'/g, '"'));
                } catch (_e) {
                  return null;
                }
              }
            };

            const obj = tryParse(m[1]);
            if (obj) {
              // Support either { items: ["a","b"] } or { items: { "a": "prepared" } }
              if (Array.isArray(obj.items)) {
                for (const it of obj.items) {
                  const t = String(it || '').replace(/_/g, ' ').trim();
                  if (!/^others[:\s]*$/i.test(t) && t.length) out.push(t);
                }
              } else if (obj.items && typeof obj.items === 'object') {
                // keys are item names (legacy note storage); collect keys as items
                for (const k of Object.keys(obj.items)) {
                  const t = String(k || '').replace(/_/g, ' ').trim();
                  if (!/^others[:\s]*$/i.test(t) && t.length) out.push(t);
                }
              }
              if (obj.others && String(obj.others).trim()) out.push(String(obj.others).trim());
            }
          }
        } catch (e) {}
      }

      // 3) legacy free-text: 'Requested equipment: ...'
      if (out.length === 0 && booking?.adminResponse) {
        try {
          const resp = String(booking.adminResponse || '');
          const eqMatch = resp.match(/Requested equipment:\s*([^\n\[]+)/i);
          if (eqMatch && eqMatch[1]) {
            const parts = eqMatch[1].split(/[,;]+/).map((s: string) => String(s).trim()).filter(Boolean);
            for (const p of parts) {
              if (/others?/i.test(p)) {
                const trailing = p.replace(/.*?others[:\s-]*/i, '').trim();
                if (trailing) out.push(trailing);
                continue;
              }
              out.push(p.replace(/_/g, ' ').trim());
            }
          }
        } catch (e) {}
      }

      return out.filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  // Silence some unused-variable TypeScript warnings during iterative refactor
  // These are intentional no-ops to avoid noisy compile errors while we iterate on admin UI.
  void pendingBookingsPage; void setPendingBookingsPage;
  void updatingNeedsIds; void setUpdatingNeedsIds;
  void markBookingNeeds;
  // No-op handlers marked as used
  const _noopHandlersUsed = () => { void handleApproveNoop; void handleDenyNoop; };
  void _noopHandlersUsed;

  const openEquipmentModal = (booking: any) => {
    try {
      // If modal is already open for this booking, do nothing.
      if (showEquipmentModal && equipmentModalBooking && String(equipmentModalBooking.id) === String(booking?.id)) {
        return;
      }
      // Open modal first so clicks always surface the modal immediately.
      setEquipmentModalBooking(booking);
      setShowEquipmentModal(true);
      try {
        // small dev-only visual feedback so admins can see the handler fired
        if (process.env.NODE_ENV === 'development') {
          try { toast({ title: 'Debug', description: `Opening equipment modal for booking ${String(booking?.id)}`, variant: 'default' }); } catch (_) {}
        }
      } catch (_) {}
      const items = parseEquipmentItemsFromBooking(booking);
      // Always show modal even if items are empty so admin can see there are no items
      const existing = bookingItemStatus[String(booking.id)] || {};
      const initStatuses: Record<string, 'prepared' | 'not_available' | undefined> = {};
      // Try to prefill from optimistic local state first
      items.forEach(it => { initStatuses[it] = existing[it]; });

      // If we don't have per-item statuses in local map, attempt to parse persisted adminResponse JSON
      // If we don't have per-item statuses in local map, attempt to parse persisted adminResponse JSON
      try {
        const resp = String(booking?.adminResponse || '');
        // look for a JSON object after Needs: or trailing after an em-dash/hyphen
        const m1 = resp.match(/Needs:\s*(\{[\s\S]*\})/i);
        const m2 = resp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
        const jsonTxt = (m1 && m1[1]) ? m1[1] : (m2 && m2[1]) ? m2[1] : null;
        if (jsonTxt) {
          // tolerant parse
          let parsed: any = null;
          try { parsed = JSON.parse(jsonTxt); } catch (e) { try { parsed = JSON.parse(jsonTxt.replace(/'/g, '"')); } catch (e) { parsed = null; } }
          if (parsed && parsed.items && typeof parsed.items === 'object') {
            // items may be an object mapping item->status or an array
            if (!Array.isArray(parsed.items)) {
              for (const [k, v] of Object.entries(parsed.items)) {
                const name = String(k).replace(/_/g, ' ').trim();
                if (items.includes(name) && !initStatuses[name]) {
                  const val = (String(v).toLowerCase().includes('prepared')) ? 'prepared' : (String(v).toLowerCase().includes('not') ? 'not_available' : undefined);
                  if (val) initStatuses[name] = val;
                }
              }
            }
          }
        }
      } catch (e) {
        // keep modal open and surface debug info in dev
        try { if (process.env.NODE_ENV === 'development') console.debug('[openEquipmentModal] parse error', e, booking?.adminResponse); } catch (_) {}
      }

  // (removed dev console output to avoid noisy repeated logs on click)
      setEquipmentModalItemStatuses(initStatuses);
      // booking already set above and modal opened immediately
    } catch (e) {
      // ensure modal is cleared on error
      // leave modal open so admin can see the empty state; clear item statuses to avoid stale UI
      setEquipmentModalItemStatuses({});
    }
  };

  const [isConfirmingEquipment, setIsConfirmingEquipment] = useState(false);

  const confirmEquipmentModal = async () => {
    if (!equipmentModalBooking || isConfirmingEquipment) return;
    
    setIsConfirmingEquipment(true);
    const bookingId = String(equipmentModalBooking.id);
    // Persist overall status: if all marked prepared -> prepared, else not_available
    const statuses = { ...equipmentModalItemStatuses };
    const allPrepared = Object.values(statuses).length > 0 && Object.values(statuses).every(v => v === 'prepared');
    const overall: 'prepared' | 'not_available' = allPrepared ? 'prepared' : 'not_available';
    // Optimistically store per-item statuses locally
    setBookingItemStatus(prev => ({ ...prev, [bookingId]: Object.entries(statuses).reduce((acc, [k, v]) => { if (v) acc[k] = v; return acc; }, {} as Record<string, 'prepared'|'not_available'>) }));
    // Also set booking-level needs status for compatibility with existing UI
    setNeedsStatusById(prev => ({ ...prev, [bookingId]: overall }));
    
    // Get user email for better toast message
    const userEmail = equipmentModalBooking?.user?.email || 'user';
    
    // Use updateNeedsMutation to persist overall status and include per-item details in `note`
    try {
      await updateNeedsMutation.mutateAsync({ bookingId, status: overall, note: JSON.stringify({ items: statuses }) });
      try { 
        toast({ 
          title: 'Equipment Updated', 
          description: `You updated ${userEmail}'s equipment request`, 
          variant: 'default' 
        }); 
      } catch (e) {}
      // Only close modal on success
      setShowEquipmentModal(false);
      setEquipmentModalBooking(null);
      setEquipmentModalItemStatuses({});
    } catch (e: any) {
      try { toast({ title: 'Save failed', description: e?.message || String(e), variant: 'destructive' }); } catch (e) {}
    } finally {
      setIsConfirmingEquipment(false);
    }
  };

  // Mutation to update needs status
  const updateNeedsMutation = useMutation({
    mutationFn: async ({ bookingId, status, note }: { bookingId: string; status: 'prepared' | 'not_available'; note?: string }) => {
      const res = await apiRequest('POST', `/api/admin/bookings/${bookingId}/needs`, { status, note });
      return res.json();
    },
    onSuccess: async (_data, variables: any) => {
      // Optimistic UI: immediately reflect the updated equipment statuses in the
      // admin bell by prepending a temporary alert constructed from the mutation
      // variables (bookingId, status, note). The Header parsing will pick up the
      // JSON payload in `note` to render per-item prepared/not-available icons.
      try {
  const { status, note } = variables || {};
        const payloadJson = note && typeof note === 'string' ? note : (note ? JSON.stringify(note) : JSON.stringify({ items: {} }));
        // Create a human summary from the payload if possible
        let humanSummary = '';
        try {
          const parsed = JSON.parse(payloadJson || '{}');
          if (parsed && parsed.items) {
            if (Array.isArray(parsed.items)) humanSummary = parsed.items.join(', ');
            else if (typeof parsed.items === 'object') humanSummary = Object.keys(parsed.items).join(', ');
          }
        } catch (e) { /* ignore */ }

        const title = 'Equipment Needs Submitted';
        const message = humanSummary ? `${humanSummary}\n\n${payloadJson}` : `${status === 'prepared' ? 'Marked prepared' : 'Marked not available'}\n\n${payloadJson}`;
        const tmpId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `tmp-${Date.now()}`;
        const tmpAlert = {
          id: tmpId,
          type: 'booking',
          severity: 'low',
          title,
          message,
          userId: null,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData(['/api/admin/alerts'], (old: any) => {
          const arr = Array.isArray(old) ? old.slice() : [];
          // prepend temporary alert so it's visible immediately
          arr.unshift(tmpAlert);
          return arr;
        });
      } catch (e) {
        // non-fatal - continue to invalidate caches below
      }

      // Ensure authoritative data is fetched after optimistic update
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
      ]);
    },
    onError: (err: any) => {
      try {
        const msg = err?.message || String(err);
        toast({ title: 'Failed to save needs', description: msg, variant: 'destructive' });
      } catch (e) {}
    }
  });

  function renderEquipmentLine(booking: FacilityBooking | any) {
    try {
      const eq = booking.equipment || null;
      if (!eq) return null;
  const rawItems = Array.isArray(eq.items) ? eq.items.map((s: string) => String(s).replace(/_/g, ' ')).filter(Boolean) : [];
  const othersText = eq.others && String(eq.others).trim() ? String(eq.others).trim() : null;
  // Treat `others` as description only; do not include it in the items list used for display.
  const allItems = rawItems.filter((s: string) => !/^others[:\s]*$/i.test(String(s).trim()));
  if (allItems.length === 0 && !othersText) return null;
  // Show up to 6 items directly, only hide if more than 6
  const displayItems = allItems.slice(0, 6);
  const hasMore = allItems.length > 6;
      const bookingStatuses = bookingItemStatus[String(booking.id)] || {};
      const coloredSpan = (it: string) => {
        const s = bookingStatuses[it];
        if (s === 'prepared') return <span className="text-green-600 font-medium">{it}</span>;
        if (s === 'not_available') return <span className="text-red-600 font-medium">{it}</span>;
        return <span>{it}</span>;
      };
      return (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-medium text-gray-700">Equipment:</div>
            {othersText && (() => {
              const id = String(booking.id || Math.random());
              const isOpen = !!openOthers[id];
              return (
                <Popover open={isOpen} onOpenChange={(v) => setOpenOthers(prev => ({ ...prev, [id]: v }))}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button onClick={() => setOpenOthers(prev => ({ ...prev, [id]: !prev[id] }))} className="text-xs text-blue-600 hover:underline cursor-pointer" aria-expanded={isOpen}>view other</button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200"><p className="font-semibold text-sm text-gray-800 text-left">Other equipment</p></div>
                        <div className="p-3"><p className="text-sm text-gray-900 leading-5 break-words text-left">{othersText}</p></div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <PopoverContent side="top" align="start" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200"><p className="font-semibold text-sm text-gray-800 text-left">Other equipment</p></div>
                    <div className="p-3"><p className="text-sm text-gray-900 leading-5 break-words text-left">{othersText}</p></div>
                  </PopoverContent>
                </Popover>
              );
            })()}
          </div>
          {displayItems.length > 0 && (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                {displayItems.map((it: string, idx: number) => (
                  <div key={idx} className="truncate">{coloredSpan(it)}</div>
                ))}
              </div>
              {hasMore && (() => {
                const extra = allItems.slice(displayItems.length);
                const count = extra.length;
                return (
                  <div className="mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-xs text-blue-600 hover:underline">+{count} more</button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="start" className="w-56 p-2 z-50">
                        <div className="text-sm">
                          {extra.map((it: string, idx: number) => (
                            <div key={idx} className="py-1">{coloredSpan(it)}</div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
    } catch (e) {
      return null;
    }
  }

  // Resolve a booking's needs status: prefer local optimistic state, fall back to parsing server adminResponse
  const getNeedsStatusForBooking = (booking: any): 'prepared' | 'not_available' | undefined => {
    if (!booking) return undefined;
    if (needsStatusById[booking.id]) return needsStatusById[booking.id];
    try {
      const resp = String(booking?.adminResponse || '');
      const m = resp.match(/Needs:\s*(Prepared|Not Available)/i);
      if (m) return /prepared/i.test(m[1]) ? 'prepared' : 'not_available';
    } catch (e) {
      // ignore
    }
    return undefined;
  };

  // Small visible badge used to highlight bookings that requested equipment
  function renderEquipmentBadge(booking: FacilityBooking | any) {
    try {
      const eq = booking?.equipment;
      const has = !!(eq && ((Array.isArray(eq.items) && eq.items.length > 0) || (eq.others && String(eq.others).trim().length > 0)));
      if (!has) return null;
      return (
        <div className="mt-1">
          <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">NEEDS EQUIPMENT</span>
        </div>
      );
    } catch (e) {
      return null;
    }
  }

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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    enabled: isAdmin,
  });

  // Facilities
  const { data: facilitiesData = [], isLoading: facilitiesLoading, isError: facilitiesError } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/facilities');
      return res.json();
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Admin users
  const { data: usersDataQ = [], isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return res.json();
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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

  // Invalidate all admin queries on mount to ensure fresh data when returning to dashboard
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
  }, []); // Only run once on mount

  // Map query results into the local state used by helper functions
  useEffect(() => {
    try {
      if (!Array.isArray(usersDataQ)) return;
      // Compare by IDs to avoid creating a new state object every render
      const same = Array.isArray(usersData) && usersData.length === usersDataQ.length && usersData.every((u: any, i: number) => String(u?.id) === String(usersDataQ[i]?.id));
      if (!same) setUsersData(usersDataQ);
    } catch (e) {
      // ignore
    }
  }, [usersDataQ, usersData]);

  useEffect(() => {
    try {
      if (!Array.isArray(activitiesData)) return;
      const same = Array.isArray(activities) && activities.length === activitiesData.length && activities.every((a: any, i: number) => String(a?.id) === String(activitiesData[i]?.id));
      if (!same) setActivities(activitiesData);
    } catch (e) {
      // ignore
    }
  }, [activitiesData, activities]);

  useEffect(() => {
    try {
      if (!Array.isArray(facilitiesData)) return;
      const same = Array.isArray(facilities) && facilities.length === facilitiesData.length && facilities.every((f: any, i: number) => String(f?.id) === String(facilitiesData[i]?.id));
      if (!same) setFacilities(facilitiesData);
    } catch (e) {
      // ignore
    }
  }, [facilitiesData, facilities]);

  useEffect(() => {
    try {
      if (!currentUserData) return;
      const different = !user || String(currentUserData?.id) !== String(user?.id) || String(currentUserData?.email) !== String(user?.email);
      if (different) setUser(currentUserData);
    } catch (e) {
      // ignore
    }
  }, [currentUserData, user]);

  // Derived lists used in the UI
  const allBookings: FacilityBooking[] = Array.isArray(adminBookingsData) ? adminBookingsData : [];
  const activeBookings: FacilityBooking[] = allBookings.filter(b => b.status === 'approved' && new Date(b.startTime) <= new Date() && new Date(b.endTime) >= new Date());
  // Upcoming bookings: include both approved future bookings and any pending bookings
  // (the UI treats pending as scheduled for admins; the server remains canonical).
  const futureApproved: FacilityBooking[] = allBookings.filter(b => b.status === 'approved' && new Date(b.startTime) > new Date());
  const pendingFromApi: FacilityBooking[] = Array.isArray(pendingBookingsData) ? (pendingBookingsData.filter((b: any) => new Date(b.startTime) > new Date())) : [];
  const upcomingBookings: FacilityBooking[] = [...futureApproved, ...pendingFromApi].sort((a,b) => new Date(String(a.startTime)).getTime() - new Date(String(b.startTime)).getTime());
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

  // Deduplicate scheduled bookings count: union of upcoming (approved future + pending API) and any pending items
  const scheduledSet = new Set<string>();
  try {
    for (const b of upcomingBookings) {
      if (b && b.id) scheduledSet.add(String(b.id));
    }
    for (const b of pendingBookings) {
      if (b && b.id) scheduledSet.add(String(b.id));
    }
  } catch (e) {
    // ignore
  }
  const scheduledCount = scheduledSet.size;

  // When bookings are (re)fetched, derive any persisted needs status stored in adminResponse
  // The server currently stores a marker like "Needs: Prepared" or "Needs: Not Available" inside adminResponse.
  // Parse that marker into our local map so the UI reflects persisted status after refresh.
  useEffect(() => {
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
        } catch (e) {
          // ignore per-book parse errors
        }
      });
      // merge server-derived values into local optimistic map (server should be canonical)
      setNeedsStatusById(prev => {
        try {
          // if no derived keys, avoid creating a new object
          const derivedKeys = Object.keys(derived);
          if (derivedKeys.length === 0) return prev;
          // check if any derived value actually differs from prev
          let changed = false;
          for (const k of derivedKeys) {
            if (String(prev[k]) !== String(derived[k])) { changed = true; break; }
          }
          if (!changed) return prev;
          return { ...prev, ...derived };
        } catch (e) {
          return prev;
        }
      });
    } catch (e) {
      // ignore
    }
  }, [adminBookingsData, pendingBookingsData]);
  // Hydrate per-item booking statuses from adminResponse JSON block when bookings arrive
  useEffect(() => {
    try {
      const map: Record<string, Record<string, 'prepared'|'not_available'>> = {};
      const all = Array.isArray(adminBookingsData) ? adminBookingsData.concat(pendingBookingsData || []) : (pendingBookingsData || []);
      (all || []).forEach((b: any) => {
        try {
          const resp = String(b?.adminResponse || '');
          // look for JSON object after Needs: or trailing after em-dash/hyphen
          const m1 = resp.match(/Needs:\s*(\{[\s\S]*\})/i);
          const m2 = resp.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
          const jsonTxt = (m1 && m1[1]) ? m1[1] : (m2 && m2[1]) ? m2[1] : null;
          if (!jsonTxt) return;
          let parsed: any = null;
          try { parsed = JSON.parse(jsonTxt); } catch (e) { try { parsed = JSON.parse(jsonTxt.replace(/'/g, '"')); } catch (e) { parsed = null; } }
          if (parsed && parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items)) {
            const per: Record<string, 'prepared'|'not_available'> = {};
            for (const [k, v] of Object.entries(parsed.items)) {
              const name = String(k).replace(/_/g, ' ').trim();
              const val = (String(v).toLowerCase().includes('prepared')) ? 'prepared' : (String(v).toLowerCase().includes('not') ? 'not_available' : undefined);
              if (val) per[name] = val;
            }
            if (Object.keys(per).length > 0 && b?.id) map[b.id] = per;
          }
        } catch (e) {
          // ignore per-book parse errors
        }
      });
      // merge into bookingItemStatus but avoid no-op updates
      setBookingItemStatus(prev => {
        try {
          const next = { ...prev } as Record<string, Record<string, 'prepared'|'not_available'>>;
          let changed = false;
          for (const bid of Object.keys(map)) {
            const existing = prev[bid] || {};
            const incoming = map[bid] || {};
            // quick shallow equality check for keys and values
            const existingKeys = Object.keys(existing).sort();
            const incomingKeys = Object.keys(incoming).sort();
            if (existingKeys.length !== incomingKeys.length) {
              changed = true;
            } else {
              for (let i = 0; i < existingKeys.length && !changed; i++) {
                const k = existingKeys[i];
                if (String(existing[k]) !== String(incoming[k])) { changed = true; break; }
              }
            }
            if (changed) {
              next[bid] = { ...(next[bid] || {}), ...(incoming || {}) };
            }
          }
          if (!changed) return prev;
          return next;
        } catch (e) {
          return prev;
        }
      });
    } catch (e) {
      // ignore
    }
  }, [adminBookingsData, pendingBookingsData]);

  // Mutations
  const approveBookingMutation = useMutation({
    // Approval is now handled automatically by the server. Keep a no-op mutation here
    // so existing callers in the UI don't cause runtime errors. It will still
    // invalidate queries so the UI refreshes to reflect server-side scheduling.
    mutationFn: async (_: any) => {
      return Promise.resolve({});
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
      ]);
    },
  });

  const denyBookingMutation = useMutation({
    // Deny is removed; keep a safe no-op to avoid runtime errors if UI calls it.
    mutationFn: async (_: any) => Promise.resolve({}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
      ]);
    },
  });

  // keep references to no-op mutations/handlers to avoid "declared but its value is never read" during iterative edits
  void approveBookingMutation; void denyBookingMutation;

  // Friendly handlers to replace approve/deny button actions in the UI.
  const handleApproveNoop = (_bookingId: any) => {
    try {
      toast({ title: 'Auto-scheduled', description: 'Bookings are scheduled automatically; manual approval has been removed.', variant: 'default' });
    } catch (e) {}
  void _bookingId;
    queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
  };

  const handleDenyNoop = (_bookingId: any) => {
    try {
      toast({ title: 'Action removed', description: 'Manual denial has been removed. The system handles scheduling automatically.', variant: 'default' });
    } catch (e) {}
  void _bookingId;
    queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] });
  };

  void handleApproveNoop; void handleDenyNoop;

  const confirmArrivalMutation = useMutation({
    mutationFn: async ({ bookingId }: any) => {
      const res = await apiRequest('POST', `/api/bookings/${bookingId}/confirm-arrival`);
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async ({ userId }: any) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/unban`);
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/activity'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  const toggleFacilityAvailabilityMutation = useMutation({
    mutationFn: async ({ facilityId, available, reason, startDate, endDate }: any) => {
      // The server expects `isActive` boolean in the payload. Include optional reason and dates when disabling.
      const payload: any = { isActive: available };
      if (!available && reason) payload.reason = reason;
      if (!available && startDate) payload.startDate = startDate;
      if (!available && endDate) payload.endDate = endDate;
      const res = await apiRequest('PUT', `/api/admin/facilities/${facilityId}/availability`, payload);
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/facilities'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: string) => apiRequest('POST', `/api/admin/alerts/${alertId}/read`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
    },
  });

  const forceActiveBookingMutation = useMutation<any, Error, FacilityBooking>({
    mutationFn: async (booking: FacilityBooking) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const arrivalDeadline = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
      const res = await apiRequest('PUT', `/api/bookings/${booking.id}`, {
        purpose: booking.purpose,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        facilityId: booking.facilityId,
        participants: booking.participants,
        status: 'approved', // CRITICAL: Set to approved so arrival confirmation logic applies
        arrivalConfirmationDeadline: arrivalDeadline.toISOString(), // Set new deadline: now + 15 minutes
        arrivalConfirmed: false, // Ensure it requires confirmation
      });
      return res.json?.();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/bookings/pending'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/bookings/all'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] }),
      ]);
      
      // Force immediate refetch of admin bookings after invalidation completes
      setTimeout(async () => {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['/api/admin/bookings'] }),
          queryClient.refetchQueries({ queryKey: ['/api/bookings/pending'] }),
        ]);
      }, 500);
      
      toast({ 
        title: 'Booking Activated', 
        description: 'Booking has been forced to active status for testing.',
        variant: 'default' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to force booking active',
        variant: 'destructive' 
      });
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
    const raw = String(message).trim();

    // Session-specific replacement
    try {
      const uuidRegex = /Session ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
      if (uuidRegex.test(raw) || raw.includes('The computer session for this user was automatically logged out due to inactivity')) {
        return raw.replace('this user', 'a user');
      }
    } catch (e) {}

    // Try to convert user UUIDs to emails in 'unbanned' messages
    try {
      const unbanMatch = raw.match(/User ([0-9a-f-]{36}) has been unbanned/);
      if (unbanMatch) {
        const userEmail = getUserEmail(unbanMatch[1]);
        return raw.replace(unbanMatch[1], userEmail);
      }
    } catch (e) {}

    // Equipment/Needs parsing (JSON-style or free-text)
    try {
      const needsMatch = raw.match(/Needs:\s*(\{[\s\S]*\})/i);
      const eqMatch = raw.match(/Requested equipment:\s*([^\[]+)/i);
      const mapToken = (tok: string) => {
        const t = String(tok || '').replace(/_/g, ' ').trim();
        const lower = t.toLowerCase();
        if (lower.includes('others')) return null;
        if (lower.includes('whiteboard')) return 'Whiteboard & Markers';
        if (lower.includes('projector')) return 'Projector';
        if (lower.includes('extension cord') || lower.includes('extension_cord')) return 'Extension Cord';
        if (lower.includes('hdmi')) return 'HDMI Cable';
        if (lower.includes('extra chairs') || lower.includes('extra_chairs')) return 'Extra Chairs';
        return t.replace(/[.,;]+$/g, '').trim();
      };

      let equipmentList: string[] = [];
      let othersText: string | null = null;

      if (needsMatch && needsMatch[1]) {
        try {
          const obj = JSON.parse(needsMatch[1]);
          const items = Array.isArray(obj.items) ? obj.items : [];
          let othersFromItems = '';
          equipmentList = items.map((it: string) => {
            const rawIt = String(it || '');
            if (/others?/i.test(rawIt)) {
              const trailing = rawIt.replace(/.*?others[:\s-]*/i, '').trim();
              if (trailing && !othersFromItems) othersFromItems = trailing;
              return null;
            }
            return mapToken(rawIt);
          }).filter(Boolean) as string[];
          othersText = othersFromItems || (obj.others ? String(obj.others).trim() : null);
        } catch (e) {}
      } else if (eqMatch && eqMatch[1]) {
        const parts = eqMatch[1].split(/[;,]+/).map(s => String(s).trim()).filter(Boolean);
        let othersFromParts = '';
        equipmentList = parts.map(p => {
          if (/others?/i.test(p)) {
            const trailing = p.replace(/.*?others[:\s-]*/i, '').trim();
            if (trailing && !othersFromParts) othersFromParts = trailing;
            return null;
          }
          return mapToken(p);
        }).filter(Boolean) as string[];
        const extrasMatch = eqMatch[1].match(/Others?:\s*(.*)$/i);
        othersText = othersFromParts || (extrasMatch && extrasMatch[1] ? String(extrasMatch[1]).trim() : null);
      }

      if ((equipmentList && equipmentList.length > 0) || othersText) {
        const items = equipmentList.slice();
        if (othersText && !items.includes('and others')) items.push('and others');
        const itemsText = items.join(', ').replace(/,\s*and others/i, ' and others');
        const emailMatch = raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const prefix = emailMatch ? `${emailMatch[1]} ` : '';
        return `${prefix}Requested equipment: ${itemsText}`;
      }
    } catch (e) {}

    // Generic cleanup fallback
    try {
      let cleaned = raw.replace(/\(Session ID: [0-9a-f-]+\)/g, '').replace(/\(ID: [0-9a-f-]+\)/g, '').replace(/\(ID removed\)/g, '').trim();
      const uuidRegexGlobal = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;
      cleaned = cleaned.replace(uuidRegexGlobal, (m) => {
        const found = usersData?.find(u => u.id === m);
        return found ? found.email : '';
      });
      cleaned = cleaned.replace(/booking\s+[0-9a-f-]{36}/gi, 'booking');
      return cleaned.replace(/\s{2,}/g, ' ').trim();
    } catch (e) {
      return raw;
    }
  };

  // formatActivityDetails removed (unused) — formatting is handled inline where needed

  // Helper to resolve an actor's display email from a userId or details blob
  function getActorEmail(activityOrUserId: any) {
    if (!activityOrUserId) return '';
    // If passed an activity object, prefer userId then details
    if (typeof activityOrUserId === 'object') {
      const a = activityOrUserId;
      if (a.userId) return getUserEmail(a.userId);
      // try to extract email from details
      const match = String(a.details || a.message || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) return match[1];
      return '';
    }

    // If passed a user id string
    return getUserEmail(activityOrUserId);
  }
  // avoid unused-variable TS warnings
  void getActorEmail;

  const handleUnavailableConfirm = (reason?: string, startDate?: string, endDate?: string) => {
    if (!facilityForUnavailable) return;
    // Add date range information to the reason if dates were selected
    let fullReason = reason || '';
    if (startDate && endDate) {
      const dateInfo = startDate === endDate 
        ? `Unavailable on ${startDate}` 
        : `Unavailable from ${startDate} to ${endDate}`;
      fullReason = fullReason ? `${dateInfo}. ${fullReason}` : dateInfo;
    }
    toggleFacilityAvailabilityMutation.mutate({ 
      facilityId: facilityForUnavailable.id, 
      available: false, 
      reason: fullReason,
      startDate,
      endDate
    });
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
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
        {badges?.map((b, i) => (
          <div key={i} className={`w-full md:w-auto ${b.className || 'bg-gray-100 text-gray-800'} px-3 py-1 rounded-full text-sm font-medium`}>
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
  // avoid unused-variable warning
  void CardHeader;

  const EmptyState = ({ Icon, message }: { Icon: any; message: string }) => (
    <div className="text-center py-8">
      <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );

  // Generate a weekly booking report (group by ISO week starting Monday) from admin bookings
  const generateBookingWeeklyReport = () => {
    try {
      const bk = Array.isArray(adminBookingsData) ? adminBookingsData.slice() : [];

      // Helper to format facility name
      const formatFacilityNameForReport = (name: string) => {
        if (!name) return name;
        const lower = name.toLowerCase();
        if (lower === 'lounge' && !lower.includes('facility')) {
          return 'Facility Lounge';
        }
        return name;
      };

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      // Add header rows
      wsData.push(['Booking Weekly Report']);
      wsData.push([`Generated: ${new Date().toLocaleString()}`]);
      wsData.push([`Total Bookings: ${bk.length}`]);
      wsData.push([]); // Empty row

      // Add column headers
      wsData.push(['Week', 'Date', 'Day', 'Time', 'Facility', 'User Email', 'Status', 'Participants', 'Purpose', 'Booking ID']);

      // Helper to get week key
      const getWeekKey = (isoDateStr: string) => {
        const d = new Date(isoDateStr);
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      };

      // Group bookings by week
      const weekMap: Record<string, any[]> = {};
      for (const b of bk) {
        const dateIso = (() => { try { return new Date(b.startTime).toISOString(); } catch (e) { return new Date().toISOString(); } })();
        const weekKey = getWeekKey(dateIso);
        if (!weekMap[weekKey]) weekMap[weekKey] = [];
        weekMap[weekKey].push(b);
      }

      const weekKeys = Object.keys(weekMap).sort().reverse();

      // Add data rows grouped by week
      for (const wk of weekKeys) {
        const items = weekMap[wk].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        // Week separator row
        wsData.push([wk, '', '', '', '', '', '', '', '', '']);

        for (const booking of items) {
          const dateObj = new Date(booking.startTime);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
          const startTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const endTime = new Date(booking.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          const timeStr = `${startTime} - ${endTime}`;
          const facilityName = formatFacilityNameForReport(getFacilityName(booking.facilityId));
          const userEmail = getUserEmail(booking.userId);

          // Determine actual status
          const now = new Date();
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          let status = booking.status || 'N/A';

          if (booking.status === 'approved') {
            if (now >= bookingStart && now <= bookingEnd) {
              status = 'Active';
            } else if (now > bookingEnd) {
              status = 'Completed';
            } else if (now < bookingStart) {
              status = 'Scheduled';
            }
          } else if (booking.status === 'pending') {
            status = 'Pending';
          } else if (booking.status === 'denied') {
            status = 'Denied';
          } else if (booking.status === 'cancelled') {
            status = 'Cancelled';
          }

          const participants = booking.participants || 0;
          const purpose = (booking.purpose || 'N/A').substring(0, 200);
          const bookingId = booking.id || 'N/A';

          wsData.push(['', dateStr, dayName, timeStr, facilityName, userEmail, status, participants, purpose, bookingId]);
        }
      }

      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 },  // Week
        { wch: 12 },  // Date
        { wch: 6 },   // Day
        { wch: 18 },  // Time
        { wch: 28 },  // Facility
        { wch: 25 },  // User Email
        { wch: 12 },  // Status
        { wch: 12 },  // Participants
        { wch: 40 },  // Purpose
        { wch: 38 }   // Booking ID
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Booking Report');

      // Generate and download file
      XLSX.writeFile(wb, `booking-weekly-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      try { toast({ title: 'Report Failed', description: String(e), variant: 'destructive' }); } catch (_) { }
    }
  };

  // XML escape for Excel XML format
  const escapeXML = (s: any) => {
    if (s == null) return '';
    const str = String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/[\r\n]+/g, ' ');
  };

  // CSV escape for Excel compatibility (kept for other potential uses)
  const escapeCSV = (s: any) => {
    if (s == null) return '';
    const str = String(s);
    // Escape double quotes by doubling them, and remove line breaks
    return str.replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
  };

  const OverviewTile = ({ title, count, subtitle, onClick, icon }: { title: string; count: number | string; subtitle?: string; onClick?: () => void; icon?: React.ReactNode }) => (
    <button onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 text-left group w-full">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-gray-800 break-words">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{count}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">{subtitle}</p>}
        </div>
        <div className="bg-gray-100 p-2 sm:p-3 rounded-full group-hover:bg-gray-200 transition-colors duration-200 flex-shrink-0 ml-2 sm:ml-0">
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
          <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Facility Booking Management</h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor active bookings, scheduled reservations, and booking history</p>
                </div>
                <div className="flex flex-row flex-wrap gap-2 items-center">
                  <div className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{activeBookings?.length || 0} Active</div>
                  <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{(upcomingBookings?.length || pendingBookings?.length) || 0} Scheduled</div>
                </div>
              </div>

              <Tabs value={bookingTab} onValueChange={(v) => setBookingTab(v)} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-2">
                  <TabsTrigger value="active" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">Active Bookings</span>
                  </TabsTrigger>
                  <TabsTrigger value="pendingList" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">Scheduled</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mt-4 md:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Currently Active Facility Bookings</h3>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{activeBookings?.length || 0} bookings</span>
                    </div>
                    
                    {activeBookings && activeBookings.length > 0 ? (
                      <div className="space-y-3">
                        {activeBookings
                          ?.slice(activeBookingsPage * itemsPerPage, (activeBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-green-300 transition-colors duration-200">
                            {/* Mobile Layout */}
                            <div className="flex flex-col gap-3 md:hidden">
                              {/* Header: Icon + User */}
                              <div className="flex items-start gap-3">
                                <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-900 break-words">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-xs text-gray-600 mt-0.5 break-words">{getFacilityName(booking.facilityId)}</p>
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap flex-shrink-0">Active</span>
                              </div>

                              {/* Participants */}
                              <div className="flex items-center gap-2 pl-11">
                                <span className="text-xs font-medium text-gray-500">Participants:</span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                              </div>

                              {/* Times */}
                              <div className="grid grid-cols-2 gap-2 pl-11">
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Started</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{formatTime(booking.startTime)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(booking.startTime)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Ends</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{formatTime(booking.endTime)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(booking.endTime)}</p>
                                </div>
                              </div>

                              {/* Purpose */}
                              {booking.purpose && (() => {
                                const id = String(booking.id || Math.random());
                                const isOpen = !!openPurpose[id];
                                return (
                                  <div className="pl-11">
                                    <button
                                      onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                      className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                    >
                                      <Eye className="h-3 w-3 text-pink-600" />
                                      <span>View purpose</span>
                                    </button>
                                    {isOpen && (
                                      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: false }))}>
                                        <div className="w-[calc(100vw-2rem)] max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                            <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                          </div>
                                          <div className="p-3">
                                            <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                              {booking.purpose || 'No purpose specified'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Equipment */}
                              {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                                <div className="pl-11">
                                  {renderEquipmentLine(booking)}
                                  {isAdmin && !!booking.equipment && new Date(booking.startTime) > new Date() && !getNeedsStatusForBooking(booking) && (
                                    <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`} className="w-full mt-2 text-xs">
                                      🔎 Check Equipment
                                    </Button>
                                  )}
                                </div>
                              )}

                              {/* Countdown / Arrival Confirmation */}
                              {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                                <div className="pl-11">
                                  {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                                    <div className="flex flex-col gap-2">
                                      <div className="text-xs text-gray-500">Confirmation required in:</div>
                                      <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); try { const label = `${getFacilityName(booking.facilityId)} (${formatDateTime(booking.startTime)})`; toast({ title: 'Arrival Confirmation Expired', description: `Arrival confirmation window expired for ${label}.` }); } catch (e) { toast({ title: 'Arrival Confirmation Expired', description: 'Arrival confirmation window expired for a booking.' }); } }} />
                                      <Button
                                        onClick={() => confirmArrivalMutation.mutate({ bookingId: booking.id })}
                                        variant="outline"
                                        size="sm"
                                        disabled={confirmArrivalMutation.isPending}
                                        aria-label={`Confirm arrival for booking ${booking.id}`}
                                        className="w-full text-xs"
                                      >
                                        {confirmArrivalMutation.isPending ? (
                                          <span className="flex items-center gap-2">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Confirming...
                                          </span>
                                        ) : (
                                          'Confirm Arrival'
                                        )}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <div className="text-xs font-medium text-gray-500">Time remaining</div>
                                      <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                        <Countdown expiry={booking.endTime} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); toast({ title: 'Booking Ended', description: `Booking for ${getUserEmail(booking.userId)} has ended.` }); }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-start justify-between gap-4">
                              {/* Left side: User info */}
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
                              
                              {/* Right side: All other info */}
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto md:flex-1 md:justify-end">
                                {/* View purpose */}
                                {booking.purpose && (() => {
                                  const id = String(booking.id || Math.random());
                                  const isOpen = !!openPurpose[id];
                                  return (
                                    <div className="text-right">
                                      <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose(prev => ({ ...prev, [id]: v }))}>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <PopoverTrigger asChild>
                                                <button
                                                  onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                                  className="flex items-center gap-1 cursor-help text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                                  aria-expanded={isOpen}
                                                >
                                                  <Eye className="h-3 w-3 text-pink-600" />
                                                  <span>View purpose</span>
                                                </button>
                                              </PopoverTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                              </div>
                                              <div className="p-3">
                                                <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                                  {booking.purpose || 'No purpose specified'}
                                                </p>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                            <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                          </div>
                                          <div className="p-3">
                                            <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                              {booking.purpose || 'No purpose specified'}
                                            </p>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  );
                                })()}
                                
                                {/* Started time */}
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-xs text-gray-600">{formatTime(booking.startTime)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(booking.startTime)}</p>
                                </div>
                                
                                {/* Ends time */}
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-xs text-gray-600">{formatTime(booking.endTime)}</p>
                                  <p className="text-xs text-gray-500">{formatDate(booking.endTime)}</p>
                                </div>
                                
                                {/* Active status */}
                                <div className="flex items-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                                </div>
                                
                                {/* Equipment */}
                                <div className="text-right">
                                  {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && renderEquipmentLine(booking)}
                                  {isAdmin && !!booking.equipment && (booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date() && !getNeedsStatusForBooking(booking) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`}>🔎 Check Equipment</Button>
                                    </div>
                                  )}
                                </div>

                                {/* Time remaining or Arrival confirmation */}
                                {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                                  <div className="text-right">
                                    {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                                      <div className="flex flex-col items-end gap-2">
                                        <div className="text-xs text-gray-500">Confirmation required in:</div>
                                        <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); try { const label = `${getFacilityName(booking.facilityId)} (${formatDateTime(booking.startTime)})`; toast({ title: 'Arrival Confirmation Expired', description: `Arrival confirmation window expired for ${label}.` }); } catch (e) { toast({ title: 'Arrival Confirmation Expired', description: 'Arrival confirmation window expired for a booking.' }); } }} />
                                        <Button
                                          onClick={() => confirmArrivalMutation.mutate({ bookingId: booking.id })}
                                          variant="outline"
                                          size="sm"
                                          disabled={confirmArrivalMutation.isPending}
                                          aria-label={`Confirm arrival for booking ${booking.id}`}
                                          className="inline-flex items-center gap-2"
                                        >
                                          {confirmArrivalMutation.isPending ? (
                                            <span className="flex items-center gap-2">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              Confirming...
                                            </span>
                                          ) : (
                                            'Confirm Arrival'
                                          )}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1 items-end">
                                        <div className="text-xs font-medium text-gray-500">Time remaining</div>
                                        <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                          <Countdown expiry={booking.endTime} onExpire={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] }); toast({ title: 'Booking Ended', description: `Booking for ${getUserEmail(booking.userId)} has ended.` }); }} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for active bookings */}
                        {activeBookings.length > itemsPerPage && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
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
                              <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
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
                <TabsContent value="pendingList" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Scheduled Facility Bookings</h3>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{upcomingBookings?.length || 0} bookings</span>
                    </div>
                    
                    {upcomingBookings && upcomingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingBookings
                          ?.slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 transition-colors duration-200">
                            {/* Mobile Layout */}
                            <div className="flex flex-col gap-3 md:hidden">
                              {/* Header: Icon + User Email */}
                              <div className="flex items-start gap-3">
                                <div className="bg-pink-100 p-2 rounded-lg flex-shrink-0">
                                  <Clock className="h-5 w-5 text-pink-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 text-sm break-words">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-xs text-gray-600 mt-0.5 break-words">{getFacilityName(booking.facilityId)}</p>
                                </div>
                              </div>

                              {/* Participants */}
                              <div className="flex items-center gap-2 pl-11">
                                <span className="text-xs font-medium text-gray-500">Participants:</span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                              </div>

                              {/* Time Details */}
                              <div className="grid grid-cols-2 gap-2 pl-11">
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Starts</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900">Ends</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(booking.endTime)}</p>
                                </div>
                              </div>

                              {/* Status Badges */}
                              <div className="flex flex-wrap gap-2 pl-11">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Scheduled</span>
                                { ((booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && !!booking.equipment) && (
                                  (() => {
                                    const ns = getNeedsStatusForBooking(booking);
                                    if (ns === 'prepared') {
                                      return <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">Prepared</span>;
                                    }
                                    if (ns === 'not_available') return null;
                                    return <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">NEEDS</span>;
                                  })()
                                )}
                              </div>

                              {/* Purpose Button */}
                              {booking.purpose && (() => {
                                const id = String(booking.id || Math.random());
                                const isOpen = !!openPurpose[id];
                                return (
                                  <div className="pl-11">
                                    <button
                                      onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                      className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                    >
                                      <Eye className="h-3 w-3 text-pink-600" />
                                      <span>View purpose</span>
                                    </button>
                                    {isOpen && (
                                      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: false }))}>
                                        <div className="w-[calc(100vw-2rem)] max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                            <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                          </div>
                                          <div className="p-3">
                                            <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                              {booking.purpose || 'No purpose specified'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Equipment and Actions */}
                              {((booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date()) && (
                                <div className="pl-11 space-y-2">
                                  {renderEquipmentLine(booking)}
                                  {isAdmin && !!booking.equipment && !getNeedsStatusForBooking(booking) && (
                                    <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`} className="w-full text-xs">
                                      🔎 Check Equipment
                                    </Button>
                                  )}
                                  {isAdmin && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => forceActiveBookingMutation.mutate(booking)} 
                                      disabled={forceActiveBookingMutation.isPending}
                                      className="w-full bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 text-xs"
                                      aria-label={`Force booking ${booking.id} to active`}
                                    >
                                      ⚡ Force Active (Test)
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-start justify-between gap-4">
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
                                      {booking.purpose && (() => {
                                        const id = String(booking.id || Math.random());
                                        const isOpen = !!openPurpose[id];
                                        return (
                                          <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose(prev => ({ ...prev, [id]: v }))}>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <PopoverTrigger asChild>
                                                    <button
                                                      onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                                      className="flex items-center gap-1 cursor-help justify-end text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                                      aria-expanded={isOpen}
                                                    >
                                                      <Eye className="h-3 w-3 text-pink-600" />
                                                      <span>View purpose</span>
                                                    </button>
                                                  </PopoverTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                    <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                                  </div>
                                                  <div className="p-3">
                                                    <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                                      {booking.purpose || 'No purpose specified'}
                                                    </p>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                              </div>
                                              <div className="p-3">
                                                <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                                  {booking.purpose || 'No purpose specified'}
                                                </p>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        );
                                      })()}
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-3">
                                          <p className="text-sm text-gray-900 leading-5 break-words text-left">
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
                                <div className="inline-grid gap-2 justify-items-stretch items-start">
                                  <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                                    <span className="w-full md:w-auto inline-flex items-center justify-center h-6 min-w-[96px] px-3 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Scheduled</span>
                                    { ((booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && !!booking.equipment) && (
                                      (() => {
                                        const ns = getNeedsStatusForBooking(booking);
                                        if (ns === 'prepared') {
                                          return <div className="w-full md:w-auto inline-flex items-center justify-center h-6 min-w-[72px] px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium truncate">Prepared</div>;
                                        }
                                        // Hide Not Available badge in list to match requested UX.
                                        if (ns === 'not_available') return null;
                                        return <div className="w-full md:w-auto inline-flex items-center justify-center h-6 min-w-[96px] px-3 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">NEEDS</div>;
                                      })()
                                    )}
                                  </div>
                                </div>
                                {/* Equipment line and admin actions for pending */}
                                <div className="ml-4">
                                  {((booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date()) && renderEquipmentLine(booking)}
                                  {isAdmin && !!booking.equipment && ((booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date()) && !getNeedsStatusForBooking(booking) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`}>🔎 Check Equipment</Button>
                                    </div>
                                  )}
                                  {isAdmin && new Date(booking.startTime) > new Date() && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => forceActiveBookingMutation.mutate(booking)} 
                                        disabled={forceActiveBookingMutation.isPending}
                                        className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                                        aria-label={`Force booking ${booking.id} to active`}
                                      >
                                        ⚡ Force Active (Test)
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for pending-list (upcoming) bookings */}
                        {upcomingBookings.length > itemsPerPage && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
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
                              <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
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
                {/* Booking Requests tab removed: server now auto-schedules bookings. */}
                
              </Tabs>
            </div>
          </div>
        );
      case "user-management":
  const bookingUsers = usersData?.filter(user => getBookingUserStatus(user.id));
  const bannedUsers = usersData?.filter(user => user.status === "banned");

        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Manage facility booking users and suspended accounts</p>
                </div>
                <div className="flex flex-row flex-wrap sm:flex-col md:flex-row gap-2 items-start md:items-center">
                  <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">{bookingUsers?.length || 0} Booking Users</div>
                  <div className="bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">{bannedUsers?.length || 0} Suspended</div>
                </div>
              </div>

              <Tabs value={userTab} onValueChange={(v: string) => setUserTab(v)} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-2">
                  <TabsTrigger value="booking-users" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Booking Users</span>
                  </TabsTrigger>
                  <TabsTrigger value="banned-users" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <UserX className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <span className="truncate">Suspended</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="booking-users" className="space-y-4 mt-6 md:mt-0">
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
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
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

                <TabsContent value="banned-users" className="space-y-4 mt-6 md:mt-0">
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
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">System Alerts</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Monitor system security alerts and notifications</p>
                </div>
                <div className="flex flex-row flex-wrap gap-2 items-center">
                  <div className="bg-orange-100 text-orange-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{securityUnread || 0} alerts</div>
                  <div className="bg-gray-100 text-gray-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{securityTotal || 0} Total</div>
                </div>
              </div>

              <Tabs value={securityTab} onValueChange={(v: string) => setSecurityTab(v)} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-2">
                  <TabsTrigger value="booking" onClick={() => setSecurityTab('booking')} className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <span className="truncate">Booking Alerts</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" onClick={() => setSecurityTab('users')} className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">User Management</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="booking" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Booking System Alerts</h3>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {alerts?.filter(a => {
                          if (a.type === 'booking') return true;
                          const t = (a.title || '').toLowerCase();
                          return t.includes('booking cancelled') || t.includes('booking canceled');
                        }).length || 0} alerts
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {(() => {
                        const bookingAlerts = (alerts || []).filter(a => {
                          if (a.type === 'booking') return true;
                          const t = (a.title || '').toLowerCase();
                          return t.includes('booking cancelled') || t.includes('booking canceled');
                        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        const alertsPerPage = 10;
                        const page = bookingAlertsPage || 0;
                        const start = page * alertsPerPage;
                        const pageItems = bookingAlerts.slice(start, start + alertsPerPage);

                        return (
                          <>
                            {pageItems.map((alert: SystemAlert) => {
                          const isHighPriority = alert.severity === 'critical' || alert.severity === 'high';
                          // Precompute parsed alert values so we don't put statements inside JSX
                          const raw = String(alert.message || '');
                          const bookingMatch = raw.match(/\[booking:([^\]]+)\]/);
                          const bookingId = bookingMatch ? bookingMatch[1] : null;

                          // Try to detect a modern "Needs: { ... }" payload (JSON-like) and parse it.
                          let needsObj: any = null;
                          try {
                            const needsMatch = raw.match(/Needs:\s*(\{[\s\S]*\})/i);
                            if (needsMatch && needsMatch[1]) {
                              // Attempt to parse the JSON block. Some alerts may include single quotes — tolerate that.
                              const jsonText = needsMatch[1].replace(/\"/g, '"');
                              try {
                                needsObj = JSON.parse(jsonText);
                              } catch (e) {
                                // Attempt a forgiving parse: replace single quotes with double quotes then parse
                                const relaxed = jsonText.replace(/'/g, '"');
                                try { needsObj = JSON.parse(relaxed); } catch (e) { needsObj = null; }
                              }
                            }
                          } catch (e) {
                            needsObj = null;
                          }

                          // Backwards-compatible: fall back to legacy "Requested equipment: ..." free-text extraction
                          const eqMatch = raw.match(/Requested equipment:\s*([^\[]+)/i);
                          let equipmentList: string[] = [];
                          // capture any Others text separately so we don't inline long free-text
                          let alertOthersText: string | null = null;
                          if (needsObj && Array.isArray(needsObj.items)) {
                            const mapped: string[] = [];
                            for (const s of needsObj.items) {
                              const token = String(s).replace(/_/g, ' ').trim();
                              const lower = token.toLowerCase();
                              if (lower.includes('others')) {
                                const trailing = token.replace(/.*?others[:\s-]*/i, '').trim();
                                if (trailing) alertOthersText = alertOthersText || trailing;
                                continue;
                              }
                              if (lower === 'whiteboard') mapped.push('Whiteboard & Markers');
                              else if (lower === 'projector') mapped.push('Projector');
                              else if (lower === 'extension cord' || lower === 'extension_cord') mapped.push('Extension Cord');
                              else if (lower === 'hdmi') mapped.push('HDMI Cable');
                              else if (lower === 'extra chairs' || lower === 'extra_chairs') mapped.push('Extra Chairs');
                              else mapped.push(token);
                            }
                            equipmentList = mapped;
                            if (!alertOthersText && needsObj.others) alertOthersText = String(needsObj.others).trim() || null;
                          } else if (eqMatch && eqMatch[1]) {
                            const parts = eqMatch[1].split(/[,;]+/).map(s => String(s).trim()).filter(Boolean);
                            const mapped: string[] = [];
                            for (const p of parts) {
                              const token = p;
                              const lower = token.toLowerCase();
                              if (lower.includes('others')) {
                                const trailing = token.replace(/.*?others[:\s-]*/i, '').trim();
                                if (trailing) alertOthersText = alertOthersText || trailing;
                                continue;
                              }
                              if (lower === 'whiteboard') mapped.push('Whiteboard & Markers');
                              else if (lower === 'projector') mapped.push('Projector');
                              else if (lower === 'extension cord' || lower === 'extension_cord') mapped.push('Extension Cord');
                              else if (lower === 'hdmi') mapped.push('HDMI Cable');
                              else if (lower === 'extra chairs' || lower === 'extra_chairs') mapped.push('Extra Chairs');
                              else mapped.push(token);
                            }
                            equipmentList = mapped;
                            // attempt to extract trailing Others: text
                            const extrasMatch = eqMatch[1].match(/Others?:\s*(.*)$/i);
                            if (!alertOthersText && extrasMatch && extrasMatch[1]) alertOthersText = String(extrasMatch[1]).trim() || null;
                          }

                          // Compute visible title and requester email (strip trailing em-dash + email)
                          let visibleTitle = String(alert.title || '');
                          let titleRequesterEmail: string | null = null;
                          try {
                            const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
                            if (m && m[1]) {
                              titleRequesterEmail = m[1];
                              visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
                            }
                          } catch (e) { titleRequesterEmail = null; }

                          // Remove booking marker, embedded Needs JSON block, and legacy 'Requested equipment:' free-text
                          const cleaned = String(raw)
                            .replace(/\s*\[booking:[^\]]+\]/, '')
                            .replace(/Needs:\s*\{[\s\S]*\}\s*/i, '')
                            .replace(/Requested equipment:\s*([^\[]+)/i, '')
                            .trim();
                          const othersText = alertOthersText || (needsObj && needsObj.others ? String(needsObj.others).trim() : null);

                            return (
                              <div key={alert.id} className={`bg-white rounded-md p-3 border border-gray-200 transition-colors duration-200 ${alert.isRead ? 'opacity-60' : ''}`}>
                                {/* Mobile Layout */}
                                <div className="flex flex-col gap-3 md:hidden">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                                      isHighPriority ? 'bg-red-100' : 'bg-orange-100'
                                    }`}>
                                      <AlertTriangle className={`h-5 w-5 ${
                                        isHighPriority ? 'text-red-600' : 'text-orange-600'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900 break-words">{visibleTitle}</p>
                                      {titleRequesterEmail && (
                                        <div className="text-xs text-gray-500 mt-0.5 break-words">{titleRequesterEmail}</div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pl-11">
                                    <div className="text-xs text-gray-500 mb-2">{formatDateTime(alert.createdAt)}</div>
                                    <p className="text-xs text-gray-600 break-words whitespace-pre-wrap">
                                      {needsObj ? cleaned : cleaned}
                                    </p>

                                    {(equipmentList && equipmentList.length > 0) && (
                                      <div className="mt-2">
                                        <div className="text-xs font-medium text-gray-700">Requested equipment:</div>
                                        <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                                          {equipmentList.map((it, idx) => <li key={idx} className="break-words">{it}</li>)}
                                        </ul>

                                        {othersText && (
                                          <div className="mt-2">
                                            <div className="p-2 text-xs text-gray-900 break-words whitespace-pre-wrap">{othersText}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {bookingId && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() => {
                                            setSelectedView('booking-management');
                                            setBookingTab('pendingList');
                                            try { setLocation(`/booking#id-${bookingId}`); } catch (e) { /* ignore */ }
                                          }}
                                          className="text-xs text-blue-600 underline"
                                        >
                                          View booking
                                        </button>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      {alert.isRead ? (
                                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          Read
                                        </span>
                                      ) : (
                                        <button
                                          className="w-full px-3 py-2 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                          onClick={async () => {
                                            try {
                                              queryClient.setQueryData(['/api/admin/alerts'], (old: any) => {
                                                if (!Array.isArray(old)) return old;
                                                return old.map((a: any) => 
                                                  a.id === alert.id ? { ...a, isRead: true } : a
                                                );
                                              });
                                              await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                            } catch (e) {
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                            }
                                          }}
                                        >
                                          Mark as Read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden md:flex items-start gap-3">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                    isHighPriority ? 'bg-red-100' : 'bg-orange-100'
                                  }`}>
                                    <AlertTriangle className={`h-5 w-5 ${
                                      isHighPriority ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div className="pr-4 min-w-0">
                                        <p className="font-medium text-sm text-gray-900">{visibleTitle}</p>
                                        {titleRequesterEmail && (
                                          <div className="text-xs text-gray-500 mt-0.5">{titleRequesterEmail}</div>
                                        )}
                                        <div className="mt-1">
                                          <p className="text-xs text-gray-600 break-words break-all whitespace-pre-wrap max-w-full">
                                            {needsObj ? cleaned : cleaned}
                                          </p>

                                          {(equipmentList && equipmentList.length > 0) && (
                                            <div className="mt-2">
                                              <div className="text-xs font-medium text-gray-700">Requested equipment:</div>
                                              <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                                                {equipmentList.map((it, idx) => <li key={idx}>{it}</li>)}
                                              </ul>

                                              {othersText && (
                                                <div className="mt-2">
                                                  {/* 'View other' removed by user request; extra text is still available in details */}
                                                  <div className="max-w-xs p-2 text-sm text-gray-900 break-words whitespace-pre-wrap">{othersText}</div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {bookingId && (
                                            <div className="mt-2">
                                              <button
                                                onClick={() => {
                                                  // Navigate to booking view; the student dashboard uses hash '#booking' plus booking id in some flows
                                                  // We'll navigate to the booking page route and include an id fragment
                                                  setSelectedView('booking-management');
                                                  setBookingTab('pendingList');
                                                  // Use location to open the student booking detail if route supports it
                                                  try { setLocation(`/booking#id-${bookingId}`); } catch (e) { /* ignore */ }
                                                }}
                                                className="text-xs text-blue-600 underline"
                                              >
                                                View booking
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        {/* source not available on SystemAlert type */}
                                      </div>
                                      <div className="w-44 text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                                        <div className="w-full">{formatDateTime(alert.createdAt)}</div>
                                        {alert.isRead ? (
                                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                            Read
                                          </span>
                                        ) : (
                                          <button
                                            className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                            onClick={async () => {
                                              try {
                                                // Optimistically update the UI
                                                queryClient.setQueryData(['/api/admin/alerts'], (old: any) => {
                                                  if (!Array.isArray(old)) return old;
                                                  return old.map((a: any) => 
                                                    a.id === alert.id ? { ...a, isRead: true } : a
                                                  );
                                                });
                                                
                                                // Make the API call
                                                await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                                
                                                // Refetch to ensure consistency
                                                queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                                queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                              } catch (e) {
                                                // Revert on error
                                                queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                              }
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

                        {/* Pagination controls for booking alerts */}
                        {bookingAlerts.length > 10 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Showing {start + 1} to {Math.min(start + 10, bookingAlerts.length)} of {bookingAlerts.length} alerts</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setBookingAlertsPage(prev => Math.max(prev - 1, 0))} disabled={page === 0} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"><ChevronLeft className="h-4 w-4" /></button>
                              <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">{page + 1} of {Math.ceil(bookingAlerts.length / alertsPerPage)}</span>
                              <button onClick={() => setBookingAlertsPage(prev => (bookingAlerts.length > (prev + 1) * alertsPerPage ? prev + 1 : prev))} disabled={bookingAlerts.length <= (page + 1) * alertsPerPage} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                          </div>
                        )}
                      </>
                      );
                      })()}
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
                <TabsContent value="users" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">User Management Activities</h3>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {alerts?.filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          // Include user management events and equipment/needs submission alerts here
                          return t.includes('user banned') || t.includes('user unbanned') || 
                                 t.includes('suspension') || m.includes('banned') || m.includes('unbanned') ||
                                 t.includes('equipment') || t.includes('needs') || m.includes('equipment') || m.includes('needs');
                        }).length || 0} activities
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {(() => {
                        const userAlerts = (alerts || []).filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          // Include user management events and equipment/needs submission alerts here
                          return t.includes('user banned') || t.includes('user unbanned') || 
                                 t.includes('suspension') || m.includes('banned') || m.includes('unbanned') ||
                                 t.includes('equipment') || t.includes('needs') || m.includes('equipment') || m.includes('needs');
                        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        const alertsPerPage = 10;
                        const page = userAlertsPage || 0;
                        const start = page * alertsPerPage;
                        const pageItems = userAlerts.slice(start, start + alertsPerPage);

                        return (
                          <>
                            {pageItems.map((alert: SystemAlert) => {
                          // Helper function to parse equipment data from message
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
                                  const equipmentData = JSON.parse(jsonStr);
                                  return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
                                }
                                return { baseMessage, equipment: null };
                              } catch (e) {
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

                          const { baseMessage, equipment } = parseEquipmentFromMessage(alert.message);
                          const formattedMessage = formatAlertMessage(baseMessage);
                          // If this alert relates to equipment/needs, also append the createdAt time inline
                          const isEquipmentRelated = /equipment|needs/i.test(String(alert.title || '') + ' ' + String(alert.message || ''));
                          const formattedMessageWithTime = (isEquipmentRelated && !equipment) ? `${formattedMessage} at ${formatDateTime(alert.createdAt)}` : formattedMessage;
                          const isUnbanActivity = (alert.title || '').toLowerCase().includes('unbanned') || 
                                                (alert.message || '').toLowerCase().includes('unbanned');
                          const isBanActivity = (alert.title || '').toLowerCase().includes('banned') && !isUnbanActivity;
                          
                          return (
                            <div key={alert.id} className={`bg-white rounded-lg p-3 border transition-colors duration-200 ${
                              isBanActivity ? 'border-red-200 hover:border-red-300' : 
                              isUnbanActivity ? 'border-green-200 hover:border-green-300' : 
                              'border-gray-200 hover:border-gray-300'
                            } ${alert.isRead ? 'opacity-60' : ''}`}>
                              {/* Mobile Layout */}
                              <div className="flex flex-col gap-3 md:hidden">
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
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 break-words">{alert.title}</p>
                                  </div>
                                </div>

                                <div className="pl-11">
                                  <div className="text-xs text-gray-500 mb-2">{formatDateTime(alert.createdAt)}</div>
                                  <p className="text-xs text-gray-600 break-words whitespace-pre-wrap">{formattedMessageWithTime}</p>
                                  
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
                                  
                                  {(isUnbanActivity || isBanActivity) && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {isUnbanActivity && (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <UserCheck className="h-3 w-3" />
                                          User Restored
                                        </div>
                                      )}
                                      {isBanActivity && (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <UserX className="h-3 w-3" />
                                          User Suspended
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    {alert.isRead ? (
                                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        Read
                                      </span>
                                    ) : (
                                      <button
                                        className="w-full px-3 py-2 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                        onClick={async () => {
                                          try {
                                            queryClient.setQueryData(['/api/admin/alerts'], (old: any) => {
                                              if (!Array.isArray(old)) return old;
                                              return old.map((a: any) => 
                                                a.id === alert.id ? { ...a, isRead: true } : a
                                              );
                                            });
                                            await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                          } catch (e) {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                          }
                                        }}
                                      >
                                        Mark as Read
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Desktop Layout */}
                              <div className="hidden md:flex items-start gap-3">
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
                                <div className="flex-grow min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="pr-4 min-w-0 flex-1">
                                      <p className="font-medium text-sm text-gray-900">{alert.title}</p>
                                      <p className="text-xs text-gray-600 mt-1 break-words break-all whitespace-pre-wrap max-w-full">{formattedMessageWithTime}</p>
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
                                      {/* source not available on SystemAlert type */}
                                      { (isUnbanActivity || isBanActivity) && (
                                        <div className="mt-2 flex flex-col md:flex-row gap-2 items-start md:items-center">
                                          {isUnbanActivity && (
                                            <div className="w-full md:w-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              <UserCheck className="h-3 w-3" />
                                              User Restored
                                            </div>
                                          )}
                                          {isBanActivity && (
                                            <div className="w-full md:w-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                              <UserX className="h-3 w-3" />
                                              User Suspended
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="w-44 text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                                      <div className="w-full">{formatDateTime(alert.createdAt)}</div>
                                      {alert.isRead ? (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          Read
                                        </span>
                                      ) : (
                                        <button
                                          className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                                          onClick={async () => {
                                            try {
                                              // Optimistically update the UI
                                              queryClient.setQueryData(['/api/admin/alerts'], (old: any) => {
                                                if (!Array.isArray(old)) return old;
                                                return old.map((a: any) => 
                                                  a.id === alert.id ? { ...a, isRead: true } : a
                                                );
                                              });
                                              
                                              // Make the API call
                                              await apiRequest('POST', `/api/admin/alerts/${alert.id}/read`);
                                              
                                              // Refetch to ensure consistency
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                                            } catch (e) {
                                              // Revert on error
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                                            }
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

                        {/* Pagination controls for user activity alerts */}
                        {userAlerts.length > 10 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Showing {start + 1} to {Math.min(start + 10, userAlerts.length)} of {userAlerts.length} activities</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setUserAlertsPage(prev => Math.max(prev - 1, 0))} disabled={page === 0} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"><ChevronLeft className="h-4 w-4" /></button>
                              <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">{page + 1} of {Math.ceil(userAlerts.length / alertsPerPage)}</span>
                              <button onClick={() => setUserAlertsPage(prev => (userAlerts.length > (prev + 1) * alertsPerPage ? prev + 1 : prev))} disabled={userAlerts.length <= (page + 1) * alertsPerPage} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                          </div>
                        )}
                      </>
                      );
                      })()}
                    </div>
                    
                    {(!alerts || alerts.filter(a => {
                      const t = (a.title || '').toLowerCase();
                      const m = (a.message || '').toLowerCase();
                      return t.includes('user banned') || t.includes('user unbanned') || 
                             t.includes('suspension') || m.includes('banned') || m.includes('unbanned') ||
                             t.includes('equipment') || t.includes('needs') || m.includes('equipment') || m.includes('needs');
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
        // Prepare lists for the activity logs view (improved with richer details)
        const successfullyBooked = allBookings.filter(b => b.status === 'approved' && b.arrivalConfirmed && new Date(b.endTime) < new Date());
        const bookingHistory = allBookings.filter(b => ['denied', 'cancelled', 'expired', 'void'].includes(b.status) || (b.status === 'approved' && new Date(b.endTime) < new Date() && !b.arrivalConfirmed));
        
        // Deduplicate activities and alerts by id to prevent duplicates
        const combinedActivity = [ ...(activities || []), ...(alerts || []) ];
        const seenIds = new Set();
        const systemActivity = combinedActivity
          .filter((item: any) => {
            if (seenIds.has(item.id)) {
              return false; // Skip duplicates
            }
            seenIds.add(item.id);
            return true;
          })
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // bookingDuration removed (unused) — compute inline if needed

        const statusClass = (statusRaw: any) => {
          const s = String(statusRaw || '').toLowerCase();
          if (s === 'pending' || s === 'request' || s === 'requested') return 'text-green-600';
          if (s === 'approved' || s === 'completed') return 'text-green-600';
          if (s === 'denied' || s === 'cancelled' || s === 'canceled') return 'text-red-600';
          if (s === 'expired' || s === 'void') return 'text-gray-600';
          return 'text-gray-600';
        };

        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Activity Logs</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Centralized booking and system logs — detailed view for auditing and troubleshooting</p>
                </div>
                <div className="flex flex-row flex-wrap gap-2 items-center">
                  <div className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{successfullyBooked.length || 0} Successful</div>
                  <div className="bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{bookingHistory.length || 0} History</div>
                  <div className="bg-gray-100 text-gray-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center">{systemActivity.length || 0} System</div>
                </div>
              </div>

              <Tabs value={settingsTab} onValueChange={(v: string) => setSettingsTab(v)} className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-2">
                  <TabsTrigger value="success" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">Successfully Booked</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <BarChart3 className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <span className="truncate">Booking History</span>
                  </TabsTrigger>
                  <TabsTrigger value="system" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
                    <Activity className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <span className="truncate">System Activity</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="success" className="space-y-2 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-6 mt-0">
                    <h3 className="text-lg font-semibold text-gray-900">Successfully Booked</h3>
                    <p className="text-sm text-gray-600 mt-1">Completed bookings which were approved and had confirmed arrival.</p>
                    {successfullyBooked.length > 0 ? (
                      <>
                        <div className="space-y-2 mt-3">
                          {successfullyBooked.slice(successPage * itemsPerPage, (successPage + 1) * itemsPerPage).map((b: FacilityBooking) => (
                            <div key={b.id} className="bg-white rounded-md p-3 border border-gray-200">
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                {/* Left: user email + room + participants */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-900">{getUserEmail(b.userId)}</h4>
                                  <p className="text-xs text-gray-600">{getFacilityName(b.facilityId)}</p>
                                  <p className="text-xs text-gray-500 mt-1">Participants: <span className="text-xs text-gray-700">{b.participants || 0}</span></p>
                                </div>

                                {/* Right: stacked on mobile, inline on md+: Purpose | Starts : Ends | Status */}
                                <div className="w-full md:flex-1 flex flex-col md:flex-row items-start md:items-center min-w-0">
                                  <div className="w-full md:flex-1 flex items-center justify-start md:justify-end gap-2 text-xs text-gray-500 min-w-0">
                                    <span className="text-xs text-gray-500">Purpose:</span>
                                    {b.purpose ? (() => {
                                      const id = `purpose-${b.id}`;
                                      const isOpen = !!openPurpose[id];
                                      return (
                                        <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose(prev => ({ ...prev, [id]: v }))}>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                  <button
                                                    onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                                    className="flex items-center gap-1 cursor-help text-xs text-pink-600"
                                                    aria-expanded={isOpen}
                                                  >
                                                    <Eye className="h-3 w-3 text-pink-600" />
                                                    <span>View</span>
                                                  </button>
                                                </PopoverTrigger>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                  <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                                </div>
                                                <div className="p-3">
                                                  <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                              <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                            </div>
                                            <div className="p-3">
                                              <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      );
                                    })() : null}
                                    <span className="text-xs text-gray-400 whitespace-nowrap">|</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">Starts:</span>
                                    <span className="text-xs text-gray-900 whitespace-nowrap">{formatDateTime(b.startTime)}</span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">|</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">Ends:</span>
                                    <span className="text-xs text-gray-900 whitespace-nowrap">{formatDateTime(b.endTime)}</span>
                                  </div>
                                  <div className="w-full md:w-36 text-right mt-2 md:mt-0 md:ml-4 flex items-center justify-end gap-2 md:whitespace-nowrap">
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className={`text-xs font-medium ${statusClass(b.status)} capitalize`}>Status: {String(b.status || '')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {successfullyBooked.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {successPage * itemsPerPage + 1} to {Math.min((successPage + 1) * itemsPerPage, successfullyBooked.length)} of {successfullyBooked.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSuccessPage(prev => Math.max(prev - 1, 0))}
                                disabled={successPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {successPage + 1} of {Math.ceil(successfullyBooked.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setSuccessPage(prev => (successfullyBooked && (prev + 1) * itemsPerPage < successfullyBooked.length ? prev + 1 : prev))}
                                disabled={!successfullyBooked || (successPage + 1) * itemsPerPage >= successfullyBooked.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState Icon={CheckCircle} message="No successful bookings found" />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-2 mt-6 md:mt-0">
                <div className="bg-gray-50 rounded-lg p-6 mt-0">
                    <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
                    <p className="text-sm text-gray-600 mt-1">Past bookings including denied, cancelled or expired reservations for audit purposes.</p>
                    {bookingHistory.length > 0 ? (
                      <>
                        <div className="space-y-2 mt-3">
                          {bookingHistory.slice(historyPage * itemsPerPage, (historyPage + 1) * itemsPerPage).map((b: FacilityBooking) => (
                            <div key={b.id} className="bg-white rounded-md p-3 border border-gray-200">
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                {/* Left: user email + room + participants */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-900">{getUserEmail(b.userId)}</h4>
                                  <p className="text-xs text-gray-600">{getFacilityName(b.facilityId)}</p>
                                  <p className="text-xs text-gray-500 mt-1">Participants: <span className="text-xs text-gray-700">{b.participants || 0}</span></p>
                                </div>

                                {/* Right: on mobile purpose stacks above dates; on md+ it is a single-line with truncation */}
                                <div className="w-full md:flex-1 flex flex-col md:flex-row items-start md:items-center min-w-0">
                                  <div className="w-full md:flex-1 min-w-0">
                                    {/* Purpose: block on mobile, inline + truncate on md+ */}
                                    <div className="block md:hidden text-sm text-gray-900 mb-1">
                                      {b.purpose && (() => {
                                        const id = `purpose-mobile-${b.id}`;
                                        const isOpen = !!openPurpose[id];
                                        return (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Purpose:</span>
                                            <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose(prev => ({ ...prev, [id]: v }))}>
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <PopoverTrigger asChild>
                                                      <button
                                                        onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                                        className="flex items-center gap-1 cursor-help text-xs text-pink-600"
                                                        aria-expanded={isOpen}
                                                      >
                                                        <Eye className="h-3 w-3 text-pink-600" />
                                                        <span>View</span>
                                                      </button>
                                                    </PopoverTrigger>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                      <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                                    </div>
                                                    <div className="p-3">
                                                      <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                                    </div>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                              <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                  <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                                </div>
                                                <div className="p-3">
                                                  <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div className="hidden md:flex items-center justify-start gap-2 text-xs text-gray-500 min-w-0">
                                      <span className="text-xs text-gray-500">Purpose:</span>
                                      {b.purpose ? (() => {
                                        const id = `purpose-${b.id}`;
                                        const isOpen = !!openPurpose[id];
                                        return (
                                          <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose(prev => ({ ...prev, [id]: v }))}>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <PopoverTrigger asChild>
                                                    <button
                                                      onClick={() => setOpenPurpose(prev => ({ ...prev, [id]: !prev[id] }))}
                                                      className="flex items-center gap-1 cursor-help text-xs text-pink-600"
                                                      aria-expanded={isOpen}
                                                    >
                                                      <Eye className="h-3 w-3 text-pink-600" />
                                                      <span>View</span>
                                                    </button>
                                                  </PopoverTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                    <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                                  </div>
                                                  <div className="p-3">
                                                    <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                              </div>
                                              <div className="p-3">
                                                <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        );
                                      })() : null}
                                      <span className="text-xs text-gray-400">|</span>
                                      <span className="text-xs text-gray-500">Starts:</span>
                                      <span className="text-xs text-gray-900">{formatDateTime(b.startTime)}</span>
                                      <span className="text-xs text-gray-400">|</span>
                                      <span className="text-xs text-gray-500">Ends:</span>
                                      <span className="text-xs text-gray-900">{formatDateTime(b.endTime)}</span>
                                    </div>

                                    {/* Dates row for mobile (hidden on md+) */}
                                    <div className="flex items-center justify-start gap-2 text-xs text-gray-500 mt-1 md:mt-0 md:hidden">
                                      <span className="text-xs text-gray-500">Starts:</span>
                                      <span className="text-xs text-gray-900">{formatDateTime(b.startTime)}</span>
                                      <span className="text-xs text-gray-400">|</span>
                                      <span className="text-xs text-gray-500">Ends:</span>
                                      <span className="text-xs text-gray-900">{formatDateTime(b.endTime)}</span>
                                    </div>
                                  </div>

                                  <div className="w-full md:w-36 text-right mt-2 md:mt-0 md:ml-4 flex items-center justify-end gap-2 md:whitespace-nowrap">
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className={`text-xs font-medium ${statusClass(b.status)} capitalize`}>Status: {String(b.status || '')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {bookingHistory.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {historyPage * itemsPerPage + 1} to {Math.min((historyPage + 1) * itemsPerPage, bookingHistory.length)} of {bookingHistory.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHistoryPage(prev => Math.max(prev - 1, 0))}
                                disabled={historyPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {historyPage + 1} of {Math.ceil(bookingHistory.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setHistoryPage(prev => (bookingHistory && (prev + 1) * itemsPerPage < bookingHistory.length ? prev + 1 : prev))}
                                disabled={!bookingHistory || (historyPage + 1) * itemsPerPage >= bookingHistory.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState Icon={BarChart3} message="No booking history records" />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="system" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900">System Activity</h3>
                    <p className="text-sm text-gray-500 mt-1">Combined system alerts and activity logs for security and operational events.</p>
                    {systemActivity.length > 0 ? (
                      <>
                        <div className="space-y-2 mt-3">
                          {systemActivity.slice(systemPage * itemsPerPage, (systemPage + 1) * itemsPerPage).map((a: any, idx: number) => {
                            // Helper function to parse equipment data from message
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
                                    const equipmentData = JSON.parse(jsonStr);
                                    return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
                                  }
                                  return { baseMessage, equipment: null };
                                } catch (e) {
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

                            return (
                            (() => {
                            // Resolve actor email: userId -> email in details -> usersMap lookup -> current user email
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
                            } catch (e) { actorEmail = '' }

                            if (!actorEmail) actorEmail = user?.email || '';

                            // If the title includes an appended email (e.g. "Equipment Needs Submitted — test@uic.edu.ph"),
                            // remove it from the visible title and treat it as a potential target email (booking owner) but do not force it.
                            let visibleTitle = String(a.title || a.action || '');
                            // Normalize certain server-produced titles: present equipment needs as a request label
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
                            } catch (e) { appendedEmail = null; }

                            const rawMsg = a.message || a.details || '';
                            let formatted = formatAlertMessage(rawMsg);
                            // If appendedEmail present, prefer using it as the target (booking owner) when appropriate.
                            // We'll only fall back to using it as the actorEmail if no other actor can be resolved.
                            let appendedIsTarget = false;
                            if (appendedEmail) {
                              appendedIsTarget = true;
                            }

                            // For 'Needs Request' messages, prefer showing the booking/target email first.
                            try {
                              if (/needs request/i.test(visibleTitle)) {
                                const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
                                const rawEmails = (String(formatted).match(emailRegex) || []);
                                const uniq: string[] = [];
                                for (const e of rawEmails) if (!uniq.includes(e)) uniq.push(e);

                                // Determine target email: prefer appendedEmail (if present and not equal to actorEmail),
                                // then prefer any unique email in the message that differs from actorEmail, otherwise use first found.
                                let targetEmail = '';
                                if (appendedIsTarget && appendedEmail && appendedEmail.toLowerCase() !== actorEmail.toLowerCase()) targetEmail = appendedEmail;
                                if (!targetEmail) {
                                  for (const e of uniq) {
                                    if (actorEmail && e.toLowerCase() === String(actorEmail).toLowerCase()) continue;
                                    targetEmail = e; break;
                                  }
                                }
                                if (!targetEmail && uniq.length > 0) targetEmail = uniq[0];

                                // Build rest of message without leading emails
                                let rest = String(formatted).replace(emailRegex, '').trim();
                                rest = rest.replace(/^[:\-\s,]+/, '').trim();
                                if (!/^(requested|requested equipment|requested equipment:)/i.test(rest)) {
                                  rest = `requested equipment: ${rest}`.trim();
                                }

                                if (targetEmail) {
                                  formatted = `${targetEmail} ${rest}`.trim();
                                }
                                // If we still don't have an actorEmail, and appendedEmail wasn't used as target, use it as actor fallback
                                if (!actorEmail && appendedEmail && appendedEmail !== targetEmail) actorEmail = appendedEmail;
                              }
                            } catch (e) {
                              // ignore
                            }
                            // If the activity contains an embedded Needs: { ... } JSON block, parse and replace it with a friendly list
                            try {
                              const needsMatch = (a.message || a.details || '').toString().match(/Needs:\s*(\{[\s\S]*\})/i);
                              if (needsMatch && needsMatch[1]) {
                                let needsObj: any = null;
                                const jsonText = needsMatch[1];
                                try {
                                  needsObj = JSON.parse(jsonText);
                                } catch (e) {
                                  try { needsObj = JSON.parse(jsonText.replace(/'/g, '"')); } catch (e) { needsObj = null; }
                                }
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
                                  // remove any items that reference 'others' (e.g., 'othersTEST') to avoid inline artifacts
                                  for (let i = mappedItems.length - 1; i >= 0; i--) {
                                    if (/others/i.test(String(mappedItems[i]))) mappedItems.splice(i, 1);
                                    else mappedItems[i] = String(mappedItems[i]).replace(/[.,;]+$/g, '').trim();
                                  }
                                  const others = needsObj.others ? String(needsObj.others).trim() : '';
                                  const othersText = othersTextFromItems || others || '';
                                  const joinWithAnd = (arr: string[]) => { if (!arr || arr.length === 0) return ''; if (arr.length === 1) return arr[0]; if (arr.length === 2) return `${arr[0]} and ${arr[1]}`; return `${arr.slice(0, -1).join(', ')} and ${arr.slice(-1)[0]}`; };
                                  const equipmentText = joinWithAnd(mappedItems);
                                  const buildWithOthers = (items: string[]) => {
                                    if (!items || items.length === 0) return 'others';
                                    if (items.length === 1) return `${items[0]} and others`;
                                    // for 2+ items: 'A, B and others'
                                    const head = items.slice(0, -1).join(', ');
                                    const last = items[items.length - 1];
                                    return `${head}, ${last} and others`;
                                  };
                                  // If there is an 'others' free-text blob, attach it inline in parentheses to avoid duplicate 'Others:' fragments.
                                  // Use 'and others' wording instead of parenthetical free-text to avoid duplicating 'Others:' fragments
                                  const replacement = othersText
                                    ? (mappedItems.length ? `Needs: ${buildWithOthers(mappedItems)}` : `Needs: others`)
                                    : `Needs: ${equipmentText}`;
                                  try { formatted = String(formatted).replace(/Needs:\s*\{[\s\S]*\}\s*/i, replacement).trim(); } catch (e) {}
                                }
                              }
                            } catch (e) { /* ignore parse errors */ }
                            // Also handle legacy free-text 'Requested equipment: ...' by mapping tokens to friendly labels
                            try {
                              const eqMatch = (a.message || a.details || '').toString().match(/Requested equipment:\s*([^\[]+)/i);
                              if (eqMatch && eqMatch[1]) {
                                const rawList = String(eqMatch[1]).trim();
                                const parts = rawList.split(/[,;]+/).map(s => String(s).trim()).filter(Boolean);
                                let othersText = '';
                                const mapped = parts.map((it) => {
                                  const raw = String(it).trim();
                                  const lower = raw.toLowerCase();
                                  // If token contains 'others' treat it as the Others marker and capture trailing text
                                  if (lower.includes('others')) {
                                    const trailing = raw.replace(/.*?others[:\s-]*/i, '').trim();
                                    if (trailing && !othersText) othersText = trailing;
                                    return null; // omit from equipment list
                                  }
                                  if (lower === 'whiteboard') return 'Whiteboard & Markers';
                                  if (lower === 'projector') return 'Projector';
                                  if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
                                  if (lower === 'hdmi') return 'HDMI Cable';
                                  if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
                                  return raw;
                                }).filter(Boolean) as string[];
                                // remove any items that reference 'others' (e.g., 'othersTEST') to avoid inline artifacts
                                for (let i = mapped.length - 1; i >= 0; i--) {
                                  if (/others/i.test(String(mapped[i]))) mapped.splice(i, 1);
                                  else mapped[i] = String(mapped[i]).replace(/[.,;]+$/g, '').trim();
                                }
                                // Extract 'Others: ...' if present at end like 'Others: TEST' unless captured above
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

                                // Attach any 'Others: <text>' content inline to avoid later duplicate fragments
                                let replacement = '';
                                if (othersText) {
                                  if (equipmentItems.length === 0) {
                                    replacement = `requested equipment: others`;
                                  } else {
                                    replacement = `requested equipment: ${buildWithOthers(equipmentItems)}`;
                                  }
                                } else {
                                  replacement = `requested equipment: ${joinWithAnd(equipmentItems)}`;
                                }
                                try { formatted = String(formatted).replace(/Requested equipment:\s*([^\[]+)/i, replacement).trim(); } catch (e) {}
                              }
                            } catch (e) { /* ignore */ }
                            // Strip any remaining long 'Others: ...' fragments from the inline formatted text (they remain in the detailed block)
                            try {
                              // Convert a trailing ', others' into ' and others' for correct grammar
                              formatted = String(formatted).replace(/,\s*(and\s+)?others(\b)/i, ' and others$2');
                              // Remove long 'Others: <text>' fragments from the inline sentence (keep details in the block)
                              formatted = String(formatted).replace(/,?\s*Others?:\s*[^,\]]+/i, '').replace(/\s{2,}/g, ' ').trim();
                              // Normalize a possible trailing comma before 'and others' (', and others' -> ' and others')
                              formatted = formatted.replace(/,\s*and\s+others/i, ' and others');
                            } catch (e) {}
                            // Remove generic leading 'Admin' to avoid confusion when actor is shown separately
                            try {
                              formatted = formatted.replace(/^Admin\b[:\s,-]*/i, '');
                            } catch (e) {}

                            // Remove actorEmail occurrences from the formatted details so it doesn't appear twice
                            if (actorEmail) {
                              try {
                                const esc = String(actorEmail).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                formatted = String(formatted).replace(new RegExp(esc, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
                              } catch (e) {}
                            }

                            // Try to find the booking/user target email mentioned in the message
                            let targetEmail = '';
                            try {
                              const m = (a.message || a.details || '').toString().match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                              if (m) targetEmail = m[1];
                            } catch (e) { /* ignore */ }

                            // Try to extract a booking id from the message/details so we can look up booking info
                            let extractedBookingId: string | null = null;
                            try {
                              const bidMatch = (a.message || a.details || '').toString().match(/booking\s+([0-9a-zA-Z-]{6,64})/i);
                              if (bidMatch) extractedBookingId = bidMatch[1];
                            } catch (e) { extractedBookingId = null; }

                            // If we found a booking id, try to locate the booking to extract user/facility
                            let lookedUpBooking: FacilityBooking | undefined;
                            if (extractedBookingId) {
                              try {
                                lookedUpBooking = allBookings.find(b => String(b.id) === String(extractedBookingId));
                              } catch (e) { lookedUpBooking = undefined; }
                            }

                            // Heuristics to make the sub-line read naturally:
                            // - If the event is a 'request', ensure the requester (targetEmail) leads the line
                            // - If the event is an admin action (approved/denied/confirmed), prepend actorEmail
                            const title = String((a.title || a.action || '')).toLowerCase();
                            const isRequest = title.includes('request') || title.includes('requested') || title.includes('new booking');
                            const isApproved = title.includes('approve') || title.includes('approved');
                            const isDenied = title.includes('deny') || title.includes('denied');
                            const isCancelled = title.includes('cancel');
                            const isArrival = title.includes('arrival') || title.includes('confirmed');

                            // Determine a timestamp for this activity (fallbacks) and build a readable sub-line
                            const activityTime = a.createdAt || a.created_at || a.timestamp || a.time || a.date || a.updatedAt || a.updated_at;

                            // Build a readable sub-line
                            let subLine = formatted;
                              try {
                              if (isRequest) {
                                // For requests, prefer the requester at the start
                                if (targetEmail && !/^\s*\S+@/.test(subLine)) {
                                  subLine = `${targetEmail} ${subLine}`.trim();
                                }
                              } else if (isApproved || isDenied || isCancelled || isArrival) {
                                // For admin actions, ensure actorEmail starts the sub-line
                                if (isArrival && lookedUpBooking) {
                                  // Build a clearer arrival message using the booking record when available
                                  const who = getUserEmail(lookedUpBooking.userId);
                                  const where = getFacilityName(lookedUpBooking.facilityId);
                                  const when = `${formatDateTime(lookedUpBooking.startTime)} to ${formatDateTime(lookedUpBooking.endTime)}`;
                                  subLine = `${actorEmail} confirmed arrival for ${who} at ${where} from ${when}`;
                                } else if (actorEmail && !subLine.toLowerCase().startsWith(actorEmail.toLowerCase())) {
                                  subLine = `${actorEmail} ${subLine}`.trim();
                                }
                              } else {
                                // Default: if subLine doesn't include a person, prepend actor if available
                                if (actorEmail && !/^\s*\S+@/.test(subLine)) {
                                  subLine = `${actorEmail} ${subLine}`.trim();
                                }
                              }
                            } catch (e) {}

                              // Ensure equipment-related events include the action time inline (if not already present)
                              try {
                                const actionLower = String((a.title || a.action || '')).toLowerCase();
                                const isEquipmentAction = /equipment|needs/i.test(actionLower) || /needs request/i.test(visibleTitle.toLowerCase());
                                const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}:\d{2}/.test(subLine);
                                if (isEquipmentAction && activityTime && !hasDateLike) {
                                  const t = formatDateTime(activityTime);
                                  if (t) subLine = `${subLine} at ${t}`.trim();
                                }
                              } catch (e) {}

                              // Parse equipment from the message
                              const { baseMessage, equipment } = parseEquipmentFromMessage(a.message || a.details || '');
                              const displaySubLine = equipment ? baseMessage : subLine;

                                return (
                              <div key={a.id || idx} className="bg-white rounded-md p-3 border border-gray-200">
                                {/* Mobile Layout */}
                                <div className="flex flex-col gap-2 md:hidden">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-sm text-gray-900 flex-1 break-words">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</p>
                                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                      {(activityTime ? formatDateTime(activityTime) : (a.createdAt ? formatDateTime(a.createdAt) : ''))}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 break-words">{displaySubLine}</p>
                                  {equipment && (
                                    <div className="flex flex-wrap gap-1.5">
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
                                  {a.source && <div className="text-xs text-gray-400">Source: {a.source}</div>}
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden md:flex items-start justify-between gap-3">
                                  <div className="flex-1 pr-4">
                                    <p className="font-medium text-sm text-gray-900">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</p>
                                    <p className="text-xs text-gray-600 mt-1">{displaySubLine}</p>
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
                                    <div className="mt-1 text-xs text-gray-400">{a.source ? `Source: ${a.source}` : ''}</div>
                                  </div>

                                  <div className="w-44 text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                                    <div className="w-full">{(activityTime ? formatDateTime(activityTime) : (a.createdAt ? formatDateTime(a.createdAt) : ''))}</div>
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
                                onClick={() => setSystemPage(prev => Math.max(prev - 1, 0))}
                                disabled={systemPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
                                {systemPage + 1} of {Math.ceil(systemActivity.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setSystemPage(prev => (systemActivity && (prev + 1) * itemsPerPage < systemActivity.length ? prev + 1 : prev))}
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
                  <TabsTrigger value="facilities" className="w-full whitespace-normal flex items-center justify-start gap-2 text-left md:justify-center md:text-center">
                    <Settings className="h-4 w-4 text-gray-600" />
                    Facility Management
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="facilities" className="space-y-4 mt-6 md:mt-0">
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Facility Availability Control</h3>
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{facilities?.length || 0} facilities</span>
                    </div>
                    
                    {facilities && facilities.length > 0 ? (
                      <div className="space-y-3">
                        {facilities.map((facility: Facility) => (
                          <div key={facility.id} className={`bg-white rounded-lg p-4 border border-gray-200 transition-colors duration-200 hover:${facility.isActive ? 'border-green-300' : 'border-red-300'}`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="flex items-start md:items-center gap-4">
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
                              
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
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
                                  className={`w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <OverviewTile
                title="Active Bookings"
                count={activeBookings?.length || 0}
                subtitle="Currently in progress"
                onClick={() => { setSelectedView("booking-management"); setBookingTab('active'); }}
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
              />

              <OverviewTile
                title="Scheduled Bookings"
                count={upcomingBookings?.length || 0}
                subtitle="Auto-scheduled reservations"
                onClick={() => { setSelectedView("booking-management"); setBookingTab('pendingList'); }}
                icon={<Clock className="h-6 w-6 text-green-600" />}
              />

              <OverviewTile
                title="System Alerts"
                count={stats?.systemAlerts || 0}
                subtitle="Requiring attention"
                onClick={() => setSelectedView("security")}
                icon={<TriangleAlert className="h-6 w-6 text-orange-600" />}
              />
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Generate reports and manage system</p>
                </div>
                <Button 
                  size="default" 
                  className="bg-pink-600 hover:bg-pink-700 text-white shadow-sm text-sm w-full sm:w-auto"
                  onClick={() => generateBookingWeeklyReport?.()} 
                  aria-label="Generate weekly booking report"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Generate Weekly Report</span>
                </Button>
              </div>
            </div>

            {/* Overview Sections */}
              <div className="mb-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Availability Preview</h3>
                      <p className="text-sm text-gray-600 mt-1">Quick view of today's scheduled slots</p>
                    </div>
                  </div>
                  <div>
                    <AvailabilityGrid />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Scheduled Bookings</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Upcoming approved and auto-scheduled reservations</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">
                    {scheduledCount || 0} scheduled
                  </div>
                </div>

                {upcomingBookings && upcomingBookings.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0,5).map((booking) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            setSelectedView('booking-management');
                            setBookingTab('pendingList');
                            try { setLocation(`/admin#booking-${booking.id}`); } catch (e) { /* ignore */ }
                          }}
                          aria-label={`Open booking ${booking.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                              <p className="text-sm text-gray-600">{getUserEmail(booking.userId)} • {new Date(booking.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div>
                              {renderStatusBadge(booking.status)}
                            </div>
                          </div>
                        </button>
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
                  <EmptyState Icon={Calendar} message="No scheduled bookings" />
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Booking History</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">A quick preview of the most recent booking records</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent System Alerts</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Booking and user management alerts</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center self-start">
                    {alerts?.length || 0} alerts
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      onClick={() => setAlertsPreviewTab('booking')}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium ${alertsPreviewTab === 'booking' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Booking Alerts
                    </button>
                    <button
                      onClick={() => setAlertsPreviewTab('users')}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium ${alertsPreviewTab === 'users' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'}`}
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
                      }).slice(0,5).map((alert: SystemAlert) => {
                        // Helper function to parse equipment data from message
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
                                const equipmentData = JSON.parse(jsonStr);
                                return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
                              }
                              return { baseMessage, equipment: null };
                            } catch (e) {
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

                        const { baseMessage, equipment } = parseEquipmentFromMessage(alert.message);
                        const fm = formatAlertMessage(baseMessage);
                        const isEquipmentRelated = /equipment|needs/i.test(String(alert.title || '') + ' ' + String(alert.message || ''));
                        // Don't append inline time if the message already contains date/time text (e.g., booking 'from ... to ...')
                        const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}/.test(fm) || /\bfrom\b[\s\S]*\bto\b/i.test(fm) || /\bat\s*\d{1,2}:\d{2}/i.test(fm);
                        const shouldAppendTime = isEquipmentRelated && !hasDateLike && !equipment;
                        const fmWithTime = shouldAppendTime ? `${fm} at ${formatDateTime(alert.createdAt)}` : fm;
                        return (
                          <div key={alert.id} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors duration-150">
                            {/* Mobile Layout */}
                            <div className="flex flex-col gap-2 md:hidden">
                              <h4 className="font-medium text-gray-900 text-sm break-words">{alert.title}</h4>
                              <div className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</div>
                              <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
                              {equipment && (
                                <div className="flex flex-wrap gap-1.5">
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
                            
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                                <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
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
                              <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{formatDateTime(alert.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts?.filter(a => {
                        const t = (a.title || '').toLowerCase();
                        const m = (a.message || '').toLowerCase();
                        // Include user management events and equipment/needs submission alerts
                        return t.includes('user') || m.includes('banned') || m.includes('unbanned') || t.includes('suspension') ||
                               t.includes('equipment') || t.includes('needs') || m.includes('equipment') || m.includes('needs');
                      }).slice(0,5).map((alert: SystemAlert) => {
                        // Helper function to parse equipment data from message
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
                                const equipmentData = JSON.parse(jsonStr);
                                return { baseMessage, equipment: equipmentData.items || equipmentData || {} };
                              }
                              return { baseMessage, equipment: null };
                            } catch (e) {
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

                        const { baseMessage, equipment } = parseEquipmentFromMessage(alert.message);
                        const fm = formatAlertMessage(baseMessage);
                        const isEquipmentRelated = /equipment|needs/i.test(String(alert.title || '') + ' ' + String(alert.message || ''));
                        // Don't append inline time if the message already contains date/time text (e.g., booking 'from ... to ...')
                        const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}/.test(fm) || /\bfrom\b[\s\S]*\bto\b/i.test(fm) || /\bat\s*\d{1,2}:\d{2}/i.test(fm);
                        const shouldAppendTime = isEquipmentRelated && !hasDateLike && !equipment;
                        const fmWithTime = shouldAppendTime ? `${fm} at ${formatDateTime(alert.createdAt)}` : fm;
                        return (
                          <div key={alert.id} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors duration-150">
                            {/* Mobile Layout */}
                            <div className="flex flex-col gap-2 md:hidden">
                              <h4 className="font-medium text-gray-900 text-sm break-words">{alert.title}</h4>
                              <div className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</div>
                              <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
                              {equipment && (
                                <div className="flex flex-wrap gap-1.5">
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
                            
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                                <p className="text-xs text-gray-600 break-words">{fmWithTime}</p>
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
                              <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{formatDateTime(alert.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => { setSelectedView('admin-activity-logs'); setSettingsTab('system'); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors duration-150"
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>

              {/* Block 2: Recent System Activity (preview of activities) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900">Recent System Activity</h3>
                    <p className="text-xs sm:text-base text-gray-600 mt-1">Monitor system events and user actions</p>
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">
                    {activities?.length || 0} Events
                  </div>
                </div>

                {activities && activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((a: any, idx: number) => {
                      // Helper function to parse equipment data from message
                      const parseEquipmentFromMessage = (message: string) => {
                        const equipmentMatch = message.match(/\[Equipment:\s*(\{.*\})\]/i);
                        if (equipmentMatch) {
                          try {
                            const baseMessage = message.substring(0, equipmentMatch.index).trim();
                            const equipmentData = JSON.parse(equipmentMatch[1]);
                            return { baseMessage, equipment: equipmentData.items || {} };
                          } catch (e) {
                            return { baseMessage: message, equipment: null };
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

                      return (
                      (() => {
                        // Use the same rich formatting logic as the System Activity list so the preview matches
                        // Resolve actor email
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
                        } catch (e) { actorEmail = '' }
                        if (!actorEmail) actorEmail = user?.email || '';

                        // Title normalization
                        let visibleTitle = String(a.title || a.action || '');
                        try {
                          if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) {
                            visibleTitle = 'Equipment or Needs Request';
                          }
                        } catch (e) {}

                        let formatted = formatAlertMessage(a.message || a.details || '');
                        // If appendedEmail present, prefer using it as the target when appropriate

                        // Reuse the same 'Needs:' JSON parsing and 'Requested equipment' mapping as in the main system activity
                        try {
                          const needsMatch = (a.message || a.details || '').toString().match(/Needs:\s*(\{[\s\S]*\})/i);
                          if (needsMatch && needsMatch[1]) {
                            let needsObj: any = null;
                            const jsonText = needsMatch[1];
                            try { needsObj = JSON.parse(jsonText); } catch (e) { try { needsObj = JSON.parse(jsonText.replace(/'/g, '"')); } catch (e) { needsObj = null; } }
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
                              const joinWithAnd = (arr: string[]) => { if (!arr || arr.length === 0) return ''; if (arr.length === 1) return arr[0]; if (arr.length === 2) return `${arr[0]} and ${arr[1]}`; return `${arr.slice(0, -1).join(', ')} and ${arr.slice(-1)[0]}`; };
                              const equipmentText = joinWithAnd(mappedItems);
                              const buildWithOthers = (items: string[]) => {
                                if (!items || items.length === 0) return 'others';
                                if (items.length === 1) return `${items[0]} and others`;
                                const head = items.slice(0, -1).join(', ');
                                const last = items[items.length - 1];
                                return `${head}, ${last} and others`;
                              };
                              const replacement = othersText
                                ? (mappedItems.length ? `Needs: ${buildWithOthers(mappedItems)}` : `Needs: others`)
                                : `Needs: ${equipmentText}`;
                              try { formatted = String(formatted).replace(/Needs:\s*\{[\s\S]*\}\s*/i, replacement).trim(); } catch (e) {}
                            }
                          }
                        } catch (e) { /* ignore */ }

                        try {
                          const eqMatch = (a.message || a.details || '').toString().match(/Requested equipment:\s*([^\[]+)/i);
                          if (eqMatch && eqMatch[1]) {
                            const rawList = String(eqMatch[1]).trim();
                            const parts = rawList.split(/[,;]+/).map(s => String(s).trim()).filter(Boolean);
                            let othersText = '';
                            const mapped = parts.map((it) => {
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
                            }).filter(Boolean) as string[];
                            for (let i = mapped.length - 1; i >= 0; i--) {
                              if (/others/i.test(String(mapped[i]))) mapped.splice(i, 1);
                              else mapped[i] = String(mapped[i]).replace(/[.,;]+$/g, '').trim();
                            }
                            const extrasMatch = rawList.match(/Others?:\s*(.*)$/i);
                            if (!othersText && extrasMatch && extrasMatch[1]) othersText = String(extrasMatch[1]).trim();
                            const equipmentItems = mapped;
                            const joinWithAnd = (arr: string[]) => { if (!arr || arr.length === 0) return ''; if (arr.length === 1) return arr[0]; if (arr.length === 2) return `${arr[0]} and ${arr[1]}`; return `${arr.slice(0, -1).join(', ')} and ${arr.slice(-1)[0]}`; };
                            const buildWithOthers = (items: string[]) => { if (!items || items.length === 0) return 'others'; if (items.length === 1) return `${items[0]} and others`; const head = items.slice(0, -1).join(', '); const last = items[items.length - 1]; return `${head}, ${last} and others`; };
                            let replacement = '';
                            if (othersText) {
                              if (equipmentItems.length === 0) {
                                replacement = `requested equipment: others`;
                              } else {
                                replacement = `requested equipment: ${buildWithOthers(equipmentItems)}`;
                              }
                            } else {
                              replacement = `requested equipment: ${joinWithAnd(equipmentItems)}`;
                            }
                            try { formatted = String(formatted).replace(/Requested equipment:\s*([^\[]+)/i, replacement).trim(); } catch (e) {}
                          }
                        } catch (e) { /* ignore */ }

                        try {
                          formatted = String(formatted).replace(/,\s*(and\s+)?others(\b)/i, ' and others$2');
                          formatted = String(formatted).replace(/,?\s*Others?:\s*[^,\]]+/i, '').replace(/\s{2,}/g, ' ').trim();
                          formatted = formatted.replace(/,\s*and\s+others/i, ' and others');
                        } catch (e) {}

                        try { formatted = formatted.replace(/^Admin\b[:\s,-]*/i, ''); } catch (e) {}
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
                        } catch (e) { /* ignore */ }

                        let extractedBookingId: string | null = null;
                        try {
                          const bidMatch = (a.message || a.details || '').toString().match(/booking\s+([0-9a-zA-Z-]{6,64})/i);
                          if (bidMatch) extractedBookingId = bidMatch[1];
                        } catch (e) { extractedBookingId = null; }

                        let lookedUpBooking: FacilityBooking | undefined;
                        if (extractedBookingId) {
                          try { lookedUpBooking = allBookings.find(b => String(b.id) === String(extractedBookingId)); } catch (e) { lookedUpBooking = undefined; }
                        }

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
                          } else {
                            if (actorEmail && !/^\s*\S+@/.test(subLine)) {
                              subLine = `${actorEmail} ${subLine}`.trim();
                            }
                          }
                        } catch (e) {}

                        try {
                          const actionLower = String((a.title || a.action || '')).toLowerCase();
                          const isEquipmentAction = /equipment|needs/i.test(actionLower) || /needs request/i.test(visibleTitle.toLowerCase());
                          const hasDateLike = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}:\d{2}/.test(subLine);
                          if (isEquipmentAction && a.createdAt && !hasDateLike) {
                            const t = formatDateTime(a.createdAt);
                            if (t) subLine = `${subLine} at ${t}`.trim();
                          }
                        } catch (e) {}

                        // Parse equipment from the message
                        const { baseMessage, equipment } = parseEquipmentFromMessage(a.message || a.details || '');
                        const displaySubLine = equipment ? baseMessage : subLine;

                        return (
                          <div key={a.id || idx} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors duration-150">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{(visibleTitle || (a.title || a.action)) ?? 'System Event'}</h4>
                                <p className="text-xs text-gray-600 mt-1 break-words">{displaySubLine}</p>
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

                              <div className="text-xs text-gray-500 ml-4">{a.createdAt ? formatDateTime(a.createdAt) : ''}</div>
                            </div>
                          </div>
                        );
                      })()
                      );
                    })}

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

            {/* Equipment check modal moved to top-level to avoid being clipped by parent transforms/overflow */}
          </div>
        );
    }
  };

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Safely close the mobile sidebar: blur any active element first so focus isn't hidden
  const closeMobileSidebar = () => {
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    } catch (e) {
      // ignore
    }
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
  <Header onMobileToggle={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex">
        {/* Desktop sidebar (fixed) */}
        <div className="hidden md:block w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={(id) => { handleSidebarClick(id); setMobileSidebarOpen(false); }}
          />
        </div>

        {/* Mobile sidebar (off-canvas) positioned under the header */}
          <div className={`md:hidden fixed inset-x-0 top-16 bottom-0 z-40 transition-transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-hidden={!mobileSidebarOpen}>
          {/* overlay behind drawer */}
          <div className="absolute inset-0 bg-black/40" onClick={() => closeMobileSidebar()} />
          <div className="relative w-64 h-full bg-card border-r rounded-none">
            <Sidebar
              items={sidebarItems}
              activeItem={selectedView}
              onItemClick={(id) => { handleSidebarClick(id); closeMobileSidebar(); }}
            />
          </div>
        </div>

        {/* Main content area; responsive margins */}
          <div className={`flex-1 ${mobileSidebarOpen ? '' : ''} md:ml-64 px-4 md:px-6 py-6 md:py-8 w-full`}> 
          <div className="max-w-7xl mx-auto relative">
            {/* Mobile header row removed; header now contains the persistent toggle button */}

            {/* dashboard-positioned close removed; control now lives inside the sidebar panel */}

            {renderContent()}
          </div>
        </div>
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

      {/* Equipment check modal - admin can mark each item prepared / not available */}
      {showEquipmentModal && equipmentModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowEquipmentModal(false); setEquipmentModalBooking(null); setEquipmentModalItemStatuses({}); }} />
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 z-50">
            <h3 className="text-lg font-semibold mb-2">Check Equipment for {getUserEmail(equipmentModalBooking.userId)}</h3>
            <p className="text-sm text-gray-600 mb-4">Mark each requested item as Prepared or Not available. Selections are required before confirming.</p>

            <div className="border border-gray-100 rounded-md overflow-hidden">
              <div className="grid grid-cols-3 gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">
                <div>Item</div>
                <div className="text-center">Prepared</div>
                <div className="text-center">Not available</div>
              </div>
              <div className="max-h-64 overflow-auto px-4 py-3 space-y-2">
                {Object.keys(equipmentModalItemStatuses).length === 0 && (
                  <div className="text-sm text-gray-500">No items requested</div>
                )}

                {Object.entries(equipmentModalItemStatuses).map(([item, status]) => {
                  const nameClass = status === 'prepared' ? 'text-green-600 font-medium' : status === 'not_available' ? 'text-red-600 font-medium' : 'text-gray-800';
                  return (
                    <div key={item} className="grid grid-cols-3 items-center gap-2">
                      <div className={`text-sm break-words ${nameClass}`}>{item}</div>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setEquipmentModalItemStatuses(prev => ({ ...prev, [item]: 'prepared' }))}
                          aria-pressed={status === 'prepared'}
                          className={`px-3 py-1 rounded text-sm ${status === 'prepared' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                        >
                          ✓
                        </button>
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setEquipmentModalItemStatuses(prev => ({ ...prev, [item]: 'not_available' }))}
                          aria-pressed={status === 'not_available'}
                          className={`px-3 py-1 rounded text-sm ${status === 'not_available' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowEquipmentModal(false); setEquipmentModalBooking(null); setEquipmentModalItemStatuses({}); }} disabled={isConfirmingEquipment}>Cancel</Button>
              {
                // disable confirm until every item has a selected status
              }
              <Button
                onClick={() => confirmEquipmentModal()}
                disabled={isConfirmingEquipment || !(Object.keys(equipmentModalItemStatuses).length > 0 && Object.values(equipmentModalItemStatuses).every(s => s === 'prepared' || s === 'not_available'))}
                className={`${(isConfirmingEquipment || !(Object.keys(equipmentModalItemStatuses).length > 0 && Object.values(equipmentModalItemStatuses).every(s => s === 'prepared' || s === 'not_available'))) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isConfirmingEquipment ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <UnavailableReasonModal
        isOpen={isUnavailableModalOpen}
        onClose={() => { setIsUnavailableModalOpen(false); setFacilityForUnavailable(null); }}
        facility={facilityForUnavailable}
        onConfirm={handleUnavailableConfirm}
      />
    </div>
  );
}