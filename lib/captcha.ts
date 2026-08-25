import crypto from "node:crypto";

const SECRET = () =>
  process.env.CAPTCHA_SECRET ||
  process.env.SESSION_SECRET ||
  "dev-session-secret";
const TTL_MS = 5 * 60 * 1000;

export type CaptchaPayload = { a: number; b: number; exp: number };

export function newCaptcha(): { token: string; question: string } {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const exp = Date.now() + TTL_MS;
  const payload: CaptchaPayload = { a, b, exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  return { token: `${body}.${sig}`, question: `Quanto é ${a} + ${b}?` };
}

export function verifyCaptcha(token: string, answer: string | number): boolean {
  if (!token || typeof token !== "string") return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  let payload: CaptchaPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (Date.now() > payload.exp) return false;
  const n = typeof answer === "number" ? answer : parseInt(String(answer).trim(), 10);
  return Number.isFinite(n) && n === payload.a + payload.b;
}
