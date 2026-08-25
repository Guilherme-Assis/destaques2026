export function normalizeHandle(raw: string): string {
  return (raw || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function isValidHandle(raw: string): boolean {
  const h = normalizeHandle(raw);
  return /^[a-z0-9._]{1,30}$/.test(h);
}
