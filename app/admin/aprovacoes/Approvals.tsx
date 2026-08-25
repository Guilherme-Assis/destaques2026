"use client";

import { useEffect, useMemo, useState } from "react";

type Group = {
  handle: string;
  display_name: string;
  avatar_url: string | null;
  approved: boolean;
  categories: { id: number; slug: string; name: string }[];
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Approvals() {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/nominees?status=${tab}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function toggle(handle: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(groups.map((g) => g.handle.toLowerCase())));
  }
  function clearSel() {
    setSelected(new Set());
  }

  async function decide(action: "approve" | "reject") {
    if (selected.size === 0) return;
    if (action === "reject" && !confirm("Rejeitar apaga o cadastro. Confirma?")) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/nominees/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles: Array.from(selected),
          action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || "Falha.");
      } else {
        setMsg(
          action === "approve"
            ? `Aprovadas ${data.affected} inscrição(ões).`
            : `Removidas ${data.affected} inscrição(ões).`,
        );
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  const all = useMemo(
    () => groups.length > 0 && selected.size === groups.length,
    [groups.length, selected.size],
  );

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-gold-400/25 bg-ink-900/60 p-1">
          {(["pending", "approved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                tab === t
                  ? "bg-gold-shine text-ink-950"
                  : "text-gold-50/60 hover:text-gold-100"
              }`}
            >
              {t === "pending" ? "Pendentes" : "Aprovados"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={all ? clearSel : selectAll}
            className="btn-ghost"
            disabled={!groups.length}
          >
            {all ? "Desmarcar" : "Selecionar todos"}
          </button>
          {tab === "pending" && (
            <>
              <button
                onClick={() => decide("reject")}
                disabled={loading || selected.size === 0}
                className="rounded-full border border-red-400/40 bg-red-500/10 px-5 py-2.5 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                Rejeitar ({selected.size})
              </button>
              <button
                onClick={() => decide("approve")}
                disabled={loading || selected.size === 0}
                className="btn-gold"
              >
                Aprovar ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-100">
          {msg}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="glass mt-8 rounded-3xl px-8 py-14 text-center">
          <div className="font-display text-4xl">
            {tab === "pending" ? "🎉" : "📭"}
          </div>
          <h3 className="mt-3 font-display text-xl text-gold-shine">
            {tab === "pending"
              ? "Nenhuma inscrição pendente"
              : "Nenhum inscrito aprovado ainda"}
          </h3>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {groups.map((g) => {
            const k = g.handle.toLowerCase();
            const on = selected.has(k);
            return (
              <li
                key={k}
                className={`glass relative overflow-hidden rounded-2xl p-5 transition ${
                  on ? "ring-2 ring-gold-300/70" : ""
                }`}
              >
                <label className="flex cursor-pointer items-start gap-4">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(k)}
                    className="mt-1 h-5 w-5 accent-[#d4af37]"
                  />
                  {g.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.avatar_url}
                      alt={g.display_name}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-gold-400/40"
                    />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-400/30 bg-ink-900 font-display text-sm text-gold-shine">
                      {initials(g.display_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-lg text-gold-50">
                      {g.display_name}
                    </div>
                    <a
                      href={`https://instagram.com/${g.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gold-50/55 hover:text-gold-200"
                    >
                      @{g.handle}
                    </a>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {g.categories.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-full border border-gold-400/20 bg-white/[0.03] px-3 py-0.5 text-[11px] text-gold-100/80"
                        >
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
