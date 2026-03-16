import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "../config";
import { fetchWithAuthenticatedSession, resolveApiUrl } from "./api";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const requestUrl = resolveApiUrl(url);
  const res = await fetchWithAuthenticatedSession(url, {
    method,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401) {
    console.warn(`[AUTH] Unauthorized response from ${requestUrl} after retry — session may have expired or user logged out.`);
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
    const path = queryKey.join("/");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = resolveApiUrl(normalizedPath);

    const res = await fetchWithAuthenticatedSession(normalizedPath);

    if (res.status === 401) {
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