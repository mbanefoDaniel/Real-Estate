"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import TurnstileCaptcha from "@/components/turnstile-captcha";

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
  const [status, setStatus] = useState<Status>(initialStatus);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
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

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          setOwnerEmail("");
          return;
        }

        const data = await response.json();
        setOwnerEmail(data?.user?.email ?? "");
        const isAdmin = data?.user?.role === "ADMIN";

        if (data?.user?.id) {
          if (isAdmin) {
            setSubscriptionActive(true);
            setSubscriptionExpiresAt(null);
            setSubscriptionReady(true);
            return;
          }

          try {
            const subscriptionResponse = await fetch("/api/subscription/status", { cache: "no-store" });
            if (subscriptionResponse.ok) {
              const subscriptionData = await subscriptionResponse.json();
              setSubscriptionActive(Boolean(subscriptionData?.active));
              setSubscriptionExpiresAt(subscriptionData?.subscription?.expiresAt ?? null);
              setSubscriptionStatus(
                typeof subscriptionData?.subscription?.status === "string"
                  ? subscriptionData.subscription.status
                  : null
              );
            } else {
              setSubscriptionActive(false);
              setSubscriptionStatus(null);
            }
          } catch {
            setSubscriptionActive(false);
            setSubscriptionStatus(null);
          } finally {
            setSubscriptionReady(true);
          }
        } else {
          setSubscriptionReady(true);
        }
      } catch {
        setOwnerEmail("");
        setSubscriptionReady(true);
      } finally {
        setAuthReady(true);
      }
    }

    void loadSession();
  }, []);

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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image") as File | null;

    let imageUrl: string | null = null;

    if (file && file.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch("/api/uploads", {
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

    const propertyResponse = await fetch("/api/properties", {
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
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="relative overflow-hidden rounded-3xl p-0 shadow-lg ring-1 ring-black/10 sm:p-0">
        {/* Premium gradient background */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-accent/80 via-blue-100 to-white opacity-90" />
        <div className="relative z-10 p-6 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl text-accent drop-shadow-lg">Post a Property</h1>
          <p className="mt-3 text-lg text-black/80 font-medium drop-shadow-sm">
            Upload a property photo and publish land or house listings for buyers across Nigeria.
          </p>

        {!authReady || !subscriptionReady ? (
          <p className="mt-6 text-sm text-muted">Checking your sign-in status...</p>
        ) : !ownerEmail ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur p-5 shadow-md">
            <p className="text-sm text-muted">
              You must sign in before you can post a property listing.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/auth/sign-in"
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : !subscriptionActive ? (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/90 backdrop-blur p-5 shadow-md">
            <p className="text-sm font-semibold text-amber-900">
              Active monthly subscription required.
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Subscribe before posting properties. Your subscription unlocks listing submissions for 30 days.
            </p>
            <p className="mt-2 text-sm text-amber-900">
              Note: starting checkout alone does not unlock posting. Payment must be completed and confirmed.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/pricing"
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Complete Subscription
              </Link>
            </div>
            {subscriptionStatus === "PENDING" ? (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Your last payment attempt is still pending. Finish checkout on the pricing page, then return here.
              </p>
            ) : null}
            {subscriptionExpiresAt ? (
              <p className="mt-3 text-xs text-amber-700">Previous expiry: {new Date(subscriptionExpiresAt).toLocaleDateString()}</p>
            ) : null}
          </div>
        ) : (
          <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
            <input
              name="title"
              required
              placeholder="Title"
              value={draft.title ?? ""}
              onChange={(event) => updateDraftValue("title", event.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />
            <textarea
              name="description"
              required
              placeholder="Description"
              rows={4}
              value={draft.description ?? ""}
              onChange={(event) => updateDraftValue("description", event.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />
            <input
              name="city"
              required
              placeholder="City (e.g. Lagos)"
              value={draft.city ?? ""}
              onChange={(event) => updateDraftValue("city", event.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />
            <input
              name="address"
              required
              placeholder="Address"
              value={draft.address ?? ""}
              onChange={(event) => updateDraftValue("address", event.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />
            <input
              name="ownerEmail"
              type="email"
              required
              value={ownerEmail}
              readOnly
              placeholder="Owner Email"
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-muted">
                Property Type
                <select
                  name="kind"
                  value={draft.kind ?? "HOUSE"}
                  onChange={(event) => updateDraftValue("kind", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-black"
                >
                  <option value="HOUSE">House</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="LAND">Land</option>
                </select>
              </label>

              <label className="text-sm text-muted">
                Listing Type
                <select
                  name="listingTerm"
                  value={draft.listingTerm ?? "SALE"}
                  onChange={(event) => updateDraftValue("listingTerm", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-black"
                >
                  <option value="SALE">For Sale</option>
                  <option value="LEASE">For Lease</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="price"
                type="number"
                min={1}
                required
                placeholder="Price (NGN)"
                value={draft.price ?? ""}
                onChange={(event) => updateDraftValue("price", event.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              />
              <input
                name="areaSqft"
                type="number"
                min={1}
                required
                placeholder="Area (sqft)"
                value={draft.areaSqft ?? ""}
                onChange={(event) => updateDraftValue("areaSqft", event.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              />
              <input
                name="bedrooms"
                type="number"
                min={0}
                required
                placeholder="Bedrooms"
                value={draft.bedrooms ?? ""}
                onChange={(event) => updateDraftValue("bedrooms", event.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              />
              <input
                name="bathrooms"
                type="number"
                min={0}
                step="0.5"
                required
                placeholder="Bathrooms"
                value={draft.bathrooms ?? ""}
                onChange={(event) => updateDraftValue("bathrooms", event.target.value)}
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              />
            </div>

            <label className="rounded-xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm text-muted">
              Property Image (max 5MB)
              <input
                name="image"
                type="file"
                accept="image/*"
                className="mt-2 block w-full"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setPreviewUrl(null);
                    return;
                  }

                  const objectUrl = URL.createObjectURL(file);
                  setPreviewUrl((prev) => {
                    if (prev) {
                      URL.revokeObjectURL(prev);
                    }
                    return objectUrl;
                  });
                }}
              />
            </label>

            {previewUrl ? (
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Image Preview</p>
                <div className="relative mt-2 h-48 w-full overflow-hidden rounded-lg">
                  <Image src={previewUrl} alt="Property preview" fill className="object-cover" sizes="100vw" unoptimized />
                </div>
              </div>
            ) : null}

            <textarea
              name="galleryUrls"
              rows={4}
              placeholder="Additional Gallery Image URLs (one per line)"
              value={draft.galleryUrls ?? ""}
              onChange={(event) => updateDraftValue("galleryUrls", event.target.value)}
              className="rounded-xl border border-black/10 bg-white px-4 py-3"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                name="featured"
                type="checkbox"
                checked={draft.featured === "on"}
                onChange={(event) => updateDraftValue("featured", event.target.checked ? "on" : "")}
                className="h-4 w-4"
              />
              Mark as featured
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
              >
                Clear Draft
              </button>
              <p className="self-center text-xs text-muted">Draft is auto-saved on this browser.</p>
            </div>

            <button
              type="submit"
              disabled={status.type === "loading"}
              className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
            >
              {status.type === "loading" ? "Publishing..." : "Publish Listing"}
            </button>

            <TurnstileCaptcha onTokenChange={setCaptchaToken} />
          </form>
        )}

        {status.message ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p
              className={`text-sm ${
                status.type === "error" ? "text-red-600" : "text-accent"
              }`}
            >
              {status.message}
            </p>
            {status.type === "success" ? (
              <Link href="/my-listings" className="text-sm font-semibold text-accent underline">
                Manage this listing
              </Link>
            ) : null}
          </div>
        ) : null}
        </div>
      </section>
    </main>
  );
}
