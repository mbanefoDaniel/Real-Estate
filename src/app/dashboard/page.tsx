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

        if (!currentUser && !authUser) {
          setStatus({ type: "error", message: "Sign in to access your profile dashboard." });
          return;
        }

        const resolvedUser = currentUser ?? (authUser ? { ...authUser, createdAt: undefined, profileImageUrl: null, kycStatus: "NOT_SUBMITTED" as const } : null);
        if (!resolvedUser) {
          setStatus({ type: "error", message: "Sign in to access your profile dashboard." });
          return;
        }

        setUser(resolvedUser);
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

        const [listingsResponse, savedSearchesResponse] = await Promise.all([
          fetch("/api/properties?includeAll=true", { cache: "no-store" }),
          fetch("/api/saved-searches", { cache: "no-store" }),
        ]);

        const listingsData = await listingsResponse.json();
        const savedSearchesData = await savedSearchesResponse.json();

        if (!active) {
          return;
        }

        setListingCount(Array.isArray(listingsData) ? listingsData.length : 0);
        setSavedSearchCount(Array.isArray(savedSearchesData) ? savedSearchesData.length : 0);
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
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">User Profile Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Manage your account activity, listings, saved searches, and session settings.
        </p>

        {status.message ? (
          <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-muted"}`}>
            {status.message}
          </p>
        ) : null}
      </section>

      {user ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {user.createdAt ? (
            <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Compliance Requirement</p>
              <p className="mt-2 text-sm text-muted">
                Profile picture and verified KYC become compulsory 2 days after registration.
              </p>
              <p className="mt-1 text-xs text-muted">
                Registration date: {new Date(user.createdAt).toLocaleString("en-NG")}
              </p>
            </article>
          ) : null}

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
            <p className="mt-2 text-sm font-semibold">{user.email}</p>
          </article>

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Role</p>
            <p className="mt-2 text-sm font-semibold">{user.role}</p>
          </article>

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Saved Searches</p>
            <p className="mt-2 text-2xl font-bold">{savedSearchCount}</p>
          </article>

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">KYC Status</p>
            <p className="mt-2 text-sm font-semibold">{user.kycStatus ?? "NOT_SUBMITTED"}</p>
          </article>

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">My Listings</p>
            <p className="mt-2 text-2xl font-bold">{listingCount}</p>
          </article>

          {user.role === "USER" ? (
            <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Subscription</p>
              <p className={`mt-2 text-sm font-semibold ${subscriptionState.active ? "text-emerald-700" : "text-amber-700"}`}>
                {subscriptionState.active ? "ACTIVE" : subscriptionState.status ?? "INACTIVE"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {subscriptionState.expiresAt
                  ? `Expires ${new Date(subscriptionState.expiresAt).toLocaleDateString("en-NG")}`
                  : "Required to post new listings"}
              </p>
              <Link href="/pricing" className="mt-3 inline-block text-xs font-semibold text-accent underline">
                Manage subscription
              </Link>
            </article>
          ) : null}

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:col-span-2 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Quick Actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/my-listings"
                className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Manage Listings
              </Link>
              <Link
                href="/saved-searches"
                className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Saved Searches
              </Link>
              <Link
                href="/sell"
                className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Post Property
              </Link>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Admin Dashboard
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Sign Out
              </button>
            </div>
          </article>

          <article className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profile Settings</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">Display Name</p>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter your display name"
                  className="mt-3 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameStatus.type === "loading"}
                  className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60"
                >
                  {nameStatus.type === "loading" ? "Saving..." : "Save Name"}
                </button>
                {nameStatus.message ? (
                  <p className={`mt-2 text-xs ${nameStatus.type === "error" ? "text-red-600" : "text-accent"}`}>
                    {nameStatus.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">Change Password</p>
                <div className="mt-3 grid gap-2">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password (8+ chars)"
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordStatus.type === "loading"}
                  className="mt-3 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60"
                >
                  {passwordStatus.type === "loading" ? "Updating..." : "Update Password"}
                </button>

                {passwordStatus.message ? (
                  <p className={`mt-2 text-xs ${passwordStatus.type === "error" ? "text-red-600" : "text-accent"}`}>
                    {passwordStatus.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">Profile Picture (Required after 2 days)</p>
                {user.profileImageUrl ? (
                  <div className="relative mt-3 h-24 w-24 overflow-hidden rounded-full border border-black/10">
                    <Image
                      src={user.profileImageUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-red-600">No profile picture uploaded yet.</p>
                )}
                <label className="mt-3 block text-xs text-muted">
                  Upload profile photo
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleUploadProfileImage(file);
                      }
                    }}
                  />
                </label>
                {profileImageStatus.message ? (
                  <p className={`mt-2 text-xs ${profileImageStatus.type === "error" ? "text-red-600" : "text-accent"}`}>
                    {profileImageStatus.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4 sm:col-span-2">
                <p className="text-sm font-semibold">KYC Verification (Required after 2 days)</p>
                <p className="mt-2 text-xs text-muted">
                  Upload a valid identity document image. Status changes to PENDING until admin verification.
                </p>
                {user.kycDocumentUrl ? (
                  <a href={user.kycDocumentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-accent underline">
                    View submitted KYC document
                  </a>
                ) : null}
                <label className="mt-3 block text-xs text-muted">
                  Upload KYC document
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleUploadKycDocument(file);
                      }
                    }}
                  />
                </label>
                {kycStatus.message ? (
                  <p className={`mt-2 text-xs ${kycStatus.type === "error" ? "text-red-600" : "text-accent"}`}>
                    {kycStatus.message}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
