import { supabase } from "./supabase"; // Make sure this path points to your Supabase client instance

/**
 * A wrapper for the native `fetch` function that automatically adds the
 * Supabase authentication token to the request headers.
 *
 * @param url The URL to fetch, which will be prefixed with the API base.
 * @param options The standard `fetch` options object.
 * @returns The JSON response from the API.
 * @throws An error if the network response is not ok.
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    // This handles potential errors from Supabase itself during the session fetch.
    throw new Error(`Authentication error: ${sessionError.message}`);
  }

  if (!session) {
    // Fail fast if there's no active session, providing a clear client-side error.
    throw new Error("No active session. Please log in to continue.");
  }

  // It's good practice to merge headers rather than overwrite them
  const headers = new Headers(options.headers);
  // We know the session exists here, so we can confidently set the header.
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("Content-Type", "application/json");

  // Construct the full API URL
  const apiUrl = `/api${url.startsWith("/") ? "" : "/"}${url}`;

  const response = await fetch(apiUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.error("🚨 401 Unauthorized received. Session expired. NOT redirecting to login for debugging.");
      console.error("401 Response:", response);
      await supabase.auth.signOut();
      // window.location.href = "/login"; // Temporarily commented out for debugging
      // No need to throw an error here as the page will reload
    }
    
    if (response.status === 403) {
      console.error("🚨 403 Forbidden received. User is banned or suspended. Signing out.");
      console.error("403 Response:", response);
      await supabase.auth.signOut();
      window.location.reload(); // Force reload to trigger useAuth to refetch user data
      // This will cause the Router to show the BannedUser component
    }
    
    // Try to parse the error message from the server for better debugging
    const errorData = await response.json().catch(() => ({
      message: `API Error: ${response.status} ${response.statusText}`,
    }));
    throw new Error(errorData.message || "An unknown API error occurred");
  }

  // Handle cases where the response might be empty (e.g., a 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return; // Return undefined for non-JSON responses
}