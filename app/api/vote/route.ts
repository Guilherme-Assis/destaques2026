import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashCpf, isValidCpf } from "@/lib/cpf";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit-log";
import { resolveWindow, statusOf } from "@/lib/votingWindow";

export const runtime = "nodejs";

const PER_IP_PER_MIN = 10;
const PER_IP_PER_HOUR = 60;
const PER_CPF_PER_HOUR = 20;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // Rate limit por IP
  const rlMin = await rateLimit(`vote:ip:${ip}:1m`, PER_IP_PER_MIN, 60_000);
  if (!rlMin.allowed) {
    await recordAudit({ action: "vote_rate_limited", req, meta: { window: "1m" } });
    return NextResponse.json(
      { error: "rate", message: "Muitas tentativas. Aguarde um instante." },
      { status: 429, headers: { "Retry-After": String(rlMin.retryAfterSec) } },
    );
  }
  const rlHour = await rateLimit(`vote:ip:${ip}:1h`, PER_IP_PER_HOUR, 60 * 60_000);
  if (!rlHour.allowed) {
    return NextResponse.json(
      { error: "rate", message: "Limite por hora excedido. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rlHour.retryAfterSec) } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json", message: "JSON inválido" }, { status: 400 });
  }

  const { cpf, consent } = body || {};
  const categoryId = Number(body?.categoryId);
  const nomineeId = Number(body?.nomineeId);

  if (!Number.isInteger(categoryId) || !Number.isInteger(nomineeId)) {
    return NextResponse.json({ error: "params", message: "Parâmetros inválidos" }, { status: 400 });
  }

  // LGPD: consentimento explícito
  if (consent !== true) {
    return NextResponse.json(
      { error: "consent", message: "É necessário aceitar a política de privacidade." },
      { status: 400 },
    );
  }

  if (typeof cpf !== "string" || !isValidCpf(cpf)) {
    return NextResponse.json({ error: "cpf", message: "CPF inválido" }, { status: 400 });
  }

  // Categoria + janela de votação
  const [cat] = (await sql<
    { id: number; name: string; voting_starts_at: Date | null; voting_ends_at: Date | null }[]
  >`
    SELECT id, name, voting_starts_at, voting_ends_at
    FROM categories WHERE id = ${categoryId}
  `) as unknown as {
    id: number;
    name: string;
    voting_starts_at: Date | null;
    voting_ends_at: Date | null;
  }[];
  if (!cat) {
    return NextResponse.json({ error: "category", message: "Categoria não encontrada" }, { status: 404 });
  }
  const win = resolveWindow({
    startsAt: cat.voting_starts_at ? new Date(cat.voting_starts_at) : null,
    endsAt: cat.voting_ends_at ? new Date(cat.voting_ends_at) : null,
  });
  const status = statusOf(win);
  if (status !== "open") {
    await recordAudit({
      action: "vote_outside_window",
      req,
      meta: { categoryId, status },
    });
    return NextResponse.json(
      {
        error: "window",
        message:
          status === "before"
            ? "A votação ainda não começou para esta categoria."
            : "A votação para esta categoria já encerrou.",
      },
      { status: 409 },
    );
  }

  // Indicado precisa estar aprovado e pertencer à categoria
  const [nominee] = (await sql<
    { id: number; category_id: number; approved: boolean; is_placeholder: boolean }[]
  >`
    SELECT id, category_id, approved, is_placeholder
    FROM nominees WHERE id = ${nomineeId}
  `) as unknown as {
    id: number;
    category_id: number;
    approved: boolean;
    is_placeholder: boolean;
  }[];
  if (
    !nominee ||
    nominee.category_id !== categoryId ||
    !nominee.approved ||
    nominee.is_placeholder
  ) {
    return NextResponse.json(
      { error: "nominee", message: "Concorrente não disponível para votação." },
      { status: 404 },
    );
  }

  const cpfHash = hashCpf(cpf);

  // Rate limit por CPF (cobertura contra IPs descartáveis)
  const rlCpf = await rateLimit(`vote:cpf:${cpfHash}:1h`, PER_CPF_PER_HOUR, 60 * 60_000);
  if (!rlCpf.allowed) {
    await recordAudit({ action: "vote_rate_limited", req, meta: { by: "cpf_hash" } });
    return NextResponse.json(
      { error: "rate", message: "Limite de votos por CPF atingido nesta hora." },
      { status: 429, headers: { "Retry-After": String(rlCpf.retryAfterSec) } },
    );
  }

  try {
    const inserted = (await sql<{ id: number }[]>`
      INSERT INTO votes (category_id, nominee_id, cpf_hash)
      VALUES (${categoryId}, ${nomineeId}, ${cpfHash})
      ON CONFLICT (category_id, cpf_hash) DO NOTHING
      RETURNING id
    `) as unknown as { id: number }[];

    if (inserted.length === 0) {
      await recordAudit({
        action: "vote_duplicate",
        req,
        meta: { categoryId, nomineeId },
      });
      return NextResponse.json(
        { error: "duplicate", message: "Esse CPF já votou nesta categoria." },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "internal", message: "Erro ao registrar voto" },
      { status: 500 },
    );
  }

  await recordAudit({
    action: "vote_recorded",
    req,
    meta: { categoryId, nomineeId },
  });
  return NextResponse.json({ ok: true });
}
