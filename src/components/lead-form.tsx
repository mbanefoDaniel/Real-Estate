"use client";

import { FormEvent, useState } from "react";
import TurnstileCaptcha from "@/components/turnstile-captcha";
import { trackEvent } from "@/lib/analytics";

type LeadFormProps = {
  propertyId: string;
};

type SubmitState = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialState: SubmitState = {
  type: "idle",
  message: "",
};

export default function LeadForm({ propertyId }: LeadFormProps) {
  const [state, setState] = useState<SubmitState>(initialState);
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading", message: "Sending your enquiry..." });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId,
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        message: formData.get("message"),
        source: "property_details",
        captchaToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({
        type: "error",
        message: result?.error || "Unable to send enquiry.",
      });
      return;
    }

    form.reset();
    void trackEvent("lead_submitted", {
      propertyId,
      source: "property_details",
    });
    setState({
      type: "success",
      message: "Enquiry sent. The property owner will contact you shortly.",
    });
    setCaptchaToken("");
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
      <input
        name="name"
        required
        placeholder="Full name"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
      />
      <input
        name="phone"
        placeholder="Phone number (optional)"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
      />
      <textarea
        name="message"
        rows={4}
        required
        placeholder="I am interested in this property. Please share inspection details."
        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
      />
      <button
        type="submit"
        disabled={state.type === "loading"}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
      >
        {state.type === "loading" ? "Sending..." : "Send Enquiry"}
      </button>
      <TurnstileCaptcha onTokenChange={setCaptchaToken} />
      {state.message ? (
        <p className={`text-sm ${state.type === "error" ? "text-red-600" : "text-accent"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
