"use client";
import { memo, useMemo } from "react";

type Props = { items: string[]; reverse?: boolean; className?: string };

function KeywordMarquee({ items, reverse, className }: Props) {
  // Duplicate to create a seamless loop
  const track = useMemo(() => [...items, ...items], [items]);
  return (
    <div className={`marquee ${className ?? ""}`}>
      <div className={`marquee-track ${reverse ? "reverse" : ""}`}>
        {track.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(KeywordMarquee);
