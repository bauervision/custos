"use client";
import { useMemo } from "react";

type Slice = { label: string; value: number };
export default function Donut({
  data,
  size = 220,
  stroke = 22,
}: {
  data: Slice[];
  size?: number;
  stroke?: number;
}) {
  const total = Math.max(
    1,
    data.reduce((s, d) => s + d.value, 0)
  );
  const R = (size - stroke) / 2;
  const C = Math.PI * 2 * R;
  const cx = size / 2,
    cy = size / 2;

  // smooth ordered slices
  const palette = ["#7dd3fc", "#f9a8d4", "#fbbf24"]; // sky / pink / amber
  const slices = useMemo(() => {
    let acc = 0;
    return data.map((d, i) => {
      const frac = d.value / total;
      const len = C * frac;
      const dash = `${Math.max(0.0001, len)} ${C - len}`;
      const offset = C * 0.25 - acc; // start at top
      acc += len;
      return {
        dash,
        offset,
        color: palette[i % palette.length],
        label: d.label,
        value: d.value,
        frac,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), C, total]);

  return (
    <div className="relative w-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto block"
      >
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.25))" }}
          />
        ))}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="14"
          fill="rgba(255,255,255,0.8)"
        >
          Risk Mix
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/80">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="truncate">{s.label}</span>
            <span className="text-white/60">({Math.round(s.frac * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
