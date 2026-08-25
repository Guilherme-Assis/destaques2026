import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql, type Nominee } from "@/lib/db";
import { describeWindow, resolveWindow, statusOf } from "@/lib/votingWindow";
import VoteSection from "./VoteSection";
import Podium from "./Podium";

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  voting_starts_at: Date | null;
  voting_ends_at: Date | null;
};

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const rows = (await sql<{ name: string; description: string | null }[]>`
    SELECT name, description FROM categories WHERE slug = ${params.slug} LIMIT 1
  `) as unknown as { name: string; description: string | null }[];
  const cat = rows[0];
  if (!cat) return {};
  const title = `${cat.name} · Melhores do Ano`;
  const description =
    cat.description ||
    `Vote no melhor em ${cat.name.toLowerCase()} na gala 2026.`;
  const image = `${SITE_URL}/api/og/${params.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/categoria/${params.slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: cat.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

type TopRow = {
  nominee_id: number;
  display_name: string;
  instagram_handle: string;
  avatar_url: string | null;
  votes: number;
};

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [cat] = (await sql<CategoryRow[]>`
    SELECT id, slug, name, description, voting_starts_at, voting_ends_at
    FROM categories WHERE slug = ${params.slug}
  `) as unknown as CategoryRow[];
  if (!cat) notFound();

  const win = resolveWindow({
    startsAt: cat.voting_starts_at ? new Date(cat.voting_starts_at) : null,
    endsAt: cat.voting_ends_at ? new Date(cat.voting_ends_at) : null,
  });
  const windowStatus = statusOf(win);
  const windowLabel = describeWindow(win);

  const nominees = (await sql<Nominee[]>`
    SELECT id, category_id, instagram_handle, display_name, avatar_url
    FROM nominees
    WHERE category_id = ${cat.id}
      AND approved = true
      AND is_placeholder = false
    ORDER BY display_name
  `) as unknown as Nominee[];

  const [{ c: totalVotes }] = (await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM votes WHERE category_id = ${cat.id}
  `) as unknown as { c: number }[];

  const top = (await sql<TopRow[]>`
    SELECT n.id AS nominee_id, n.display_name, n.instagram_handle, n.avatar_url,
           COUNT(v.id)::int AS votes
    FROM nominees n
    LEFT JOIN votes v ON v.nominee_id = n.id
    WHERE n.category_id = ${cat.id}
      AND n.approved = true
      AND n.is_placeholder = false
    GROUP BY n.id
    ORDER BY votes DESC, n.display_name
    LIMIT 5
  `) as unknown as TopRow[];

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold-50/50 transition hover:text-gold-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5m0 0l6 6m-6-6l6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Voltar à gala
      </Link>

      <header className="mt-6">
        <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
          Categoria
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">
          <span className="text-gold-shine">{cat.name}</span>
        </h1>
        {cat.description && (
          <p className="mt-4 max-w-2xl text-base text-gold-50/70">{cat.description}</p>
        )}
        <div className="mt-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-gold-50/50">
          <span>
            <b className="font-display text-base text-gold-200">{nominees.length}</b>{" "}
            indicados
          </span>
          <span className="h-3 w-px bg-gold-400/30" />
          <span>
            <b className="font-display text-base text-gold-200">{totalVotes}</b> votos
            registrados
          </span>
        </div>
      </header>

      {windowStatus !== "open" && (
        <div
          className={`mt-8 rounded-3xl border px-6 py-5 text-sm ${
            windowStatus === "ended"
              ? "border-red-400/40 bg-red-500/10 text-red-100"
              : "border-gold-400/40 bg-gold-400/10 text-gold-100"
          }`}
        >
          <div className="font-display text-base">
            {windowStatus === "ended"
              ? "🔒 Votação encerrada"
              : "⏳ Votação ainda não começou"}
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-75">
            {windowLabel}
          </p>
        </div>
      )}

      <Podium
        slug={cat.slug}
        initial={{
          total: totalVotes,
          top,
          generatedAt: new Date().toISOString(),
        }}
      />

      <div className="gold-divider mt-12" />

      <VoteSection
        categoryId={cat.id}
        categoryName={cat.name}
        categorySlug={cat.slug}
        votingStatus={windowStatus}
        windowLabel={windowLabel}
        nominees={nominees.map((n) => ({
          id: n.id,
          handle: n.instagram_handle,
          name: n.display_name,
          avatar: n.avatar_url,
        }))}
      />
    </div>
  );
}
