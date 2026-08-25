import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-log";

export const runtime = "nodejs";

type Body = { handles?: string[]; action?: "approve" | "reject" };

export async function POST(req: NextRequest) {
  if (!isAdmin())
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const action = body.action;
  const handles = (body.handles || [])
    .map((h) => String(h || "").toLowerCase().trim())
    .filter(Boolean);

  if (!handles.length || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { error: "params", message: "Parâmetros inválidos" },
      { status: 400 },
    );
  }

  let affected = 0;
  if (action === "approve") {
    const r = (await sql<{ id: number }[]>`
      UPDATE nominees SET approved = true
      WHERE LOWER(instagram_handle) = ANY(${handles}) AND NOT is_placeholder
      RETURNING id
    `) as unknown as { id: number }[];
    affected = r.length;
  } else {
    const r = (await sql<{ id: number }[]>`
      DELETE FROM nominees
      WHERE LOWER(instagram_handle) = ANY(${handles})
        AND NOT is_placeholder
        AND approved = false
      RETURNING id
    `) as unknown as { id: number }[];
    affected = r.length;
  }

  await recordAudit({
    action: `nominee_${action}`,
    req,
    meta: { handles, affected },
  });

  return NextResponse.json({ ok: true, action, affected });
}
