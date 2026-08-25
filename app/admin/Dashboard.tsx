"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Result = {
  generatedAt: string;
  grandTotal: number;
  categories: {
    id: number;
    slug: string;
    name: string;
    total: number;
    nominees: {
      nominee_id: number;
      display_name: string;
      instagram_handle: string;
      votes: number;
    }[];
  }[];
};

function medal(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return null;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/results", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        setErr("Falha ao carregar resultados.");
        return;
      }
      const next: Result = await res.json();
      setData((prev) => {
        if (prev && prev.grandTotal !== next.grandTotal) {
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
        }
        return next;
      });
      setErr(null);
    } catch {
      setErr("Erro de rede.");
    }
  }

  useEffect(() => {
    load();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(load, 350);
    };

    // Realtime via Supabase: cada INSERT em `votes` dispara um delta;
    // a gente debounca e re-busca o agregado (mais simples + evita drift).
    // Vercel Hobby tem timeout de 10s, então só ligamos SSE quando o operador
    // habilitar explicitamente (Fly/Railway/Render): NEXT_PUBLIC_REALTIME=true.
    const realtime = process.env.NEXT_PUBLIC_REALTIME === "true";
    let es: EventSource | null = null;
    if (realtime) {
      try {
        es = new EventSource("/api/admin/stream");
        es.addEventListener("vote", scheduleReload);
        es.addEventListener("error", () => {
          // EventSource reconecta sozinho; só pulsa pra sinalizar.
        });
      } catch {
        es = null;
      }
    }

    // Fallback / modo padrão Vercel: poll. 5s quando há realtime ligado
    // (segurança contra drift), 15s quando é o único canal.
    const fallback = setInterval(load, realtime ? 30_000 : 15_000);

    return () => {
      if (debounce) clearTimeout(debounce);
      if (es) es.close();
      clearInterval(fallback);
    };
  }, []);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
            Camarote · Tempo real
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">
            <span className="text-gold-shine">Apuração</span> da gala
          </h1>
          <p className="mt-3 flex items-center gap-3 text-sm text-gold-50/60">
            <span
              className={`inline-block h-2 w-2 rounded-full bg-gold-300 ${
                pulse ? "animate-ping" : "animate-glow"
              }`}
            />
            Atualizando a cada 3 segundos
            {data && (
              <span className="text-gold-50/40">
                · último update {new Date(data.generatedAt).toLocaleTimeString("pt-BR")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-gold-400/25 bg-ink-900/60 px-6 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-50/50">
              Total de votos
            </div>
            <div className="font-display text-3xl text-gold-shine">
              {data?.grandTotal ?? "—"}
            </div>
          </div>
          <Link href="/admin/aprovacoes" className="btn-ghost">
            Aprovar inscrições
          </Link>
          <Link href="/cadastro" className="btn-ghost">
            Cadastrar concorrente
          </Link>
          <button onClick={logout} className="btn-ghost">
            Sair
          </button>
        </div>
      </header>

      <div className="gold-divider mt-8" />

      {err && (
        <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {data?.categories.map((c) => {
          const max = Math.max(1, ...c.nominees.map((n) => n.votes));
          return (
            <section
              key={c.id}
              className="glass relative overflow-hidden rounded-3xl p-7"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gold-400/10 blur-3xl" />

              <header className="mb-5 flex items-baseline justify-between">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.4em] text-gold-300/70">
                    Categoria
                  </p>
                  <h2 className="mt-1 font-display text-2xl tracking-tight text-gold-50">
                    {c.name}
                  </h2>
                </div>
                <span className="rounded-full border border-gold-400/25 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold-50/60">
                  {c.total} votos
                </span>
              </header>

              <ul className="space-y-4">
                {c.nominees.map((n, i) => {
                  const pct = c.total > 0 ? (n.votes / c.total) * 100 : 0;
                  const w = (n.votes / max) * 100;
                  const leader = i === 0 && n.votes > 0;
                  return (
                    <li key={n.nominee_id}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0 flex-1">
                          <span
                            className={`mr-2 inline-block w-5 text-center ${
                              leader ? "" : "text-gold-50/30"
                            }`}
                          >
                            {medal(i) ?? `${i + 1}.`}
                          </span>
                          <span
                            className={
                              leader
                                ? "font-display text-base text-gold-shine"
                                : "text-gold-50/85"
                            }
                          >
                            {n.display_name}
                          </span>
                          <span className="ml-2 text-xs text-gold-50/40">
                            @{n.instagram_handle}
                          </span>
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <div className="font-display text-base text-gold-100">
                            {n.votes}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-gold-50/40">
                            {pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700/60">
                        <div
                          className={`h-1.5 rounded-full transition-[width] duration-700 ${
                            leader ? "bar-fill" : "bg-gold-400/40"
                          }`}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
