

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
  Bell,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState("dashboard");

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activeSessions } = useQuery({
    queryKey: ["/api/admin/sessions"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: pendingBookings } = useQuery({
    queryKey: ["/api/bookings/pending"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: pendingExtensions } = useQuery({
    queryKey: ["/api/orz/time-extension/pending"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: alerts } = useQuery({
    queryKey: ["/api/admin/alerts"],
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/admin/activity"],
  });

  const approveBookingMutation = useMutation({
    mutationFn: async ({ bookingId, response }: { bookingId: string; response: string }) => {
      const result = await apiRequest("POST", `/api/bookings/${bookingId}/approve`, { adminResponse: response });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      toast({
        title: "Booking Approved",
        description: "The booking has been approved successfully.",
        variant: "default",
      });
    },
  });

  const denyBookingMutation = useMutation({
    mutationFn: async ({ bookingId, response }: { bookingId: string; response: string }) => {
      const result = await apiRequest("POST", `/api/bookings/${bookingId}/deny`, { adminResponse: response });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/pending"] });
      toast({
        title: "Booking Denied",
        description: "The booking has been denied.",
        variant: "default",
      });
    },
  });

  const approveExtensionMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string; response: string }) => {
      const result = await apiRequest("POST", `/api/orz/time-extension/${requestId}/approve`, { adminResponse: response });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/time-extension/pending"] });
      toast({
        title: "Extension Approved",
        description: "The time extension has been approved.",
        variant: "default",
      });
    },
  });

  const denyExtensionMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string; response: string }) => {
      const result = await apiRequest("POST", `/api/orz/time-extension/${requestId}/deny`, { adminResponse: response });
      return result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/time-extension/pending"] });
      toast({
        title: "Extension Denied",
        description: "The time extension has been denied.",
        variant: "default",
      });
    },
  });

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Shield },
    { id: "orz-management", label: "ORZ Management", icon: Dock },
    { id: "facility-management", label: "Facility Management", icon: Calendar },
    { id: "user-management", label: "User Management", icon: Users },
    { id: "security", label: "Security Management", icon: Shield },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleSidebarClick = (itemId: string) => {
    setSelectedView(itemId);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderContent = () => {
    switch (selectedView) {
      case "orz-management":
        return (
          <div className="space-y-6">
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
                    {activeSessions?.map((session: any) => (
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

            <div className="material-card p-6">
              <h3 className="text-lg font-semibold mb-4">Pending Time Extensions</h3>
              <div className="space-y-4">
                {pendingExtensions?.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium">Time Extension Request</div>
                      <div className="text-xs text-muted-foreground">
                        User: {request.userId} | Duration: {request.requestedMinutes} minutes
                      </div>
                      <div className="text-xs text-muted-foreground">Reason: {request.reason}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => approveExtensionMutation.mutate({ requestId: request.id, response: "Approved" })}
                        className="material-button secondary text-sm py-1 px-3"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => denyExtensionMutation.mutate({ requestId: request.id, response: "Denied" })}
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

      case "facility-management":
        return (
          <div className="material-card p-6">
            <h3 className="text-lg font-semibold mb-4">Pending Facility Bookings</h3>
            <div className="space-y-4">
              {pendingBookings?.map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Facility Booking Request</div>
                    <div className="text-xs text-muted-foreground">
                      User: {booking.userId} | Facility: {booking.facilityId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                    </div>
                    <div className="text-xs text-muted-foreground">Purpose: {booking.purpose}</div>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => approveBookingMutation.mutate({ bookingId: booking.id, response: "Approved" })}
                      className="material-button secondary text-sm py-1 px-3"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => denyBookingMutation.mutate({ bookingId: booking.id, response: "Denied" })}
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
        );

      case "security":
        return (
          <div className="material-card p-6">
            <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
            <div className="space-y-4">
              {alerts?.map((alert: any) => (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(alert.createdAt)}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    }`}>
                      {alert.severity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="material-card p-6">
            <h3 className="text-lg font-semibold mb-4">System Reports</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">ORZ Computer Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Today</span>
                    <span className="text-sm font-medium">{stats?.activeUsers || 0} active users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">This Week</span>
                    <span className="text-sm font-medium">968 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">This Month</span>
                    <span className="text-sm font-medium">4,230 hours</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Facility Bookings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Today</span>
                    <span className="text-sm font-medium">12 bookings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">This Week</span>
                    <span className="text-sm font-medium">84 bookings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">This Month</span>
                    <span className="text-sm font-medium">356 bookings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <>
            {/* Overview Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats?.activeUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Active ORZ Users</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-secondary mb-2">{stats?.pendingBookings || 0}</div>
                <div className="text-sm text-muted-foreground">Pending Bookings</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-warning mb-2">{stats?.systemAlerts || 0}</div>
                <div className="text-sm text-muted-foreground">System Alerts</div>
              </div>
              <div className="material-card p-6 text-center">
                <div className="text-3xl font-bold text-destructive mb-2">{stats?.bannedUsers || 0}</div>
                <div className="text-sm text-muted-foreground">Banned Users</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="material-card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {activities?.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-center p-3 bg-accent/50 rounded-lg">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.action}</div>
                        <div className="text-xs text-muted-foreground">{activity.details}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="material-card p-6">
                <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
                <div className="space-y-4">
                  {pendingExtensions?.slice(0, 3).map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Time Extension Request</div>
                        <div className="text-xs text-muted-foreground">User: {request.userId}</div>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => approveExtensionMutation.mutate({ requestId: request.id, response: "Approved" })}
                          className="material-button secondary text-sm py-1 px-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => denyExtensionMutation.mutate({ requestId: request.id, response: "Denied" })}
                          className="material-button destructive text-sm py-1 px-3"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingBookings?.slice(0, 2).map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">Facility Booking Request</div>
                        <div className="text-xs text-muted-foreground">User: {booking.userId}</div>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => approveBookingMutation.mutate({ bookingId: booking.id, response: "Approved" })}
                          className="material-button secondary text-sm py-1 px-3"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => denyBookingMutation.mutate({ bookingId: booking.id, response: "Denied" })}
                          className="material-button destructive text-sm py-1 px-3"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex min-h-screen">
        {/* Admin Sidebar */}
        <div className="w-64 bg-card shadow-sm">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>
        
        {/* Admin Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
