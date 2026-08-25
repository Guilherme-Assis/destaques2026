# Melhores do Ano

App web de votação popular onde concorrentes em cada categoria são perfis do Instagram. O público vota informando o CPF; cada CPF pode votar apenas uma vez por categoria. Apuração em tempo real, auditável via Merkle root, com cadastro público dos concorrentes (em fila de moderação) e Stories prontos pra Instagram.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase hosted** (Postgres + Storage + Realtime opcional)
- `postgres` (postgres-js) via pooler em transaction mode
- `@supabase/supabase-js` para Storage e Realtime
- TailwindCSS + Playfair Display
- HMAC-SHA256 (Node `crypto`) para hash de CPF com pepper server-side
- scrypt para hash da senha de admin
- `next/og` para OG image (1200×630) e Story Instagram (1080×1920)

## Setup

### 1. Crie o projeto no Supabase

1. https://supabase.com → **New Project** (recomendado: região `sa-east-1` / São Paulo).
2. **Project Settings → Database → Connection string → Transaction** (porta 6543) → vira `DATABASE_URL`. O username é `postgres.<PROJECT_REF>` (não só `postgres`).
3. **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Configure o ambiente

```bash
cp .env.example .env.local
# Preencha tudo conforme os comentários do .env.example
npm install
npm run check:env       # confere DATABASE_URL, Supabase, etc.
```

### 3. Migrations + seed

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
npm run db:push                       # aplica supabase/migrations/
npm run seed                          # 400+ categorias + placeholders
npm run seed:votes -- 100 --reset     # opcional: dev/staging
```

### 4. Senha do admin (produção)

```bash
node scripts/hash-password.js 'sua-senha-forte'
# Cole o ADMIN_PASSWORD_HASH= no Vercel; remova ADMIN_PASSWORD do prod.
```

### 5. Rodar local

```bash
npm run dev
```

- `/` — home com hero + categorias
- `/categoria/[slug]` — pódio top 5 + lista filtrável + voto
- `/cadastro` — inscrição pública (entra em fila de moderação)
- `/transparencia` — Merkle root + estatísticas auditáveis
- `/privacidade` — política LGPD
- `/admin/login` → `/admin` — apuração em tempo real
- `/admin/aprovacoes` — moderação de inscrições
- `/api/og/[slug]` — 1200×630 OG image dinâmica
- `/api/story/[slug]/[nomineeId]` — 1080×1920 Story PNG

## Deploy na Vercel (Hobby grátis)

1. Importe o repo no Vercel. Region: **gru1** (já fixada em `vercel.json`).
2. Em **Settings → Environment Variables** cole tudo do `.env.local`, **trocando**:
   - `ADMIN_PASSWORD` → `ADMIN_PASSWORD_HASH=scrypt$...`
   - `CPF_PEPPER` → string aleatória de ≥32 chars (`openssl rand -hex 32`)
   - `SESSION_SECRET` → outra string aleatória de ≥32 chars
   - `NEXT_PUBLIC_SITE_URL` = URL da Vercel
   - `NEXT_PUBLIC_REALTIME=false` (Vercel Hobby tem timeout 10s; o admin cai em polling)
3. Deploy.

> **Quer Realtime no admin?** Vercel Hobby não serve. Migre o app para Fly.io, Railway, Render ou um VPS, e ligue `NEXT_PUBLIC_REALTIME=true`.

## Variáveis de ambiente

| Var | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Pooler Supabase em transaction mode (porta 6543, user `postgres.<ref>`) |
| `SUPABASE_URL` | sim | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Service role, **server-only** |
| `CPF_PEPPER` | sim | Pepper do HMAC-SHA256 do CPF. Troque em prod. |
| `ADMIN_USER` | sim | Usuário do painel |
| `ADMIN_PASSWORD_HASH` | prod | scrypt hash gerado por `scripts/hash-password.js` |
| `ADMIN_PASSWORD` | dev | Senha em texto (ignorado em prod) |
| `SESSION_SECRET` | sim | Assina o cookie de sessão admin |
| `GLOBAL_VOTING_STARTS` | não | ISO 8601, override global da abertura |
| `GLOBAL_VOTING_ENDS` | não | ISO 8601, override global do encerramento |
| `NEXT_PUBLIC_REALTIME` | não | `true` para SSE no admin (não funciona em Vercel Hobby) |
| `NEXT_PUBLIC_SITE_URL` | sim | URL canônica usada em og:image |

## Hardening de produção embutido

- **Rate limit em Postgres** (sliding window): IP por minuto/hora em `/api/vote` e `/api/cadastro`, **+ por hash de CPF** no voto, **+ por handle** no cadastro.
- **Janela de votação** por categoria (`voting_starts_at` / `voting_ends_at`) com override global via env. UI mostra "Encerrada / Em breve" e a API retorna 409 fora da janela.
- **Aprovação de inscrição** — cadastro público entra com `approved=false`. Indicado só aparece em home/categoria/pódio/OG/Story após admin aprovar em `/admin/aprovacoes`.
- **Admin auth** com scrypt + lockout (5 tentativas / 15 min, 30 / hora) por IP e audit log de tentativas.
- **LGPD**: checkbox de consentimento obrigatório em voto e cadastro, página `/privacidade`, audit log sem PII (IP + UA + meta JSON, sem CPF cru).
- **Merkle root público** (`/transparencia`) das tabelas de votos para auditoria cidadã.
- **CSP + headers de segurança** em `next.config.js` (HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy).
- **RLS habilitada** em todas as tabelas (anon não consegue ler/escrever direto; tudo passa pelo backend com service role).

## Critérios de aceitação

1. Home (`/`) lista categorias com contagem de indicados aprovados e votos.
2. Categoria (`/categoria/[slug]`) lista concorrentes filtráveis; clique em **Votar** abre form com CPF + LGPD.
3. Reenvio com mesmo CPF na mesma categoria → erro `409` com mensagem clara.
4. Mesmo CPF em outra categoria → permitido.
5. CPF inválido bloqueado no client antes da API.
6. Banco grava só `cpf_hash` (HMAC-SHA256). CPF cru nunca é persistido nem logado.
7. `/admin` exige login com lockout, mostra apuração em tempo real (polling ou SSE).
8. Cadastro público entra em fila → só aparece após admin aprovar.
9. Voto fora da janela é rejeitado com 409.
10. `/transparencia` expõe Merkle root reproduzível por terceiros.

## Estrutura

```
supabase/migrations/
  20250506000000_init.sql            categorias, indicados, votos, RLS
  20250506000100_storage.sql         bucket avatars
  20250506001000_security.sql        rate_limit, is_placeholder, NOTIFY de votos, publicação realtime
  20250506002000_prod_hardening.sql  voting_starts/ends, approved, audit_log

