import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import Approvals from "./Approvals";

export const dynamic = "force-dynamic";

export default function AprovacoesPage() {
  if (!isAdmin()) redirect("/admin/login");
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
            Camarote · Moderação
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-tight">
            <span className="text-gold-shine">Aprovar</span> inscrições
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gold-50/65">
            Inscrições chegam como <b>pendentes</b> — só aparecem ao público depois que
            você aprovar. Isso evita que alguém cadastre um concorrente alheio com foto
            falsa.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost">
          ← Apuração
        </Link>
      </div>

      <div className="gold-divider mt-8" />

      <Approvals />
    </div>
  );
}
