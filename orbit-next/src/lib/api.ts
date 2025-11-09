import { supabase } from "./supabase"; // Make sure this path points to your Supabase client instance

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
  : "";
const API_PREFIX = "/api";
const USE_EXTERNAL_API = (process.env.NEXT_PUBLIC_API_USE_EXTERNAL || "false").toLowerCase() === "true";

export function resolveApiUrl(path: string) {
  if (!path) {
    if (USE_EXTERNAL_API && API_BASE) {
      return `${API_BASE}${API_PREFIX}`;
    }
    return API_PREFIX;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const shouldPrefix = !normalized.startsWith(API_PREFIX);
  const relativePath = shouldPrefix ? `${API_PREFIX}${normalized}` : normalized;

  if (USE_EXTERNAL_API && API_BASE) {
    return `${API_BASE}${relativePath}`;
  }

  return relativePath;
}

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

  let activeSession = session;

  if (!activeSession) {
    // Attempt a silent refresh if the session is unexpectedly missing. This covers cases where
    // Supabase has a valid refresh token but has not yet materialized an access token in memory.
    try {
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw refreshError;
      }

      activeSession = refreshedSession ?? null;
    } catch (refreshErr) {
      console.warn("[AUTH] Silent session refresh failed", refreshErr);
    }
  }

  if (!activeSession) {
    // Fallback to signing out so application state stays consistent instead of throwing immediately.
    await supabase.auth.signOut();
    throw new Error("Session expired. Please log in to continue.");
  }

  // It's good practice to merge headers rather than overwrite them
  const headers = new Headers(options.headers);
  // We know the session exists here, so we can confidently set the header.
  headers.set("Authorization", `Bearer ${activeSession.access_token}`);
  headers.set("Content-Type", "application/json");

  const apiUrl = resolveApiUrl(url);

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
      console.error("🚨 401 Unauthorized received. Attempting silent session refresh...");
      console.error("401 Response:", response);

      // Try to get a refreshed session from Supabase client and retry once if token changed
      try {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.getSession();

        const refreshedToken = refreshedSession?.access_token;
        const originalToken = activeSession.access_token;

        if (refreshedToken && refreshedToken !== originalToken) {
          console.log('[AUTH] Token refreshed locally, retrying request once');
          // Retry the original request with the refreshed token
          const retryHeaders = new Headers(options.headers);
          retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
          retryHeaders.set('Content-Type', 'application/json');

          const retryResp = await fetch(apiUrl, {
            ...options,
            headers: retryHeaders,
          });

          if (retryResp.ok) return retryResp.json().catch(() => undefined);
          // If retry failed, fall through to sign-out below
        }
      } catch (e) {
        console.warn('[AUTH] Silent refresh attempt failed', e);
      }

      // Final fallback: sign out the client to force a fresh login
      await supabase.auth.signOut();
      // window.location.href = "/login"; // Optionally redirect to login
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