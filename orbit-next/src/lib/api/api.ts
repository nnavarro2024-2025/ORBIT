import { supabase } from "../config"; // Make sure this path points to your Supabase client instance

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

function shouldSetJsonContentType(body: RequestInit["body"]): boolean {
  if (body == null) {
    return false;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return false;
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return false;
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return false;
  }

  return true;
}

export async function getAuthenticatedSession(forceRefresh = false) {
  if (!forceRefresh) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (session) {
      return session;
    }
  }

  try {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw refreshError;
    }

    return refreshedSession ?? null;
  } catch (refreshErr) {
    console.warn("[AUTH] Session refresh failed", refreshErr);
    return null;
  }
}

export async function fetchWithAuthenticatedSession(url: string, options: RequestInit = {}) {
  const apiUrl = resolveApiUrl(url);
  const activeSession = await getAuthenticatedSession();

  if (!activeSession) {
    await supabase.auth.signOut();
    throw new Error("Session expired. Please log in to continue.");
  }

  const sendRequest = async (accessToken: string) => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    if (!headers.has("Content-Type") && shouldSetJsonContentType(options.body)) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(apiUrl, {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
    });
  };

  let response = await sendRequest(activeSession.access_token);

  if (response.status === 401) {
    console.warn("[AUTH] Request returned 401. Refreshing session and retrying once.");
    const refreshedSession = await getAuthenticatedSession(true);

    if (refreshedSession?.access_token) {
      response = await sendRequest(refreshedSession.access_token);
    }

    if (response.status === 401) {
      await supabase.auth.signOut();
    }
  }

  return response;
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
  const apiUrl = resolveApiUrl(url);
  const response = await fetchWithAuthenticatedSession(url, options);

  if (!response.ok) {
    // Helpful diagnostics for 404/502 when backend or proxy isn't available
    if (response.status === 404) {
      console.error(`API 404 at ${apiUrl} - check that your backend is running and the route exists.`);
    }
    if (response.status === 502) {
      console.error(`API 502 Bad Gateway at ${apiUrl} - proxy failed to reach backend.`);
    }
    if (response.status === 401) {
      console.warn(`[AUTH] Unauthorized response from ${apiUrl} after retry — session may have expired or user logged out.`);
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