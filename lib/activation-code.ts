export const ACTIVATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatActivationCodeInput(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 23);
  const prefix = compact.slice(0, 3);
  const body = compact.slice(3);
  return [prefix, body.slice(0, 5), body.slice(5, 10), body.slice(10, 15), body.slice(15, 20)]
    .filter(Boolean)
    .join("-");
}

export function normalizeActivationCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact.startsWith("J4U") || compact.length !== 23) return "";
  const body = compact.slice(3);
  if (![...body].every((character) => ACTIVATION_ALPHABET.includes(character))) return "";
  return `J4U-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}-${body.slice(15, 20)}`;
}