app/
  page.tsx                           home
  cadastro/                          inscrição pública
  categoria/[slug]/                  pódio + lista + voto
  admin/login/                       login com lockout
  admin/                             apuração live
  admin/aprovacoes/                  moderação de inscrições
  transparencia/                     auditoria pública (Merkle root)
  privacidade/                       LGPD
  api/vote                           registra voto com janela + consent + rate limit
  api/cadastro                       upsert nominee + Storage + audit
  api/admin/login                    sessão admin (scrypt + lockout)
  api/admin/results                  agregado pra dashboard
  api/admin/stream                   SSE de votos (gated por NEXT_PUBLIC_REALTIME)
  api/admin/nominees                 lista de inscritos por status
  api/admin/nominees/decision        approve / reject em lote
  api/category/[slug]/top            top 5 público
  api/og/[slug]                      OG 1200×630 dinâmico
  api/story/[slug]/[id]              Story 1080×1920 dinâmico
  api/transparency                   snapshot da auditoria

lib/
  db.ts                              postgres-js (pooler, bigint→Number)
  storage.ts                         Supabase Storage (avatares)
  cpf.ts / cpf-validate.ts           validação + hash HMAC
  password.ts                        scrypt
  auth.ts                            cookie de sessão admin
  rateLimit.ts                       sliding window em Postgres
  audit-log.ts                       insere em audit_log
  votingWindow.ts                    resolve + status da janela
  audit.ts                           Merkle root
  handle.ts                          normalização de @

scripts/
  seed.js                            categorias + placeholders
  seed-votes.js                      votos sintéticos pra teste
  hash-password.js                   gera ADMIN_PASSWORD_HASH
  check-env.js                       diagnóstico de DATABASE_URL + Storage

next.config.js                       CSP / HSTS / X-Frame-Options
vercel.json                          região gru1, maxDuration por rota
```
