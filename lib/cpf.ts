import crypto from "node:crypto";
export { isValidCpf, sanitizeCpf } from "./cpf-validate";
import { sanitizeCpf } from "./cpf-validate";

export function hashCpf(rawCpf: string): string {
  const pepper = process.env.CPF_PEPPER || "dev-pepper-change-me";
  const cpf = sanitizeCpf(rawCpf);
  return crypto.createHmac("sha256", pepper).update(cpf).digest("hex");
}
