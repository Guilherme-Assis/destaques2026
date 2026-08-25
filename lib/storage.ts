import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes. Defina em .env.local (e nas envs do deploy).",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseAdmin: ReturnType<typeof createClient> | undefined;
}

export const supabaseAdmin =
  globalThis.__supabaseAdmin ??
  createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

if (process.env.NODE_ENV !== "production") globalThis.__supabaseAdmin = supabaseAdmin;

const BUCKET = "avatars";
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_MIME = Object.keys(MIME_EXT);

export function extForMime(mime: string): string | null {
  return MIME_EXT[mime] ?? null;
}

export async function uploadAvatar(
  handle: string,
  ext: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  // remove versões antigas (em qualquer extensão) antes de subir a nova
  await deleteAvatarsForHandle(handle);
  const path = `${handle}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, body, { upsert: true, contentType });
  if (error) throw new Error(`Storage upload falhou: ${error.message}`);
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  // cache-buster pra forçar reload do <img> mesmo com mesma URL pública
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteAvatarsForHandle(handle: string): Promise<void> {
  const variants = Object.values(MIME_EXT).map((ext) => `${handle}.${ext}`);
  // ignora erro: tentamos remover possíveis versões; se nenhuma existir tudo bem
  await supabaseAdmin.storage.from(BUCKET).remove(variants);
}
