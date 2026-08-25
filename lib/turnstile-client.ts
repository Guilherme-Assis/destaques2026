const configuredSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

// Chaves reais restringem o hostname e falham ao abrir o dev server por IP.
// A chave de teste da Cloudflare funciona em localhost e na rede local.
export const turnstileSiteKey =
  process.env.NODE_ENV === "production" || !configuredSiteKey
    ? configuredSiteKey
    : "1x00000000000000000000AA";

export const useTurnstile = !!turnstileSiteKey;
