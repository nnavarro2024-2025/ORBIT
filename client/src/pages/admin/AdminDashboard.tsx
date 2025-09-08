// src/components/AdminDashboard.tsx
// Fixed icon import naming conflict and syntax error

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DeveloperCredit from "@/components/DeveloperCredit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BanUserModal from "@/components/modals/BanUserModal";
import UserEmailDisplay from "@/components/UserEmailDisplay";
import {
  Shield,
  Dock,
  Calendar,
  Users,
  BarChart3,
  Activity,
  Bell,
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
  User as UserIcon,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, OrzSession, TimeExtensionRequest, FacilityBooking, SystemAlert, ActivityLog, Facility } from "../../../../shared/schema";

// --- Type Definitions ---
interface Stats {
  activeUsers: number;
  pendingBookings: number;
  systemAlerts: number;
  bannedUsers: number;
}

// --- Component ---
export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState("dashboard");
  const [isBanUserModalOpen, setIsBanUserModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [endedSessionsPage, setEndedSessionsPage] = useState(0);
  const [activeSessionsPage, setActiveSessionsPage] = useState(0);
  const [pendingExtensionsPage, setPendingExtensionsPage] = useState(0);
  const [activeBookingsPage, setActiveBookingsPage] = useState(0);
  const [upcomingBookingsPage, setUpcomingBookingsPage] = useState(0);
  const [pendingBookingsPage, setPendingBookingsPage] = useState(0);
  const [approvedAndDeniedBookingsPage, setApprovedAndDeniedBookingsPage] = useState(0);
  const [bookingUsersPage, setBookingUsersPage] = useState(0);
  const [orzUsersPage, setOrzUsersPage] = useState(0);
  const [bannedUsersPage, setBannedUsersPage] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [pendingBookingsDashboardPage, setPendingBookingsDashboardPage] = useState(0);
  const [pendingExtensionsDashboardPage, setPendingExtensionsDashboardPage] = useState(0);
  const itemsPerPage = 10;

  // --- Data Fetching Hooks --- (must be called before any conditional returns)
  const { 
    data: stats, 
    isLoading: statsLoading, 
    isError: statsError 
  } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/stats");
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: activeSessions, 
    isLoading: sessionsLoading, 
    isError: sessionsError 
  } = useQuery<OrzSession[]>({
    queryKey: ["/api/admin/sessions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/sessions");
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: endedSessions, 
    isLoading: endedSessionsLoading, 
    isError: endedSessionsError 
  } = useQuery<OrzSession[]>({
    queryKey: ["/api/admin/sessions/history"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/sessions/history");
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: pendingBookings, 
    isLoading: bookingsLoading, 
    isError: bookingsError 
  } = useQuery<FacilityBooking[]>({
    queryKey: ["/api/bookings/pending"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings/pending");
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: pendingExtensions, 
    isLoading: extensionsLoading, 
    isError: extensionsError 
  } = useQuery<TimeExtensionRequest[]>({
    queryKey: ["/api/orz/time-extension/pending"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/orz/time-extension/pending"
      );
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: alerts, 
    isLoading: alertsLoading, 
    isError: alertsError 
  } = useQuery<SystemAlert[]>({
    queryKey: ["/api/admin/alerts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/alerts");
      return response.json();
    },
    refetchInterval: 3000, // Faster refresh to surface new alerts quickly
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: activities, 
    isLoading: activitiesLoading, 
    isError: activitiesError 
  } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/activity");
      return response.json();
    },
    refetchInterval: 5000, // Faster refresh for recent activity
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: allBookings, 
    isLoading: allBookingsLoading, 
    isError: allBookingsError 
  } = useQuery<FacilityBooking[]>({ // Reusing PendingBooking interface for now, might need a more general Booking interface
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/bookings");
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: usersData, 
    isLoading: usersLoading, 
    isError: usersError 
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    enabled: !!user && user.role === "admin",
  });

  const { 
    data: facilities, 
    isLoading: facilitiesLoading, 
    isError: facilitiesError 
  } = useQuery<Facility[]>({ 
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/facilities");
      return response.json();
    },
    enabled: !!user && user.role === "admin",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Memoized maps for quick lookups
  const usersMap = useMemo(() => {
    return new Map(usersData?.map(user => [user.id, user]));
  }, [usersData]);

  const facilitiesMap = useMemo(() => {
    return new Map(facilities?.map(facility => [String(facility.id), facility]));
  }, [facilities]);

  // Derived booking lists
  const approvedBookings = useMemo(() => {
    return (allBookings || []).filter(b => b.status === "approved");
  }, [allBookings]);

  const deniedBookings = useMemo(() => {
    return (allBookings || []).filter(b => b.status === "denied");
  }, [allBookings]);

  const activeBookings = useMemo(() => {
    const now = new Date();
    return approvedBookings.filter(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return now >= start && now <= end;
    });
  }, [approvedBookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return approvedBookings.filter(b => new Date(b.startTime) > now);
  }, [approvedBookings]);

  // Recent bookings: include pending requests alongside approved/denied
  const recentBookings = useMemo(() => {
    const now = new Date();
    const completedApproved = approvedBookings.filter(b => new Date(b.endTime) < now);
    return [...completedApproved, ...deniedBookings].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [approvedBookings, deniedBookings]);


  // --- Mutations ---
  const approveBookingMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: string }) => {
      const result = await apiRequest("POST", `/api/bookings/${bookingId}/approve`, {
        adminResponse: "Approved",
      });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] }); // Invalidate all bookings
      toast({
        title: "Booking Approved",
        description: "The booking has been approved successfully.",
        variant: "default",
      });
    },
  });

  const denyBookingMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: string }) => {
      const result = await apiRequest("POST", `/api/bookings/${bookingId}/deny`, {
        adminResponse: "Denied",
      });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] }); // Invalidate all bookings
      toast({
        title: "Booking Denied",
        description: "The booking has been denied.",
        variant: "default",
      });
    },
  });

  const approveExtensionMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const result = await apiRequest(
        "POST",
        `/api/orz/time-extension/${requestId}/approve`,
        { adminResponse: "Approved" }
      );
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orz/time-extension/pending"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      toast({
        title: "Extension Approved",
        description: "The time extension has been approved.",
        variant: "default",
      });
    },
  });

  const denyExtensionMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const result = await apiRequest("POST", `/api/orz/time-extension/${requestId}/deny`, {
        adminResponse: "Denied",
      });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orz/time-extension/pending"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      toast({
        title: "Extension Denied",
        description: "The time extension has been denied.",
        variant: "default",
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason, duration, customDate }: { userId: string; reason: string; duration: string; customDate?: string }) => {
      const payload: any = { reason, duration };
      if (duration === "custom" && customDate) {
        payload.customDate = customDate;
      }
      const result = await apiRequest("POST", `/api/admin/users/${userId}/ban`, payload);
      return result.json();
    },
    onSuccess: (data, variables) => {
      const bannedUserEmail = getUserEmail(variables.userId);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] }); // Refresh alerts for new ban notifications
      
      const bookingsInfo = data?.details?.bookingsCancelled > 0 
        ? ` ${data.details.bookingsCancelled} booking(s) cancelled.` 
        : "";
      
      toast({
        title: "User Banned",
        description: `User ${bannedUserEmail} has been banned for ${variables.duration}. Reason: ${variables.reason}.${bookingsInfo}`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Banning User",
        description: error.message || "Failed to ban user.",
        variant: "destructive",
      });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const result = await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      return result.json();
    },
    onSuccess: (_, variables) => {
      const unbannedUserEmail = getUserEmail(variables.userId);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User Unbanned",
        description: `User ${unbannedUserEmail} has been unbanned.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Unbanning User",
        description: error.message || "Failed to unban user.",
        variant: "destructive",
      });
    },
  });

  const toggleFacilityAvailabilityMutation = useMutation({
    mutationFn: async ({ facilityId, isActive }: { facilityId: number; isActive: boolean }) => {
      const result = await apiRequest("PUT", `/api/admin/facilities/${facilityId}/availability`, { isActive });
      return result.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      toast({
        title: "Facility Updated",
        description: `Facility has been ${variables.isActive ? 'made available' : 'made unavailable'}.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Facility",
        description: error.message || "Failed to update facility availability.",
        variant: "destructive",
      });
    },
  });

  // Helper function for toggling facility availability
  const toggleFacilityAvailability = (facilityId: number, isActive: boolean) => {
    toggleFacilityAvailabilityMutation.mutate({ facilityId, isActive });
  };

  // Check if user is admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    const promoteToAdmin = async () => {
      try {
        const response = await apiRequest('POST', '/api/dev/promote-to-admin');
        
        if (response.ok) {
          toast({
            title: "Success!",
            description: "You have been promoted to admin. Please refresh the page.",
            variant: "default",
          });
          // Refresh the page after a short delay
          setTimeout(() => window.location.reload(), 2000);
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "Failed to promote to admin.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to promote to admin.",
          variant: "destructive",
        });
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin dashboard.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Required role: <span className="font-mono bg-muted px-2 py-1 rounded">admin</span>
            <br />
            Your role: <span className="font-mono bg-muted px-2 py-1 rounded">{user?.role || 'none'}</span>
          </p>
          
          {/* Development feature - promote to admin */}
          <button
            onClick={promoteToAdmin}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🧪 Promote to Admin (Dev)
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            This button is for development/testing purposes only
          </p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: "dashboard", label: "Overview", icon: BarChart3 },
    { id: "orz-management", label: "Computer Station Management", icon: Dock },
    { id: "booking-management", label: "Facility Booking Management", icon: Calendar },
    { id: "user-management", label: "User Management", icon: Users },
    { id: "security", label: "Admin System Alerts", icon: Shield },
    { id: "settings", label: "System Settings", icon: Settings },
  ];

  const handleSidebarClick = (itemId: string) => {
    setSelectedView(itemId);
  };

  const formatDateTime = (dateInput: string | Date | number) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : 
                 typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    return date.toLocaleString();
  };

  // Helper to get user email from ID
  const getUserEmail = (userId: string) => {
    const user = usersMap.get(userId);
    // If user is found and has an email, return email.
    // Otherwise, if user is found but email is null, return "N/A (No Email)".
    // If user is not found, return "Unknown User (ID: userId)".
    if (user) {
      return user.email || `N/A (User ID: ${userId})`;
    }
    return `Unknown User (ID: ${userId})`;
  };

  // Helper to get facility name from ID
  const getFacilityName = (facilityId: string | number) => {
    const facility = facilitiesMap.get(String(facilityId));
    return facility?.name || `Unknown Facility (${facilityId})`;
  };

  // Helper to determine computer station user status
  const getOrzUserStatus = (userId: string) => {
    return activeSessions?.some(session => session.userId === userId) ? "Active Computer Station User" : "";
  };

  // Helper to determine facility booking user status
  const getBookingUserStatus = (userId: string) => {
    return activeBookings?.some(booking => booking.userId === userId) ? "Facility Booking User" : "";
  };

  // Helper to format activity details for better readability
  const formatActivityDetails = (activity: ActivityLog) => {
    const details = activity.details || '';
    const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
    const uuids = details.match(uuidRegex);

    if (activity.action.startsWith("Booking")) {
      const bookingId = uuids?.[0];
      if (bookingId) {
        const booking = allBookings?.find(b => b.id === bookingId);
        if (booking) {
          const userEmail = getUserEmail(booking.userId);
          return `for ${userEmail} at Facility ${getFacilityName(booking.facilityId)} from ${formatDateTime(booking.startTime)} to ${formatDateTime(booking.endTime)}`;
        }
      }
      return details.replace(uuidRegex, 'a booking').trim();
    }

    if (activity.action.startsWith("Time Extension")) {
      const sessionId = uuids?.[1] || uuids?.[0];
      if (sessionId) {
        const session = [...(activeSessions || []), ...(endedSessions || [])].find(s => s.id === sessionId);
        if (session) {
          const userEmail = getUserEmail(session.userId);
          const minutesMatch = details.match(/by (\d+) minutes/);
          const minutes = minutesMatch ? ` by ${minutesMatch[1]} minutes` : '';
          return `for ${userEmail} at Station ${session.stationId}${minutes}`;
        }
      }
      return details.replace(uuidRegex, 'a request').replace('for session', 'for').trim();
    }

    if (activity.action === "User Unbanned") {
      // Handle "Admin (ID removed) unbanned user (ID removed) by jamesrabang7@gmail.com"
      const emailMatch = details.match(/by ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        const adminEmail = emailMatch[1];
        
        // Extract user ID from the details if available
        const userIdMatch = details.match(/unbanned user ([a-zA-Z0-9-]+) by/);
        if (userIdMatch) {
          const userId = userIdMatch[1];
          const userEmail = getUserEmail(userId);
          return `Admin ${adminEmail} unbanned user ${userEmail}`;
        }
        
        // Look for pattern without "by" in between
        const userIdMatch2 = details.match(/Admin.*unbanned user ([a-zA-Z0-9-]+)/);
        if (userIdMatch2) {
          const userId = userIdMatch2[1];
          const userEmail = getUserEmail(userId);
          return `Admin ${adminEmail} unbanned user ${userEmail}`;
        }
        
        // If no specific user ID found, look for general pattern
        return `Admin ${adminEmail} unbanned a user`;
      }
      
      // Handle case without admin email but with user ID
      const userIdOnlyMatch = details.match(/unbanned user ([a-zA-Z0-9-]+)/);
      if (userIdOnlyMatch) {
        const userId = userIdOnlyMatch[1];
        const userEmail = getUserEmail(userId);
        return `Admin unbanned user ${userEmail}`;
      }
      
      // Fallback - clean up the message
      return details
        .replace(/Admin \(ID removed\)/g, 'Admin')
        .replace(/user \(ID removed\)/g, 'a user')
        .replace(uuidRegex, '')
        .trim();
    }

    if (activity.action === "User Banned") {
      // Extract user ID from details
      const userIdMatch = details.match(/banned user ([a-zA-Z0-9-]+)/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const userEmail = getUserEmail(userId);
        return details.replace(`user ${userId}`, `user ${userEmail}`);
      }
    }

    // Default fallback for any other action
    return details.replace(uuidRegex, '(ID removed)').trim();
  };

  const formatAlertMessage = (message: string | null): string => {
    if (!message) return '';
    
    // Handle session ID replacements for computer alerts
    const uuidRegex = /Session ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
    const match = message.match(uuidRegex);

    if (match) {
      const sessionId = match[1];
      const session = [...(activeSessions || []), ...(endedSessions || [])].find(s => s.id === sessionId);
      if (session) {
        const userEmail = getUserEmail(session.userId);
        return `The computer session for ${userEmail} was automatically logged out due to inactivity.`;
      }
    }

    // Handle "The computer session for this user was automatically logged out due to inactivity."
    if (message.includes('The computer session for this user was automatically logged out due to inactivity')) {
      // Try to extract session ID from the original message or find a way to identify the user
      // For now, let's look for any session info in the message
      const sessionMatch = message.match(/Session ID: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        const session = [...(activeSessions || []), ...(endedSessions || [])].find(s => s.id === sessionId);
        if (session) {
          const userEmail = getUserEmail(session.userId);
          return `The computer session for ${userEmail} was automatically logged out due to inactivity.`;
        }
      }
      // If no session ID found, return generic message but improved
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

  const renderContent = () => {
    const errorState = {
      stats: statsError,
      sessions: sessionsError,
      bookings: bookingsError,
      extensions: extensionsError,
      alerts: alertsError,
      activities: activitiesError,
      allBookings: allBookingsError,
      usersData: usersError,
      endedSessions: endedSessionsError,
      facilities: facilitiesError,
    };

    const hasError = Object.values(errorState).some(Boolean);

    if (
      statsLoading ||
      sessionsLoading ||
      bookingsLoading ||
      extensionsLoading ||
      alertsLoading ||
      activitiesLoading ||
      allBookingsLoading ||
      usersLoading ||
      endedSessionsLoading ||
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
      case "orz-management":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Computer Station Management</h2>
                  <p className="text-gray-600 mt-1">Monitor active sessions, time extensions, and completed sessions</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activeSessions?.length || 0} Active
                  </div>
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingExtensions?.length || 0} Pending
                  </div>
                </div>
              </div>

              <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Active Sessions
                  </TabsTrigger>
                  <TabsTrigger value="extensions" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Extensions
                  </TabsTrigger>
                  <TabsTrigger value="ended" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Active Computer Station Sessions</h3>
                      <span className="text-sm text-gray-600">{activeSessions?.length || 0} sessions</span>
                    </div>
                    
                    {activeSessions && activeSessions.length > 0 ? (
                      <div className="space-y-3">
                        {activeSessions
                          ?.slice(activeSessionsPage * itemsPerPage, (activeSessionsPage + 1) * itemsPerPage)
                          .map((session: OrzSession) => (
                          <div key={session.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                  <Dock className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    <UserEmailDisplay userId={session.userId} />
                                  </h4>
                                  <p className="text-sm text-gray-600">Station {session.stationId}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(session.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(session.plannedEndTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for active sessions */}
                        {activeSessions.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {activeSessionsPage * itemsPerPage + 1} to {Math.min((activeSessionsPage + 1) * itemsPerPage, activeSessions.length)} of {activeSessions.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveSessionsPage(prev => Math.max(prev - 1, 0))}
                                disabled={activeSessionsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {activeSessionsPage + 1} of {Math.ceil(activeSessions.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setActiveSessionsPage(prev => (activeSessions && (prev + 1) * itemsPerPage < activeSessions.length ? prev + 1 : prev))}
                                disabled={!activeSessions || (activeSessionsPage + 1) * itemsPerPage >= activeSessions.length}
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
                          <Dock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No active computer sessions</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="extensions" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Pending Time Extension Requests</h3>
                      <span className="text-sm text-gray-600">{pendingExtensions?.length || 0} requests</span>
                    </div>
                    
                    {pendingExtensions && pendingExtensions.length > 0 ? (
                      <div className="space-y-3">
                        {pendingExtensions
                          ?.slice(pendingExtensionsPage * itemsPerPage, (pendingExtensionsPage + 1) * itemsPerPage)
                          .map((request: TimeExtensionRequest) => {
                          const associatedSession = activeSessions?.find(
                            (session) => session.id === request.sessionId
                          );
                          const stationId = associatedSession ? associatedSession.stationId : 'N/A';

                          return (
                            <div key={request.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-300 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="bg-orange-100 p-2 rounded-lg">
                                    <Clock className="h-5 w-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      <UserEmailDisplay userId={request.userId} />
                                    </h4>
                                    <p className="text-sm text-gray-600">Station {stationId} • {request.requestedMinutes} minutes</p>
                                    <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">Requested</p>
                                    <p className="text-sm text-gray-600">{formatDateTime(request.createdAt)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        approveExtensionMutation.mutate({
                                          requestId: request.id,
                                        })
                                      }
                                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() =>
                                        denyExtensionMutation.mutate({
                                          requestId: request.id,
                                        })
                                      }
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Deny
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Pagination for pending extensions */}
                        {pendingExtensions.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {pendingExtensionsPage * itemsPerPage + 1} to {Math.min((pendingExtensionsPage + 1) * itemsPerPage, pendingExtensions.length)} of {pendingExtensions.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPendingExtensionsPage(prev => Math.max(prev - 1, 0))}
                                disabled={pendingExtensionsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {pendingExtensionsPage + 1} of {Math.ceil(pendingExtensions.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setPendingExtensionsPage(prev => (pendingExtensions && (prev + 1) * itemsPerPage < pendingExtensions.length ? prev + 1 : prev))}
                                disabled={!pendingExtensions || (pendingExtensionsPage + 1) * itemsPerPage >= pendingExtensions.length}
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
                        <p className="text-gray-600 text-sm">No pending time extension requests</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="ended" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Completed Computer Sessions</h3>
                      <span className="text-sm text-gray-600">{endedSessions?.length || 0} sessions</span>
                    </div>
                    
                    {endedSessions && endedSessions.length > 0 ? (
                      <div className="space-y-3">
                        {endedSessions
                          ?.slice(endedSessionsPage * itemsPerPage, (endedSessionsPage + 1) * itemsPerPage)
                          .map((session: OrzSession) => (
                          <div key={session.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-2 rounded-lg">
                                  <CheckCircle className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    <UserEmailDisplay userId={session.userId} />
                                  </h4>
                                  <p className="text-sm text-gray-600">Station {session.stationId}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(session.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ended</p>
                                  <p className="text-sm text-gray-600">{session.endTime ? formatDateTime(session.endTime) : 'N/A'}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for ended sessions */}
                        {endedSessions.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {endedSessionsPage * itemsPerPage + 1} to {Math.min((endedSessionsPage + 1) * itemsPerPage, endedSessions.length)} of {endedSessions.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEndedSessionsPage(prev => Math.max(prev - 1, 0))}
                                disabled={endedSessionsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {endedSessionsPage + 1} of {Math.ceil(endedSessions.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setEndedSessionsPage(prev => (endedSessions && (prev + 1) * itemsPerPage < endedSessions.length ? prev + 1 : prev))}
                                disabled={!endedSessions || (endedSessionsPage + 1) * itemsPerPage >= endedSessions.length}
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
                        <p className="text-gray-600 text-sm">No completed sessions found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );

      case "booking-management":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Facility Booking Management</h2>
                  <p className="text-gray-600 mt-1">Monitor active bookings, pending requests, and booking history</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activeBookings?.length || 0} Active
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {upcomingBookings?.length || 0} Upcoming
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingBookings?.length || 0} Pending
                  </div>
                </div>
              </div>

              <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Active Bookings
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    History
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
                                  <Calendar className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
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
                                              <Eye className="h-3 w-3 text-blue-600" />
                                              <span className="text-xs text-blue-600">View purpose</span>
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
                          <Calendar className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No active facility bookings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="upcoming" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Upcoming Facility Bookings</h3>
                      <span className="text-sm text-gray-600">{upcomingBookings?.length || 0} bookings</span>
                    </div>
                    
                    {upcomingBookings && upcomingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingBookings
                          ?.slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                  <Clock className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
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
                                              <Eye className="h-3 w-3 text-blue-600" />
                                              <span className="text-xs text-blue-600">View purpose</span>
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
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Scheduled
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for upcoming bookings */}
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
                <TabsContent value="pending" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Pending Facility Booking Requests</h3>
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
                                              <Eye className="h-3 w-3 text-blue-600" />
                                              <span className="text-xs text-blue-600">View purpose</span>
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
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for pending bookings */}
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
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No pending facility booking requests</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="recent" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
                      <span className="text-sm text-gray-600">{recentBookings?.length || 0} records</span>
                    </div>
                    
                    {recentBookings && recentBookings.length > 0 ? (
                      <div className="space-y-3">
                        {recentBookings
                          ?.slice(approvedAndDeniedBookingsPage * itemsPerPage, (approvedAndDeniedBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className={`bg-white rounded-lg p-4 border transition-colors duration-200 ${
                            booking.status === 'denied' ? 'border-red-200 hover:border-red-300' : 'border-green-200 hover:border-green-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${
                                  booking.status === 'denied' ? 'bg-red-100' : 'bg-green-100'
                                }`}>
                                  {booking.status === 'denied' ? (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
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
                                              <Eye className="h-3 w-3 text-blue-600" />
                                              <span className="text-xs text-blue-600">View purpose</span>
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
                                  <p className="text-sm font-medium text-gray-900">Ended</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  booking.status === 'denied' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {booking.status === 'denied' ? 'Denied' : 'Completed'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for booking history */}
                        {recentBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {approvedAndDeniedBookingsPage * itemsPerPage + 1} to {Math.min((approvedAndDeniedBookingsPage + 1) * itemsPerPage, recentBookings.length)} of {recentBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setApprovedAndDeniedBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={approvedAndDeniedBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {approvedAndDeniedBookingsPage + 1} of {Math.ceil(recentBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setApprovedAndDeniedBookingsPage(prev => (recentBookings && (prev + 1) * itemsPerPage < recentBookings.length ? prev + 1 : prev))}
                                disabled={!recentBookings || (approvedAndDeniedBookingsPage + 1) * itemsPerPage >= recentBookings.length}
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
                          <BarChart3 className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No booking history available</p>
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
        const orzUsers = usersData?.filter(user => getOrzUserStatus(user.id));
        const bannedUsers = usersData?.filter(user => user.status === "banned");

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                  <p className="text-gray-600 mt-1">Manage facility booking users, computer station users, and suspended accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bookingUsers?.length || 0} Booking Users
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {orzUsers?.length || 0} Station Users
                  </div>
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bannedUsers?.length || 0} Suspended
                  </div>
                </div>
              </div>

              <Tabs defaultValue="booking-users" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="booking-users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Booking Users
                  </TabsTrigger>
                  <TabsTrigger value="orz-users" className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Station Users
                  </TabsTrigger>
                  <TabsTrigger value="banned-users" className="flex items-center gap-2">
                    <UserX className="h-4 w-4" />
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

                <TabsContent value="orz-users" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Computer Station Users</h3>
                      <span className="text-sm text-gray-600">{orzUsers?.length || 0} users</span>
                    </div>
                    
                    {orzUsers && orzUsers.length > 0 ? (
                      <div className="space-y-3">
                        {orzUsers
                          ?.slice(orzUsersPage * itemsPerPage, (orzUsersPage + 1) * itemsPerPage)
                          .map((userItem: User) => {
                          const userSession = activeSessions?.find(session => session.userId === userItem.id);
                          return (
                            <div key={userItem.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="bg-green-100 p-2 rounded-lg">
                                    <Monitor className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{userItem.email}</h4>
                                    <p className="text-sm text-gray-600">
                                      {userSession ? `Station ${userSession.stationId}` : 'No active station'}
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
                                  {userSession && (
                                    <div className="text-right">
                                      <p className="text-xs font-medium text-gray-700">Session Active</p>
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs text-gray-600">Station {userSession.stationId}</span>
                                      </div>
                                    </div>
                                  )}
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
                        
                        {/* Pagination for ORZ users */}
                        {orzUsers.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {orzUsersPage * itemsPerPage + 1} to {Math.min((orzUsersPage + 1) * itemsPerPage, orzUsers.length)} of {orzUsers.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setOrzUsersPage(prev => Math.max(prev - 1, 0))}
                                disabled={orzUsersPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {orzUsersPage + 1} of {Math.ceil(orzUsers.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setOrzUsersPage(prev => (orzUsers && (prev + 1) * itemsPerPage < orzUsers.length ? prev + 1 : prev))}
                                disabled={!orzUsers || (orzUsersPage + 1) * itemsPerPage >= orzUsers.length}
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
                          <Monitor className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No computer station users found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

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
                    {alerts?.filter(a => {
                      if (a.isRead) return false;
                      // Exclude computer/ORZ alerts from unread count
                      const t = (a.title || '').toLowerCase();
                      const m = (a.message || '').toLowerCase();
                      const isComputerAlert = t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
                      return !isComputerAlert;
                    }).length || 0} Unread
                  </div>
                  <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                    {alerts?.filter(a => {
                      // Exclude computer/ORZ alerts from total count
                      const t = (a.title || '').toLowerCase();
                      const m = (a.message || '').toLowerCase();
                      const isComputerAlert = t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
                      return !isComputerAlert;
                    }).length || 0} Total
                  </div>
                </div>
              </div>

              <Tabs defaultValue="orz" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="orz" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Computer Alerts
                  </TabsTrigger>
                  <TabsTrigger value="booking" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Booking Alerts
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    User Management
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="orz" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Computer Station Alerts</h3>
                      <span className="text-sm text-gray-600">
                        {alerts?.filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          return t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
                        }).length || 0} alerts
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {alerts?.filter(a => {
                          const t = (a.title || '').toLowerCase();
                          const m = (a.message || '').toLowerCase();
                          return t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
                        })
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((alert: SystemAlert) => {
                          const formattedMessage = formatAlertMessage(alert.message);
                          const isHighPriority = alert.severity === 'critical' || alert.severity === 'high';
                          return (
                            <div key={alert.id} className={`bg-white rounded-lg p-4 border transition-colors duration-200 ${
                              isHighPriority ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-gray-300'
                            } ${alert.isRead ? 'opacity-60' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                  isHighPriority ? 'bg-red-100' : 'bg-orange-100'
                                }`}>
                                  <TriangleAlert className={`h-5 w-5 ${
                                    isHighPriority ? 'text-red-600' : 'text-orange-600'
                                  }`} />
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{formattedMessage}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <span className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</span>
                                      {alert.isRead && (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                          Read
                                        </span>
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
                      return t.includes('automatically logged out') || t.includes('auto-logout') || m.includes('inactivity');
                    }).length === 0) && (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Shield className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No computer station alerts</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
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

              <Tabs defaultValue="facilities" className="space-y-6">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="facilities" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
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
                                  onClick={() => toggleFacilityAvailability(facility.id, !facility.isActive)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <button
                onClick={() => setSelectedView("orz-management")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-green-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-green-700">Active Computer Users</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats?.activeUsers || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Currently logged in</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors duration-200">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("booking-management")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-700">Active Bookings</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{activeBookings?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors duration-200">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("security")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-orange-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-orange-700">System Alerts</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats?.systemAlerts || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition-colors duration-200">
                    <Bell className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("orz-management")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-yellow-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-yellow-700">Time Extensions</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingExtensions?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending approval</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full group-hover:bg-yellow-200 transition-colors duration-200">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedView("booking-management")}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-purple-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-purple-700">Booking Requests</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats?.pendingBookings || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors duration-200">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setSelectedView("orz-management")}
                  className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 border border-green-200"
                >
                  <div className="bg-green-600 p-2 rounded-lg">
                    <Dock className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-green-900">Computer Stations</p>
                    <p className="text-sm text-green-700">Manage sessions</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedView("booking-management")}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
                >
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-blue-900">Facility Bookings</p>
                    <p className="text-sm text-blue-700">Review requests</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedView("user-management")}
                  className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200 border border-purple-200"
                >
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-purple-900">User Management</p>
                    <p className="text-sm text-purple-700">Manage users</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedView("security")}
                  className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200 border border-orange-200"
                >
                  <div className="bg-orange-600 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-orange-900">System Alerts</p>
                    <p className="text-sm text-orange-700">View alerts</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Overview Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Pending Bookings</h3>
                    <p className="text-gray-600 text-sm mt-1">Facility booking requests requiring approval</p>
                  </div>
                  <button
                    onClick={() => setSelectedView("booking-management")}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                  >
                    View All →
                  </button>
                </div>

                {pendingBookings && pendingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pendingBookings.slice(pendingBookingsDashboardPage * itemsPerPage, (pendingBookingsDashboardPage + 1) * itemsPerPage).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Calendar className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                            <p className="text-sm text-gray-600">
                              {getUserEmail(booking.userId)} • {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                          <button
                            onClick={() => setSelectedView("booking-management")}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pagination for pending bookings */}
                    {pendingBookings.length > itemsPerPage && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Showing {pendingBookingsDashboardPage * itemsPerPage + 1} to {Math.min((pendingBookingsDashboardPage + 1) * itemsPerPage, pendingBookings.length)} of {pendingBookings.length} results
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPendingBookingsDashboardPage(prev => Math.max(prev - 1, 0))}
                            disabled={pendingBookingsDashboardPage === 0}
                            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {pendingBookingsDashboardPage + 1} of {Math.ceil(pendingBookings.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() => setPendingBookingsDashboardPage(prev => (prev + 1) * itemsPerPage < pendingBookings.length ? prev + 1 : prev)}
                            disabled={(pendingBookingsDashboardPage + 1) * itemsPerPage >= pendingBookings.length}
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
                    <p className="text-gray-600 text-sm">No pending booking requests</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Pending Time Extensions</h3>
                    <p className="text-gray-600 text-sm mt-1">Computer station time extension requests</p>
                  </div>
                  <button
                    onClick={() => setSelectedView("orz-management")}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                  >
                    View All →
                  </button>
                </div>

                {pendingExtensions && pendingExtensions.length > 0 ? (
                  <div className="space-y-4">
                    {pendingExtensions.slice(pendingExtensionsDashboardPage * itemsPerPage, (pendingExtensionsDashboardPage + 1) * itemsPerPage).map((extension) => (
                      <div key={extension.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Clock className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{extension.requestedMinutes} minutes</h4>
                            <p className="text-sm text-gray-600">
                              {getUserEmail(extension.userId)} • {extension.reason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Extension
                          </span>
                          <button
                            onClick={() => setSelectedView("orz-management")}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pagination for pending extensions */}
                    {pendingExtensions.length > itemsPerPage && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Showing {pendingExtensionsDashboardPage * itemsPerPage + 1} to {Math.min((pendingExtensionsDashboardPage + 1) * itemsPerPage, pendingExtensions.length)} of {pendingExtensions.length} results
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPendingExtensionsDashboardPage(prev => Math.max(prev - 1, 0))}
                            disabled={pendingExtensionsDashboardPage === 0}
                            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {pendingExtensionsDashboardPage + 1} of {Math.ceil(pendingExtensions.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() => setPendingExtensionsDashboardPage(prev => (prev + 1) * itemsPerPage < pendingExtensions.length ? prev + 1 : prev)}
                            disabled={(pendingExtensionsDashboardPage + 1) * itemsPerPage >= pendingExtensions.length}
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
                    <p className="text-gray-600 text-sm">No pending time extensions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent System Activity</h3>
                  <p className="text-gray-600 mt-1">Monitor system events and user actions</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {activities?.length || 0} Events
                </div>
              </div>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities
                    ?.slice(activitiesPage * itemsPerPage, (activitiesPage + 1) * itemsPerPage)
                    .map((activity) => (
                    <div key={activity.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{activity.action}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatActivityDetails(activity)} {activity.userId && `by ${getUserEmail(activity.userId)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm">No recent system activity</p>
                </div>
              )}
              
              {/* Pagination for activities */}
              {activities && activities.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {activitiesPage * itemsPerPage + 1} to {Math.min((activitiesPage + 1) * itemsPerPage, activities.length)} of {activities.length} results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivitiesPage(prev => Math.max(prev - 1, 0))}
                      disabled={activitiesPage === 0}
                      className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">
                      {activitiesPage + 1} of {Math.ceil((activities?.length || 0) / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setActivitiesPage(prev => (activities && (prev + 1) * itemsPerPage < activities.length ? prev + 1 : prev))}
                      disabled={!activities || (activitiesPage + 1) * itemsPerPage >= activities.length}
                      className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
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
    {userToBan && (
        <BanUserModal
          isOpen={isBanUserModalOpen}
          onClose={() => setIsBanUserModalOpen(false)}
          user={userToBan}
          onBanUser={(userId, reason, duration, customDate) => {
            banUserMutation.mutate({ userId, reason, duration, customDate });
            setIsBanUserModalOpen(false);
          }}
        />
      )}
      <DeveloperCredit />
    </div>
  );
}