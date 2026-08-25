import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_TTL_MS, createSessionCookie } from "@/lib/auth";
import { configuredAdminHash, verifyPassword } from "@/lib/password";
import { verifyChallenge } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // Lockout por IP: 5 tentativas em 15 min, depois 30/h.
  const lockShort = await rateLimit(`login:ip:${ip}:15m`, 5, 15 * 60_000);
  if (!lockShort.allowed) {
    await recordAudit({
      action: "admin_login_blocked",
      req,
      meta: { window: "15m" },
    });
    return NextResponse.json(
      { error: "rate", message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(lockShort.retryAfterSec) } },
    );
  }
  const lockHour = await rateLimit(`login:ip:${ip}:1h`, 30, 60 * 60_000);
  if (!lockHour.allowed) {
    return NextResponse.json(
      { error: "rate", message: "Limite por hora atingido." },
      { status: 429, headers: { "Retry-After": String(lockHour.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { user, password, captchaToken, captchaAnswer } = body || {};

  // Turnstile (com fallback matemático em dev)
  const challenge = await verifyChallenge({
    token: String(captchaToken || ""),
    answer: String(captchaAnswer || ""),
    ip,
  });
  if (!challenge.ok) {
    await recordAudit({
      action: "admin_login_failed",
      req,
      meta: { reason: "captcha" },
    });
    return NextResponse.json(
      { error: "captcha", message: "Verificação anti-robô falhou." },
      { status: 400 },
    );
  }

  const expectedUser = process.env.ADMIN_USER || "admin";
  const adminHash = configuredAdminHash();
  const passOk =
    typeof password === "string" &&
    !!adminHash &&
    verifyPassword(password, adminHash);

  if (user !== expectedUser || !passOk) {
    await recordAudit({
      action: "admin_login_failed",
      req,
      meta: { reason: "credentials" },
    });
    return NextResponse.json(
      { error: "credentials", message: "Credenciais inválidas." },
      { status: 401 },
    );
  }

  await recordAudit({ action: "admin_login_ok", req });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ADMIN_TTL_MS / 1000),
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  await recordAudit({ action: "admin_logout", req });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
