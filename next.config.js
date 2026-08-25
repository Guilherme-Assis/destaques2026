/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production";

// CSP é estrito mas inclui as origens de fato usadas:
//   - Supabase (api + storage + websockets)
//   - Cloudflare Turnstile
//   - Google Fonts (next/font baixa em build, mas o CSS pode bater no gstatic)
//
// 'unsafe-inline' em script-src é o trade-off pra Next.js sem nonce dinâmico
// (App Router exige config bem mais complicada se quiser nonce). Próximo
// passo de hardening seria nonce via middleware.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
  // Vercel Hobby: garante que rotas com upload (cadastro) e SSE (admin/stream)
  // tenham o runtime certo. Definimos `runtime = "nodejs"` no próprio arquivo,
  // mas reforçamos aqui o tamanho máximo da resposta de funções.
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

module.exports = nextConfig;
