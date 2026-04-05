const TOKEN_KEY = "nph_token";

/**
 * Store the auth token in localStorage.
 * Called after successful sign-in / sign-up.
 */
export function saveAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage might be disabled
  }
}

/**
 * Remove the auth token from localStorage.
 * Called on sign-out.
 */
export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get the stored auth token.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * fetch() wrapper that attaches the Authorization: Bearer header
 * when a stored token exists. This works as a fallback when
 * httpOnly cookies fail to persist (e.g. on some Vercel deployments).
 */
export function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  if (!token) {
    return fetch(input, init);
  }

  const headers = new Headers(init?.headers);
  // Don't overwrite if already set
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
