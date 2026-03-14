"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

const sharedLinks = [
  { href: "/properties", label: "Browse Listings" },
  { href: "/sell", label: "Post a Property" },
  { href: "/pricing", label: "Pricing" },
];

const signedInOnlyLinks = [
  { href: "/compare", label: "Compare" },
  { href: "/saved-searches", label: "Saved Searches" },
];

type TopNavProps = {
  initialUser: SessionUser | null;
};

export default function TopNav({ initialUser }: TopNavProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const sessionUser = initialUser;
  const [subscriptionBadge, setSubscriptionBadge] = useState<"ACTIVE" | "INACTIVE" | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSubscriptionStatus() {
      if (!sessionUser || sessionUser.role !== "USER") {
        return;
      }

      try {
        const response = await fetch("/api/subscription/status", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) {
            setSubscriptionBadge("INACTIVE");
          }
          return;
        }

        const data = (await response.json()) as { active?: boolean };
        if (mounted) {
          setSubscriptionBadge(data.active ? "ACTIVE" : "INACTIVE");
        }
      } catch {
        if (mounted) {
          setSubscriptionBadge("INACTIVE");
        }
      }
    }

    void loadSubscriptionStatus();

    return () => {
      mounted = false;
    };
  }, [sessionUser]);

  function closeMenu() {
    const menus = document.querySelectorAll('details[data-topnav-menu="true"]');
    menus.forEach((menu) => {
      (menu as HTMLDetailsElement).open = false;
    });
  }

  if (isAdminRoute) {
    return null;
  }

  return (
    <header className="sticky top-0 z-[120] border-b border-black/10 bg-white/90 backdrop-blur">
      <nav className="relative mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 md:px-10">
        <div className="flex items-center justify-between sm:hidden">
          {/* Removed 'Navigation' label for mobile view */}
          <details data-topnav-menu="true" className="relative z-[130]">
            <summary
              className="inline-flex list-none cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-accent hover:text-white"
              aria-haspopup="menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
              Menu
            </summary>
            <div
              className="absolute right-0 z-[140] mt-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-black/10 bg-white p-2 shadow-lg"
              role="menu"
            >
              {sharedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  {link.label}
                </Link>
              ))}

              {signedInOnlyLinks.map((link) => (
                sessionUser ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    {link.label}
                  </Link>
                ) : null
              ))}

              {sessionUser?.role === "USER" ? (
                <Link
                  href="/my-listings"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Manage Listings
                </Link>
              ) : null}

              {sessionUser ? (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Profile Dashboard
                </Link>
              ) : null}

              {sessionUser?.role === "USER" && subscriptionBadge ? (
                <Link
                  href="/pricing"
                  onClick={closeMenu}
                  className={`block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5 ${
                    subscriptionBadge === "ACTIVE" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  Subscription: {subscriptionBadge}
                </Link>
              ) : null}

              {sessionUser?.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Admin Dashboard
                </Link>
              ) : null}

              {sessionUser ? (
                <Link
                  href="/api/auth/signout?next=/auth/sign-in"
                  onClick={closeMenu}
                  className="mt-1 block w-full rounded-xl border border-black/10 px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5"
                >
                  Sign Out
                </Link>
              ) : (
                <div className="mt-1 grid gap-2">
                  <Link
                    href="/auth/sign-in"
                    onClick={closeMenu}
                    className="block rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={closeMenu}
                    className="block rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
            {sharedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {sessionUser ? (
            <details data-topnav-menu="true" className="relative z-[130] self-end sm:self-auto">
              <summary
                className="list-none cursor-pointer whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white"
                aria-haspopup="menu"
              >
                My Menu
              </summary>
              <div
                className="absolute right-0 z-[140] mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-lg"
                role="menu"
              >
                {signedInOnlyLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    {link.label}
                  </Link>
                ))}
                {sessionUser.role === "USER" ? (
                  <Link
                    href="/my-listings"
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    Manage Listings
                  </Link>
                ) : null}
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Profile Dashboard
                </Link>
                {sessionUser.role === "USER" && subscriptionBadge ? (
                  <Link
                    href="/pricing"
                    onClick={closeMenu}
                    className={`block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5 ${
                      subscriptionBadge === "ACTIVE" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    Subscription: {subscriptionBadge}
                  </Link>
                ) : null}
                {sessionUser.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                  >
                    Admin Dashboard
                  </Link>
                ) : null}
                <Link
                  href="/api/auth/signout?next=/auth/sign-in"
                  onClick={closeMenu}
                  className="mt-1 block w-full rounded-xl border border-black/10 px-3 py-2 text-left text-sm font-semibold transition hover:bg-black/5"
                >
                  Sign Out
                </Link>
              </div>
            </details>
          ) : (
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Link
                href="/auth/sign-in"
                className="whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
