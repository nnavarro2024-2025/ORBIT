import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        setIsLoading(true);

        // Get the current user from Supabase Auth
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

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
          } catch (syncError) {
            console.error("Auth sync failed. This is a critical error, logging out.", syncError);
            // If we can't sync the user with our backend, we shouldn't let them proceed.
            // This prevents data inconsistency and logs the user out cleanly.
            supabase.auth.signOut();
            if (isMounted) setUser(null);
          }
        } else {
          if (isMounted) setUser(null);
        }
      } catch (err: any) {
        if (isMounted) setUser(null);
        setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchUser();

    // Listen for explicit refresh events (used by ProfileModal after successful update)
    const onManualRefresh = () => {
      fetchUser();
    };
    window.addEventListener('orbit:auth:refresh', onManualRefresh);

    // Listen to auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // If the user signs out, clear the user state
      if (_event === "SIGNED_OUT") {
        if (isMounted) setUser(null);
      } else if (session) {
        // On sign-in or token refresh, fetch the user's profile.
        fetchUser();
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