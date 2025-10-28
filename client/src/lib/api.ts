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

  // Construct the full API URL. Prefer an explicit backend URL when provided via
  // VITE_API_BASE_URL (e.g. http://localhost:5000). Otherwise, fall back to a
  // relative `/api/...` path which relies on Vite's dev server proxy in development.
  const apiBase = (import.meta as any).env?.VITE_API_URL || '';
  const apiUrl = apiBase
    ? `${apiBase.replace(/\/$/, '')}/api${url.startsWith('/') ? '' : '/'}${url}`
    : `/api${url.startsWith('/') ? '' : '/'}${url}`;

  const response = await fetch(apiUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Helpful diagnostics for 404/502 when backend or proxy isn't available
    if (response.status === 404) {
      console.error(`API 404 at ${apiUrl} - check that your backend is running and the route exists.`);
    }
    if (response.status === 502) {
      console.error(`API 502 Bad Gateway at ${apiUrl} - proxy failed to reach backend.`);
    }
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
      // Dispatch silent refresh instead of forcing reload to avoid tab switch issues
      try {
        window.dispatchEvent(new Event('orbit:auth:refresh'));
      } catch (e) {
        // ignore
      }
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