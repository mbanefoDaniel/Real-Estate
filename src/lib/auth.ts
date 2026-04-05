import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const AUTH_COOKIE_NAME = "nph_auth";
const SESSION_TTL_SECONDS = 60 * 60 * 24;      // 24-hour JWT lifetime
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes client-side idle limit

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name?: string | null;
};

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured.");
  }

  return secret;
}

export function createSessionToken(user: SessionUser) {
  return jwt.sign(user, getJwtSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    const id = typeof decoded.id === "string" ? decoded.id : null;
    const email = typeof decoded.email === "string" ? decoded.email : null;
    const role = decoded.role === "ADMIN" ? "ADMIN" : decoded.role === "USER" ? "USER" : null;
    const name = typeof decoded.name === "string" ? decoded.name : null;

    if (!id || !email || !role) {
      return null;
    }

    return { id, email, role, name };
  } catch {
    return null;
  }
}

export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function isAdminFromRequest(request: NextRequest): boolean {
  const user = getSessionUserFromRequest(request);
  return user?.role === "ADMIN";
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

/**
 * Build a raw Set-Cookie header value for the auth token.
 * Bypasses Next.js response.cookies.set() which can silently fail
 * on some hosting platforms when multiple cookies are set.
 */
export function buildAuthSetCookieHeader(token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=/`,
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Build a raw Set-Cookie header that clears the auth cookie.
 */
export function buildAuthClearCookieHeader() {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=/`,
    `Max-Age=0`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function getInactivityTimeoutMs() {
  return INACTIVITY_TIMEOUT_MS;
}
