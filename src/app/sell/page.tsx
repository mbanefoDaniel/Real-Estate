"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import TurnstileCaptcha from "@/components/turnstile-captcha";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/lib/auth-fetch";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialStatus: Status = {
  type: "idle",
  message: "",
};

const DRAFT_KEY = "sell-listing-draft-v1";

export default function SellPage() {
  const sessionUser = useAuth();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [ownerEmail, setOwnerEmail] = useState(sessionUser?.email ?? "");
  const [authReady, setAuthReady] = useState(false);
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(sessionUser?.role === "ADMIN");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        setDraft(parsed);
      }
    } catch {
      setDraft({});
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* Bootstrap auth + subscription in a single effect so we never
     skip the subscription check when the context user is null on
     first render (common on mobile where session cookies may arrive
     after hydration). */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      /* 1. Resolve the authenticated user — always verify via
         /api/auth/me so stale Router Cache context cannot trick us. */
      let email = "";
      let role: "USER" | "ADMIN" = "USER";

      try {
        const meRes = await authFetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const meData = await meRes.json();
        email = meData?.user?.email ?? "";
        role = meData?.user?.role === "ADMIN" ? "ADMIN" : "USER";
      } catch { /* ignore */ }

      if (cancelled) return;

      if (email) {
        setOwnerEmail(email);
      }
      setAuthReady(true);

      /* 2. Check subscription (admins bypass) */
      if (!email || role === "ADMIN") {
        setSubscriptionActive(role === "ADMIN");
        setSubscriptionReady(true);
        return;
      }

      try {
        const subRes = await authFetch("/api/subscription/status", { cache: "no-store", credentials: "include" });
        if (cancelled) return;
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptionActive(Boolean(subData?.active));
          setSubscriptionExpiresAt(subData?.subscription?.expiresAt ?? null);
          setSubscriptionStatus(
            typeof subData?.subscription?.status === "string"
              ? subData.subscription.status
              : null
          );
        } else {
          setSubscriptionActive(false);
          setSubscriptionStatus(null);
        }
      } catch {
        if (!cancelled) {
          setSubscriptionActive(false);
          setSubscriptionStatus(null);
        }
      } finally {
        if (!cancelled) setSubscriptionReady(true);
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
    // Re-run if the context user changes (e.g. after hydration)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.email]);

  function updateDraftValue(name: string, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [name]: value };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage limits and keep form usable.
      }
      return next;
    });
  }

  function clearDraft() {
    setDraft({});
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ownerEmail) {
      setStatus({
        type: "error",
        message: "Please sign in before posting a property.",
      });
      return;
    }

    setStatus({ type: "loading", message: "Uploading image and creating listing..." });

    try {
    const form = event.currentTarget;
    const formData = new FormData(form);
    let file = formData.get("image") as File | null;

    let imageUrl: string | null = null;

    if (file && file.size > 0) {
      // Compress large images (especially from mobile cameras) before uploading
      if (file.size > 1024 * 1024) {
        file = await compressImage(file);
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await authFetch("/api/uploads", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setStatus({
          type: "error",
          message: uploadResult.error || "Image upload failed.",
        });
        return;
      }

      imageUrl = uploadResult.imageUrl;
    }

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      city: formData.get("city"),
      address: formData.get("address"),
      kind: formData.get("kind"),
      listingTerm: formData.get("listingTerm"),
      price: Number(formData.get("price")),
      bedrooms: Number(formData.get("bedrooms")),
      bathrooms: Number(formData.get("bathrooms")),
      areaSqft: Number(formData.get("areaSqft")),
      featured: formData.get("featured") === "on",
      imageUrl,
      galleryUrls: String(formData.get("galleryUrls") || "")
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      captchaToken,
    };

    const propertyResponse = await authFetch("/api/properties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const propertyResult = await propertyResponse.json();

    if (!propertyResponse.ok) {
      setStatus({
        type: "error",
        message: propertyResult.error || "Listing creation failed.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Listing created successfully.",
    });
    clearDraft();
    form.reset();
    setPreviewUrl(null);
    } catch {
      setStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-[#0d1f23] p-6 text-white shadow-sm sm:p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.18),transparent_36%)]" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">List Your Property</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Publish your listing to <span className="text-amber-300">thousands of buyers</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/75 sm:text-base">
            Upload photos, set your price, and connect with verified buyers across Nigeria — all in one step.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">Auto-saved drafts</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">Image optimization</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">Instant preview</span>
          </div>
        </div>
      </section>

      {/* Status / auth gates */}
      {!authReady || !subscriptionReady ? (
        <section className="mt-8 flex items-center justify-center rounded-2xl border border-black/10 bg-surface p-10 shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Checking your account status...</p>
          </div>
        </section>
      ) : !ownerEmail ? (
        <section className="mt-8 rounded-2xl border border-black/10 bg-surface p-6 shadow-sm sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z" /></svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold">Sign in to get started</h2>
            <p className="mt-2 text-sm text-muted">
              You must be signed in with an active account before posting a property listing.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/auth/sign-in"
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-semibold transition hover:bg-black/5"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      ) : !subscriptionActive ? (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-amber-900">Subscription required</h2>
            <p className="mt-2 text-sm text-amber-800">
              An active monthly subscription is needed to post listings. Your plan unlocks submissions for 30 days.
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Starting checkout alone does not unlock posting — payment must be completed and confirmed.
            </p>
            <div className="mt-6">
              <Link
                href="/pricing"
                className="inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                View Pricing &amp; Subscribe
              </Link>
            </div>
            {subscriptionStatus === "PENDING" ? (
              <p className="mt-4 text-xs font-semibold text-amber-700">
                Your last payment is still pending. Complete checkout on the pricing page, then return here.
              </p>
            ) : null}
            {subscriptionExpiresAt ? (
              <p className="mt-3 text-xs text-amber-600">Previous expiry: {new Date(subscriptionExpiresAt).toLocaleDateString()}</p>
            ) : null}
          </div>
        </section>
      ) : (
        /* Main form */
        <form className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]" onSubmit={onSubmit}>
          {/* Left column — form fields */}
          <div className="grid gap-6">
            {/* Basic info card */}
            <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">1</span>
                <h2 className="text-lg font-semibold">Basic Information</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Lekki Detached Duplex"
                    value={draft.title ?? ""}
                    onChange={(event) => updateDraftValue("title", event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
                  <textarea
                    name="description"
                    required
                    placeholder="Describe the property — features, layout, surroundings..."
                    rows={4}
                    value={draft.description ?? ""}
                    onChange={(event) => updateDraftValue("description", event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">City</label>
                    <input
                      name="city"
                      required
                      placeholder="e.g. Lagos"
                      value={draft.city ?? ""}
                      onChange={(event) => updateDraftValue("city", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Address</label>
                    <input
                      name="address"
                      required
                      placeholder="Street address"
                      value={draft.address ?? ""}
                      onChange={(event) => updateDraftValue("address", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                </div>
                <input
                  name="ownerEmail"
                  type="email"
                  required
                  value={ownerEmail}
                  readOnly
                  className="rounded-xl border border-black/5 bg-black/[0.02] px-4 py-3 text-sm text-muted"
                />
              </div>
            </div>

            {/* Property details card */}
            <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">2</span>
                <h2 className="text-lg font-semibold">Property Details</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Property Type</label>
                    <select
                      name="kind"
                      value={draft.kind ?? "HOUSE"}
                      onChange={(event) => updateDraftValue("kind", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                    >
                      <option value="HOUSE">House</option>
                      <option value="APARTMENT">Apartment</option>
                      <option value="LAND">Land</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Listing Type</label>
                    <select
                      name="listingTerm"
                      value={draft.listingTerm ?? "SALE"}
                      onChange={(event) => updateDraftValue("listingTerm", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                    >
                      <option value="SALE">For Sale</option>
                      <option value="LEASE">For Lease</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Price (NGN)</label>
                    <input
                      name="price"
                      type="number"
                      min={1}
                      required
                      placeholder="0"
                      value={draft.price ?? ""}
                      onChange={(event) => updateDraftValue("price", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Area (sqft)</label>
                    <input
                      name="areaSqft"
                      type="number"
                      min={1}
                      required
                      placeholder="0"
                      value={draft.areaSqft ?? ""}
                      onChange={(event) => updateDraftValue("areaSqft", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Bedrooms</label>
                    <input
                      name="bedrooms"
                      type="number"
                      min={0}
                      required
                      placeholder="0"
                      value={draft.bedrooms ?? ""}
                      onChange={(event) => updateDraftValue("bedrooms", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Bathrooms</label>
                    <input
                      name="bathrooms"
                      type="number"
                      min={0}
                      step="0.5"
                      required
                      placeholder="0"
                      value={draft.bathrooms ?? ""}
                      onChange={(event) => updateDraftValue("bathrooms", event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Media card */}
            <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">3</span>
                <h2 className="text-lg font-semibold">Photos</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="group cursor-pointer rounded-2xl border-2 border-dashed border-black/15 bg-white/80 p-6 text-center transition hover:border-accent/40 hover:bg-accent/[0.02]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 transition group-hover:bg-accent/20">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" /></svg>
                  </div>
                  <p className="mt-3 text-sm font-semibold">Click to upload property image</p>
                  <p className="mt-1 text-xs text-muted">JPG, PNG, WebP — max 5 MB</p>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        setPreviewUrl(null);
                        return;
                      }
                      const objectUrl = URL.createObjectURL(file);
                      setPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return objectUrl;
                      });
                    }}
                  />
                </label>

                {previewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                    <div className="relative h-52 w-full sm:h-64">
                      <Image src={previewUrl} alt="Property preview" fill className="object-cover" sizes="100vw" unoptimized />
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Image Preview</p>
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(null)}
                        className="text-xs font-semibold text-red-500 transition hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Gallery URLs (optional)</label>
                  <textarea
                    name="galleryUrls"
                    rows={3}
                    placeholder="Paste additional image URLs, one per line"
                    value={draft.galleryUrls ?? ""}
                    onChange={(event) => updateDraftValue("galleryUrls", event.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="grid gap-5">
              {/* Summary card */}
              <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Listing Summary</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2">
                    <span className="text-muted">Type</span>
                    <span className="font-semibold">{draft.kind === "LAND" ? "Land" : draft.kind === "APARTMENT" ? "Apartment" : "House"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2">
                    <span className="text-muted">Listing</span>
                    <span className="font-semibold">{draft.listingTerm === "LEASE" ? "For Lease" : "For Sale"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2">
                    <span className="text-muted">City</span>
                    <span className="font-semibold">{draft.city || "—"}</span>
                  </div>
                  {draft.price ? (
                    <div className="flex items-center justify-between rounded-xl bg-accent/5 px-3 py-2">
                      <span className="text-muted">Price</span>
                      <span className="font-bold text-accent">
                        {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(draft.price) || 0)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Options card */}
              <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Options</h3>
                <label className="mt-4 flex items-center gap-3 rounded-xl bg-black/[0.03] px-4 py-3 text-sm transition hover:bg-black/[0.05]">
                  <input
                    name="featured"
                    type="checkbox"
                    checked={draft.featured === "on"}
                    onChange={(event) => updateDraftValue("featured", event.target.checked ? "on" : "")}
                    className="h-4 w-4 rounded border-black/20 text-accent accent-accent"
                  />
                  <div>
                    <p className="font-semibold">Featured listing</p>
                    <p className="text-xs text-muted">Boost visibility on the homepage</p>
                  </div>
                </label>
              </div>

              {/* Actions card */}
              <div className="rounded-2xl border border-black/10 bg-surface p-5 shadow-sm">
                <button
                  type="submit"
                  disabled={status.type === "loading"}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {status.type === "loading" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Listing"
                  )}
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="text-xs font-semibold text-muted transition hover:text-black"
                  >
                    Clear Draft
                  </button>
                  <span className="text-xs text-muted">Auto-saved</span>
                </div>

                <TurnstileCaptcha onTokenChange={setCaptchaToken} />
              </div>

              {/* Status message */}
              {status.message ? (
                <div className={`rounded-2xl border p-4 shadow-sm ${status.type === "error" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className={`text-sm font-medium ${status.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
                    {status.message}
                  </p>
                  {status.type === "success" ? (
                    <Link href="/my-listings" className="mt-2 inline-block text-sm font-semibold text-accent underline">
                      View your listings &rarr;
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
