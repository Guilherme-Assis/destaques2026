export const metadata = {
  title: "Privacidade · Melhores do Ano",
};

export default function PrivacidadePage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl">
      <p className="font-display text-[11px] uppercase tracking-[0.5em] text-gold-300/70">
        LGPD · Política de privacidade
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        <span className="text-gold-shine">Transparência</span> sobre seus dados
      </h1>

      <div className="gold-divider my-8" />

      <div className="space-y-6 text-gold-50/80">
        <section>
          <h2 className="font-display text-2xl text-gold-100">Quais dados coletamos</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>
              <b>Votação:</b> CPF (apenas para contagem única por categoria), endereço IP
              e user-agent do navegador.
            </li>
            <li>
              <b>Cadastro de concorrente:</b> nome, @ do Instagram e, opcionalmente, foto
              de perfil.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">O que NÃO armazenamos</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>
              <b>O CPF em texto nunca é salvo nem logado.</b> O que fica no banco é
              apenas um <code className="rounded bg-ink-800/70 px-1.5 py-0.5 text-gold-100">HMAC-SHA256</code>{" "}
              com um pepper server-side — um hash irreversível que impede reconstrução.
            </li>
            <li>Não coletamos email, telefone, localização precisa ou cookies de terceiros para rastreamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Finalidade (base legal: consentimento)</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Garantir unicidade do voto por categoria por pessoa.</li>
            <li>Detectar abuso (bots, flood, múltiplas contas no mesmo IP).</li>
            <li>Calcular e exibir o ranking público da gala.</li>
            <li>Publicar o <a href="/transparencia" className="text-gold-200 underline">Merkle root</a> da apuração para auditoria cidadã.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Retenção</h2>
          <p className="mt-3 text-sm">
            Os hashes de CPF e os registros de voto são mantidos até 60 dias após o
            encerramento do evento, para permitir auditoria. Logs de abuso (IP + UA) são
            mantidos por 30 dias. Depois disso, são apagados em rotina automatizada.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Seus direitos (LGPD art. 18)</h2>
          <p className="mt-3 text-sm">
            Você pode solicitar confirmação de tratamento, acesso, correção ou exclusão
            de dados pelo email do controlador. Como o CPF é armazenado apenas em hash
            não reversível, a exclusão pontual só é possível se o solicitante conseguir
            apresentar o CPF original para calcularmos o mesmo hash e localizar o
            registro.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Contato do controlador</h2>
          <p className="mt-3 text-sm">
            Organização do evento <b>Melhores do Ano</b> — substituir por nome, CNPJ e
            email de DPO antes do lançamento público.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Cookies</h2>
          <p className="mt-3 text-sm">
            Usamos apenas cookies funcionais (sessão do painel admin, assinatura do
            captcha). Nenhum cookie de analytics/publicidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-gold-100">Auditoria pública</h2>
          <p className="mt-3 text-sm">
            Todos os votos são selados num <a href="/transparencia" className="text-gold-200 underline">Merkle root SHA-256</a>{" "}
            publicado em tempo real. Qualquer pessoa pode reproduzir o cálculo e
            verificar que nenhum voto foi alterado entre snapshots.
          </p>
        </section>
      </div>
    </article>
  );
}
