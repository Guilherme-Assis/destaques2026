"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user,
        password,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message || "Credenciais inválidas.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
        Acesso restrito
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">
        <span className="text-gold-shine">Camarote</span> da gala
      </h1>
      <p className="mt-2 text-sm text-gold-50/60">
        Apenas a organização tem chave para o painel de resultados.
      </p>

      <form
        onSubmit={submit}
        className="glass mt-8 space-y-4 rounded-3xl p-8 shadow-gold"
      >
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            Usuário
          </span>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="input-luxe mt-2 font-display text-lg"
            required
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.25em] text-gold-50/60">
            Senha
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-luxe mt-2 font-display text-lg"
            required
            autoComplete="current-password"
          />
        </label>

        {err && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full"
        >
          {loading ? "Abrindo as portas..." : "Entrar no camarote"}
        </button>
      </form>
    </div>
  );
}
