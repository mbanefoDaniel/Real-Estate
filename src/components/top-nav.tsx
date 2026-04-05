"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

/* ── SVG icon components ──────────────────────────────────────────── */

function IconSearch(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconPlus(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
function IconTag(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
function IconScale(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}
function IconBookmark(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}
function IconClipboard(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function IconUser(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconCreditCard(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
function IconShield(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
function IconLogOut(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
function IconLogIn(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  );
}
function IconUserPlus(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
function IconMenu(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
function IconX(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function IconChevron(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* ── Reusable menu-item component ─────────────────────────────────── */

function MenuItem({
  href,
  icon: Icon,
  label,
  description,
  onClick,
  badge,
  badgeColor,
  variant = "default",
}: {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  description?: string;
  onClick?: () => void;
  badge?: string | null;
  badgeColor?: string;
  variant?: "default" | "danger" | "accent";
}) {
  const colorClasses =
    variant === "danger"
      ? "text-rose-600 hover:bg-rose-50"
      : variant === "accent"
        ? "text-accent hover:bg-accent/5"
        : "text-foreground hover:bg-black/[0.04]";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${colorClasses}`}
      role="menuitem"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-muted transition-colors group-hover:bg-accent/10 group-hover:text-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold leading-tight">{label}</span>
        {description ? (
          <span className="truncate text-xs text-muted leading-tight">{description}</span>
        ) : null}
      </span>
      {badge ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            badgeColor ?? "bg-black/5 text-muted"
          }`}
        >
          {badge}
        </span>
      ) : null}
      <IconChevron className="h-3.5 w-3.5 shrink-0 text-muted/40 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function MenuDivider({ label }: { label?: string }) {
  return label ? (
    <div className="px-3 pb-1 pt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60">{label}</p>
    </div>
  ) : (
    <div className="my-1.5 border-t border-black/[0.06]" role="separator" />
  );
}

/* ── Avatar helper ─────────────────────────────────────────────────── */

function Avatar({ src, size = "md" }: { src: string | null; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-5 w-5" : "h-9 w-9";
  const iconDims = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dims} shrink-0 rounded-full object-cover ring-1 ring-black/10`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent`}>
      <IconUser className={iconDims} aria-hidden="true" />
    </div>
  );
}

/* ── Top-level nav link pills ─────────────────────────────────────── */

const sharedLinks: { href: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { href: "/properties", label: "Browse Listings", icon: IconSearch },
  { href: "/sell", label: "Post a Property", icon: IconPlus },
  { href: "/pricing", label: "Pricing", icon: IconTag },
];

type TopNavProps = {
  initialUser: SessionUser | null;
};

export default function TopNav({ initialUser }: TopNavProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const sessionUser = initialUser;
  const [subscriptionBadge, setSubscriptionBadge] = useState<"ACTIVE" | "INACTIVE" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  /* fetch profile image from /api/auth/me */
  useEffect(() => {
    let mounted = true;
    if (!sessionUser) return;

    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const url = data?.user?.profileImageUrl;
        if (mounted && typeof url === "string" && url.trim()) {
          setProfileImageUrl(url.trim());
        }
      } catch { /* ignore */ }
    }

    void loadProfile();
    return () => { mounted = false; };
  }, [sessionUser]);

  /* close desktop dropdown when clicking outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
        setDesktopOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* prevent body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* close menus on route change */
  useEffect(() => {
    setMobileOpen(false);
    setDesktopOpen(false);
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function loadSubscriptionStatus() {
      if (!sessionUser || sessionUser.role !== "USER") {
        return;
      }

      try {
        const response = await fetch("/api/subscription/status", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setSubscriptionBadge("INACTIVE");
          return;
        }

        const data = (await response.json()) as { active?: boolean };
        if (mounted) setSubscriptionBadge(data.active ? "ACTIVE" : "INACTIVE");
      } catch {
        if (mounted) setSubscriptionBadge("INACTIVE");
      }
    }

    void loadSubscriptionStatus();
    return () => { mounted = false; };
  }, [sessionUser]);

  function closeMobile() { setMobileOpen(false); }
  function closeDesktop() { setDesktopOpen(false); }

  if (isAdminRoute) {
    return null;
  }

  /* ── shared dropdown content ────────────────────────────────────── */

  function renderMenuItems(close: () => void) {
    return (
      <>
        <MenuDivider label="Explore" />
        {sharedLinks.map((link) => (
          <MenuItem
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            onClick={close}
          />
        ))}

        {sessionUser ? (
          <>
            <MenuDivider label="Your Account" />
            <MenuItem href="/compare" icon={IconScale} label="Compare" description="Side-by-side comparison" onClick={close} />
            <MenuItem href="/saved-searches" icon={IconBookmark} label="Saved Searches" description="Alerts & filters" onClick={close} />
            {sessionUser.role === "USER" ? (
              <MenuItem href="/my-listings" icon={IconClipboard} label="Manage Listings" description="Edit & promote" onClick={close} />
            ) : null}
            <MenuItem href="/dashboard" icon={IconUser} label="Profile Dashboard" onClick={close} />
            {sessionUser.role === "USER" && subscriptionBadge ? (
              <MenuItem
                href="/pricing"
                icon={IconCreditCard}
                label="Subscription"
                onClick={close}
                badge={subscriptionBadge}
                badgeColor={
                  subscriptionBadge === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }
              />
            ) : null}
            {sessionUser.role === "ADMIN" ? (
              <MenuItem href="/admin" icon={IconShield} label="Admin Dashboard" description="Moderation & settings" onClick={close} variant="accent" />
            ) : null}
            <MenuDivider />
            <MenuItem href="/api/auth/signout?next=/auth/sign-in" icon={IconLogOut} label="Sign Out" onClick={close} variant="danger" />
          </>
        ) : (
          <>
            <MenuDivider />
            <MenuItem href="/auth/sign-in" icon={IconLogIn} label="Sign In" description="Welcome back" onClick={close} variant="accent" />
            <MenuItem href="/auth/sign-up" icon={IconUserPlus} label="Create Account" description="Get started free" onClick={close} />
          </>
        )}
      </>
    );
  }

  return (
    <>
    <header className="sticky top-0 z-[120] border-b border-black/10 bg-white/90 backdrop-blur">
      <nav className="relative mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 md:px-10">

        {/* ─── MOBILE ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between sm:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-accent hover:text-white"
            aria-label="Open navigation menu"
          >
            <IconMenu className="h-4 w-4" aria-hidden="true" />
            Menu
          </button>
        </div>

        {/* ─── DESKTOP / TABLET ────────────────────────────────── */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
            {sharedLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-black/15 hover:bg-accent hover:text-white"
                  }`}
                >
                  <link.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {sessionUser ? (
            <div ref={desktopRef} className="relative z-[130]">
              <button
                type="button"
                onClick={() => setDesktopOpen((prev) => !prev)}
                className={`inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  desktopOpen
                    ? "border-accent bg-accent text-white"
                    : "border-black/15 hover:bg-accent hover:text-white"
                }`}
                aria-haspopup="menu"
                aria-expanded={desktopOpen}
              >
                <Avatar src={profileImageUrl} size="sm" />
                My Menu
                <IconChevron
                  className={`h-3 w-3 transition-transform ${desktopOpen ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {desktopOpen ? (
                <div
                  className="absolute right-0 z-[140] mt-2.5 w-72 origin-top-right rounded-2xl border border-black/[0.08] bg-white p-2 shadow-xl ring-1 ring-black/[0.04] animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  {/* user info header */}
                  <div className="mb-1 rounded-xl bg-gradient-to-br from-accent/5 to-transparent px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={profileImageUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{sessionUser.email}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          {sessionUser.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <MenuItem href="/compare" icon={IconScale} label="Compare" description="Side-by-side comparison" onClick={closeDesktop} />
                  <MenuItem href="/saved-searches" icon={IconBookmark} label="Saved Searches" description="Alerts & filters" onClick={closeDesktop} />
                  {sessionUser.role === "USER" ? (
                    <MenuItem href="/my-listings" icon={IconClipboard} label="Manage Listings" description="Edit & promote" onClick={closeDesktop} />
                  ) : null}
                  <MenuItem href="/dashboard" icon={IconUser} label="Profile Dashboard" onClick={closeDesktop} />
                  {sessionUser.role === "USER" && subscriptionBadge ? (
                    <MenuItem
                      href="/pricing"
                      icon={IconCreditCard}
                      label="Subscription"
                      onClick={closeDesktop}
                      badge={subscriptionBadge}
                      badgeColor={
                        subscriptionBadge === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    />
                  ) : null}
                  {sessionUser.role === "ADMIN" ? (
                    <MenuItem href="/admin" icon={IconShield} label="Admin Dashboard" description="Moderation & settings" onClick={closeDesktop} variant="accent" />
                  ) : null}
                  <MenuDivider />
                  <MenuItem href="/api/auth/signout?next=/auth/sign-in" icon={IconLogOut} label="Sign Out" onClick={closeDesktop} variant="danger" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white"
              >
                <IconLogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                <IconUserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>

    {/* Mobile overlay + slide-in panel — portalled to body so it's above everything */}
    {mobileOpen
      ? createPortal(
          <div className="fixed inset-0 z-[9999] sm:hidden" ref={mobileRef}>
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeMobile}
              aria-hidden="true"
            />
            {/* panel */}
            <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5">
                <span className="text-sm font-bold tracking-tight text-accent">Menu</span>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="rounded-lg p-1.5 transition hover:bg-black/5"
                  aria-label="Close menu"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              {sessionUser ? (
                <div className="border-b border-black/[0.06] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={profileImageUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{sessionUser.email}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {sessionUser.role}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-2 py-1" role="menu">
                {renderMenuItems(closeMobile)}
              </div>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
}
