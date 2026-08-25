// Diagnóstico: lê .env.local, mostra DATABASE_URL parseada (mascarando),
// e tenta conectar no pooler com postgres-js.
const fs = require("node:fs");
const path = require("node:path");

const p = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(p)) {
  console.error("✗ .env.local não encontrado");
  process.exit(1);
}
const env = {};
for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const mask = (s, head = 6, tail = 4) =>
  !s ? "(missing)" : s.length <= head + tail ? "(set)" : `${s.slice(0, head)}…(${s.length})…${s.slice(-tail)}`;

const url = env.DATABASE_URL || "";
let parsed = null;
try {
  parsed = new URL(url);
} catch (e) {
  console.error("✗ DATABASE_URL não é uma URL válida:", e.message);
}

console.log("=== .env.local ===");
console.log("DATABASE_URL set?         ", !!url);
if (parsed) {
  console.log("  protocol               ", parsed.protocol);
  console.log("  host                   ", parsed.hostname);
  console.log("  port                   ", parsed.port);
  console.log("  username               ", parsed.username);
  console.log("  password               ", parsed.password ? `(set, ${parsed.password.length} chars)` : "(missing)");
  console.log("  database               ", parsed.pathname);
  console.log("  search                 ", parsed.search || "(none)");
}
console.log("SUPABASE_URL              ", env.SUPABASE_URL || "(missing)");
console.log("SUPABASE_SERVICE_ROLE_KEY ", mask(env.SUPABASE_SERVICE_ROLE_KEY));
console.log("CPF_PEPPER                ", env.CPF_PEPPER ? "(set)" : "(missing)");
console.log("ADMIN_USER                ", env.ADMIN_USER || "(missing)");
console.log("ADMIN_PASSWORD            ", env.ADMIN_PASSWORD ? "(set)" : "(missing)");
console.log("SESSION_SECRET            ", env.SESSION_SECRET ? "(set)" : "(missing)");

// === Sanidade da DATABASE_URL ===
console.log("\n=== checagens ===");
let warnings = 0;
function warn(msg) {
  warnings++;
  console.log("  ⚠ ", msg);
}
function ok(msg) {
  console.log("  ✓ ", msg);
}
if (!parsed) {
  console.log("  (skip — URL inválida)");
} else {
  // host esperado: <region>.pooler.supabase.com  (transaction mode roda em :6543)
  const host = parsed.hostname;
  if (!host.endsWith("pooler.supabase.com")) {
    warn(
      `host '${host}' NÃO é o pooler. Use o connection string de "Transaction" (host *.pooler.supabase.com) — não a direta '<ref>.supabase.co'.`,
    );
  } else {
    ok("host é o pooler do Supabase");
  }

  if (parsed.port !== "6543") {
    warn(`porta ${parsed.port || "(vazia)"} ≠ 6543. O modo Transaction usa 6543.`);
  } else {
    ok("porta 6543 (transaction mode)");
  }

  // username esperado: postgres.<PROJECT_REF>
  const user = parsed.username;
  if (user === "postgres") {
    warn(
      `username é 'postgres' puro — o pooler exige 'postgres.<PROJECT_REF>'. Esse é o "Tenant or user not found" mais comum.`,
    );
  } else if (!user.startsWith("postgres.")) {
    warn(`username '${user}' não começa com 'postgres.<ref>'.`);
  } else {
    ok(`username '${user}' tem formato esperado (postgres.<ref>)`);
  }

  if (!parsed.password) warn("senha vazia");
  if (parsed.pathname !== "/postgres") warn(`database '${parsed.pathname}' (esperado '/postgres')`);
}

// === Tenta conectar ===
async function tryConnect() {
  if (!url) {
    console.log("\n=== conexão: pulada (sem DATABASE_URL) ===");
    return;
  }
  let postgres;
  try {
    postgres = require("postgres");
  } catch {
    console.log("\n=== conexão: pulada (modulo 'postgres' não instalado — rode `npm install`) ===");
    return;
  }
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 8 });
  console.log("\n=== conexão Postgres ===");
  try {
    const [{ now }] = await sql`SELECT now() AS now`;
    console.log("  ✓ ping ok — server time:", now);
    const [{ schemas }] = await sql`
      SELECT array_agg(schema_name) AS schemas
      FROM information_schema.schemata
      WHERE schema_name IN ('public','storage')
    `;
    console.log("  ✓ schemas visíveis:", schemas);
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('categories','nominees','votes')
      ORDER BY table_name
    `;
    if (tables.length === 0) {
      console.log("  ⚠  nenhuma tabela do app encontrada — rode `npm run db:push`");
    } else {
      console.log("  ✓ tabelas presentes:", tables.map((t) => t.table_name).join(", "));
    }
  } catch (e) {
    console.log("  ✗ falhou:", e.message);
    if (/Tenant or user not found/i.test(e.message)) {
      console.log(
        "    → causa típica: o connection string copiado é o 'Direct' (porta 5432) ou o username não é 'postgres.<PROJECT_REF>'.",
      );
      console.log(
        "    → em supabase.com vá em Project Settings → Database → Connection string → escolha 'Transaction' e copie a URL inteira (ela já vem com o user correto).",
      );
    }
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

// === Tenta supabase-js Storage ===
async function tryStorage() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("\n=== Storage: pulado (faltam SUPABASE_URL ou SERVICE_ROLE_KEY) ===");
    return;
  }
  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch {
    console.log("\n=== Storage: pulado (modulo '@supabase/supabase-js' não instalado) ===");
    return;
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  console.log("\n=== Storage ===");
  const { data, error } = await sb.storage.listBuckets();
  if (error) {
    console.log("  ✗ listBuckets falhou:", error.message);
    return;
  }
  const names = (data || []).map((b) => b.id);
  console.log("  ✓ buckets:", names.length ? names.join(", ") : "(nenhum)");
  if (!names.includes("avatars")) {
    console.log("  ⚠  bucket 'avatars' não existe — rode `npm run db:push` para criá-lo.");
  } else {
    console.log("  ✓ bucket 'avatars' presente");
  }
}

(async () => {
  await tryConnect();
  await tryStorage();
  process.exit(warnings ? 0 : 0);
})();
