"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AdminShellProps = {
  children: React.ReactNode;
  adminEmail?: string | null;
};

const adminLinks = [
  { id: "review-listing", href: "/admin/listings", label: "Review Listing" },
  { id: "kyc-queue", href: "/admin/kyc", label: "KYC Queue" },
  { id: "lead-inbox", href: "/admin/leads", label: "Lead Inbox" },
  { id: "user-roles", href: "/admin/user-roles", label: "User Roles" },
  { id: "audit-timeline", href: "/admin/audit", label: "Audit Timeline" },
  { id: "users", href: "/admin/users", label: "Users" },
  { id: "reports", href: "/admin/reports", label: "Reports" },
  { id: "settings", href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({ children, adminEmail }: AdminShellProps) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    // Use server redirect endpoint so logout still works even if client fetch hangs.
    window.location.assign("/api/auth/signout?next=/auth/sign-in");
  }

  return (
    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/admin-panel-bg.svg')" }}
        />
        <div className="absolute inset-0 bg-white/35" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-10 md:py-8">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
          <aside className="rounded-2xl border border-black/10 bg-surface p-4 shadow-sm backdrop-blur-[1px] lg:sticky lg:top-24 lg:h-fit">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Admin Panel</p>
            <p className="mt-1 text-sm font-semibold text-foreground">NaijaProperty Hub</p>
            {adminEmail ? <p className="mt-1 text-xs text-muted">{adminEmail}</p> : null}

            <nav className="mt-4 grid gap-2">
              {adminLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-accent text-white"
                        : "border border-black/10 bg-white hover:bg-black/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="mt-4 inline-flex rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60"
            >
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </button>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </section>
  );
}
