import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async (showLoading = false) => {
      try {
        if (showLoading) setIsLoading(true);

        // Get the current user from Supabase Auth
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        // If this is a silent fetch (showLoading === false) and no user is returned,
        // do NOT call setUser, setError, or setIsLoading—preserve previous state to prevent flicker.
        if (!showLoading && !data.user) {
          return;
        }

        if (data.user) {
          // Sync with local database to get updated role and status
          try {
            const userData = await authenticatedFetch('/auth/sync', {
              method: 'POST',
            });
            
            // Check if user is banned - keep user data but don't auto-logout
            // This allows the Router to show the BannedUser component
            if (userData && userData.status === "banned") {
              console.log("User is banned, setting banned user data");
              if (isMounted) setUser(userData); // Keep user data so Router can show ban message
              return; // Don't logout, let Router handle the ban display
            }
            
            if (isMounted) setUser(userData);
            // Successful sync means the user is allowed — clear any domain-block flag
            try { sessionStorage.removeItem('orbit:domain_blocked'); } catch (_) {}
          } catch (syncError) {
            console.error("Auth sync failed.", syncError);
            // If we can't sync the user with our backend, we shouldn't let them proceed.
            // This prevents data inconsistency and logs the user out cleanly.
            await supabase.auth.signOut();
            if (isMounted) setUser(null);
            
            // Check if it's a 403 domain block error
            const errorMessage = (syncError as any)?.message || '';
            if (errorMessage.includes('403') || errorMessage.includes('restricted')) {
              // Redirect to login with a notification unless we've already
              // performed the domain-block flow (to avoid redirect spam).
              const already = (() => { try { return !!sessionStorage.getItem('orbit:domain_blocked'); } catch (_) { return false; } })();
              if (!already && !window.location.pathname.includes('/login')) {
                try { sessionStorage.setItem('orbit:domain_blocked', '1'); } catch (_) {}
                window.location.href = '/login?error=domain_restricted';
              }
            }
          }
        } else {
          // Only clear user on visible reloads to avoid flicker when switching tabs
          if (isMounted && showLoading) {
            setUser(null);
          }
          // If not showLoading, do NOT call setUser at all (preserve previous user)
        }
      } catch (err: any) {
        // Only clear user on visible reloads to avoid flicker
        if (isMounted && showLoading) setUser(null);
        // If not showLoading, preserve the previous user (do nothing)
        setError(err);
      } finally {
        if (isMounted && showLoading) setIsLoading(false);
      }
    };

    // Initial fetch — show loading on first app load
    fetchUser(true);

    // Listen for explicit refresh events (used by ProfileModal after successful update)
    const onManualRefresh = () => {
      // Manual refreshes should be silent by default to avoid flashing the global
      // loader when they are triggered by UI components (like ProfileModal) or
      // by background events (tab focus/token refresh).
      fetchUser(false);
    };
    window.addEventListener('orbit:auth:refresh', onManualRefresh);

    // Listen to auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // If the user signs out, clear the user state
      if (_event === "SIGNED_OUT") {
        if (isMounted) setUser(null);
      } else if (session) {
        // On sign-in or token refresh, perform a silent sync so tab switches
        // or background token refreshes don't show the full-screen loader.
        fetchUser(false);
      } else {
        if (isMounted) setUser(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener('orbit:auth:refresh', onManualRefresh);
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user.status !== "banned",
    error,
    logout: async () => {
      await supabase.auth.signOut();
    },
  };
}