import { useEffect } from "react";
import { Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import OrzDashboard from "@/pages/student/OrzDashboard";
import BookingDashboard from "@/pages/student/BookingDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login/:subsystem?" component={Login} />
          <Route path="*" component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/" component={Landing} />
          <Route path="/orz" component={OrzDashboard} />
          <Route path="/booking" component={BookingDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="*" component={NotFound} />
        </>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
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

    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        localStorage.setItem("auth.token", token);
        syncUserData(token);
        console.log("Synced token on app load:", token);
      }
    });

    // Correct destructuring here:
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
