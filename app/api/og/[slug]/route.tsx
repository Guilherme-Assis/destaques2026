import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

const W = 1200;
const H = 630;
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
  { params }: { params: { slug: string } },
) {
  let cat:
    | { id: number; name: string; description: string | null }
    | undefined;
  let top: {
    display_name: string;
    instagram_handle: string;
    avatar_url: string | null;
    votes: number;
  }[] = [];
  let totalVotes = 0;
  try {
    const cats = (await sql<{ id: number; name: string; description: string | null }[]>`
      SELECT id, name, description FROM categories WHERE slug = ${params.slug} LIMIT 1
    `) as unknown as { id: number; name: string; description: string | null }[];
    cat = cats[0];
    if (!cat) return new Response("not found", { status: 404 });

    top = (await sql<typeof top>`
      SELECT n.display_name, n.instagram_handle, n.avatar_url,
             COUNT(v.id)::int AS votes
      FROM nominees n
      LEFT JOIN votes v ON v.nominee_id = n.id
      WHERE n.category_id = ${cat.id}
        AND n.approved = true
        AND n.is_placeholder = false
      GROUP BY n.id
      ORDER BY votes DESC, n.display_name
      LIMIT 3
    `) as unknown as typeof top;

    const [t] = (await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM votes WHERE category_id = ${cat.id}
    `) as unknown as { c: number }[];
    totalVotes = t?.c ?? 0;
  } catch (e) {
    return new Response(
      "db error: " + (e instanceof Error ? e.message : String(e)),
      { status: 500 },
    );
  }

  const RING = ["#d4af37", "#c0c0c8", "#a0673a"]; // ouro, prata, bronze

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: W,
            height: H,
            display: "flex",
            flexDirection: "column",
            padding: "56px 72px",
            color: "#f5f1e8",
            background:
              "radial-gradient(circle at 18% 0%, rgba(212,175,55,0.32), rgba(7,6,10,0) 55%), radial-gradient(circle at 95% 100%, rgba(120,80,200,0.18), rgba(7,6,10,0) 55%), #07060a",
            fontFamily: "serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 14,
                color: "rgba(212,175,55,0.85)",
              }}
            >
              ·  GALA  2026  ·
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                letterSpacing: 6,
                color: "rgba(245,233,182,0.6)",
              }}
            >
              MELHORES  DO  ANO
            </div>
          </div>

          {/* Categoria */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 12,
                color: "rgba(245,233,182,0.6)",
              }}
            >
              CATEGORIA
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 76,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -1,
                backgroundImage: GOLD,
                backgroundClip: "text",
                color: "transparent",
                maxWidth: 1060,
              }}
            >
              {cat.name}
            </div>
          </div>

          {/* Top 3 podio em fila */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 64,
              marginTop: 36,
              flex: 1,
            }}
          >
            {top.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 24,
                  color: "rgba(245,233,182,0.6)",
                }}
              >
                Aguardando inscrições — seja o primeiro a concorrer.
              </div>
            ) : (
              top.map((t, i) => {
                const ring = RING[i] ?? "#d4af37";
                const avatarSrc =
                  t.avatar_url && /^https?:\/\//i.test(t.avatar_url)
                    ? t.avatar_url
                    : null;
                return (
                  <div
                    key={t.instagram_handle + i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 220,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 140,
                        height: 140,
                        borderRadius: 140,
                        backgroundColor: ring,
                        padding: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 132,
                          height: 132,
                          borderRadius: 132,
                          backgroundColor: "#0d0c12",
                          overflow: "hidden",
                        }}
                      >
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarSrc}
                            alt=""
                            width={132}
                            height={132}
                            style={{
                              width: 132,
                              height: 132,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              fontSize: 56,
                              fontWeight: 700,
                              backgroundImage: GOLD,
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                          >
                            {initials(t.display_name) || "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: 16,
                        fontSize: 20,
                        letterSpacing: 6,
                        color: "rgba(245,233,182,0.65)",
                      }}
                    >
                      {i + 1}º  LUGAR
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: 6,
                        fontSize: 26,
                        fontWeight: 700,
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      {t.display_name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: 4,
                        fontSize: 18,
                        color: "rgba(245,233,182,0.55)",
                      }}
                    >
                      {t.votes} votos
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(212,175,55,0.25)",
              paddingTop: 18,
              marginTop: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 4,
                color: "rgba(245,233,182,0.6)",
              }}
            >
              Vote em /categoria/{params.slug}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 4,
                color: "rgba(245,233,182,0.85)",
              }}
            >
              {totalVotes.toLocaleString("pt-BR")} votos · Apuração ao vivo
            </div>
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.stack || e.message : String(e);
    console.error("[/api/og]", msg);
    return new Response("og render error:\n" + msg, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
