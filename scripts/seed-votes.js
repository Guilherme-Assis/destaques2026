// Gera votos de teste para popular pódio e dashboard.
//   node scripts/seed-votes.js                  (default: ~120 votos/categoria)
//   node scripts/seed-votes.js 300              (300 votos/categoria)
//   node scripts/seed-votes.js 200 --reset      (apaga votos antes)
(function loadEnvLocal() {
  const p = require("node:path").join(process.cwd(), ".env.local");
  const fs = require("node:fs");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
})();
process.env.CPF_PEPPER = process.env.CPF_PEPPER || "dev-pepper-change-me";

const crypto = require("node:crypto");
const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL ausente em .env.local. Use o pooler do Supabase (porta 6543).",
  );
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 4 });

const args = process.argv.slice(2);
const PER_CATEGORY = parseInt(args.find((a) => /^\d+$/.test(a)) || "120", 10);
const RESET = args.includes("--reset");

function hashCpf(rawCpf) {
  return crypto
    .createHmac("sha256", process.env.CPF_PEPPER)
    .update(String(rawCpf).replace(/\D/g, ""))
    .digest("hex");
}

function calcDigit(slice, factorStart) {
  let sum = 0;
  let f = factorStart;
  for (const ch of slice) sum += parseInt(ch, 10) * f--;
  const r = (sum * 10) % 11;
  return r === 10 ? 0 : r;
}

function randomValidCpf() {
  let base;
  do {
    base = "";
    for (let i = 0; i < 9; i++) base += Math.floor(Math.random() * 10);
  } while (/^(\d)\1{8}$/.test(base));
  const d1 = calcDigit(base, 10);
  const d2 = calcDigit(base + d1, 11);
  return base + d1 + d2;
}

function weightsFor(n) {
  const base = [];
  for (let i = 0; i < n; i++) {
    base.push(Math.pow(0.7, i) + Math.random() * 0.15);
  }
  return base;
}

function pickIndex(weights) {
  const s = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * s;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

async function main() {
  if (RESET) {
    const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM votes`;
    await sql`DELETE FROM votes`;
    console.log(`reset: removidos ${c} votos.`);
  }

  const categories = await sql`
    SELECT id, slug, name FROM categories ORDER BY id
  `;

  // Carrega todos os indicados de uma vez e agrupa por categoria
  const allNominees = await sql`SELECT id, category_id FROM nominees ORDER BY id`;
  const byCat = new Map();
  for (const n of allNominees) {
    if (!byCat.has(n.category_id)) byCat.set(n.category_id, []);
    byCat.get(n.category_id).push(n.id);
  }

  // Gera todas as linhas em memória
  const rows = [];
  for (const cat of categories) {
    const nominees = byCat.get(cat.id) || [];
    if (nominees.length === 0) continue;
    const shuffled = [...nominees].sort(() => Math.random() - 0.5);
    const weights = weightsFor(shuffled.length);
    for (let i = 0; i < PER_CATEGORY; i++) {
      const cpf = randomValidCpf();
      const idx = pickIndex(weights);
      rows.push({
        category_id: cat.id,
        nominee_id: shuffled[idx],
        cpf_hash: hashCpf(cpf),
      });
    }
  }

  // Insere em chunks. ON CONFLICT garante idempotência se houver colisão.
  const CHUNK = 1000;
  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const inserted = await sql`
      INSERT INTO votes ${sql(slice, "category_id", "nominee_id", "cpf_hash")}
      ON CONFLICT (category_id, cpf_hash) DO NOTHING
      RETURNING id
    `;
    totalInserted += inserted.length;
    process.stdout.write(
      `\r  inserindo... ${Math.min(i + CHUNK, rows.length).toLocaleString("pt-BR")}/${rows.length.toLocaleString("pt-BR")}`,
    );
  }
  process.stdout.write("\n");

  console.log(
    `\nTotal: ${totalInserted.toLocaleString("pt-BR")} votos em ${categories.length} categorias (${PER_CATEGORY}/categoria).`,
  );

  // Snapshot do pódio das primeiras 6 categorias usando window function
  const sampleSlugs = categories.slice(0, 6).map((c) => c.slug);
  const top = await sql`
    SELECT * FROM (
      SELECT c.id   AS category_id,
             c.name AS category_name,
             c.slug AS category_slug,
             n.display_name,
             n.instagram_handle,
             COUNT(v.id)::int AS votes,
             ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(v.id) DESC, n.display_name) AS rn
      FROM categories c
      LEFT JOIN nominees n ON n.category_id = c.id
      LEFT JOIN votes v    ON v.nominee_id  = n.id
      WHERE c.slug = ANY(${sampleSlugs})
      GROUP BY c.id, n.id
    ) sub
    WHERE rn <= 5
    ORDER BY category_id, rn
  `;

  console.log("\n=== Pódio (amostra das primeiras categorias) ===");
  let currentCat = null;
  for (const row of top) {
    if (row.category_name !== currentCat) {
      currentCat = row.category_name;
      console.log(`\n[${currentCat}]`);
    }
    const medal = ["🥇", "🥈", "🥉", "4.", "5."][row.rn - 1];
    console.log(
      `  ${medal} ${String(row.display_name).padEnd(22)} @${String(row.instagram_handle).padEnd(28)} ${row.votes} votos`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
