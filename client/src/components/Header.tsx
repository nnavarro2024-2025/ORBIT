import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import ProfileModal from "./modals/ProfileModal";
import { useState } from "react";

export default function Header() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [pendingMarkIds, setPendingMarkIds] = useState<Set<string>>(new Set());

  // Admin alerts (notifications)
  const isAdmin = !!(user && user.role === 'admin');

  const { data: adminAlerts = [], isLoading: adminLoading } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/alerts');
      try { return await res.json(); } catch { return []; }
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const { data: userAlerts = [], isLoading: userLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications');
      try { return await res.json(); } catch { return []; }
    },
    enabled: !!user && !isAdmin,
    staleTime: 30_000,
  });

  const markReadEndpoint = (id: string) => isAdmin ? `/api/admin/alerts/${id}/read` : `/api/notifications/${id}/read`;

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: string) => apiRequest('POST', markReadEndpoint(alertId)),
    // optimistic update
    onMutate: async (alertId: string) => {
      // add to pending set
      setPendingMarkIds(prev => new Set(prev).add(alertId));

      // snapshot previous data
      const prevAdmin = queryClient.getQueryData<any>(['/api/admin/alerts']);
      const prevUser = queryClient.getQueryData<any>(['/api/notifications']);

      // helper to mark read in a dataset
      const markReadIn = (data: any) => {
        if (!Array.isArray(data)) return data;
        return data.map((a: any) => (a.id === alertId ? { ...a, isRead: true } : a));
      };

      // optimistically update both caches
      queryClient.setQueryData(['/api/admin/alerts'], (old: any) => markReadIn(old));
      queryClient.setQueryData(['/api/notifications'], (old: any) => markReadIn(old));

      return { prevAdmin, prevUser, alertId };
    },
    onError: (_err, _alertId, context: any) => {
      // rollback
      if (context?.prevAdmin) queryClient.setQueryData(['/api/admin/alerts'], context.prevAdmin);
      if (context?.prevUser) queryClient.setQueryData(['/api/notifications'], context.prevUser);
      // remove from pending
      if (context?.alertId) setPendingMarkIds(prev => {
        const next = new Set(prev);
        next.delete(context.alertId);
        return next;
      });
    },
    onSettled: (_data, _err, alertId: string | undefined) => {
      // ensure we refetch to get authoritative state and remove pending
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      // also refresh admin stats so the dashboard count reflects the change
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      if (alertId) setPendingMarkIds(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    },
  });

  // For non-admin users, only show alerts explicitly targeted to them (userId === user.id).
  // Global alerts (userId == null) are admin-level and should not be shown in regular users' dropdown.
  const userAlertsFiltered = Array.isArray(userAlerts) && user ? userAlerts.filter((a: any) => a.userId === user.id) : [];
  const alertsData = isAdmin ? adminAlerts : userAlertsFiltered;
  const alertsLoading = isAdmin ? adminLoading : userLoading;
  const unreadCount = Array.isArray(alertsData) ? alertsData.filter((a: any) => !a.isRead).length : 0;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      toast({
        title: "Logout Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Redirect to login page
      setLocation("/login");
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/orbit-logo.png" 
            alt="ORBIT Logo" 
            className="h-10 w-auto object-contain"
          />
          <span className="font-bold text-2xl tracking-wider bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            ORBIT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu onOpenChange={(open) => {
              if (open) {
                // Refetch appropriate notifications when opened
                if (isAdmin) {
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
                  // ensure the admin stats (counts) are also refreshed when viewing alerts
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                } else {
                  queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                }
              }
            }}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-2">
              <DropdownMenuLabel className="font-medium p-2">Notifications</DropdownMenuLabel>
              {alertsLoading ? (
                <div className="p-3 text-sm text-gray-500">Loading...</div>
              ) : Array.isArray(alertsData) && alertsData.length > 0 ? (
                <div className="space-y-2">
                  {alertsData
                    .slice()
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 6)
                    .map((alert: any) => (
                      <div key={alert.id} className={`p-2 rounded-md ${alert.isRead ? 'opacity-70' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{alert.title}</div>
                            <div className="text-sm text-gray-700 leading-snug break-words">{alert.message}</div>
                            <div className="text-[11px] text-gray-400 mt-1">{new Date(alert.createdAt).toLocaleString()}</div>
                          </div>
                          {!alert.isRead && (
                            <button
                              onClick={() => markAlertReadMutation.mutate(alert.id)}
                              className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded disabled:opacity-60"
                              disabled={pendingMarkIds.has(alert.id)}
                            >
                              {pendingMarkIds.has(alert.id) ? 'Marking...' : 'Mark Read'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                  {alertsData.length > 6 && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setLocation(isAdmin ? '/admin/alerts' : '/notifications')}
                        className="w-full text-left text-sm text-pink-600 hover:text-pink-700 px-2 py-2 rounded"
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500">No notifications</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Avatar className="h-9 w-9 border-2 border-gray-200">
                    {user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt="User Avatar" />
                    ) : (
                      <AvatarFallback className="bg-pink-500 text-white font-semibold">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="text-sm text-gray-600">Signed in as</div>
                  <div className="font-semibold text-gray-900 truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </div>
                  {user.firstName && user.lastName && (
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsProfileSidebarOpen(true)}
                  className="cursor-pointer p-3 rounded-lg hover:bg-pink-50 hover:text-pink-700"
                >
                  <User className="mr-3 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ProfileModal
        isOpen={isProfileSidebarOpen}
        onClose={() => setIsProfileSidebarOpen(false)}
      />
    </header>
  );
}