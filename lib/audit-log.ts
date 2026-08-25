import type { NextRequest } from "next/server";
import { sql } from "./db";

/**
 * Registra evento em `audit_log`. Falha silenciosamente: o app não deve cair
 * se o audit estiver indisponível.
 *
 * Nunca inclua CPF cru, senha, token, ou qualquer PII no `meta`.
 */
export async function recordAudit(input: {
  action: string;
  req?: NextRequest;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const ip =
      input.ip ??
      (input.req
        ? input.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          input.req.headers.get("x-real-ip") ||
          input.req.headers.get("cf-connecting-ip") ||
          null
        : null);
    const ua =
      input.userAgent ?? input.req?.headers.get("user-agent") ?? null;
    const meta = input.meta ?? null;
    await sql`
      INSERT INTO public.audit_log (action, ip, user_agent, meta)
      VALUES (${input.action}, ${ip}, ${ua}, ${meta ? JSON.stringify(meta) : null}::jsonb)
    `;
  } catch {
    /* swallow */
  }
}
