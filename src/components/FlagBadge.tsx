"use client";

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
  // Add more as you demo; later we can swap to a full country→ISO source
};

export default function FlagBadge({
  country,
  iso2, // optional override if you already have ISO code
  size = 20, // px height for the flag glyph itself
}: {
  country: string;
  iso2?: string;
  size?: number;
}) {
  const code = (iso2 || NAME_TO_ISO2[country] || "").toLowerCase();
  const hasCode = code.length === 2;

  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-black/40 shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
      title={country}
      aria-label={`Country of origin: ${country}`}
    >
      {hasCode ? (
        <span
          className={`fi fi-${code}`}
          style={{ fontSize: 0, width: size, height: size }}
          aria-hidden
        />
      ) : (
        <span className="text-[11px] font-semibold text-white/80">?</span>
      )}
    </div>
  );
}
