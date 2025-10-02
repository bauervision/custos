// src/lib/flags.ts
// super lightweight flag via emoji (works everywhere)
const NAME_TO_ISO2: Record<string, string> = {
  "South Africa": "ZA",
  Namibia: "NA",
  Botswana: "BW",
  Germany: "DE",
  Singapore: "SG",
  Norway: "NO",
  Canada: "CA",
  China: "CN",
  UAE: "AE",
};

export function countryFlagEmoji(name: string): string {
  const iso = NAME_TO_ISO2[name] || "";
  if (iso.length !== 2) return "🏳️";
  const cc = iso.toUpperCase();
  const codePoints = [...cc].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
