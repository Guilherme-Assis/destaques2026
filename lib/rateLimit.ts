import type { NextRequest } from "next/server";
import { sql } from "./db";

export type RateLimitVerdict = {
  allowed: boolean;
  hits: number;
  retryAfterSec: number;
};

/**
 * Sliding window via Postgres. Chama a função `check_and_record_hit` que
 * apaga acertos fora da janela, conta os atuais e insere o novo se houver
 * orçamento. Tudo em uma round-trip.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  const intervalSec = Math.max(1, Math.round(windowMs / 1000));
  const interval = `${intervalSec} seconds`;
  try {
    const [row] = (await sql<{ allowed: boolean; hits: number }[]>`
      SELECT allowed, hits
      FROM public.check_and_record_hit(${key}, ${interval}::interval, ${max}::int)
    `) as unknown as { allowed: boolean; hits: number }[];
    return {
      allowed: !!row?.allowed,
      hits: row?.hits ?? 0,
      retryAfterSec: row?.allowed ? 0 : intervalSec,
    };
  } catch {
    // Se o rate limit falhar por qualquer motivo (ex.: migration ainda não
    // aplicada), permitimos a requisição em vez de derrubar o app.
    return { allowed: true, hits: 0, retryAfterSec: 0 };
  }
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "0.0.0.0";
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}
