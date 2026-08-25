import { verifyCaptcha } from "./captcha";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const IS_PROD = process.env.NODE_ENV === "production";
const CONFIGURED_SECRET = process.env.TURNSTILE_SECRET_KEY || "";
const SECRET =
  IS_PROD || !CONFIGURED_SECRET
    ? CONFIGURED_SECRET
    : "1x0000000000000000000000000000000AA";

export const turnstileEnabled = !!SECRET;
export const turnstilePublicKey = SITE_KEY;

if (IS_PROD && !turnstileEnabled) {
  // Não derruba o build, mas pinta um vermelho gritante no log.
  console.error(
    "[turnstile] FATAL: TURNSTILE_SECRET_KEY ausente em produção. " +
      "Captcha matemático não é seguro contra bots/LLMs.",
  );
}

/**
 * Verifica se o cliente passou no challenge.
 *
 * - Se TURNSTILE_SECRET_KEY estiver configurado, usa Cloudflare Turnstile (robô-resistente).
 * - Caso contrário, cai no captcha matemático assinado (compatível com dev local
 *   sem precisar registrar conta na Cloudflare).
 *
 * O front-end envia `captchaToken` (turnstile token) OU `captchaToken+captchaAnswer`
 * (matemático). A função decide com base na config do servidor.
 */
export async function verifyChallenge(input: {
  token: string;
  answer: string;
  ip: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (turnstileEnabled) {
    if (!input.token) return { ok: false, reason: "missing-token" };
    try {
      const body = new URLSearchParams({
        secret: SECRET,
        response: input.token,
        remoteip: input.ip,
      });
      const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body, cache: "no-store" },
      );
      if (!res.ok) return { ok: false, reason: `verify-${res.status}` };
      const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
      return data.success
        ? { ok: true }
        : { ok: false, reason: (data["error-codes"] || []).join(",") || "denied" };
    } catch (e) {
      return {
        ok: false,
        reason: "network: " + (e instanceof Error ? e.message : "unknown"),
      };
    }
  }
  // Em produção exigimos Turnstile; sem ele, recusa todo desafio.
  if (IS_PROD && !turnstileEnabled) {
    return { ok: false, reason: "turnstile-not-configured" };
  }
  // fallback matemático (apenas dev/local)
  return verifyCaptcha(input.token, input.answer)
    ? { ok: true }
    : { ok: false, reason: "math" };
}
