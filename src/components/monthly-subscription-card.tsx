"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { authFetch } from "@/lib/auth-fetch";

type SubscriptionStatusResponse = {
  active: boolean;
  subscription: {
    status: string;
    expiresAt: string;
  } | null;
};

function formatExpiry(value?: string) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

type MonthlySubscriptionCardProps = {
  priceNgn: number;
  className?: string;
};

export default function MonthlySubscriptionCard({ priceNgn, className }: MonthlySubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [checkedStatus, setCheckedStatus] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await authFetch("/api/subscription/status", { cache: "no-store", credentials: "include" });
        if (!response.ok) {
          setCheckedStatus(true);
          return;
        }

        const result = (await response.json()) as SubscriptionStatusResponse;
        setActive(result.active);
        setExpiresAt(result.subscription?.expiresAt || null);
      } catch {
        // Keep UI non-blocking.
      } finally {
        setCheckedStatus(true);
      }
    }

    void loadStatus();
  }, []);

  useEffect(() => {
    async function verifyReference(reference: string) {
      setLoading(true);
      try {
        const response = await authFetch("/api/payments/subscription/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(result.error || "Unable to confirm payment.");
          return;
        }

        setActive(result.status === "ACTIVE");
        setExpiresAt(result.expiresAt || null);
        setMessage(result.status === "ACTIVE" ? "Subscription is active." : "Subscription not active yet.");
        void trackEvent("subscription_verify", { status: result.status ?? "UNKNOWN" });
      } catch {
        setMessage("Unable to confirm payment right now.");
      } finally {
        setLoading(false);
      }
    }

    async function verifyIfReturnedFromCheckout() {
      const ref = searchParams.get("ref");
      const flag = searchParams.get("subscription");
      if (!ref || !flag || flag !== "success") {
        return;
      }

      setLastReference(ref);
      await verifyReference(ref);
    }

    void verifyIfReturnedFromCheckout();
  }, [searchParams]);

  async function startSubscription() {
    setLoading(true);
    setMessage("");

    try {
      const response = await authFetch("/api/payments/subscription/initiate", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign("/auth/sign-in?next=/pricing");
          return;
        }

        setMessage(result.error || "Unable to start subscription checkout.");
        return;
      }

      if (typeof result.checkoutUrl === "string" && result.checkoutUrl) {
        void trackEvent("subscription_checkout_started", { amount: priceNgn });
        window.location.assign(result.checkoutUrl);
        return;
      }

      setMessage("Checkout URL missing. Please try again.");
    } catch {
      setMessage("Network error while starting subscription checkout.");
    } finally {
      setLoading(false);
    }
  }

  const formattedExpiry = useMemo(() => formatExpiry(expiresAt || undefined), [expiresAt]);

  return (
    <article
      className={`${className ?? ""} relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.96)_0%,rgba(241,248,249,0.98)_100%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.10)] ring-1 ring-black/5 sm:p-6`}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-200/45 blur-xl" />
      <div className="relative z-10 flex h-full flex-col">
        <p className="inline-flex rounded-full border border-amber-700/20 bg-amber-900/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900/80">
          Core Access
        </p>
        <h2 className="mt-3 text-xl font-semibold">Monthly Posting Subscription</h2>
        <p className="mt-2 text-3xl font-bold">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(priceNgn)}{" "}
          / month
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>- Required to post properties</li>
          <li>- Active for 30 days per payment</li>
          <li>- Renew anytime from this page</li>
        </ul>

        <div className="mt-auto pt-6">
          {checkedStatus && active ? (
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Active subscription{formattedExpiry ? ` until ${formattedExpiry}` : ""}.
            </p>
          ) : (
            <button
              type="button"
              onClick={startSubscription}
              disabled={loading}
              className="inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
            >
              {loading ? "Processing..." : "Subscribe Monthly"}
            </button>
          )}

          {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
          {!active && lastReference ? (
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await authFetch("/api/payments/subscription/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference: lastReference }),
                  });
                  const result = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    setMessage(result.error || "Still waiting for payment confirmation.");
                    return;
                  }
                  setActive(result.status === "ACTIVE");
                  setExpiresAt(result.expiresAt || null);
                  setMessage(result.status === "ACTIVE" ? "Subscription is active." : "Subscription is pending.");
                } catch {
                  setMessage("Unable to recheck payment right now.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="mt-3 inline-flex rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5 disabled:opacity-60"
            >
              Recheck Payment Status
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
