// Smoke test de lógica pura (não toca o Supabase).
// Cobre: validação de CPF (criterion 5), hash determinístico sem CPF cru (criterion 6)
// e captcha assinado (HMAC).
// Para validar a regra de duplicidade no banco (criteria 3 e 4), use a UI ou
// inspect direto na tabela `votes` após `npm run seed:votes`.
process.env.CPF_PEPPER = "test-pepper";
process.env.SESSION_SECRET = "test-session";

const crypto = require("node:crypto");

function sanitizeCpf(s) {
  return (s || "").replace(/\D/g, "");
}
function isValidCpf(raw) {
  const cpf = sanitizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice, factor) => {
    let sum = 0;
    for (const ch of slice) sum += parseInt(ch, 10) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (calc(cpf.slice(0, 9), 10) !== parseInt(cpf[9], 10)) return false;
  if (calc(cpf.slice(0, 10), 11) !== parseInt(cpf[10], 10)) return false;
  return true;
}
function hashCpf(raw) {
  return crypto
    .createHmac("sha256", process.env.CPF_PEPPER)
    .update(sanitizeCpf(raw))
    .digest("hex");
}

let pass = 0,
  fail = 0;
function t(name, cond) {
  if (cond) {
    pass++;
    console.log("  ok  ", name);
  } else {
    fail++;
    console.log("  FAIL", name);
  }
}

// --- CPF (criterion 5) ---
t("CPF válido conhecido", isValidCpf("529.982.247-25"));
t("CPF inválido (dígito errado)", !isValidCpf("529.982.247-26"));
t("CPF formato curto", !isValidCpf("123"));
t("CPF todos iguais", !isValidCpf("111.111.111-11"));
t("CPF com letras é sanitizado e rejeitado", !isValidCpf("abc"));

// --- hash (criterion 6) ---
const h = hashCpf("529.982.247-25");
t("hash é hex de 64 chars", /^[0-9a-f]{64}$/.test(h));
t("hash é determinístico", h === hashCpf("52998224725"));
t("hash não contém o CPF cru", !h.includes("52998224725"));
t(
  "hash muda quando o pepper muda",
  (() => {
    const old = process.env.CPF_PEPPER;
    process.env.CPF_PEPPER = "outro-pepper";
    const h2 = hashCpf("52998224725");
    process.env.CPF_PEPPER = old;
    return h !== h2;
  })(),
);

// --- captcha (HMAC assinado, expiração) ---
function newCaptcha(aOverride, bOverride, expOverride) {
  const a = aOverride ?? 3;
  const b = bOverride ?? 4;
  const exp = expOverride ?? Date.now() + 60_000;
  const body = Buffer.from(JSON.stringify({ a, b, exp })).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return { token: `${body}.${sig}`, answer: a + b };
}
function verifyCaptcha(token, answer) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const exp = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(body)
    .digest("base64url");
  if (sig.length !== exp.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return false;
  const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (Date.now() > p.exp) return false;
  return parseInt(answer, 10) === p.a + p.b;
}

const c = newCaptcha();
t("captcha resposta correta passa", verifyCaptcha(c.token, c.answer));
t("captcha resposta errada falha", !verifyCaptcha(c.token, c.answer + 1));
t("captcha token adulterado falha", !verifyCaptcha(c.token.slice(0, -2) + "xx", c.answer));
const expired = newCaptcha(2, 3, Date.now() - 1000);
t("captcha expirado falha", !verifyCaptcha(expired.token, expired.answer));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
