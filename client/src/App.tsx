import { useEffect } from "react";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import React, { Suspense, lazy } from "react";
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const BannedUser = lazy(() => import("@/pages/BannedUser"));
const BookingDashboard = lazy(() => import("@/pages/student/BookingDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const SearchPage = lazy(() => import("@/pages/Search"));


function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log("Router - isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "user:", user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is banned FIRST - show ban message even if not "authenticated"
  if (user && user.status === "banned") {
    console.log("Router - User is banned, showing BannedUser component");
    return <BannedUser />;
  }

  // Create protected route wrapper
  const ProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => {
    return isAuthenticated ? <Component /> : <Login />;
  };

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div></div>}>
      {/* If the app was loaded directly at /notifications, replace the URL so the BookingDashboard
          receives the hash it expects. Use replaceState so browser history isn't polluted. */}
      {typeof window !== 'undefined' && (function() {
        try {
          const pathname = window.location.pathname || '/';
          const ensureBase = (suffix: string, targetSuffix: string, setFlag?: () => void) => {
            if (!pathname.endsWith(suffix)) return null;
            // compute base (may be empty or a prefix like '/173')
            const base = pathname.slice(0, pathname.length - suffix.length) || '/';
            const target = (base === '/' ? '' : base) + targetSuffix;
            try { setFlag && setFlag(); } catch (_) {}
            if (window.location.pathname + window.location.hash !== target) {
              window.history.replaceState({}, '', target);
            }
            return null;
          };

          // /notifications -> /booking#activity-logs:notifications
          const maybeNotifications = ensureBase('/notifications', '/booking#activity-logs:notifications', () => { try { sessionStorage.setItem('openNotificationsOnce', '1'); } catch (_) {} });
          if (maybeNotifications !== null) return maybeNotifications;

          // /admin/alerts -> /admin#activity:notifications
          const maybeAdminAlerts = ensureBase('/admin/alerts', '/admin#activity:notifications', () => { try { sessionStorage.setItem('openAdminAlertsOnce', '1'); } catch (_) {} });
          if (maybeAdminAlerts !== null) return maybeAdminAlerts;
        } catch (e) {
          console.warn('Failed to perform path rewrites for notifications/admin alerts', e);
        }
        return null;
      })()}
      <Route path="/" component={Landing} />
      <Route path="/login/:subsystem?" component={Login} />
      <Route path="/booking" component={() => <ProtectedRoute component={BookingDashboard} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} />} />
      {/* Direct route to admin alerts - opens AdminDashboard and lets it pick the Security -> Booking tab */}
      <Route path="/admin/alerts" component={() => <ProtectedRoute component={AdminDashboard} />} />
      {/* Route for user notifications - opens BookingDashboard and lets it pick Activity Logs -> Notification Logs */}
      <Route path="/notifications" component={() => <ProtectedRoute component={BookingDashboard} />} />
      <Route path="/search" component={SearchPage} />
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    // Clear any existing token on app load to force fresh login/session sync
    localStorage.removeItem("auth.token");

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

    const syncUserData = async (token: string) => {
      try {
        const res = await fetch(`${API_URL}/api/auth/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) {
          // If server rejects due to domain restriction, sign user out client-side
          if (res.status === 403) {
              try {
                // Clear local token and redirect to login with domain-block flag
                localStorage.removeItem('auth.token');
                // Avoid repeatedly redirecting if we've already shown the blocked page
                const already = (() => { try { return !!sessionStorage.getItem('orbit:domain_blocked'); } catch (_) { return false; } })();
                if (!already) {
                  try { sessionStorage.setItem('orbit:domain_blocked', '1'); } catch (_) {}
                  window.location.href = '/login?domain_block=1';
                }
                return;
              } catch (e) {
                // fallback to throwing
              }
            }
          const text = await res.text();
          throw new Error(`Sync failed: ${res.status} ${text}`);
        }
          // If sync was successful, clear any domain-block flag that may have been
          // set earlier during failed attempts so valid users are not shown the modal.
          try { sessionStorage.removeItem('orbit:domain_blocked'); } catch (_) {}
      } catch (error) {
        console.error("User sync failed:", error);
      }
    };

    // Get current session and sync token
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        localStorage.setItem("auth.token", token);
        syncUserData(token);
        console.log("Synced token on app load:", token);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.access_token) {
          localStorage.setItem("auth.token", session.access_token);
          await syncUserData(session.access_token);
          console.log("Synced token on auth state change:", session.access_token);
        } else {
          localStorage.removeItem("auth.token");
          console.log("User logged out or session ended");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
