import { useEffect } from "react";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import BannedUser from "@/pages/BannedUser";
// ORZ feature removed
import BookingDashboard from "@/pages/student/BookingDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";


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
    <>
      <Route path="/" component={Landing} />
      <Route path="/login/:subsystem?" component={Login} />
      <Route path="/booking" component={() => <ProtectedRoute component={BookingDashboard} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} />} />
    </>
  );
}

function App() {
  useEffect(() => {
    // Clear any existing token on app load to force fresh login/session sync
    localStorage.removeItem("auth.token");

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
          const text = await res.text();
          throw new Error(`Sync failed: ${res.status} ${text}`);
        }
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
