import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type Row = {
  category_id: number;
  category_slug: string;
  category_name: string;
  nominee_id: number;
  display_name: string;
  instagram_handle: string;
  votes: number;
};

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Uma query só para todas as categorias e nominees com contagem.
  // Filtra placeholders de seed (is_placeholder = true) — admin ainda vê
  // pendentes (approved = false) para o fluxo de aprovação.
  const rows = (await sql<Row[]>`
    SELECT c.id  AS category_id,
           c.slug AS category_slug,
           c.name AS category_name,
           n.id  AS nominee_id,
           n.display_name,
           n.instagram_handle,
           COUNT(v.id)::int AS votes
    FROM categories c
    LEFT JOIN nominees n
      ON n.category_id = c.id
     AND n.is_placeholder = false
    LEFT JOIN votes v    ON v.nominee_id  = n.id
    GROUP BY c.id, n.id
    ORDER BY c.id, votes DESC, n.display_name
  `) as unknown as Row[];

  const map = new Map<
    number,
    {
      id: number;
      slug: string;
      name: string;
      total: number;
      nominees: {
        nominee_id: number;
        display_name: string;
        instagram_handle: string;
        votes: number;
      }[];
    }
  >();

  for (const r of rows) {
    let cat = map.get(r.category_id);
    if (!cat) {
      cat = {
        id: r.category_id,
        slug: r.category_slug,
        name: r.category_name,
        total: 0,
        nominees: [],
      };
      map.set(r.category_id, cat);
    }
    if (r.nominee_id != null) {
      cat.nominees.push({
        nominee_id: r.nominee_id,
        display_name: r.display_name,
        instagram_handle: r.instagram_handle,
        votes: r.votes,
      });
      cat.total += r.votes;
    }
  }

  const categories = Array.from(map.values());
  const grandTotal = categories.reduce((a, c) => a + c.total, 0);

  return NextResponse.json(
    { generatedAt: new Date().toISOString(), grandTotal, categories },
    { headers: { "Cache-Control": "no-store" } },
  );
}
