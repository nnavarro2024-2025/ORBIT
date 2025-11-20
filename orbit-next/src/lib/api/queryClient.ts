import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "../config";
import { resolveApiUrl } from "./api";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const requestUrl = resolveApiUrl(url);

  const res = await fetch(requestUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    console.error("🚨 401 Unauthorized received in apiRequest. Session expired. NOT redirecting to login for debugging.");
    await supabase.auth.signOut();
    // window.location.href = "/login"; // Temporarily commented out for debugging
    throw new Error("Session expired or unauthorized. Redirecting to login.");
  }

  if (!res.ok) {
    // Try to parse structured JSON payload (e.g., { message, facility, conflictingBookings })
    let payload: any = null;
    let textBody: string | null = null;
    try {
      payload = await res.json();
    } catch (e) {
      // res.json failed (maybe body not JSON or already consumed). Try to read text and parse JSON out of it.
      try {
        textBody = await res.text();
        try {
          payload = JSON.parse(textBody);
        } catch (pe) {
          // not JSON
        }
      } catch (te) {
        // ignore
      }
    }

    const text = (payload && (payload.message || JSON.stringify(payload))) || textBody || (await res.text()) || res.statusText;
    const err: any = new Error(`${res.status}: ${text}`);
    if (payload) err.payload = payload;
    throw err;
  }

  return res;
}

export function getQueryFn<T>(): QueryFunction<T> {
  return async ({ queryKey }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const path = queryKey.join("/");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = resolveApiUrl(normalizedPath);

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      await supabase.auth.signOut();
      // window.location.href = "/login"; // Temporarily commented out for debugging
      throw new Error("Session expired or unauthorized. Redirecting to login.");
    }

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn<any>(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});