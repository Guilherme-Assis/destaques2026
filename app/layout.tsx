import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Destaques do Ano · Diony 2026",
  description: "A noite que coroa os melhores perfis do Brasil.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div className="relative z-10">
          <header className="border-b border-gold-400/10 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
              <Link href="/" className="group flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-shine text-ink-950 shadow-gold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2l2.39 6.96H22l-6 4.36 2.39 7.06L12 16.27 5.61 20.38 8 13.32 2 8.96h7.61z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="font-display text-xl tracking-wide">
                  <span className="text-gold-shine">Destaques</span>
                  <span className="text-gold-50/70"> do Ano 2026 - Itumbiára</span>
                </span>
              </Link>
              <nav className="flex items-center gap-3">
                <span className="hidden text-[11px] uppercase tracking-[0.25em] text-gold-50/50 sm:inline">
                  Diony 2026
                </span>
                <Link
                  href="/cadastro"
                  className="rounded-full border border-gold-400/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold-200 transition hover:border-gold-300 hover:bg-gold-400/10 hover:text-gold-100"
                >
                  Inscrever-se
                </Link>
{/*                 <Link
                  href="/admin/login"
                  className="text-xs uppercase tracking-[0.2em] text-gold-50/50 transition hover:text-gold-300"
                >
                  admin
                </Link> */}
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>

          <footer className="mt-24 border-t border-gold-400/10 py-8 text-center">
            <div className="gold-divider mx-auto mb-6 w-32" />
            <p className="font-display text-sm tracking-[0.3em] text-gold-50/40">
              DESTAQUES · DO · ANO
            </p>
            <p className="mt-2 text-xs text-gold-50/30">
              Cada CPF é armazenado apenas como hash criptográfico (HMAC-SHA256). Sua identidade
              fica em segurança.
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.3em]">
              <Link
                href="/transparencia"
                className="text-gold-300/70 transition hover:text-gold-100"
              >
                Apuração auditável · Merkle root público
              </Link>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
