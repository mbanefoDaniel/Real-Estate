"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name?: string | null;
  createdAt?: string;
  profileImageUrl?: string | null;
  kycStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
  kycDocumentUrl?: string | null;
  kycSubmittedAt?: string | null;
  kycVerifiedAt?: string | null;
};

type Status = {
  type: "idle" | "loading" | "error";
  message: string;
};

type FormStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

type SubscriptionState = {
  active: boolean;
  status: string | null;
  expiresAt: string | null;
};

/* ── tiny icon helpers ─────────────────────────────────────────────── */
const ico = "h-5 w-5 shrink-0";
function IcoLayers(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>);
}
function IcoBookmark(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>);
}
function IcoShield(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>);
}
function IcoCreditCard(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>);
}
function IcoUser(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
}
function IcoLock(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
}
function IcoCamera(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>);
}
function IcoFileText(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M16 13h-2"/></svg>);
}
function IcoLogOut(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>);
}
function IcoArrowRight(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>);
}
function IcoCheck(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>);
}
function IcoUpload(p: React.SVGProps<SVGSVGElement>) {
  return (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>);
}

/* ── KYC badge ─────────────────────────────────────────────────────── */
function KycBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    VERIFIED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Verified" },
    PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Review" },
    REJECTED: { bg: "bg-rose-100", text: "text-rose-700", label: "Rejected" },
    NOT_SUBMITTED: { bg: "bg-zinc-100", text: "text-zinc-600", label: "Not Submitted" },
  };
  const s = map[status] ?? map.NOT_SUBMITTED;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${s.bg} ${s.text}`}>
      {status === "VERIFIED" ? <IcoCheck className="h-3 w-3" /> : null}
      {s.label}
    </span>
  );
}

/* ── Section wrapper ───────────────────────────────────────────────── */
function Section({ icon: Icon, title, children, actions }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export default function ProfileDashboardPage() {
  const authUser = useAuth();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [listingCount, setListingCount] = useState<number>(0);
  const [savedSearchCount, setSavedSearchCount] = useState<number>(0);
  const [status, setStatus] = useState<Status>({ type: "loading", message: "Loading profile..." });
  const [displayName, setDisplayName] = useState("");
  const [nameStatus, setNameStatus] = useState<FormStatus>({ type: "idle", message: "" });
  const [passwordStatus, setPasswordStatus] = useState<FormStatus>({ type: "idle", message: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImageStatus, setProfileImageStatus] = useState<FormStatus>({ type: "idle", message: "" });
  const [kycStatus, setKycStatus] = useState<FormStatus>({ type: "idle", message: "" });
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    active: false,
    status: null,
    expiresAt: null,
  });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meResponse.json();
        const currentUser = meData?.user ?? null;

        if (!active) {
          return;
        }

        /* If /api/auth/me returns no user the real session is expired.
           Don't trust the cached authUser from React context — it may be
           stale due to Next.js Router Cache preserving a previous
           server-rendered layout. */
        if (!currentUser) {
          setStatus({ type: "error", message: "Your session has expired. Please sign in again." });
          return;
        }

        setUser(currentUser);
        setDisplayName(currentUser.name ?? "");

        if (currentUser.role === "USER") {
          try {
            const subscriptionResponse = await fetch("/api/subscription/status", { cache: "no-store" });
            if (subscriptionResponse.ok) {
              const subscriptionData = await subscriptionResponse.json();
              setSubscriptionState({
                active: Boolean(subscriptionData?.active),
                status: typeof subscriptionData?.subscription?.status === "string" ? subscriptionData.subscription.status : null,
                expiresAt: typeof subscriptionData?.subscription?.expiresAt === "string" ? subscriptionData.subscription.expiresAt : null,
              });
            }
          } catch {
            setSubscriptionState({ active: false, status: null, expiresAt: null });
          }
        }

        try {
          const [listingsResponse, savedSearchesResponse] = await Promise.all([
            fetch(`/api/properties?includeAll=true&ownerEmail=${encodeURIComponent(currentUser.email)}`, { cache: "no-store" }),
            fetch("/api/saved-searches", { cache: "no-store" }),
          ]);

          const listingsData = listingsResponse.ok ? await listingsResponse.json() : [];
          const savedSearchesData = savedSearchesResponse.ok ? await savedSearchesResponse.json() : [];

          if (!active) return;

          setListingCount(Array.isArray(listingsData) ? listingsData.length : 0);
          setSavedSearchCount(Array.isArray(savedSearchesData) ? savedSearchesData.length : 0);
        } catch {
          // Stats fetches failed — show dashboard anyway with zero counts
        }

        setStatus({ type: "idle", message: "" });
      } catch {
        if (!active) {
          return;
        }

        setStatus({ type: "error", message: "Unable to load dashboard right now." });
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.assign("/auth/sign-in");
  }

  async function handleSaveName() {
    setNameStatus({ type: "loading", message: "Saving profile..." });

    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: displayName }),
    });

    const result = await response.json();

    if (!response.ok) {
      setNameStatus({ type: "error", message: result?.error || "Unable to save profile." });
      return;
    }

    setUser(result?.user ?? user);
    setNameStatus({ type: "success", message: "Profile updated." });
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", message: "Fill all password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    setPasswordStatus({ type: "loading", message: "Updating password..." });

    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setPasswordStatus({ type: "error", message: result?.error || "Unable to update password." });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus({ type: "success", message: "Password updated successfully." });
  }

  async function handleUploadProfileImage(file: File) {
    setProfileImageStatus({ type: "loading", message: "Uploading profile picture..." });

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadResponse = await fetch("/api/uploads", {
      method: "POST",
      body: uploadForm,
    });

    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadResult?.imageUrl) {
      setProfileImageStatus({
        type: "error",
        message: uploadResult?.error || "Unable to upload profile picture.",
      });
      return;
    }

    const profileResponse = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profileImageUrl: uploadResult.imageUrl }),
    });

    const profileResult = await profileResponse.json();
    if (!profileResponse.ok) {
      setProfileImageStatus({ type: "error", message: profileResult?.error || "Unable to save profile picture." });
      return;
    }

    setUser(profileResult?.user ?? user);
    setProfileImageStatus({ type: "success", message: "Profile picture updated." });
  }

  async function handleUploadKycDocument(file: File) {
    setKycStatus({ type: "loading", message: "Uploading KYC document..." });

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadResponse = await fetch("/api/uploads", {
      method: "POST",
      body: uploadForm,
    });

    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadResult?.imageUrl) {
      setKycStatus({
        type: "error",
        message: uploadResult?.error || "Unable to upload KYC document.",
      });
      return;
    }

    const profileResponse = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kycDocumentUrl: uploadResult.imageUrl }),
    });

    const profileResult = await profileResponse.json();
    if (!profileResponse.ok) {
      setKycStatus({ type: "error", message: profileResult?.error || "Unable to submit KYC." });
      return;
    }

    setUser(profileResult?.user ?? user);
    setKycStatus({ type: "success", message: "KYC submitted. Awaiting verification." });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">

      {/* ── loading / error state ────────────────────────────────── */}
      {status.type === "loading" ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-accent/20 border-t-accent" />
        </div>
      ) : status.type === "error" ? (
        <div className="rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-red-600">{status.message}</p>
          <Link href="/auth/sign-in" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
            Sign In
          </Link>
        </div>
      ) : null}

      {user ? (
        <div className="grid gap-6">

          {/* ── HERO PROFILE HEADER ──────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/[0.07] via-surface to-surface shadow-sm ring-1 ring-black/5">
            {/* decorative circles */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/[0.04]" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent/[0.03]" />

            <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
              {/* avatar */}
              <div className="group relative">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-accent/10 ring-2 ring-accent/20 sm:h-28 sm:w-28">
                  {user.profileImageUrl ? (
                    <Image src={user.profileImageUrl} alt="Profile" fill className="object-cover" sizes="112px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <IcoUser className="h-10 w-10 text-accent/40" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-md transition hover:bg-accent-strong">
                  <IcoCamera className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUploadProfileImage(file);
                    }}
                  />
                </label>
              </div>

              {/* info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold sm:text-2xl">{user.name || "Welcome"}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-accent/10 text-accent"
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
                {user.createdAt ? (
                  <p className="mt-0.5 text-xs text-muted/70">
                    Member since {new Date(user.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <KycBadge status={user.kycStatus ?? "NOT_SUBMITTED"} />
                  {profileImageStatus.message ? (
                    <span className={`text-xs font-medium ${profileImageStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
                      {profileImageStatus.message}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* sign-out (desktop) */}
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden shrink-0 items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 sm:inline-flex"
              >
                <IcoLogOut className="h-4 w-4 text-muted" />
                Sign Out
              </button>
            </div>

            {/* compliance notice */}
            {user.createdAt && (user.kycStatus !== "VERIFIED" || !user.profileImageUrl) ? (
              <div className="border-t border-accent/10 bg-amber-50/60 px-6 py-3 sm:px-8">
                <p className="text-xs font-medium text-amber-800">
                  Profile picture and KYC verification are required within 2 days of registration. Complete them below to avoid restrictions.
                </p>
              </div>
            ) : null}
          </section>

          {/* ── STATS ROW ────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/my-listings" className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-accent/30">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                <IcoLayers className={ico} />
              </div>
              <div>
                <p className="text-2xl font-bold">{listingCount}</p>
                <p className="text-xs font-medium text-muted">My Listings</p>
              </div>
              <IcoArrowRight className="ml-auto h-4 w-4 text-muted/30 transition group-hover:text-accent" />
            </Link>

            <Link href="/saved-searches" className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-accent/30">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                <IcoBookmark className={ico} />
              </div>
              <div>
                <p className="text-2xl font-bold">{savedSearchCount}</p>
                <p className="text-xs font-medium text-muted">Saved Searches</p>
              </div>
              <IcoArrowRight className="ml-auto h-4 w-4 text-muted/30 transition group-hover:text-accent" />
            </Link>

            <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <IcoShield className={ico} />
              </div>
              <div>
                <KycBadge status={user.kycStatus ?? "NOT_SUBMITTED"} />
                <p className="mt-0.5 text-xs font-medium text-muted">KYC Status</p>
              </div>
            </div>

            {user.role === "USER" ? (
              <Link href="/pricing" className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-accent/30">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  subscriptionState.active
                    ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                    : "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                }`}>
                  <IcoCreditCard className={ico} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${subscriptionState.active ? "text-emerald-700" : "text-amber-700"}`}>
                    {subscriptionState.active ? "Active" : subscriptionState.status ?? "Inactive"}
                  </p>
                  <p className="text-xs font-medium text-muted">
                    {subscriptionState.expiresAt
                      ? `Expires ${new Date(subscriptionState.expiresAt).toLocaleDateString("en-NG")}`
                      : "Subscription"}
                  </p>
                </div>
                <IcoArrowRight className="ml-auto h-4 w-4 text-muted/30 transition group-hover:text-accent" />
              </Link>
            ) : (
              <Link href="/admin" className="group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-accent/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                  <IcoShield className={ico} />
                </div>
                <div>
                  <p className="text-sm font-bold">Admin Panel</p>
                  <p className="text-xs font-medium text-muted">Manage site</p>
                </div>
                <IcoArrowRight className="ml-auto h-4 w-4 text-muted/30 transition group-hover:text-accent" />
              </Link>
            )}
          </div>

          {/* ── QUICK ACTIONS ────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <Link href="/my-listings" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white">
              <IcoLayers className="h-3.5 w-3.5" /> Manage Listings
            </Link>
            <Link href="/saved-searches" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white">
              <IcoBookmark className="h-3.5 w-3.5" /> Saved Searches
            </Link>
            <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white">
              Post Property
            </Link>
            {user.role === "ADMIN" ? (
              <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-accent hover:text-white">
                Admin Dashboard
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 sm:hidden"
            >
              <IcoLogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>

          {/* ── DISPLAY NAME ─────────────────────────────────────── */}
          <Section icon={IcoUser} title="Display Name">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-muted">Full name shown on your profile</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameStatus.type === "loading"}
                  className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {nameStatus.type === "loading" ? "Saving..." : "Save"}
                </button>
              </div>
              {nameStatus.message ? (
                <p className={`mt-2 text-xs font-medium ${nameStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
                  {nameStatus.message}
                </p>
              ) : null}
            </div>
          </Section>

          {/* ── CHANGE PASSWORD ───────────────────────────────────── */}
          <Section icon={IcoLock} title="Change Password">
            <div className="max-w-md grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8+ characters"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordStatus.type === "loading"}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {passwordStatus.type === "loading" ? "Updating..." : "Update Password"}
                </button>
                {passwordStatus.message ? (
                  <p className={`mt-2 text-xs font-medium ${passwordStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
                    {passwordStatus.message}
                  </p>
                ) : null}
              </div>
            </div>
          </Section>

          {/* ── PROFILE PICTURE ───────────────────────────────────── */}
          <Section icon={IcoCamera} title="Profile Picture">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-black/[0.03] ring-1 ring-black/10">
                {user.profileImageUrl ? (
                  <Image src={user.profileImageUrl} alt="Profile" fill className="object-cover" sizes="112px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted/30">
                    <IcoUser className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted">
                  Upload a clear photo of yourself. Required within 2 days of registration.
                </p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03] px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent/[0.07]">
                  <IcoUpload className="h-4 w-4" />
                  {profileImageStatus.type === "loading" ? "Uploading..." : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUploadProfileImage(file);
                    }}
                  />
                </label>
                {profileImageStatus.message ? (
                  <p className={`mt-2 text-xs font-medium ${profileImageStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
                    {profileImageStatus.message}
                  </p>
                ) : null}
              </div>
            </div>
          </Section>

          {/* ── KYC VERIFICATION ──────────────────────────────────── */}
          <Section
            icon={IcoFileText}
            title="KYC Verification"
            actions={<KycBadge status={user.kycStatus ?? "NOT_SUBMITTED"} />}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-muted">
                  Upload a valid identity document (national ID, passport, or driver&apos;s license). Your submission will be reviewed by an admin.
                </p>
                {user.kycDocumentUrl ? (
                  <a
                    href={user.kycDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    View submitted document <IcoArrowRight className="h-3 w-3" />
                  </a>
                ) : null}
                <div className="mt-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-accent/30 bg-accent/[0.03] px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent/[0.07]">
                    <IcoUpload className="h-4 w-4" />
                    {kycStatus.type === "loading" ? "Uploading..." : "Upload Document"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUploadKycDocument(file);
                      }}
                    />
                  </label>
                </div>
                {kycStatus.message ? (
                  <p className={`mt-2 text-xs font-medium ${kycStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
                    {kycStatus.message}
                  </p>
                ) : null}
              </div>
            </div>
          </Section>

        </div>
      ) : null}
    </main>
  );
}
