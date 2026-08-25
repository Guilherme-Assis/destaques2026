import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin())
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") || "pending";

  const filter =
    status === "approved"
      ? sql`n.approved = true AND NOT n.is_placeholder`
      : sql`n.approved = false AND NOT n.is_placeholder`;

  const rows = (await sql<
    {
      id: number;
      display_name: string;
      instagram_handle: string;
      avatar_url: string | null;
      approved: boolean;
      category_slug: string;
      category_name: string;
    }[]
  >`
    SELECT n.id, n.display_name, n.instagram_handle, n.avatar_url, n.approved,
           c.slug AS category_slug, c.name AS category_name
    FROM nominees n
    JOIN categories c ON c.id = n.category_id
    WHERE ${filter}
    ORDER BY n.id DESC
    LIMIT 500
  `) as unknown as {
    id: number;
    display_name: string;
    instagram_handle: string;
    avatar_url: string | null;
    approved: boolean;
    category_slug: string;
    category_name: string;
  }[];

  // Agrupa por handle pra UI mostrar 1 card por inscrito.
  const byHandle = new Map<
    string,
    {
      handle: string;
      display_name: string;
      avatar_url: string | null;
      approved: boolean;
      categories: { id: number; slug: string; name: string }[];
    }
  >();
  for (const r of rows) {
    const k = r.instagram_handle.toLowerCase();
    let bucket = byHandle.get(k);
    if (!bucket) {
      bucket = {
        handle: r.instagram_handle,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        approved: r.approved,
        categories: [],
      };
      byHandle.set(k, bucket);
    }
    bucket.categories.push({
      id: r.id,
      slug: r.category_slug,
      name: r.category_name,
    });
  }

  return NextResponse.json(
    {
      status,
      count: byHandle.size,
      groups: Array.from(byHandle.values()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
