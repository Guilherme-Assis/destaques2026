import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL ausente. Defina em .env.local apontando para o pooler do Supabase (porta 6543, transaction mode).",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __pgsql: ReturnType<typeof postgres> | undefined;
}

// Reaproveita conexão entre hot-reloads em dev e entre invocações warm em serverless.
export const sql =
  globalThis.__pgsql ??
  postgres(url, {
    prepare: false, // pooler em transaction mode não suporta statements preparados nomeados
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // bigint (int8) por padrão volta como BigInt — quebra Number.isInteger e JSON.stringify.
    // Nossos ids cabem em Number.MAX_SAFE_INTEGER, então parseamos como Number.
    types: {
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: number | bigint | string) => String(x),
        parse: (x: string) => Number(x),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalThis.__pgsql = sql;

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

export type Nominee = {
  id: number;
  category_id: number;
  instagram_handle: string;
  display_name: string;
  avatar_url: string | null;
};
