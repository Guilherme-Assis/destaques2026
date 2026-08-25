-- Schema inicial: categories, nominees, votes
-- Espelha o SQLite anterior em Postgres + segurança (RLS) compatível com cadastro/votação públicos.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id          bigserial primary key,
  slug        text not null unique,
  name        text not null,
  description text
);

create table if not exists public.nominees (
  id                bigserial primary key,
  category_id       bigint not null references public.categories(id) on delete cascade,
  instagram_handle  text   not null,
  display_name      text   not null,
  avatar_url        text
);
create index if not exists idx_nominees_category   on public.nominees(category_id);
create index if not exists idx_nominees_handle_low on public.nominees(lower(instagram_handle));
-- mesmo @ não pode aparecer duas vezes na mesma categoria
create unique index if not exists uq_nominees_cat_handle
  on public.nominees(category_id, lower(instagram_handle));

create table if not exists public.votes (
  id          bigserial primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  nominee_id  bigint not null references public.nominees(id)   on delete cascade,
  cpf_hash    text   not null,
  created_at  timestamptz not null default now(),
  unique (category_id, cpf_hash)
);
create index if not exists idx_votes_nominee  on public.votes(nominee_id);
create index if not exists idx_votes_category on public.votes(category_id);

-- Row Level Security
-- Como o app usa a service role (server-side), as políticas abaixo são para a chave anon
-- nunca conseguir ler/escrever sem passar pelo backend. Dessa forma evitamos que cliente
-- web bata direto na API PostgREST com a anon key.
alter table public.categories enable row level security;
alter table public.nominees   enable row level security;
alter table public.votes      enable row level security;

-- (sem políticas) → tabelas ficam fechadas para roles anon/authenticated.
-- service_role bypass automático.
