import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "mda_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.SESSION_SECRET || "dev-session-secret";
}

export function createSessionCookie(): string {
  const exp = Date.now() + TTL_MS;
  const body = Buffer.from(JSON.stringify({ exp, role: "admin" })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.role === "admin" && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export function isAdmin(): boolean {
  const token = cookies().get(COOKIE)?.value;
  return verifySession(token);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_TTL_MS = TTL_MS;
