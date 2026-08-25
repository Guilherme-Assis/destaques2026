import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Formato de post quadrado-vertical do Instagram (4:5)
const W = 1080;
const H = 1350;
const GOLD =
  "linear-gradient(135deg, #f5e9b6 0%, #d4af37 35%, #bf972c 65%, #f5d97a 100%)";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Gera o cartão de visitas 1080×1350 do indicado, pronto para post no feed
 * do Instagram. Aponta para o perfil dele via QR code (e link textual).
 *
 * Querystring opcional:
 *   ?download=1   força Content-Disposition: attachment
 */
export async function GET(
  req: Request,
  { params }: { params: { slug: string; nomineeId: string } },
) {
  const nomineeId = Number(params.nomineeId);
  if (!Number.isInteger(nomineeId)) {
    return new Response("invalid id", { status: 400 });
  }

  const url = new URL(req.url);
  const wantsDownload = url.searchParams.get("download") === "1";

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

  const profileUrl = `https://instagram.com/${row.instagram_handle}`;
  const qrSrc =
    `https://api.qrserver.com/v1/create-qr-code/?` +
    new URLSearchParams({
      data: profileUrl,
      size: "420x420",
      margin: "8",
      qzone: "1",
      color: "f5e9b6", // dourado claro
      bgcolor: "0d0c12", // ink-900
      ecc: "M",
      format: "png",
    }).toString();

  const avatarSrc =
    row.avatar_url && /^https?:\/\//i.test(row.avatar_url)
      ? row.avatar_url
      : null;

  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  };
  if (wantsDownload) {
    const safeHandle = row.instagram_handle.replace(/[^a-z0-9._-]/gi, "");
    headers["Content-Disposition"] = `attachment; filename="cartao-${safeHandle}.png"`;
  }

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
            padding: "70px 70px 50px",
            color: "#f5f1e8",
            backgroundColor: "#07060a",
            backgroundImage:
              "radial-gradient(circle at 50% 12%, rgba(212,175,55,0.30), rgba(7,6,10,0) 55%), radial-gradient(circle at 50% 100%, rgba(120,80,200,0.18), rgba(7,6,10,0) 55%)",
            fontFamily: "serif",
          }}
        >
          {/* Topo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              marginTop: 18,
              fontSize: 26,
              letterSpacing: 14,
              color: "rgba(245,233,182,0.75)",
            }}
          >
            INDICADO  A  MELHOR
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.05,
              textAlign: "center",
              color: "#f5e9b6",
              letterSpacing: -1,
              maxWidth: 880,
            }}
          >
            {row.category_name}
          </div>

          {/* Linha dourada */}
          <div
            style={{
              display: "flex",
              marginTop: 30,
              width: 280,
              height: 2,
              backgroundImage:
                "linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.85) 50%, rgba(212,175,55,0) 100%)",
            }}
          />

          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 32,
              width: 260,
              height: 260,
              borderRadius: 260,
              backgroundImage: GOLD,
              padding: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 248,
                height: 248,
                borderRadius: 248,
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
                  width={248}
                  height={248}
                  style={{ width: 248, height: 248, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: 110,
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
              marginTop: 26,
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1,
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
              marginTop: 10,
              fontSize: 30,
              color: "rgba(245,233,182,0.75)",
              letterSpacing: 2,
            }}
          >
            @{row.instagram_handle}
          </div>

          {/* Bloco do QR */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 36,
              padding: 16,
              borderRadius: 24,
              border: "2px solid rgba(212,175,55,0.45)",
              backgroundColor: "rgba(13,12,18,0.85)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt=""
                width={180}
                height={180}
                style={{ width: 180, height: 180, borderRadius: 8 }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  paddingLeft: 4,
                  paddingRight: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    letterSpacing: 6,
                    color: "rgba(245,233,182,0.6)",
                  }}
                >
                  APONTE  A  CÂMERA
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 6,
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#f5e9b6",
                  }}
                >
                  Siga @{row.instagram_handle}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 4,
                    fontSize: 18,
                    color: "rgba(245,233,182,0.5)",
                  }}
                >
                  e vote em mim na gala
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 20,
                letterSpacing: 6,
                color: "rgba(245,233,182,0.55)",
              }}
            >
              VOTE  EM
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                padding: "10px 28px",
                border: "2px solid rgba(212,175,55,0.55)",
                borderRadius: 999,
                fontSize: 22,
                letterSpacing: 4,
                color: "#f5e9b6",
              }}
            >
              {SITE_URL.replace(/^https?:\/\//, "")}/categoria/{row.category_slug}
            </div>
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        headers,
      },
    );
  } catch (e: unknown) {
    return new Response(
      "render error: " + (e instanceof Error ? e.message : String(e)),
      { status: 500 },
    );
  }
}
