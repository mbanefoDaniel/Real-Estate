"use client";

import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;   // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000;       // warn 5 min before logout
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;    // refresh token every 15 min while active
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export default function InactivityGuard() {
  const lastActivityRef = useRef(0);
  const warningShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    // Check inactivity every 30 seconds
    timerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;

      if (idle >= INACTIVITY_LIMIT_MS) {
        window.location.assign("/api/auth/signout?next=/auth/sign-in");
        return;
      }

      if (idle >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        showWarningBanner();
      }
    }, 30_000);

    // Refresh token periodically while active
    refreshTimerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle < INACTIVITY_LIMIT_MS) {
        fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      dismissWarningBanner();
    };
  }, [recordActivity]);

  return null;
}

/* ---------- lightweight warning banner (no extra state/portal needed) ---------- */

const BANNER_ID = "__inactivity-warning";

function showWarningBanner() {
  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement("div");
  banner.id = BANNER_ID;
  banner.setAttribute("role", "alert");
  Object.assign(banner.style, {
    position: "fixed",
    bottom: "1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "9999",
    background: "#1a1a1a",
    color: "#fff",
    padding: "0.85rem 1.5rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    boxShadow: "0 8px 30px rgba(0,0,0,.25)",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  });
  banner.innerHTML =
    `<span>You'll be signed out soon due to inactivity.</span>` +
    `<button style="background:#0d6f63;color:#fff;border:none;padding:0.4rem 1rem;border-radius:0.5rem;cursor:pointer;font-weight:600;font-size:0.8rem" ` +
    `id="${BANNER_ID}-dismiss">Stay signed in</button>`;

  document.body.appendChild(banner);

  document.getElementById(`${BANNER_ID}-dismiss`)?.addEventListener("click", () => {
    dismissWarningBanner();
    // This click already counts as activity via the mousedown listener
  });
}

function dismissWarningBanner() {
  document.getElementById(BANNER_ID)?.remove();
}
