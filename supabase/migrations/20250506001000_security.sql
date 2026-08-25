-- Endurecimento: rate limit, sinalização de placeholder, publicação realtime de votos.

-- ── Rate limit (sliding window por chave) ────────────────────────────────────
create table if not exists public.rate_limit_hits (
  id      bigserial primary key,
  key     text not null,
  hit_at  timestamptz not null default now()
);
create index if not exists idx_rate_limit_hits_key_time
  on public.rate_limit_hits (key, hit_at);

-- atomic check + record. Retorna allowed e a contagem após o registro.
create or replace function public.check_and_record_hit(
  p_key    text,
  p_window interval,
  p_max    int
)
returns table(allowed boolean, hits int) as $$
declare
  v_count int;
begin
  delete from public.rate_limit_hits
   where key = p_key and hit_at < now() - p_window;

  select count(*)::int into v_count
    from public.rate_limit_hits where key = p_key;

  if v_count >= p_max then
    return query select false, v_count;
  else
    insert into public.rate_limit_hits(key) values (p_key);
    return query select true, v_count + 1;
  end if;
end;
$$ language plpgsql;

alter table public.rate_limit_hits enable row level security;
-- (sem políticas → fechado pra anon/authenticated; só service_role escreve)

-- ── Placeholder vs concorrente real ──────────────────────────────────────────
alter table public.nominees
  add column if not exists is_placeholder boolean not null default false;

-- marca os placeholders existentes (seed legado: "Indicado I/II/III/IV/V" sem foto)
update public.nominees
   set is_placeholder = true
 where avatar_url is null
   and display_name ~ '^Indicado [IVX]+$';

create index if not exists idx_nominees_is_placeholder
  on public.nominees (category_id) where not is_placeholder;

-- ── NOTIFY em cada voto novo (para o SSE de admin) ───────────────────────────
create or replace function public.notify_vote() returns trigger as $$
begin
  perform pg_notify(
    'votes_changed',
    json_build_object('category_id', new.category_id, 'nominee_id', new.nominee_id)::text
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_votes_notify on public.votes;
create trigger trg_votes_notify
  after insert on public.votes
  for each row execute function public.notify_vote();

-- ── Publicação Realtime para o admin via supabase-js ─────────────────────────
-- Idempotente: ignora se já estiver publicada.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
  ) then
    execute 'alter publication supabase_realtime add table public.votes';
  end if;
end $$;
