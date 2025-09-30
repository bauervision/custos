"use client";
type Item = { name: string; country: string; keywords: string[] };

export default function StreamingFeed({ items }: { items: Item[] }) {
  return (
    <div className="space-y-3">
      {items.slice(-25).map((it, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium">{it.name}</div>
            <div className="text-xs text-white/60">· {it.country}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {it.keywords.map((k, j) => (
              <span
                key={j}
                className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
