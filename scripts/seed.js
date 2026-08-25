// carrega .env.local manualmente
(function loadEnvLocal() {
  const p = require("node:path").join(process.cwd(), ".env.local");
  const fs = require("node:fs");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
})();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL ausente em .env.local. Use o pooler do Supabase (porta 6543).",
  );
  process.exit(1);
}

const postgres = require("postgres");
const sql = postgres(url, { prepare: false, max: 4 });

const RAW_CATEGORIES = `
Academia
Academia de dança
Academia de luta
Açaiteria
Acessórios para celular
Acessórios para móveis
Acessórios personalizados
Açougue
Adega cachaça
Adesivo envelopamento
Adestrador
Advogado
Afiador de alicates
Agência de marketing
Agência de turismo
Agência funerária
Agrônomo
Aluguel de brinquedos
Aluguel de caçamba
Aluguel de fantasia
Aluguel de mesas e cadeiras
Analista clínico
Aplicativo de mobilidade urbana
Ar condicionado automotivo
Arquiteto
Artesanato
Artigos religiosos
Artista em pintura
Assistência em celulares
Assistência em games
Assistência em máquina lavar
Assistente social
Astrólogo
Ateliê
Ateliê de noivas
Auto Center
Auto elétrica
Auto escola
Auto peça
Automação industrial
Aviamentos
Babá
Balões personalizado
Bar
Barbearia
Barbeiro
Bartender
Beach tênis
Bicicletaria
Biomédico
Body piercing
Bolos
Bombas injetoras
Borracharia
Brechó
Brindes personalizado
Bronzeamento
Buffet
Cachorro quente
Cafeteria
Calçados infantil
Calhas e rufos
Canecas personalizadas
Cantor
Cardiologista
Carimbos
Carroceria
Cartomante
Cartório
Cartuchos
Casa de massas
Casa de ração
Casa lotérica
Centro de massagem
Cerimonialista
Cestas de café
Chaveiro
Chefe de cozinha
Chinelaria
Choperia
Churrascaria
Churrasqueiro
Cirurgia plástica
Clínica de emagrecimento
Clínica de estética
Clínica de fisioterapia
Clínica de harmonização
Clínica de ultrassom
Clínica medicina do trabalho
Clínica odontológica
Comida caseira
Comida de boteco
Comida fitness
Comida japonesa
Comunicação visual
Concessionária
Confeitaria artística
Consórcio
Construtora
Consultor de beleza
Consultor de vendas
Consultor proteção veicular
Corretor de imóveis
Corretor de seguros
Costureira
Crossfit
Cursos técnicos
Customização automotiva
Cuteleiro
Decoração de festa
Decoração de interiores
Dedetizadora
Dentista
Depiladora
Depósito de gás
Dermatologista
Desentopidora
Designer de sobrancelha
Designer gráfico
Despachante
Diarista
Diretor escola
Distribuidora de água
Distribuidora de bebidas
DJ
Doces
Domador
Doula
Educação infantil
Educador físico
Eletricista
Embalagem personalizada
Empresa de segurança
Encanador
Energia solar
Enfermeiro
Engenheiro civil
Engenheiro eletricista
Escola de esporte
Escola de idioma
Escola de natação
Escritório de advocacia
Escritório de contabilidade
Esfiharia
Espaço para festas
Especialista em alisamentos
Especialista em loiro
Especialista em mega hair
Espetinho
Estética automotiva
Esteticista
Estrutura e sonorização
Estrutura metálica
Estúdio de gravação
Estúdio de pilates
Estúdio de tatuagem
Estúdio fotográfico
Exames laboratoriais
Fábrica de gelo
Faculdade
Farmacêutico
Farmácia
Farmácia de manipulação
Ferragista
Ferro velho
Filmaker
Financeira empréstimo
Fisiculturismo feminino
Fisiculturismo masculino
Fisioterapeuta
Floricultura
Food truck
Forros e divisórias
Fotógrafo
Funcional
Funilaria e pintura
Garagem de carros
Garagem de motos
Garçom
Geladinho gourmet
Geradores de energia
Gesseiro
Gestor de tráfego
Ginecologista
Gráfica
Guia de compras
Guincho
Hamburgueria
Higienização
Hipnoterapia
Home care
Hortaliças
Hortifruti
Hospital veterinário
Hotel
Hotel infantil
Hotel pet
Humorista
Imobiliária
Impermeabilização
Influencer
Instalação de antenas
Instalação de ar condicionado
Instrumentos musicais
Instrutor de academia
Instrutor de auto escola
Instrutor de tiro
Insulfilme
Insumos agrícolas
Intérprete de libras
Jardinagem e paisagismo
Jornalista apresentador
Lan house
Lanchonete
Lash designer
Lava jato
Lavanderia
Limpeza de piscina
Livraria
Locação de máquina
Locação de material de festa
Locutor de rádio
Loja country
Loja de acessórios femininos
Loja de baterias
Loja de brinquedos
Loja de calçados
Loja de celulares
Loja de chocolate
Loja de colchões
Loja de cosméticos
Loja de embalagens
Loja de escapamento
Loja de ferramentas
Loja de hidráulica
Loja de iluminação
Loja de informática
Loja de lingerie
Loja de moda plus size
Loja de moda praia
Loja de móveis
Loja de piscina
Loja de pneus
Loja de presentes
Loja de produtos de limpeza
Loja de produtos hospitalares
Loja de rodas
Loja de roupas femininas
Loja de roupas masculinas
Loja de semi joias
Loja de som automotivo
Loja de suplementos
Loja de tintas
Loja de utilidades
Madeireira
Manicure e pedicure
Manutenção em ar condicionado
Manutenção em máquinas de costura
Manutenção hidráulica
Maqueiro
Maquiadora
Marcenaria
Marido de aluguel
Marmita fitness
Marmoraria
Massoterapia
Materiais elétricos
Material de construção
Médico veterinário
Mentoria e coaching
Micropigmentação
Moda geek
Moda gestante
Monitoramento de máquinas
Montador de móveis
Motel
Motoboy
Motores elétricos
Motorista de app
Móveis e enxoval para bebês
Musical para casamento
Nail designer
Nail educadora
Nutricionista
Nutricionista infantil
Nutrólogo
Odontopediatria
Oficina de caminhão
Oficina de máquinas agrícolas
Oficina de moto
Oficina mecânica
Oftalmologista
Operador de drone
Ortopedista
Ótica
Ourives
Página de entretenimento
Panificadora
Pão de queijo
Papelaria
Papelaria personalizada
Paradesporto
Pastelaria
Peças agrícolas
Pedagoga
Pediatra
Pedreiro
Pegue e monte decoração
Peixaria
Penteadista
Perfumaria
Personal trainer
Pesca e camping
Pesque e pague
Pet shop
Pintor residencial
Pizzaria
Podcast
Podologia
Polimento automotivo
Posto de gasolina
Produtos naturais
Produtos para festa
Produtos para nail design
Professor de artes marciais
Professor de beach tênis
Professor de capoeira
Professor de dança
Professor de futevôlei
Professor de música
Professor de natação
Professor de reforço escolar
Professor de yoga
Professor funcional na areia
Profissional de educação física
Programador de sistemas
Propaganda volante
Prótese capilar
Protético
Provedor de internet
Psicólogo
Psicopedagoga
Psiquiatra
Quadra de areia
Quadra de futsal
Queijaria
Quiropraxia
Quitandas
Radialista
Rastreador
Reciclagem
Redes e telas de proteção
Relojoaria-joalheria
Remoção a laser
Repórter
Restaurante
Restaurante delivery
Retífica de motores
Revenda de máquinas agrícola
Roupa fitness
Sacolão
Salão de beleza
Salgados
Segurança do trabalho
Segurança eletrônica
Serralheria
Sex shop
Social media
Sorveteria
Spa
Supermercado
Tabacaria
Tapeçaria
Técnico de internet
Técnico em informática
Terapeuta
Terapeuta infantil
Terraplanagem
Toldos e cobertura
Topografia
Torneadora
Trancista
Transporte de encomenda
Transporte de gado
Transporte de máquinas agrícolas
Transporte escolar
Troca de óleo
Uniformes
Velas aromáticas
Ventosaterapia
Vereador
Vestidos de festa
Vestuário infantil
Vidraçaria
Vidros automotivo
Vistoria veicular
Vitrinista
Arbitragem
Pintor de moto
Esmalteria express
`;

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const names = RAW_CATEGORIES.split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const seen = new Set();
const categories = [];
for (const name of names) {
  const slug = slugify(name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  categories.push({
    slug,
    name,
    description: `Os melhores em ${name.toLowerCase()} escolhidos pelo voto popular.`,
  });
}

async function main() {
  const NOMINEES_PER_CATEGORY = 5;
  const ROMAN = ["I", "II", "III", "IV", "V"];

  // Apaga tudo antes de repopular (cascade remove nominees + votes)
  const [{ c: prevCats }] = await sql`SELECT COUNT(*)::int AS c FROM categories`;
  const [{ c: prevVotes }] = await sql`SELECT COUNT(*)::int AS c FROM votes`;
  await sql`TRUNCATE categories, nominees, votes RESTART IDENTITY CASCADE`;
  console.log(
    `reset: ${prevCats} categorias e ${prevVotes} votos removidos (indicados descem em cascata).`,
  );

  // Insere categorias em lote e recupera os ids
  const catRows = await sql`
    INSERT INTO categories ${sql(categories, "slug", "name", "description")}
    RETURNING id, slug
  `;
  const idBySlug = new Map(catRows.map((r) => [r.slug, r.id]));

  // Monta indicados placeholder
  const nominees = [];
  const MAX_HANDLE = 30; // limite tipo Instagram
  for (const cat of categories) {
    const catId = idBySlug.get(cat.slug);
    for (let i = 0; i < NOMINEES_PER_CATEGORY; i++) {
      const suffix = `.i${i + 1}`; // curto pra caber junto com qualquer slug
      const handle = (
        cat.slug.slice(0, MAX_HANDLE - suffix.length) + suffix
      ).slice(0, MAX_HANDLE);
      nominees.push({
        category_id: catId,
        instagram_handle: handle,
        display_name: `Indicado ${ROMAN[i]}`,
        avatar_url: null,
        is_placeholder: true,
      });
    }
  }

  // Insere indicados em chunks de 1000 (limite de parâmetros do pooler)
  const CHUNK = 1000;
  for (let i = 0; i < nominees.length; i += CHUNK) {
    const slice = nominees.slice(i, i + CHUNK);
    await sql`
      INSERT INTO nominees ${sql(
        slice,
        "category_id",
        "instagram_handle",
        "display_name",
        "avatar_url",
        "is_placeholder",
      )}
    `;
  }

  const [{ c: totalCats }] = await sql`SELECT COUNT(*)::int AS c FROM categories`;
  const [{ c: totalNoms }] = await sql`SELECT COUNT(*)::int AS c FROM nominees`;
  console.log(
    `\n${totalCats} categorias criadas, ${totalNoms} indicados placeholder (5 por categoria).`,
  );
  console.log(
    `\nDica: substitua os placeholders pelos perfis reais via /cadastro (tela pública).`,
  );
  console.log(`Para gerar votos de teste: \`npm run seed:votes -- 150 --reset\``);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
