"use client";

import { useEffect, useState } from "react";

type Entry = {
  nominee_id: number;
  display_name: string;
  instagram_handle: string;
  avatar_url: string | null;
  votes: number;
};

type Payload = {
  total: number;
  top: Entry[];
  generatedAt: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const TIERS = [
  {
    label: "1º · OURO",
    medal: "🥇",
    height: "h-56",
    ring: "from-[#fff5c2] via-[#d4af37] to-[#8a6612]",
    accent: "text-gold-shine",
    glow: "bg-[#d4af37]/40",
    crown: true,
  },
  {
    label: "2º · PRATA",
    medal: "🥈",
    height: "h-44",
    ring: "from-[#f4f4f5] via-[#c0c0c8] to-[#6b6b73]",
    accent: "text-[#e7e7ec]",
    glow: "bg-[#c0c0c8]/30",
    crown: false,
  },
  {
    label: "3º · BRONZE",
    medal: "🥉",
    height: "h-36",
    ring: "from-[#f5c08a] via-[#a0673a] to-[#4f2f17]",
    accent: "text-[#e8b687]",
    glow: "bg-[#a0673a]/30",
    crown: false,
  },
];

// Visual order: 2nd · 1st · 3rd
const PODIUM_VISUAL_ORDER = [1, 0, 2];

export default function Podium({
  slug,
  initial,
}: {
  slug: string;
  initial: Payload;
}) {
  const [data, setData] = useState<Payload>(initial);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/category/${slug}/top`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Payload;
        if (alive) setData(next);
      } catch {
        /* ignore */
      }
    }
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [slug]);

  const top3 = [data.top[0], data.top[1], data.top[2]];
  const rest = data.top.slice(3, 5);
  const hasAnyVote = data.total > 0 && data.top.some((e) => e?.votes > 0);

  return (
    <section className="mt-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
            O Pódio
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-tight">
            <span className="text-gold-shine">Top 5</span> da categoria
          </h2>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.25em] text-gold-50/40 sm:inline">
          Atualiza a cada 5s
        </span>
      </div>

      {!hasAnyVote ? (
        <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.18),transparent_60%)]" />
          <div className="relative">
            <div className="font-display text-6xl">🏆</div>
            <h3 className="mt-4 font-display text-2xl text-gold-shine">
              O pódio aguarda
            </h3>
            <p className="mt-2 text-sm text-gold-50/60">
              Ainda não há votos nesta categoria. Seja o primeiro a coroar um indicado.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),transparent_65%)]" />

            {/* Mobile: stacked. Desktop: real podium */}
            <div className="grid items-end gap-4 md:grid-cols-3">
              {PODIUM_VISUAL_ORDER.map((rank) => {
                const entry = top3[rank];
                const tier = TIERS[rank];
                if (!entry) {
                  return (
                    <div
                      key={`empty-${rank}`}
                      className={`hidden rounded-3xl border border-dashed border-gold-400/15 ${tier.height} md:block`}
                    />
                  );
                }
                const pct = data.total > 0 ? (entry.votes / data.total) * 100 : 0;
                return (
                  <PodiumCard
                    key={entry.nominee_id}
                    rank={rank}
                    tier={tier}
                    entry={entry}
                    pct={pct}
                  />
                );
              })}
            </div>

            {/* Base do pódio (bloco decorativo) */}
            <div className="mt-1 hidden md:grid md:grid-cols-3">
              <div className="h-3 rounded-bl-2xl bg-gradient-to-b from-[#c0c0c8]/30 to-transparent" />
              <div className="h-3 bg-gradient-to-b from-[#d4af37]/40 to-transparent" />
              <div className="h-3 rounded-br-2xl bg-gradient-to-b from-[#a0673a]/30 to-transparent" />
            </div>
          </div>

          {/* 4º e 5º */}
          {rest.length > 0 && (
            <div className="mt-10">
              <div className="gold-divider mb-6" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {rest.map((entry, i) => {
                  const rank = i + 4;
                  const pct = data.total > 0 ? (entry.votes / data.total) * 100 : 0;
                  return (
                    <li
                      key={entry.nominee_id}
                      className="glass flex items-center gap-4 rounded-2xl px-5 py-4"
                    >
                      <span className="font-display text-2xl text-gold-50/40">
                        {rank}º
                      </span>
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.display_name}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-gold-400/40"
                        />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-full border border-gold-400/30 bg-ink-900 font-display text-sm text-gold-200">
                          {initials(entry.display_name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-base text-gold-50">
                          {entry.display_name}
                        </div>
                        <div className="truncate text-xs text-gold-50/50">
                          @{entry.instagram_handle}
                        </div>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <div className="font-display text-base text-gold-100">
                          {entry.votes}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-gold-50/40">
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PodiumCard({
  rank,
  tier,
  entry,
  pct,
}: {
  rank: number;
  tier: (typeof TIERS)[number];
  entry: Entry;
  pct: number;
}) {
  return (
    <div className="relative flex flex-col items-center">
      {tier.crown && (
        <div className="mb-2 animate-floaty text-3xl drop-shadow-[0_0_18px_rgba(212,175,55,0.6)]">
          👑
        </div>
      )}

      {/* Avatar com aro do metal */}
      <div className="relative">
        <div
          className={`absolute inset-0 -m-1 rounded-full bg-gradient-to-br ${tier.ring} blur-[2px] opacity-90`}
        />
        <div
          className={`pointer-events-none absolute -inset-6 rounded-full ${tier.glow} blur-2xl`}
        />
        <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-ink-900 font-display text-2xl">
          {entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt={entry.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className={tier.accent}>{initials(entry.display_name)}</span>
          )}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-gold-400/40 bg-ink-950 px-3 py-0.5 text-sm">
          {tier.medal}
        </div>
      </div>

      {/* Nome */}
      <div className="mt-6 px-2 text-center">
        <div className={`font-display text-xl leading-tight ${tier.accent}`}>
          {entry.display_name}
        </div>
        <div className="mt-1 text-xs text-gold-50/50">@{entry.instagram_handle}</div>
      </div>

      {/* Bloco do pódio */}
      <div
        className={`relative mt-5 w-full ${tier.height} overflow-hidden rounded-t-3xl border border-gold-400/20`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-b ${tier.ring} opacity-25`}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-200/60 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_100%)]" />

        <div className="relative flex h-full flex-col items-center justify-end p-5 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.4em] text-gold-50/70">
            {tier.label}
          </p>
          <div className={`mt-1 font-display text-5xl ${tier.accent}`}>
            {entry.votes}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            {pct.toFixed(1)}% dos votos
          </div>
        </div>

        {/* Número grande de fundo */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="font-display text-[8rem] font-bold leading-none text-white/[0.04]">
            {rank + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
