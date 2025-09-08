import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // ✅ Backend URL

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

  const res = await fetch(`${BASE_URL}${url}`, {
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
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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

    const url = `${BASE_URL}/${queryKey.join("/")}`;

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