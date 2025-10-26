// This service handles authentication specifically for the UIC API.
// It automatically includes the necessary Client ID and Secret headers.
//
// Removed the 'next/server' import to resolve type issues.
// We'll use a generic object type for the 'next' property.

// Get API config from Vite environment variables (safe on the client)
const BASE_URL = (import.meta.env.VITE_UIC_API_BASE_URL as string) ?? "";
const API_CLIENT_ID = (import.meta.env.VITE_UIC_API_CLIENT_ID as string) ?? "";
const API_CLIENT_SECRET = (import.meta.env.VITE_UIC_API_CLIENT_SECRET as string) ?? "";

// Informative warnings and safety: the client must not send a secret.
if (!BASE_URL || !API_CLIENT_ID) {
  console.warn(
    "UIC API Vite env vars (VITE_UIC_API_BASE_URL, VITE_UIC_API_CLIENT_ID) are not defined in the client environment. " +
      "Put them in client/.env(.local) and restart the client dev server."
  );
}

if (API_CLIENT_SECRET) {
  // Do not use the secret in browser requests — log stronger guidance.
  console.warn(
    "WARNING: VITE_UIC_API_CLIENT_SECRET is set. Client secrets MUST NOT be exposed to browsers.\n" +
      "Move that value to a server env variable (e.g. SERVER_UIC_API_CLIENT_SECRET) and create a server-side proxy endpoint.\n" +
      "The client will ignore the secret header to avoid accidental leakage."
  );
}

// --- API Response Types ---

/**
 * Represents the user details object from the API.
 */
export type UicUser = Record<string, any>;

/**
 * Represents the 'data' object in a successful login response.
 */
export type UicLoginData = {
  user: UicUser;
  token: string;
  token_type: "Bearer";
};

/**
 * Represents the full response from the UIC login API.
 */
export type UicLoginResponse = {
  success: boolean;
  data: UicLoginData | null; // Data is likely null on failure
  message: string;
};

/**
 * A generic API response for calls that just return a message (e.g., logout).
 */
export type UicApiResponse = {
  success: boolean;
  message: string;
  data?: any; // Optional data field
};

// --- Fetch Configuration ---

/**
 * A type for the fetch options, allowing us to pass Next.js specific options
 * like `next: { revalidate: 3600 }`.
 * We use a generic object for 'next' to avoid type import issues.
 */
type FetchOptions = RequestInit & {
  next?: Record<string, any>;
};

/**
 * The core API fetch function for UIC.
 * @param endpoint - The API endpoint (e.g., "/login")
 * @param options - Optional fetch options (method, body, headers, cache)
 * @returns {Promise<T>} - The JSON response
 */
async function uicApiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  // Construct the full URL. Preserve BASE_URL path segments.
  const base = BASE_URL ? BASE_URL.replace(/\/$/, "") : window.location.origin.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${base}${path}`);

  // Define default headers, including the static API keys
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(API_CLIENT_ID ? { "X-API-Client-ID": API_CLIENT_ID } : {}),
  };

  // Merge default headers with any custom headers (like Authorization)
  options.headers = { ...defaultHeaders, ...options.headers };

  // Stringify the body if it's an object
  if (options.body && typeof options.body === "object") {
    if (!(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url.toString(), options);

    // Check if the request was successful
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // Not a JSON error
      }
      
      throw new Error(
        `UIC API Error: ${response.status} ${response.statusText}. ` +
        (errorBody ? `Details: ${JSON.stringify(errorBody)}` : "")
      );
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;

  } catch (error) {
    console.error("UIC API Fetch Error:", error);
    throw error; // Re-throw the error
  }
}

// --- Public Authentication Functions ---

/**
 * Logs a user in.
 * Assumes the API expects a POST to /accounts/auth/login with a body.
 * @param credentials - The user's credentials { username, password }
 * @returns The API response, strongly typed.
 */
// export async function loginToUic(credentials: { username: string; password: string }): Promise<UicLoginResponse> {
//   // Use the specific login endpoint provided
//   return uicApiFetch<UicLoginResponse>("/accounts/auth/login", {
//     method: "POST",
//     body: credentials,
//     // We don't want to cache a login request
//     next: { revalidate: 0 },
//   });
// }

export async function loginToUic(credentials: { username: string; password: string }): Promise<UicLoginResponse> {
  // If no explicit external BASE_URL is configured for the client, call our server proxy
  if (!BASE_URL) {
    const resp = await fetch("/api/uic/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!resp.ok) {
      let body;
      try { body = await resp.json(); } catch { body = await resp.text(); }
      throw new Error(`UIC proxy failed: ${resp.status} ${resp.statusText} - ${JSON.stringify(body)}`);
    }
    return (await resp.json()) as UicLoginResponse;
  }

  // existing external call path
  return uicApiFetch<UicLoginResponse>("/accounts/auth/login", {
    method: "POST",
    body: credentials,
    next: { revalidate: 0 },
  });
}

/**
 * Logs a user out.
 * Assumes the API expects an authenticated POST to /logout.
 * @param token - The user's Bearer token.
 * @returns The API response.
 */
export async function logoutFromUic(token: string): Promise<UicApiResponse> {
  if (!token) throw new Error("Logout requires an auth token.");

  // Do not send the client secret from the browser. If your API requires a server-side secret,
  // call your server proxy (/api/auth/uic-logout) instead.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(API_CLIENT_ID ? { "X-API-Client-ID": API_CLIENT_ID } : {}),
    Authorization: `Bearer ${token}`,
  };

  return uicApiFetch<UicApiResponse>("/logout", { method: "POST", headers, next: { revalidate: 0 } });
}

