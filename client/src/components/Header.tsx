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

// Helper: parse alert for equipment-related content in a safe, testable way
function parseEquipmentAlert(alert: any) {
  const raw = String(alert?.message || '');
  let visibleTitle = String(alert?.title || '');
  let titleRequesterEmail: string | null = null;

  try {
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) {
      titleRequesterEmail = m[1];
      visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
    }
  } catch (e) {
    titleRequesterEmail = null;
  }

  // Try JSON-style Needs: { ... }
  let needsObj: any = null;
  try {
    const needsMatch = raw.match(/Needs:\s*(\{[\s\S]*\})/i);
    if (needsMatch && needsMatch[1]) {
      try { needsObj = JSON.parse(needsMatch[1]); } catch (e) { needsObj = null; }
    }
  } catch (e) { needsObj = null; }

  // Legacy free-text
  const eqMatch = raw.match(/Requested equipment:\s*([^\[]+)/i);
  let equipmentList: string[] = [];
  let othersText: string | null = null;

  const mapToken = (rawToken: string) => {
    const raw = String(rawToken || '').replace(/_/g, ' ').trim();
    const lower = raw.toLowerCase();
    if (lower.includes('others')) return null;
    if (lower === 'whiteboard') return 'Whiteboard & Markers';
    if (lower === 'projector') return 'Projector';
    if (lower === 'extension cord' || lower === 'extension_cord') return 'Extension Cord';
    if (lower === 'hdmi') return 'HDMI Cable';
    if (lower === 'extra chairs' || lower === 'extra_chairs') return 'Extra Chairs';
    return raw.replace(/[.,;]+$/g, '').trim();
  };

  if (needsObj && Array.isArray(needsObj.items)) {
    // extract others text from items or from needsObj.others
    let othersFromItems = '';
    const mapped = needsObj.items.map((s: string) => {
      const rawTok = String(s || '');
      const lower = rawTok.toLowerCase();
      if (lower.includes('others')) {
        const trailing = rawTok.replace(/.*?others[:\s-]*/i, '').trim();
        if (trailing && !othersFromItems) othersFromItems = trailing;
        return null;
      }
      return mapToken(rawTok);
    }).filter(Boolean) as string[];
    equipmentList = mapped;
    othersText = othersFromItems || (needsObj.others ? String(needsObj.others).trim() : null);
  } else if (eqMatch && eqMatch[1]) {
    const parts = eqMatch[1].split(/[,;]+/).map(s => String(s).trim()).filter(Boolean);
    let othersFromParts = '';
    const mapped = parts.map((p) => {
      const lower = p.toLowerCase();
      if (lower.includes('others')) {
        const trailing = p.replace(/.*?others[:\s-]*/i, '').trim();
        if (trailing && !othersFromParts) othersFromParts = trailing;
        return null;
      }
      return mapToken(p);
    }).filter(Boolean) as string[];
    equipmentList = mapped;
    // also capture 'Others: ...' trailing token if present
    const extrasMatch = eqMatch[1].match(/Others?:\s*(.*)$/i);
    othersText = othersFromParts || (extrasMatch && extrasMatch[1] ? String(extrasMatch[1]).trim() : null);
  }

  // If we have an others text or detected 'others' markers, show a placeholder in the inline list instead of raw 'Others: ...'
  if (othersText && equipmentList.length >= 0) {
    // Ensure we don't duplicate 'and others'
    if (!equipmentList.includes('and others')) equipmentList.push('and others');
  }

  // Normalize visible title for equipment alerts
  try {
    if (/equipment\s*needs?/i.test(visibleTitle) || /equipment needs submitted/i.test(visibleTitle)) {
      visibleTitle = 'Equipment or Needs Request';
    }
    // remove appended email from title if present
    const m = visibleTitle.match(/[—–-]\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/);
    if (m && m[1]) visibleTitle = visibleTitle.replace(/[—–-]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*$/, '').trim();
  } catch (e) {}

  // Clean raw snippet for brief display: remove booking tags, remove raw Needs JSON and stray 'Others:' fragments
  let cleaned = raw.replace(/\s*\[booking:[^\]]+\]/, '').replace(/Needs:\s*\{[\s\S]*\}\s*/i, '').replace(/,?\s*Others?:\s*[^,\]]+/i, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return { visibleTitle, titleRequesterEmail, equipmentList, othersText, cleaned };
}

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

        // snapshot previous data depending on role
        const prevAdmin = isAdmin ? queryClient.getQueryData<any>(['/api/admin/alerts']) : undefined;
        const prevUser = !isAdmin ? queryClient.getQueryData<any>(['/api/notifications']) : undefined;

        // helper to mark read in a dataset
        const markReadIn = (data: any) => {
          if (!Array.isArray(data)) return data;
          return data.map((a: any) => (a.id === alertId ? { ...a, isRead: true } : a));
        };

        // optimistically update only the relevant cache for this actor
        if (isAdmin) {
          queryClient.setQueryData(['/api/admin/alerts'], (old: any) => markReadIn(old));
        } else {
          queryClient.setQueryData(['/api/notifications'], (old: any) => markReadIn(old));
        }

        return { prevAdmin, prevUser, alertId };
    },
    onError: (_err, _alertId, context: any) => {
      // rollback - only restore the cache we touched
      if (isAdmin && context?.prevAdmin) queryClient.setQueryData(['/api/admin/alerts'], context.prevAdmin);
      if (!isAdmin && context?.prevUser) queryClient.setQueryData(['/api/notifications'], context.prevUser);
      // remove from pending
      if (context?.alertId) setPendingMarkIds(prev => {
        const next = new Set(prev);
        next.delete(context.alertId);
        return next;
      });
    },
    onSettled: (_data, _err, alertId: string | undefined) => {
      // ensure we refetch to get authoritative state and remove pending
      // Only invalidate the cache relevant to this actor
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
        // refresh admin stats so the dashboard count reflects the change
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
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
                    .map((alert: any) => {
                      const parsed = parseEquipmentAlert(alert);

                      // Resolve actor email from message/details or fallback to current user
                      let actorEmail = '';
                      try {
                        if (alert.userId) actorEmail = String(alert.userId);
                        const m = String(alert.message || alert.details || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                        if (m && m[1]) actorEmail = m[1];
                      } catch (e) { actorEmail = '' }
                      if (!actorEmail) actorEmail = user?.email || '';

                      // Try to find the target email (booking owner) different from actor
                      let targetEmail = '';
                      try {
                        const emails = (String(alert.message || alert.details || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
                        for (const e of emails) {
                          if (actorEmail && e.toLowerCase() === actorEmail.toLowerCase()) continue;
                          targetEmail = e; break;
                        }
                        if (!targetEmail && parsed.titleRequesterEmail) targetEmail = parsed.titleRequesterEmail;
                      } catch (e) { targetEmail = parsed.titleRequesterEmail || ''; }

                      // Build a single-line subLine for equipment alerts to match System Activity style
                      let subLine = alert.isRead ? `READ: ${parsed.cleaned}` : parsed.cleaned;
                      try {
                        if (parsed.equipmentList && parsed.equipmentList.length > 0) {
                          // Join items into a friendly text and ensure 'and others' grammar
                          const items = parsed.equipmentList.slice();
                          let itemsText = items.join(', ').replace(/,\s*and others/i, ' and others');
                          // Determine verb from title (e.g., Prepared vs Requested)
                          const verb = /prepared/i.test(String(alert.title || '')) ? 'Prepared' : (alert.title || 'requested');
                          const whoPart = targetEmail ? ` for ${targetEmail}` : '';
                          // Include the alert creation time inline in the notification subline
                          const when = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '';
                          subLine = `${actorEmail} ${verb} requested equipment${whoPart}. Needs: ${itemsText}`;
                          if (when) subLine = `${subLine} at ${when}`;
                        }
                      } catch (e) {}

                      // Keep timestamps in the notifications dropdown (they are appended inline above).

                      return (
                        <div key={alert.id} className={`p-2 rounded-md ${alert.isRead ? 'opacity-70' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 pr-4">
                              <div className="flex items-start justify-between">
                                <div className="font-medium text-sm text-gray-900">{parsed.visibleTitle}</div>
                                {!alert.isRead && (
                                  <div className="ml-4">
                                    <button
                                      onClick={() => markAlertReadMutation.mutate(alert.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded disabled:opacity-60"
                                      disabled={pendingMarkIds.has(alert.id)}
                                    >
                                      {pendingMarkIds.has(alert.id) ? 'Marking...' : 'Mark Read'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="text-xs text-gray-600 mt-1 break-words">{subLine}</div>

                              {/* 'View other' removed by user request */}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {alertsData.length > 6 && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (isAdmin) {
                            setLocation('/admin/alerts');
                          } else {
                            // Use dedicated route `/notifications` which BookingDashboard listens to
                            // This is more robust than relying on hash propagation through router navigation
                            setLocation('/notifications');
                          }
                        }}
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