/**
 * Janela de votação:
 *   - GLOBAL_VOTING_STARTS / GLOBAL_VOTING_ENDS no env têm precedência (override total)
 *   - senão usa as colunas voting_starts_at / voting_ends_at da categoria
 *   - colunas/env nulos → "sempre aberta"
 */
export type VotingWindow = {
  startsAt: Date | null;
  endsAt: Date | null;
};

export type WindowStatus = "before" | "open" | "ended";

function parseEnvDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveWindow(category: VotingWindow): VotingWindow {
  const envStart = parseEnvDate(process.env.GLOBAL_VOTING_STARTS);
  const envEnd = parseEnvDate(process.env.GLOBAL_VOTING_ENDS);
  return {
    startsAt: envStart ?? category.startsAt,
    endsAt: envEnd ?? category.endsAt,
  };
}

export function statusOf(w: VotingWindow, now: Date = new Date()): WindowStatus {
  if (w.startsAt && now < w.startsAt) return "before";
  if (w.endsAt && now > w.endsAt) return "ended";
  return "open";
}

export function describeWindow(w: VotingWindow): string {
  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  const a = fmt(w.startsAt);
  const b = fmt(w.endsAt);
  if (a && b) return `${a} → ${b}`;
  if (b) return `Encerra ${b}`;
  if (a) return `Abre ${a}`;
  return "Sem janela definida";
}
