import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type TopRow = {
  nominee_id: number;
  display_name: string;
  instagram_handle: string;
  avatar_url: string | null;
  votes: number;
};

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const [cat] = (await sql<{ id: number; slug: string; name: string }[]>`
    SELECT id, slug, name FROM categories WHERE slug = ${params.slug}
  `) as unknown as { id: number; slug: string; name: string }[];
  if (!cat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const top = (await sql<TopRow[]>`
    SELECT n.id AS nominee_id, n.display_name, n.instagram_handle, n.avatar_url,
           COUNT(v.id)::int AS votes
    FROM nominees n
    LEFT JOIN votes v ON v.nominee_id = n.id
    WHERE n.category_id = ${cat.id}
      AND n.approved = true
      AND n.is_placeholder = false
    GROUP BY n.id
    ORDER BY votes DESC, n.display_name
    LIMIT 5
  `) as unknown as TopRow[];

  const [{ c: total }] = (await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM votes WHERE category_id = ${cat.id}
  `) as unknown as { c: number }[];

  return NextResponse.json(
    { categoryId: cat.id, total, top, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
