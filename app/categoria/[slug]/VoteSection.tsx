"use client";

import { useMemo, useState } from "react";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf-validate";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type Nominee = { id: number; handle: string; name: string; avatar?: string | null };

function formatCpf(raw: string): string {
  const v = sanitizeCpf(raw).slice(0, 11);
  const p1 = v.slice(0, 3);
  const p2 = v.slice(3, 6);
  const p3 = v.slice(6, 9);
  const p4 = v.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function VoteSection({
  categoryId,
  categoryName,
  categorySlug,
  votingStatus = "open",
  windowLabel,
  nominees,
}: {
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  votingStatus?: "before" | "open" | "ended";
  windowLabel?: string;
  nominees: Nominee[];
}) {
  const votingOpen = votingStatus === "open";
  const [selected, setSelected] = useState<Nominee | null>(null);
  const [cpf, setCpf] = useState("");
  const [consent, setConsent] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; msg: string; nomineeId: number; nomineeName: string }
    | { kind: "err"; msg: string }
    | null
  >(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim().replace(/^@/, ""));
    if (!q) return nominees;
    return nominees.filter(
      (n) => normalize(n.name).includes(q) || normalize(n.handle).includes(q),
    );
  }, [query, nominees]);

  const cpfClean = sanitizeCpf(cpf);
  const cpfFilled = cpfClean.length === 11;
  const cpfValid = cpfFilled && isValidCpf(cpfClean);
  const cpfErr = cpfFilled && !cpfValid;

  function openVote(n: Nominee) {
    setSelected(n);
    setCpf("");
    setConsent(false);
    setFeedback(null);
  }

  function close() {
    setSelected(null);
    setFeedback(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!cpfValid) {
      setFeedback({ kind: "err", msg: "CPF inválido. Verifique o número." });
      return;
    }
    if (!consent) {
      setFeedback({
        kind: "err",
        msg: "Marque o consentimento para registrar seu voto.",
      });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          nomineeId: selected.id,
          cpf: cpfClean,
          consent: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({
          kind: "ok",
          msg: `Voto coroado para ${selected.name} em "${categoryName}".`,
          nomineeId: selected.id,
          nomineeName: selected.name,
        });
        setCpf("");
      } else if (res.status === 409) {
        setFeedback({
          kind: "err",
          msg: "Esse CPF já votou nesta categoria. Cada CPF só pode votar uma vez por categoria.",
        });
      } else if (res.status === 400 && data?.error === "cpf") {
        setFeedback({ kind: "err", msg: "CPF inválido." });
      } else {
        setFeedback({ kind: "err", msg: data?.message || "Não foi possível registrar o voto." });
      }
    } catch {
      setFeedback({ kind: "err", msg: "Erro de rede. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-gold-50/90">
            Os indicados
          </h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gold-50/40">
            {nominees.length === 0
              ? "Aguardando inscrições aprovadas"
              : query.trim()
                ? `${filtered.length} de ${nominees.length} encontrados`
                : `Toque em votar no seu favorito`}
          </p>
        </div>

        {nominees.length > 0 && (
          <div className="relative w-full sm:w-80">
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
              placeholder="Buscar por nome ou @instagram"
              aria-label="Buscar indicados por nome ou @instagram"
              className="input-luxe pl-11 pr-10 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="limpar busca"
                className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-gold-400/20 text-xs text-gold-50/60 transition hover:border-gold-300 hover:text-gold-100"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {nominees.length === 0 ? (
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.18),transparent_60%)]" />
          <div className="relative">
            <div className="font-display text-5xl">🪞</div>
            <h3 className="mt-4 font-display text-2xl text-gold-shine">
              Aguardando inscrições
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gold-50/65">
              Esta categoria ainda não tem concorrentes aprovados. Quer disputar o troféu?
              Inscreva-se com seu @ e foto.
            </p>
            <a href="/cadastro" className="btn-gold mt-6 inline-flex">
              Inscrever-se
            </a>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-14 text-center">
          <div className="font-display text-4xl">🔍</div>
          <h3 className="mt-3 font-display text-xl text-gold-shine">Nenhum indicado encontrado</h3>
          <p className="mt-2 text-sm text-gold-50/60">
            Não há ninguém com{" "}
            <span className="text-gold-200">"{query}"</span> nesta categoria. Tente outro termo.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="btn-ghost mt-5"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {filtered.map((n) => (
          <li
            key={n.id}
            className="glass glass-hover group relative overflow-hidden rounded-2xl p-6"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gold-400/10 blur-3xl transition group-hover:bg-gold-400/25" />
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="absolute inset-0 -m-[2px] rounded-full bg-gold-shine opacity-80 blur-[1px]" />
                {n.avatar ? (
                  <img
                    src={n.avatar}
                    alt={n.name}
                    className="relative h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="relative grid h-16 w-16 place-items-center rounded-full bg-ink-900 font-display text-xl text-gold-shine">
                    {initials(n.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl leading-tight text-gold-50">
                  {n.name}
                </div>
                <a
                  href={`https://instagram.com/${n.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-gold-50/60 transition hover:text-gold-200"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                  @{n.handle}
                </a>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => votingOpen && openVote(n)}
                  disabled={!votingOpen}
                  title={!votingOpen ? windowLabel : undefined}
                  className="btn-gold"
                >
                  {votingOpen
                    ? "Votar"
                    : votingStatus === "ended"
                      ? "Encerrado"
                      : "Em breve"}
                </button>
                <a
                  href={`/api/card/${categorySlug}/${n.id}?download=1`}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-gold-50/55 transition hover:text-gold-200"
                  title="Cartão de visitas 1080×1350 pronto pro feed do Instagram"
                >
                  Cartão IG
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gold-400/30 bg-ink-900/95 p-8 shadow-goldlg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.4),transparent_70%)]" />

            <button
              type="button"
              onClick={close}
              className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full border border-gold-400/20 text-gold-50/60 transition hover:border-gold-300 hover:text-gold-100"
              aria-label="fechar"
            >
              ✕
            </button>

            <p className="font-display text-[10px] uppercase tracking-[0.5em] text-gold-300/80">
              {categoryName}
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight tracking-tight">
              <span className="text-gold-shine">{selected.name}</span>
            </h2>
            <p className="mt-1 text-sm text-gold-50/60">@{selected.handle}</p>

            <div className="gold-divider my-6" />

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
                  CPF
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`input-luxe mt-2 font-display text-lg tracking-wider ${
                    cpfErr ? "border-red-400/60" : ""
                  }`}
                  required
                />
                {cpfErr && (
                  <span className="mt-1 block text-xs text-red-300/90">
                    CPF inválido. Confira os dígitos.
                  </span>
                )}
              </label>

              {feedback && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    feedback.kind === "ok"
                      ? "border-gold-400/40 bg-gold-400/10 text-gold-100"
                      : "border-red-400/30 bg-red-500/10 text-red-200"
                  }`}
                >
                  <div>{feedback.msg}</div>

                  {feedback.kind === "ok" && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <a
                        href={`/api/story/${categorySlug}/${feedback.nomineeId}`}
                        target="_blank"
                        rel="noreferrer"
                        download={`melhores-do-ano-${categorySlug}-${feedback.nomineeId}.png`}
                        className="btn-gold"
                      >
                        Baixar story 📲
                      </a>
                      <a
                        href={`/api/card/${categorySlug}/${feedback.nomineeId}?download=1`}
                        className="btn-ghost"
                        title="Cartão 1080×1350 pro feed do Instagram"
                      >
                        Baixar cartão IG
                      </a>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-gold-50/55">
                        Story 1080×1920 · Cartão 1080×1350
                      </span>
                    </div>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-400/20 bg-ink-900/40 p-3 text-xs text-gold-50/75">
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
                  . Autorizo o uso do hash do meu CPF para garantir voto único por categoria.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="btn-ghost">
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !cpfValid ||
                    !consent ||
                    false
                  }
                  className="btn-gold"
                >
                  {loading ? "Enviando..." : "Confirmar voto"}
                </button>
              </div>

              <p className="pt-2 text-center text-[10px] uppercase tracking-[0.25em] text-gold-50/40">
                Seu CPF é convertido em hash · jamais armazenado em texto
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
