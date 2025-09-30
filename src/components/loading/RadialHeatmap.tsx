"use client";
import { useMemo } from "react";

export default function RadialHeatmap({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const top = useMemo(() => {
    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    const max = entries[0]?.[1] ?? 1;
    return { entries, max };
  }, [counts]);

  const R = 120; // radius
  const cx = 150; // center x
  const cy = 150; // center y

  return (
    <svg
      viewBox="0 0 300 300"
      className="w-full h-[300px] rounded-xl border border-white/10 bg-white/[0.02]"
    >
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      {top.entries.map(([word, value], i) => {
        const a = (i / top.entries.length) * Math.PI * 2 - Math.PI / 2;
        const len = (value / top.max) * 90 + 20; // spoke length
        const x2 = cx + Math.cos(a) * len;
        const y2 = cy + Math.sin(a) * len;
        const xLabel = cx + Math.cos(a) * (len + 14);
        const yLabel = cy + Math.sin(a) * (len + 14);

        return (
          <g key={word}>
            <line
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="rgba(173,216,230,0.8)"
              strokeWidth="2"
            />
            <circle
              cx={x2}
              cy={y2}
              r={4 + (value / top.max) * 6}
              fill="rgba(0,255,200,0.65)"
            />
            <text
              x={xLabel}
              y={yLabel}
              fontSize="10"
              fill="rgba(255,255,255,0.8)"
            >
              {word}
            </text>
          </g>
        );
      })}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fill="rgba(255,255,255,0.7)"
      >
        Keyword Intensity
      </text>
    </svg>
  );
}
