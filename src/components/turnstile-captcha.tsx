"use client";

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileCaptchaProps = {
  onTokenChange: (token: string) => void;
  className?: string;
};

const scriptId = "cf-turnstile-script";

export default function TurnstileCaptcha({ onTokenChange, className }: TurnstileCaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  console.log("Turnstile siteKey:", siteKey);
  const [ready, setReady] = useState(() =>
    typeof window !== "undefined" ? Boolean(window.turnstile) : false
  );
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const instanceId = useId();

  useEffect(() => {
    onTokenChange("");

    if (!siteKey) {
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => {
          onTokenChange(token);
        },
        "expired-callback": () => {
          onTokenChange("");
        },
        "error-callback": () => {
          onTokenChange("");
          setLoadError(true);
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onLoad = () => {
      setReady(true);
      renderWidget();
    };

    const onError = () => {
      setLoadError(true);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (window.turnstile) {
      onLoad();
    }

    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <div id={`turnstile-${instanceId}`} ref={containerRef} />
      {!ready ? <p className="mt-2 text-xs text-muted">Loading captcha...</p> : null}
      {loadError ? <p className="mt-2 text-xs text-red-600">Captcha failed to load. Refresh and try again.</p> : null}
    </div>
  );
}
