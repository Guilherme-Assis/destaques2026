import Link from "next/link";
import { sql } from "@/lib/db";
import CategoriesGrid from "./CategoriesGrid";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  nominees_count: number;
  real_count: number;
  votes_count: number;
};

export default async function HomePage() {
  const cats = (await sql<Row[]>`
    SELECT c.id, c.slug, c.name, c.description,
      (SELECT COUNT(*) FROM nominees n WHERE n.category_id = c.id)::int AS nominees_count,
      (SELECT COUNT(*) FROM nominees n
        WHERE n.category_id = c.id
          AND n.approved = true
          AND n.is_placeholder = false)::int AS real_count,
      (SELECT COUNT(*) FROM votes    v WHERE v.category_id = c.id)::int AS votes_count
    FROM categories c
    ORDER BY c.id
  `) as unknown as Row[];

  const totalNominees = cats.reduce((a, c) => a + c.real_count, 0);
  const totalVotes = cats.reduce((a, c) => a + c.votes_count, 0);

  return (
    <div>
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-gold-400/15 px-8 py-20 text-center sm:px-14">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl animate-glow" />

        <p className="mb-4 font-display text-[11px] uppercase tracking-[0.6em] text-gold-300/80">
          · Gala 2026 ·
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          A noite em que Itumbiara
          <br />
          <span className="text-gold-shine">destaca seus melhores</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-gold-50/70">
          Centenas de categorias. Um único voto seu por categoria. Vista o smoking,
          levante a taça e escolha quem leva o troféu.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <a href="#categorias" className="btn-gold">
            Começar a votar
          </a>
          <Link href="/admin/login" className="btn-ghost">
            Acompanhar resultados
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 text-left">
          {[
            { label: "Categorias", value: cats.length },
            { label: "Concorrentes", value: totalNominees },
            { label: "Votos", value: totalVotes },
          ].map((s) => (
            <div key={s.label} className="border-l border-gold-400/30 pl-4">
              <div className="font-display text-3xl text-gold-shine">{s.value}</div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-gold-50/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CategoriesGrid categories={cats} />
    </div>
  );
}
