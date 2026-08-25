"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  nominees_count: number;
  real_count: number;
  votes_count: number;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function CategoriesGrid({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return categories;
    return categories.filter(
      (c) => normalize(c.name).includes(q) || normalize(c.slug).includes(q),
    );
  }, [query, categories]);

  return (
    <section id="categorias" className="mt-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-gold-300/70">
            As Categorias
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-tight">Escolha sua disputa</h2>
          <p className="mt-1 text-xs text-gold-50/40">
            {query.trim()
              ? `${filtered.length} de ${categories.length} encontradas`
              : `${categories.length} categorias no total`}
          </p>
        </div>

        <div className="relative w-full sm:w-96">
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
            aria-label="Buscar categoria por nome"
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
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-14 text-center">
          <div className="font-display text-4xl">🔍</div>
          <h3 className="mt-3 font-display text-xl text-gold-shine">
            Nenhuma categoria encontrada
          </h3>
          <p className="mt-2 text-sm text-gold-50/60">
            Não há nada com{" "}
            <span className="text-gold-200">"{query}"</span>. Tente outro termo.
          </p>
          <button type="button" onClick={() => setQuery("")} className="btn-ghost mt-5">
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((c, i) => {
            const nominees = c.real_count;
            const votes = c.votes_count;
            const empty = nominees === 0;
            if (empty) {
              return (
                <div
                  key={c.id}
                  className="glass relative overflow-hidden rounded-3xl p-8 opacity-90"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/[0.04] blur-3xl" />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-[10px] uppercase tracking-[0.35em] text-gold-50/45">
                        Categoria {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="mt-2 font-display text-3xl tracking-tight text-gold-50/85">
                        {c.name}
                      </h3>
                    </div>
                    <span className="rounded-full border border-gold-400/25 bg-ink-900/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold-50/55">
                      Aguardando inscrições
                    </span>
                  </div>
                  <p className="mt-4 max-w-md text-sm text-gold-50/55">
                    Ainda não há concorrentes nesta categoria. Seja o primeiro a se
                    inscrever e a disputa começa por aí.
                  </p>
                  <div className="mt-8 flex items-center gap-3">
                    <Link href="/cadastro" className="btn-gold">
                      Inscrever-se
                    </Link>
                    <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/40">
                      Cadastro público em 30s
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="glass glass-hover group relative overflow-hidden rounded-3xl p-8"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl transition group-hover:bg-gold-400/30" />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-[10px] uppercase tracking-[0.35em] text-gold-300/70">
                      Categoria {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-2 font-display text-3xl tracking-tight text-gold-50">
                      {c.name}
                    </h3>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-gold-400/30 text-gold-300 transition group-hover:border-gold-300 group-hover:text-gold-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12h14m0 0l-6-6m6 6l-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
                {c.description && (
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-gold-50/65">
                    {c.description}
                  </p>
                )}
                <div className="mt-8 flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-gold-50/50">
                  <span>
                    <b className="font-display text-base text-gold-200">{nominees}</b>{" "}
                    indicados
                  </span>
                  <span className="h-3 w-px bg-gold-400/30" />
                  <span>
                    <b className="font-display text-base text-gold-200">{votes}</b> votos
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
