"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isValidHandle, normalizeHandle } from "@/lib/handle";

type Category = { slug: string; name: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function CadastroForm({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    | {
        kind: "ok";
        msg: string;
        inserted: number;
        updated: number;
        categories: { categoryName: string; action: "inserted" | "updated" }[];
      }
    | { kind: "err"; msg: string }
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cleanHandle = normalizeHandle(handle);
  const handleValid = cleanHandle.length > 0 && isValidHandle(cleanHandle);
  const nameValid = name.trim().length >= 2;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return categories;
    return categories.filter((c) => normalize(c.name).includes(q));
  }, [query, categories]);

  const selectedList = useMemo(
    () =>
      categories
        .filter((c) => selected.has(c.slug))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [categories, selected],
  );

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  function pickFile(f: File | null) {
    if (!f) return setFile(null);
    if (!ALLOWED.includes(f.type)) {
      setFeedback({ kind: "err", msg: "Formato não suportado. Envie JPG, PNG ou WEBP." });
      return;
    }
    if (f.size > MAX_BYTES) {
      setFeedback({ kind: "err", msg: "Imagem maior que 5 MB." });
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameValid) {
      setFeedback({ kind: "err", msg: "Informe um nome (mín. 2 caracteres)." });
      return;
    }
    if (!handleValid) {
      setFeedback({ kind: "err", msg: "@ inválido." });
      return;
    }
    if (selected.size === 0) {
      setFeedback({ kind: "err", msg: "Escolha pelo menos uma categoria." });
      return;
    }
    if (!consent) {
      setFeedback({
        kind: "err",
        msg: "Marque o consentimento para concluir a inscrição.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("handle", cleanHandle);
      fd.set("categories", JSON.stringify(Array.from(selected)));
      fd.set("consent", "true");
      if (file) fd.set("file", file);

      const res = await fetch("/api/cadastro", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback({ kind: "err", msg: data?.message || "Falha no cadastro." });
      } else {
        const parts = [];
        if (data.inserted) parts.push(`${data.inserted} inscrição(ões)`);
        if (data.updated) parts.push(`${data.updated} atualização(ões)`);
        setFeedback({
          kind: "ok",
          msg: `${data.name} (@${data.handle}) — ${parts.join(" e ")}. Em fila de moderação.`,
          inserted: data.inserted,
          updated: data.updated,
          categories: data.categories || [],
        });
        // reset parcial: mantém nome/@ pra cadastros em lote, limpa categorias e arquivo
        setSelected(new Set());
        setFile(null);
        setConsent(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setFeedback({ kind: "err", msg: "Erro de rede." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Coluna esquerda: dados pessoais + foto */}
      <div className="glass space-y-6 rounded-3xl p-7">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            Nome do concorrente
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como deve aparecer no pódio"
            maxLength={80}
            className="input-luxe mt-2 font-display text-lg"
            required
          />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            @ do Instagram
          </span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg text-gold-300/80">
              @
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="seu.handle"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="input-luxe pl-9 font-display text-lg tracking-wider"
              required
            />
          </div>
          {handle && !handleValid && (
            <span className="mt-1 block text-xs text-red-300/90">
              Use a–z, 0–9, ponto ou underline (até 30).
            </span>
          )}
        </label>

        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            Foto (opcional)
          </span>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex cursor-pointer items-center gap-5 rounded-2xl border border-dashed border-gold-400/30 bg-ink-900/40 px-5 py-5 transition hover:border-gold-300/60 hover:bg-ink-900/70"
          >
            {preview ? (
              <img
                src={preview}
                alt="prévia"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gold-400/60"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full border border-gold-400/30 bg-ink-900 font-display text-xl text-gold-300/70">
                +
              </div>
            )}
            <div>
              <div className="font-display text-base text-gold-50/85">
                {file ? file.name : "Clique ou arraste a foto"}
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold-50/40">
                JPG · PNG · WEBP · até 5 MB
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="mt-2 text-xs text-gold-50/50 hover:text-gold-200"
            >
              remover foto
            </button>
          )}
        </div>

      </div>

      {/* Coluna direita: categorias */}
      <div className="glass flex flex-col rounded-3xl p-7">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            Categorias
          </span>
          <span className="font-display text-sm text-gold-200">
            {selected.size} selecionada{selected.size === 1 ? "" : "s"}
          </span>
        </div>

        {/* Chips selecionados */}
        {selectedList.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5 rounded-2xl border border-gold-400/20 bg-ink-900/40 p-3">
            {selectedList.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggle(c.slug)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs text-gold-100 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200"
              >
                {c.name}
                <span className="text-gold-300/70 group-hover:text-red-300">✕</span>
              </button>
            ))}
            {selectedList.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 text-[11px] uppercase tracking-[0.2em] text-gold-50/40 hover:text-gold-200"
              >
                limpar tudo
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-gold-400/15 bg-ink-900/30 p-3 text-xs text-gold-50/45">
            Nenhuma categoria escolhida ainda. Marque pelo menos uma abaixo.
          </p>
        )}

        {/* Busca */}
        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold-50/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M20 20l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoria..."
            className="input-luxe pl-11 text-sm"
          />
        </div>

        {/* Lista filtrada */}
        <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-2xl border border-gold-400/15 bg-ink-900/40">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gold-50/40">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            <ul className="divide-y divide-gold-400/10">
              {filtered.map((c) => {
                const on = selected.has(c.slug);
                return (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => toggle(c.slug)}
                      aria-pressed={on}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                        on
                          ? "bg-gold-400/10 text-gold-100"
                          : "text-gold-50/80 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full border text-[11px] ${
                          on
                            ? "border-gold-300 bg-gold-shine text-ink-950"
                            : "border-gold-400/30 text-gold-50/30"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Feedback + ação */}
      <div className="lg:col-span-2">
        {feedback && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm ${
              feedback.kind === "ok"
                ? "border-gold-400/40 bg-gold-400/10 text-gold-100"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            <div className="font-display text-base">{feedback.msg}</div>
            {feedback.kind === "ok" && feedback.categories.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {feedback.categories.map((c) => (
                  <li
                    key={c.categoryName}
                    className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-ink-950/40 px-3 py-1 text-[11px]"
                  >
                    <span
                      className={
                        c.action === "inserted"
                          ? "text-gold-shine"
                          : "text-gold-50/70"
                      }
                    >
                      {c.action === "inserted" ? "novo" : "atualizado"}
                    </span>
                    <span className="text-gold-100/85">{c.categoryName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-gold-400/20 bg-ink-900/40 p-3 text-xs text-gold-50/75">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#d4af37]"
          />
          <span>
            Li e aceito a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noreferrer"
              className="text-gold-200 underline"
            >
              política de privacidade
            </a>
            . Confirmo que tenho autorização para usar este nome, @ e foto, e que o
            cadastro entra em fila de moderação até que a organização aprove.
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-50/40">
            Cadastro fica em moderação até a organização aprovar
          </p>
          <button
            type="submit"
            disabled={
              submitting ||
              !nameValid ||
              !handleValid ||
              selected.size === 0 ||
              !consent ||
              false
            }
            className="btn-gold"
          >
            {submitting ? "Enviando..." : "Confirmar inscrição"}
          </button>
        </div>
      </div>
    </form>
  );
}
