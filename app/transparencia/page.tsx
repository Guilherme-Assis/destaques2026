import { computeMerkleRoot } from "@/lib/audit";
import { sql } from "@/lib/db";
import TransparencyLive from "./Live";

export const dynamic = "force-dynamic";

export default async function TransparenciaPage() {
  const audit = await computeMerkleRoot();

  const [counts] = (await sql<
    {
      total_categories: number;
      audited_categories: number;
      total_nominees: number;
      nominees_with_votes: number;
      unique_voters: number;
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM categories)::int               AS total_categories,
      (SELECT COUNT(DISTINCT category_id) FROM votes)::int AS audited_categories,
      (SELECT COUNT(*) FROM nominees)::int                 AS total_nominees,
      (SELECT COUNT(DISTINCT nominee_id) FROM votes)::int  AS nominees_with_votes,
      (SELECT COUNT(DISTINCT cpf_hash) FROM votes)::int    AS unique_voters
  `) as unknown as {
    total_categories: number;
    audited_categories: number;
    total_nominees: number;
    nominees_with_votes: number;
    unique_voters: number;
  }[];

  const [last] = (await sql<{ at: Date | null }[]>`
    SELECT MAX(created_at) AS at FROM votes
  `) as unknown as { at: Date | null }[];

  const topAudited = (await sql<
    { name: string; slug: string; votes: number }[]
  >`
    SELECT c.name, c.slug, COUNT(v.id)::int AS votes
    FROM categories c
    JOIN votes v ON v.category_id = c.id
    GROUP BY c.id
    ORDER BY votes DESC, c.name
    LIMIT 8
  `) as unknown as { name: string; slug: string; votes: number }[];

  return (
    <TransparencyLive
      initial={{
        ...audit,
        ...counts,
        lastVoteAt: last?.at ? new Date(last.at).toISOString() : null,
        topAudited,
      }}
    />
  );
}
