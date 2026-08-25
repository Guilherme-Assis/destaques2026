import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ALLOWED_MIME, extForMime, uploadAvatar } from "@/lib/storage";
import { isValidHandle, normalizeHandle } from "@/lib/handle";
import { verifyChallenge } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit-log";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const NAME_MAX = 80;

// `File` global só existe a partir do Node 20. Em Node 18 o formData() do Next
// devolve um objeto File-like (undici) — fazemos duck-typing pra evitar
// ReferenceError.
type UploadedFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};
function isUploadedFile(x: unknown): x is UploadedFile {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as UploadedFile).arrayBuffer === "function" &&
    typeof (x as UploadedFile).size === "number" &&
    typeof (x as UploadedFile).type === "string"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // Rate limit: cadastro público é alvo fácil de enumeração / spam.
  const rlMin = await rateLimit(`cadastro:ip:${ip}:5m`, 5, 5 * 60_000);
  if (!rlMin.allowed) {
    return NextResponse.json(
      { error: "rate", message: "Muitas inscrições recentes. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rlMin.retryAfterSec) } },
    );
  }
  const rlHour = await rateLimit(`cadastro:ip:${ip}:1h`, 20, 60 * 60_000);
  if (!rlHour.allowed) {
    return NextResponse.json(
      { error: "rate", message: "Limite por hora excedido." },
      { status: 429, headers: { "Retry-After": String(rlHour.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "form", message: "Formulário inválido" },
      { status: 400 },
    );
  }

  // captcha (Turnstile com fallback matemático)
  const captchaToken = String(form.get("captchaToken") || "");
  const captchaAnswer = String(form.get("captchaAnswer") || "");
  const challenge = await verifyChallenge({
    token: captchaToken,
    answer: captchaAnswer,
    ip,
  });
  if (!challenge.ok) {
    return NextResponse.json(
      { error: "captcha", message: "Captcha inválido. Tente novamente." },
      { status: 400 },
    );
  }

  // LGPD: consentimento explícito
  if (String(form.get("consent")) !== "true") {
    return NextResponse.json(
      { error: "consent", message: "É necessário aceitar a política de privacidade." },
      { status: 400 },
    );
  }

  // nome
  const name = String(form.get("name") || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > NAME_MAX) {
    return NextResponse.json(
      { error: "name", message: `Nome precisa ter entre 2 e ${NAME_MAX} caracteres.` },
      { status: 400 },
    );
  }

  // handle
  const handle = normalizeHandle(String(form.get("handle") || ""));
  if (!isValidHandle(handle)) {
    return NextResponse.json(
      { error: "handle", message: "@ inválido. Use a–z, 0–9, ponto ou underline (até 30)." },
      { status: 400 },
    );
  }

  // Rate limit por handle (cobre IPs descartáveis tentando flood do mesmo @)
  const rlHandle = await rateLimit(`cadastro:handle:${handle}:1h`, 5, 60 * 60_000);
  if (!rlHandle.allowed) {
    await recordAudit({ action: "cadastro_rate_limited", req, meta: { by: "handle" } });
    return NextResponse.json(
      { error: "rate", message: "Esse @ recebeu muitas atualizações. Aguarde uma hora." },
      { status: 429, headers: { "Retry-After": String(rlHandle.retryAfterSec) } },
    );
  }

  // categorias
  let slugs: string[];
  try {
    const raw = form.get("categories");
    slugs = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(slugs)) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "categories", message: "Categorias inválidas." },
      { status: 400 },
    );
  }
  slugs = Array.from(new Set(slugs.map((s) => String(s).trim()).filter(Boolean)));
  if (slugs.length === 0) {
    return NextResponse.json(
      { error: "categories", message: "Escolha ao menos uma categoria." },
      { status: 400 },
    );
  }

  // resolve slugs -> ids
  const found = (await sql<{ id: number; slug: string; name: string }[]>`
    SELECT id, slug, name FROM categories WHERE slug = ANY(${slugs})
  `) as unknown as { id: number; slug: string; name: string }[];
  const foundSlugs = new Set(found.map((c) => c.slug));
  const unknown = slugs.filter((s) => !foundSlugs.has(s));
  if (unknown.length > 0) {
    return NextResponse.json(
      {
        error: "categories",
        message: `Categoria desconhecida: ${unknown.slice(0, 3).join(", ")}`,
      },
      { status: 400 },
    );
  }

  // arquivo opcional → Supabase Storage
  let newAvatarUrl: string | null = null;
  const file = form.get("file");
  if (isUploadedFile(file) && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "size", message: "Imagem maior que 5 MB." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: "mime", message: "Formato não suportado. Envie JPG, PNG ou WEBP." },
        { status: 400 },
      );
    }
    const ext = extForMime(file.type)!;
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      newAvatarUrl = await uploadAvatar(handle, ext, buf, file.type);
    } catch (e: any) {
      return NextResponse.json(
        { error: "storage", message: e?.message || "Falha no upload da foto." },
        { status: 500 },
      );
    }
  }

  // pega avatar pré-existente para reaproveitar em novas linhas se não houver upload novo
  const [prev] = (await sql<{ avatar_url: string }[]>`
    SELECT avatar_url FROM nominees
    WHERE LOWER(instagram_handle) = ${handle} AND avatar_url IS NOT NULL
    LIMIT 1
  `) as unknown as { avatar_url: string }[];
  const prevAvatar = prev?.avatar_url ?? null;
  const avatarForNew = newAvatarUrl ?? prevAvatar;

  let inserted = 0;
  let updated = 0;
  const summary: { categoryName: string; action: "inserted" | "updated" }[] = [];

  await sql.begin(async (tx) => {
    for (const cat of found) {
      const existing = (await tx<{ id: number }[]>`
        SELECT id FROM nominees
        WHERE category_id = ${cat.id} AND LOWER(instagram_handle) = ${handle}
      `) as unknown as { id: number }[];
      if (existing.length > 0) {
        await tx`UPDATE nominees SET display_name = ${name}, is_placeholder = false WHERE id = ${existing[0].id}`;
        updated++;
        summary.push({ categoryName: cat.name, action: "updated" });
      } else {
        await tx`
          INSERT INTO nominees (category_id, instagram_handle, display_name, avatar_url, is_placeholder)
          VALUES (${cat.id}, ${handle}, ${name}, ${avatarForNew}, false)
        `;
        inserted++;
        summary.push({ categoryName: cat.name, action: "inserted" });
      }
    }
    if (newAvatarUrl) {
      await tx`
        UPDATE nominees SET avatar_url = ${newAvatarUrl}
        WHERE LOWER(instagram_handle) = ${handle}
      `;
    }
  });

  await recordAudit({
    action: "cadastro_recorded",
    req,
    meta: { handle, inserted, updated, withPhoto: !!newAvatarUrl },
  });

  return NextResponse.json({
    ok: true,
    handle,
    name,
    inserted,
    updated,
    avatarUrl: newAvatarUrl ?? prevAvatar,
    categories: summary,
    pendingApproval: true,
  });
}
