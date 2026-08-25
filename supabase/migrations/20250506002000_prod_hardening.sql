-- Endurecimento pra produção (Vercel + Supabase hosted).

-- ── Janela de votação por categoria (global via env override) ────────────────
alter table public.categories
  add column if not exists voting_starts_at timestamptz,
  add column if not exists voting_ends_at   timestamptz;

-- ── Aprovação de indicados (cadastro público vira fila) ──────────────────────
alter table public.nominees
  add column if not exists approved boolean not null default false;

-- placeholders nunca aparecem; cadastros antigos ficam pendentes até admin aprovar.
-- (intencional: força revisão de quem subiu antes desta proteção existir)

create index if not exists idx_nominees_visible
  on public.nominees(category_id) where approved and not is_placeholder;

-- ── Audit log (sem PII; apenas IP, UA, ação e meta) ──────────────────────────
create table if not exists public.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  action      text not null,
  ip          text,
  user_agent  text,
  meta        jsonb
);
create index if not exists idx_audit_log_at      on public.audit_log(at desc);
create index if not exists idx_audit_log_action  on public.audit_log(action, at desc);

alter table public.audit_log enable row level security;
-- (sem políticas → fechado pra anon/authenticated; só service_role escreve/lê)
