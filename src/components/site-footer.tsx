"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

const publicLinks = [
  { href: "/properties", label: "Browse Listings" },
  { href: "/sell", label: "Post a Property" },
  { href: "/my-listings", label: "Manage Listings" },
];

type SiteFooterProps = {
  initialUser: SessionUser | null;
};

export default function SiteFooter({ initialUser }: SiteFooterProps) {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(initialUser);
  const authReady = true;

  const quickLinks = useMemo(() => {
    if (!authReady) {
      return publicLinks;
    }

    if (sessionUser) {
      return [...publicLinks, { href: "/dashboard", label: "Profile Dashboard" }];
    }

    return [...publicLinks, { href: "/auth/sign-in", label: "Sign In" }, { href: "/auth/sign-up", label: "Sign Up" }];
  }, [authReady, sessionUser]);

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setSessionUser(null);
    window.location.assign("/auth/sign-in");
  }

  return (
    <footer className="relative mt-14 overflow-hidden border-t border-white/15 bg-[#0d1f23] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_84%_14%,rgba(245,158,11,0.2),transparent_34%),radial-gradient(circle_at_54%_100%,rgba(16,185,129,0.14),transparent_44%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.11) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.11) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-10 lg:px-10">
        <section className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <h2 className="inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-amber-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
            </svg>
            NaijaProperty Hub
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/80">
            Trusted Nigerian real estate platform for verified listings, faster buyer enquiries, and secure property discovery.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/85">Verified Listings</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/85">Lead Tracking</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/85">Owner Analytics</span>
          </div>
        </section>

        <section className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 6H3" />
              <path d="M14 12H3" />
              <path d="M21 18H3" />
            </svg>
            Quick Links
          </h3>
          <ul className="mt-3 grid gap-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  {link.label}
                </Link>
              </li>
            ))}
            {authReady && sessionUser ? (
              <li>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Sign Out
                </button>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92V20a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 11.2 18.8 19.5 19.5 0 0 1 5.2 12.8 19.86 19.86 0 0 1 2 4.18 2 2 0 0 1 3.99 2h3.09a2 2 0 0 1 2 1.72c.12.9.33 1.8.62 2.66a2 2 0 0 1-.45 2.11L8 9.74a16 16 0 0 0 6.26 6.26l1.25-1.25a2 2 0 0 1 2.11-.45c.86.29 1.76.5 2.66.62A2 2 0 0 1 22 16.92z" />
            </svg>
            Contact
          </h3>
          <ul className="mt-3 grid gap-2 text-sm text-white/85">
            <li className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              mbanefodaniel01@gmail.com
            </li>
            <li className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92V20a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 11.2 18.8 19.5 19.5 0 0 1 5.2 12.8 19.86 19.86 0 0 1 2 4.18 2 2 0 0 1 3.99 2h3.09a2 2 0 0 1 2 1.72c.12.9.33 1.8.62 2.66a2 2 0 0 1-.45 2.11L8 9.74a16 16 0 0 0 6.26 6.26l1.25-1.25a2 2 0 0 1 2.11-.45c.86.29 1.76.5 2.66.62A2 2 0 0 1 22 16.92z" /></svg>
              +234 814 707 8833
            </li>
            <li className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4.35 8-11a8 8 0 1 0-16 0c0 6.65 8 11 8 11z" /><circle cx="12" cy="11" r="3" /></svg>
              Lagos, Nigeria
            </li>
          </ul>
        </section>
      </div>

      <div className="relative z-10 border-t border-white/15 px-4 py-5 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 text-xs text-white/75 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-semibold sm:justify-start">
            <Link href="/privacy" className="transition hover:text-amber-100">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-amber-100">
              Terms
            </Link>
            <Link href="/contact" className="transition hover:text-amber-100">
              Contact
            </Link>
          </div>
          <p className="inline-flex items-center gap-1">
            <span aria-hidden="true">&copy;</span>
            <span>NefoTech.Ng 2022-2026</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
