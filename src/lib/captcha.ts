import { NextRequest } from "next/server";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "";
}

export async function verifyCaptchaToken(request: NextRequest, token?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If captcha is not configured yet, allow requests while keeping the same API shape.
  if (!secret) {
    return { ok: true, mode: "disabled" as const };
  }

  if (!token) {
    return { ok: false, mode: "enabled" as const, error: "captcha token is required." };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);

  const ip = getClientIp(request);
  if (ip) {
    form.set("remoteip", ip);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return { ok: false, mode: "enabled" as const, error: "captcha verification failed." };
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    return { ok: false, mode: "enabled" as const, error: "captcha verification failed." };
  }

  const result = (await response.json()) as { success?: boolean };
  if (!result.success) {
    return { ok: false, mode: "enabled" as const, error: "captcha verification failed." };
  }

  return { ok: true, mode: "enabled" as const };
}
