import crypto from "node:crypto";
import { sql } from "./db";

function sha256(input: string | Buffer): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

/**
 * Hash da folha = SHA-256 do registro canônico do voto.
 * Formato: id|category_id|nominee_id|cpf_hash|created_at_iso
 *
 * Como `cpf_hash` já é HMAC do CPF com pepper server-side, reproduzir
 * a auditoria não exige acesso ao CPF cru — basta exportar a tabela
 * `votes` e rodar o mesmo algoritmo localmente.
 */
function leafHash(v: {
  id: number;
  category_id: number;
  nominee_id: number;
  cpf_hash: string;
  created_at: string;
}): Buffer {
  const canonical = `${v.id}|${v.category_id}|${v.nominee_id}|${v.cpf_hash}|${v.created_at}`;
  return sha256(canonical);
}

export type AuditSnapshot = {
  totalVotes: number;
  leafCount: number;
  root: string | null;
  algorithm: string;
  computedAt: string;
};

/** Constrói o Merkle root sobre todos os votos ordenados por id ASC.
 *  Em níveis com quantidade ímpar duplica o último (estilo Bitcoin). */
export async function computeMerkleRoot(): Promise<AuditSnapshot> {
  const rows = (await sql<
    {
      id: number;
      category_id: number;
      nominee_id: number;
      cpf_hash: string;
      created_at: Date;
    }[]
  >`
    SELECT id, category_id, nominee_id, cpf_hash, created_at
    FROM votes
    ORDER BY id ASC
  `) as unknown as {
    id: number;
    category_id: number;
    nominee_id: number;
    cpf_hash: string;
    created_at: Date;
  }[];

  const computedAt = new Date().toISOString();
  const algorithm =
    "SHA-256 sobre `id|category_id|nominee_id|cpf_hash|created_at_iso`, pares concatenados, último duplicado em níveis ímpares";

  if (rows.length === 0) {
    return { totalVotes: 0, leafCount: 0, root: null, algorithm, computedAt };
  }

  let level: Buffer[] = rows.map((v) =>
    leafHash({
      ...v,
      created_at: new Date(v.created_at).toISOString(),
    }),
  );

  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : a;
      next.push(sha256(Buffer.concat([a, b])));
    }
    level = next;
  }

  return {
    totalVotes: rows.length,
    leafCount: rows.length,
    root: level[0].toString("hex"),
    algorithm,
    computedAt,
  };
}
