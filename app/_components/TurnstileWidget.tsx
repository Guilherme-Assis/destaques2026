"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    __turnstileLoaded?: boolean;
  }
}

const SCRIPT_ID = "cf-turnstile";

function ensureScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (document.getElementById(SCRIPT_ID)) {
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          resolve();
        }
      }, 50);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("falha ao carregar Turnstile"));
    document.head.appendChild(s);
  });
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  theme = "dark",
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const id = useId();

  useEffect(() => {
    let cancelled = false;
    ensureScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: onVerify,
          "expired-callback": () => {
            onExpire?.();
            // reseta automaticamente
            if (widgetId.current) window.turnstile?.reset(widgetId.current);
          },
          "error-callback": () => onExpire?.(),
          theme,
        });
      })
      .catch(() => {
        // silencioso — o submit ficará desabilitado por falta de token
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
        widgetId.current = null;
      }
    };
    // siteKey/theme só mudam em rerender raro; deps mínimas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, theme]);

  return <div ref={ref} id={`ts-${id}`} />;
}
