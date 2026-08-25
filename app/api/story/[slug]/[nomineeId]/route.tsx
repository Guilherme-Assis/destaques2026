import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

const W = 1080;
const H = 1920;
const GOLD =
  "linear-gradient(135deg, #f5e9b6 0%, #d4af37 35%, #bf972c 65%, #f5d97a 100%)";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; nomineeId: string } },
) {
  const nomineeId = Number(params.nomineeId);
  if (!Number.isInteger(nomineeId)) {
    return new Response("invalid id", { status: 400 });
  }

  let row:
    | {
        display_name: string;
        instagram_handle: string;
        avatar_url: string | null;
        category_name: string;
        category_slug: string;
      }
    | undefined;
  try {
    const rows = (await sql<
      {
        display_name: string;
        instagram_handle: string;
        avatar_url: string | null;
        category_name: string;
        category_slug: string;
      }[]
    >`
      SELECT n.display_name, n.instagram_handle, n.avatar_url,
             c.name AS category_name, c.slug AS category_slug
      FROM nominees n
      JOIN categories c ON c.id = n.category_id
      WHERE n.id = ${nomineeId}
        AND c.slug = ${params.slug}
        AND n.approved = true
        AND n.is_placeholder = false
      LIMIT 1
    `) as unknown as {
      display_name: string;
      instagram_handle: string;
      avatar_url: string | null;
      category_name: string;
      category_slug: string;
    }[];
    row = rows[0];
  } catch (e: unknown) {
    return new Response(
      "db error: " + (e instanceof Error ? e.message : String(e)),
      { status: 500 },
    );
  }
  if (!row) return new Response("not found", { status: 404 });

  // só usa a foto se a URL for absoluta — Satori não resolve relativas
  const avatarSrc =
    row.avatar_url && /^https?:\/\//i.test(row.avatar_url)
      ? row.avatar_url
      : null;

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: W,
            height: H,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "100px 80px",
            color: "#f5f1e8",
            background:
              "radial-gradient(circle at 50% 18%, rgba(212,175,55,0.32), rgba(7,6,10,0) 55%), radial-gradient(circle at 50% 95%, rgba(120,80,200,0.18), rgba(7,6,10,0) 55%), #07060a",
            fontFamily: "serif",
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 18,
              color: "rgba(212,175,55,0.85)",
            }}
          >
            ·  GALA  2026  ·
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 30,
              letterSpacing: 16,
              color: "rgba(245,233,182,0.7)",
            }}
          >
            EU  VOTEI  EM
          </div>

          {/* Avatar com aro dourado */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 60,
              width: 380,
              height: 380,
              borderRadius: 380,
              backgroundImage: GOLD,
              padding: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 364,
                height: 364,
                borderRadius: 364,
                backgroundColor: "#0d0c12",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  width={364}
                  height={364}
                  style={{ width: 364, height: 364, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: 160,
                    fontWeight: 700,
                    backgroundImage: GOLD,
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {initials(row.display_name) || "?"}
                </div>
              )}
            </div>
          </div>

          {/* Nome */}
          <div
            style={{
              display: "flex",
              marginTop: 60,
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1.05,
              textAlign: "center",
              letterSpacing: -2,
              backgroundImage: GOLD,
              backgroundClip: "text",
              color: "transparent",
              maxWidth: 920,
            }}
          >
            {row.display_name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 36,
              color: "rgba(245,233,182,0.7)",
              letterSpacing: 2,
            }}
          >
            @{row.instagram_handle}
          </div>

          {/* Divisor */}
          <div
            style={{
              display: "flex",
              marginTop: 70,
              width: 320,
              height: 2,
              backgroundImage:
                "linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.85) 50%, rgba(212,175,55,0) 100%)",
            }}
          />

          {/* Categoria */}
          <div
            style={{
              display: "flex",
              marginTop: 60,
              fontSize: 28,
              letterSpacing: 12,
              color: "rgba(245,233,182,0.65)",
            }}
          >
            PARA  MELHOR
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.1,
              textAlign: "center",
              color: "#f5e9b6",
              letterSpacing: -1,
              maxWidth: 920,
            }}
          >
            {row.category_name}
          </div>

          {/* Footer / CTA */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: 60,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 28,
                letterSpacing: 8,
                color: "rgba(245,233,182,0.7)",
              }}
            >
              VOTE  TAMBÉM
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                padding: "14px 36px",
                border: "2px solid rgba(212,175,55,0.55)",
                borderRadius: 999,
                fontSize: 26,
                letterSpacing: 4,
                color: "#f5e9b6",
              }}
            >
              melhoresdoano · /categoria/{row.category_slug}
            </div>
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (e: unknown) {
    // surface o erro de render como texto pra debug em dev
    const msg = e instanceof Error ? e.stack || e.message : String(e);
    console.error("[/api/story] render error:", msg);
    return new Response("ImageResponse falhou:\n" + msg, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
