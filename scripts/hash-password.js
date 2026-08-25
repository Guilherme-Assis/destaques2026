// Gera o ADMIN_PASSWORD_HASH para colocar em produção.
//   node scripts/hash-password.js 'minha-senha-forte'
const crypto = require("node:crypto");

const KEY_LEN = 64;
const SALT_LEN = 16;
const COST = 16384;
const BLOCK = 8;
const PARALLELIZATION = 1;

const plain = process.argv.slice(2).join(" ").trim();
if (!plain) {
  console.error("Uso: node scripts/hash-password.js '<senha em texto>'");
  process.exit(1);
}

const salt = crypto.randomBytes(SALT_LEN);
const derived = crypto.scryptSync(plain, salt, KEY_LEN, {
  cost: COST,
  blockSize: BLOCK,
  parallelization: PARALLELIZATION,
});
const hash = `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
console.log(
  "Cole a linha acima nas Environment Variables do Vercel (Settings → Environment Variables)\n" +
    "e remova ADMIN_PASSWORD — não deixe senha em texto na cloud.",
);
