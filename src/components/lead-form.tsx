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

const dialingCodes = [
  { code: "+234", country: "NG", label: "Nigeria (+234)" },
  { code: "+1", country: "US", label: "USA (+1)" },
  { code: "+44", country: "GB", label: "UK (+44)" },
  { code: "+233", country: "GH", label: "Ghana (+233)" },
  { code: "+254", country: "KE", label: "Kenya (+254)" },
  { code: "+27", country: "ZA", label: "South Africa (+27)" },
  { code: "+49", country: "DE", label: "Germany (+49)" },
  { code: "+33", country: "FR", label: "France (+33)" },
  { code: "+971", country: "AE", label: "UAE (+971)" },
  { code: "+91", country: "IN", label: "India (+91)" },
  { code: "+86", country: "CN", label: "China (+86)" },
  { code: "+81", country: "JP", label: "Japan (+81)" },
  { code: "+61", country: "AU", label: "Australia (+61)" },
  { code: "+55", country: "BR", label: "Brazil (+55)" },
  { code: "+34", country: "ES", label: "Spain (+34)" },
  { code: "+39", country: "IT", label: "Italy (+39)" },
  { code: "+7", country: "RU", label: "Russia (+7)" },
  { code: "+82", country: "KR", label: "South Korea (+82)" },
  { code: "+31", country: "NL", label: "Netherlands (+31)" },
  { code: "+46", country: "SE", label: "Sweden (+46)" },
];

export default function LeadForm({ propertyId }: LeadFormProps) {
  const [state, setState] = useState<SubmitState>(initialState);
  const [captchaToken, setCaptchaToken] = useState("");
  const [dialCode, setDialCode] = useState("+234");

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
        phone: `${dialCode}${String(formData.get("phone") ?? "").replace(/^0+/, "")}`,
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
      <div className="flex gap-2">
        <select
          value={dialCode}
          onChange={(e) => setDialCode(e.target.value)}
          className="w-[130px] shrink-0 rounded-xl border border-black/10 bg-white px-2 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          aria-label="Country dialing code"
        >
          {dialingCodes.map((item) => (
            <option key={item.code} value={item.code}>
              {item.country} {item.code}
            </option>
          ))}
        </select>
        <input
          name="phone"
          type="tel"
          required
          placeholder="Phone number"
          pattern="[0-9]{7,15}"
          title="Enter 7 to 15 digits"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
        />
      </div>
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
