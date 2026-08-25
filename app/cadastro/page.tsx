import { sql } from "@/lib/db";
import CadastroForm from "./CadastroForm";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  const categories = (await sql<{ slug: string; name: string }[]>`
    SELECT slug, name FROM categories ORDER BY name
  `) as unknown as { slug: string; name: string }[];

  return (
    <div>
      <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
        Inscrições abertas
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">
        <span className="text-gold-shine">Concorra</span> à gala
      </h1>
      <p className="mt-4 max-w-2xl text-base text-gold-50/70">
        Cadastre seu nome, seu <span className="text-gold-200">@instagram</span> e escolha as
        categorias em que você quer concorrer. Você pode estar em quantas categorias quiser.
        Adicione uma foto pra ostentar no pódio.
      </p>

      <div className="gold-divider mt-8" />

      <CadastroForm categories={categories} />
    </div>
  );
}
