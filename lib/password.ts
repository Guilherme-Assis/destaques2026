import crypto from "node:crypto";

/**
 * Hash de senha com scrypt (built-in do Node, sem dependências nativas).
 * Formato armazenado: `scrypt$<saltHex>$<hashHex>`.
 *
 * Para gerar o hash do ADMIN_PASSWORD em produção:
 *   node scripts/hash-password.js 'minha-senha-forte'
 * Cole o resultado em ADMIN_PASSWORD_HASH no .env (e remova ADMIN_PASSWORD).
 */
const PREFIX = "scrypt$";
const KEY_LEN = 64;
const SALT_LEN = 16;
const COST = 16384;
const BLOCK = 8;
const PARALLELIZATION = 1;

export function hashPassword(plain: string, saltHex?: string): string {
  const salt = saltHex
    ? Buffer.from(saltHex, "hex")
    : crypto.randomBytes(SALT_LEN);
  const derived = crypto.scryptSync(plain, salt, KEY_LEN, {
    cost: COST,
    blockSize: BLOCK,
    parallelization: PARALLELIZATION,
  });
  return `${PREFIX}${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.startsWith(PREFIX)) {
    // Fallback: comparação em tempo constante para senhas puras
    // (apenas para retrocompatibilidade; troque por hash assim que possível).
    const a = Buffer.from(plain);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = crypto.scryptSync(plain, salt, expected.length, {
    cost: COST,
    blockSize: BLOCK,
    parallelization: PARALLELIZATION,
  });
  return (
    expected.length === derived.length &&
    crypto.timingSafeEqual(expected, derived)
  );
}

/** Retorna o hash configurado pelo operador, hashando ADMIN_PASSWORD se necessário. */
export function configuredAdminHash(): string {
  const explicit = process.env.ADMIN_PASSWORD_HASH;
  if (explicit) return explicit;
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return "";
  // Em produção, exija ADMIN_PASSWORD_HASH; ADMIN_PASSWORD vira erro:
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[auth] ADMIN_PASSWORD_HASH ausente em produção — configure scrypt$… via `node scripts/hash-password.js`",
    );
    return "";
  }
  return hashPassword(plain);
}
