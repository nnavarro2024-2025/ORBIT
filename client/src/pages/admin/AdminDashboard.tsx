import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import {
  Shield,
  Dock,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ---------- Types ----------
type StatSummary = {
  activeUsers: number;
  pendingBookings: number;
  systemAlerts: number;
  bannedUsers: number;
};

type Session = {
  id: string;
  userId: string;
  stationId: string;
  startTime: string;
  plannedEndTime: string;
};

type Booking = {
  id: string;
  userId: string;
  facilityId: string;
  startTime: string;
  endTime: string;
  purpose: string;
};

type Extension = {
  id: string;
  userId: string;
  requestedMinutes: number;
  reason: string;
};

type Alert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
};

type ActivityLog = {
  id: string;
  action: string;
  details: string;
  createdAt: string;
};

// ---------- Component ----------
export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState("dashboard");

  // ---------- Queries ----------
  const { data: stats = {} as StatSummary } = useQuery<StatSummary>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/stats")).json(),
    refetchInterval: 30000,
  });

  const { data: activeSessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/admin/sessions"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/sessions")).json(),
    refetchInterval: 5000,
  });

  const { data: pendingBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/pending"],
    queryFn: async () => (await apiRequest("GET", "/api/bookings/pending")).json(),
    refetchInterval: 10000,
  });

  const { data: pendingExtensions = [] } = useQuery<Extension[]>({
    queryKey: ["/api/orz/time-extension/pending"],
    queryFn: async () =>
      (await apiRequest("GET", "/api/orz/time-extension/pending")).json(),
    refetchInterval: 10000,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/admin/alerts"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/alerts")).json(),
  });

  const { data: activities = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/activity")).json(),
  });

  // ---------- Mutations ----------
  const approveBookingMutation = useMutation({
    mutationFn: async ({ bookingId, response }: { bookingId: string; response: string }) =>
      (await apiRequest("POST", `/api/bookings/${bookingId}/approve`, { adminResponse: response })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      toast({ title: "Booking Approved", description: "The booking has been approved." });
    },
  });

  const denyBookingMutation = useMutation({
    mutationFn: async ({ bookingId, response }: { bookingId: string; response: string }) =>
      (await apiRequest("POST", `/api/bookings/${bookingId}/deny`, { adminResponse: response })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      toast({ title: "Booking Denied", description: "The booking has been denied." });
    },
  });

  const approveExtensionMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string; response: string }) =>
      (await apiRequest("POST", `/api/orz/time-extension/${requestId}/approve`, { adminResponse: response })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/time-extension/pending"] });
      toast({ title: "Extension Approved", description: "The time extension has been approved." });
    },
  });

  const denyExtensionMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string; response: string }) =>
      (await apiRequest("POST", `/api/orz/time-extension/${requestId}/deny`, { adminResponse: response })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/time-extension/pending"] });
      toast({ title: "Extension Denied", description: "The time extension has been denied." });
    },
  });

  // ---------- Helpers ----------
  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Shield },
    { id: "orz-management", label: "ORZ Management", icon: Dock },
    { id: "facility-management", label: "Facility Management", icon: Calendar },
    { id: "user-management", label: "User Management", icon: Users },
    { id: "security", label: "Security Management", icon: Shield },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString();

  // ---------- Render ----------
  const renderContent = () => {
    switch (selectedView) {
      case "orz-management":
        return (
          <div className="space-y-6">
            {/* Active Sessions */}
            <div className="material-card p-6">
              <h3 className="text-lg font-semibold mb-4">Active ORZ Sessions</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Station</th>
                      <th className="text-left py-3 px-4">Start Time</th>
                      <th className="text-left py-3 px-4">End Time</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 px-4">{session.userId}</td>
                        <td className="py-3 px-4">Station {session.stationId}</td>
                        <td className="py-3 px-4">{formatDateTime(session.startTime)}</td>
                        <td className="py-3 px-4">{formatDateTime(session.plannedEndTime)}</td>
                        <td className="py-3 px-4">
                          <span className="status-badge active">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Extensions */}
            <div className="material-card p-6">
              <h3 className="text-lg font-semibold mb-4">Pending Time Extensions</h3>
              <div className="space-y-4">
                {pendingExtensions.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">Time Extension Request</div>
                      <div className="text-xs text-muted-foreground">
                        User: {request.userId} | Duration: {request.requestedMinutes} minutes
                      </div>
                      <div className="text-xs text-muted-foreground">Reason: {request.reason}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() =>
                          approveExtensionMutation.mutate({ requestId: request.id, response: "Approved" })
                        }
                        className="material-button secondary text-sm py-1 px-3"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          denyExtensionMutation.mutate({ requestId: request.id, response: "Denied" })
                        }
                        className="material-button destructive text-sm py-1 px-3"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // (Other cases remain the same as your original code — now type-safe)
      default:
        // Dashboard overview
        return (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.activeUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Active ORZ Users</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-secondary mb-2">{stats.pendingBookings || 0}</div>
                <div className="text-sm text-muted-foreground">Pending Bookings</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-warning mb-2">{stats.systemAlerts || 0}</div>
                <div className="text-sm text-muted-foreground">System Alerts</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-destructive mb-2">{stats.bannedUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Banned Users</div>
              </div>
            </div>
            {/* Recent Activity and Pending Approvals */}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card shadow-sm">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={setSelectedView}
          />
        </div>
        {/* Main Content */}
        <div className="flex-1 p-8">{renderContent()}</div>
      </div>
    </div>
  );
}
