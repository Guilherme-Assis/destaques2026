export function sanitizeCpf(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidCpf(raw: string): boolean {
  const cpf = sanitizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (slice: string, factor: number): number => {
    let sum = 0;
    for (const ch of slice) {
      sum += parseInt(ch, 10) * factor--;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  if (d1 !== parseInt(cpf[9], 10)) return false;
  const d2 = calc(cpf.slice(0, 10), 11);
  if (d2 !== parseInt(cpf[10], 10)) return false;
  return true;
}
