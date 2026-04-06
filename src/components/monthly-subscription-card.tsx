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

export default function MonthlySubscriptionCard({ priceNgn }: MonthlySubscriptionCardProps) {
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
      className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm ring-1 ring-white/10 transition hover:shadow-md"
    >
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Required
        </span>
        <h2 className="mt-3 text-lg font-bold">Monthly Subscription</h2>
        <p className="mt-0.5 text-xs text-white/60">Required to post listings</p>
      </div>

      <p className="mt-4">
        <span className="text-3xl font-extrabold tracking-tight">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(priceNgn)}
        </span>
        <span className="ml-1 text-sm text-white/60">/ month</span>
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        <li className="flex items-start gap-2 text-sm text-white/80">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Post unlimited properties
        </li>
        <li className="flex items-start gap-2 text-sm text-white/80">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Active for 30 days per payment
        </li>
        <li className="flex items-start gap-2 text-sm text-white/80">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Renew anytime
        </li>
      </ul>

      <div className="mt-6">
        {checkedStatus && active ? (
          <div className="rounded-lg bg-emerald-500/20 px-4 py-2.5 text-center">
            <p className="text-sm font-semibold text-emerald-300">
              ✓ Active{formattedExpiry ? ` until ${formattedExpiry}` : ""}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={startSubscription}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Processing...
              </>
            ) : (
              "Subscribe Now"
            )}
          </button>
        )}

        {message ? <p className="mt-3 text-center text-xs text-white/60">{message}</p> : null}

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
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-60"
          >
            Recheck Payment Status
          </button>
        ) : null}
      </div>
    </article>
  );
}
