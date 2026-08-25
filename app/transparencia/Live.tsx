"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Snapshot = {
  totalVotes: number;
  leafCount: number;
  root: string | null;
  algorithm: string;
  computedAt: string;
  total_categories: number;
  audited_categories: number;
  total_nominees: number;
  nominees_with_votes: number;
  unique_voters: number;
  lastVoteAt: string | null;
  topAudited: { name: string; slug: string; votes: number }[];
};

function formatRoot(root: string | null) {
  if (!root) return "—";
  return root.match(/.{1,8}/g)?.join(" ") ?? root;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function TransparencyLive({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState<Snapshot>(initial);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/transparency", { cache: "no-store" });
      if (!res.ok) return;
      const next: Snapshot = await res.json();
      setData((prev) => {
        if (prev.root !== next.root) {
          setPulse(true);
          setTimeout(() => setPulse(false), 900);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);

  async function copyRoot() {
    if (!data.root) return;
    try {
      await navigator.clipboard.writeText(data.root);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  const stats: { label: string; value: number | string; hint?: string }[] = [
    { label: "Votos totais", value: data.totalVotes },
    { label: "CPFs únicos", value: data.unique_voters },
    {
      label: "Categorias auditadas",
      value: `${data.audited_categories} / ${data.total_categories}`,
      hint: "Que receberam ao menos 1 voto",
    },
    {
      label: "Indicados premiáveis",
      value: `${data.nominees_with_votes} / ${data.total_nominees}`,
      hint: "Já com pelo menos 1 voto",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
            Apuração auditável
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">
            <span className="text-gold-shine">Transparência</span> da gala
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gold-50/65">
            Cada voto é selado num Merkle root público. Qualquer pessoa pode exportar a
            tabela <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">votes</code>{" "}
            e reproduzir o mesmo hash no próprio computador. Sem CPF aparente: o que entra
            no hash já é o HMAC server-side.
          </p>
        </div>

        <button onClick={refresh} disabled={loading} className="btn-ghost">
          {loading ? "Atualizando..." : "Atualizar agora"}
        </button>
      </div>

      <div className="gold-divider mt-8" />

      {/* Merkle root destaque */}
      <section
        className={`glass relative mt-10 overflow-hidden rounded-3xl p-8 ${
          pulse ? "ring-2 ring-gold-300/70" : ""
        }`}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.4em] text-gold-300/70">
              Merkle root · SHA-256
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              Selo da apuração
            </h2>
          </div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold-50/40">
            calculado às {formatTime(data.computedAt)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <code className="block flex-1 break-all rounded-2xl border border-gold-400/25 bg-ink-950/70 p-5 font-mono text-sm leading-relaxed text-gold-100">
            {data.root ? formatRoot(data.root) : "(sem votos ainda)"}
          </code>
          {data.root && (
            <button
              type="button"
              onClick={copyRoot}
              className={copied ? "btn-gold" : "btn-ghost"}
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gold-50/45">
          Algoritmo: {data.algorithm}.
        </p>
      </section>

      {/* Estatísticas */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass rounded-2xl p-5"
            title={s.hint}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-50/45">
              {s.label}
            </div>
            <div className="mt-1 font-display text-3xl text-gold-shine">
              {s.value}
            </div>
            {s.hint && (
              <div className="mt-1 text-[11px] text-gold-50/40">{s.hint}</div>
            )}
          </div>
        ))}
      </section>

      <p className="mt-2 text-xs text-gold-50/45">
        Último voto registrado: {formatTime(data.lastVoteAt)}
      </p>

      {/* Top categorias auditadas */}
      {data.topAudited.length > 0 && (
        <section className="mt-12">
          <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
            Disputas mais aquecidas
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">
            <span className="text-gold-shine">Top 8</span> em volume de votos
          </h2>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {data.topAudited.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="glass glass-hover flex items-center gap-4 rounded-2xl px-5 py-4"
                >
                  <span className="font-display text-2xl text-gold-50/40">
                    {i + 1}º
                  </span>
                  <span className="flex-1 font-display text-base text-gold-50">
                    {c.name}
                  </span>
                  <span className="rounded-full border border-gold-400/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold-100">
                    {c.votes} votos
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Como auditar */}
      <section className="glass mt-14 rounded-3xl p-8">
        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-gold-300/70">
          Manual do auditor
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">
          Como reproduzir o Merkle root no seu computador
        </h2>

        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-gold-50/75">
          <li>
            Exporte todos os votos em ordem ascendente de <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">id</code>:
            campos <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">id, category_id, nominee_id, cpf_hash, created_at</code>.
          </li>
          <li>
            Para cada voto, monte a string canônica{" "}
            <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">
              id|category_id|nominee_id|cpf_hash|created_at_ISO
            </code>{" "}
            e calcule SHA-256.
          </li>
          <li>
            Concatene pares de hashes adjacentes; em níveis com quantidade ímpar, duplique
            o último. Calcule SHA-256 da concatenação. Repita até sobrar um hash.
          </li>
          <li>
            Compare com o root acima. Bate → todos os votos exibidos foram contabilizados
            sem alteração desde o snapshot.
          </li>
        </ol>

        <p className="mt-5 text-xs text-gold-50/40">
          O <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">cpf_hash</code> exposto não permite descobrir o
          CPF original — é HMAC-SHA256 com pepper server-side.
        </p>
      </section>
    </div>
  );
}
