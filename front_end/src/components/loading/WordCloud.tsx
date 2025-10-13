"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Word = {
  text: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
};

export default function WordCloud({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const [words, setWords] = useState<Word[]>([]);
  const [dims, setDims] = useState<{ w: number; h: number }>({
    w: 300,
    h: 300,
  });
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Track size (ResizeObserver)
  useEffect(() => {
    if (!boxRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setDims({ w: Math.max(280, cr.width), h: Math.max(240, cr.height) });
      }
    });
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  // Prepare input words (top 60 by frequency)
  const data = useMemo(() => {
    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60);
    const max = entries[0]?.[1] ?? 1;
    const minSize = 12,
      maxSize = 36;
    return entries.map(([text, v]) => {
      const size = Math.round(minSize + (maxSize - minSize) * (v / max));
      return { text, size };
    });
  }, [counts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cloud: any =
        (await import("d3-cloud")).default ?? (await import("d3-cloud"));
      const layout = cloud()
        .size([dims.w, dims.h])
        .words(data.map((d) => ({ text: d.text, size: d.size })))
        .padding(3)
        .rotate(() => (Math.random() < 0.2 ? 90 : 0))
        .font("Inter, system-ui, sans-serif")
        .fontSize((d: any) => d.size)
        .on("end", (out: any[]) => {
          if (!cancelled) {
            setWords(
              out.map((w) => ({
                text: w.text,
                size: w.size,
                x: w.x,
                y: w.y,
                rotate: w.rotate,
              }))
            );
          }
        });
      layout.start();
      return () => layout.stop?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [data, dims.w, dims.h]);

  return (
    <div
      ref={boxRef}
      className="relative h-[300px] w-full rounded-xl border border-white/10 bg-white/[0.02]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
      >
        <g transform={`translate(${dims.w / 2}, ${dims.h / 2})`}>
          {words.map((w, i) => (
            <text
              key={`${w.text}-${i}`}
              textAnchor="middle"
              transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
              fontSize={w.size}
              fill="rgba(255,255,255,0.85)"
              style={{ userSelect: "none" }}
            >
              {w.text}
            </text>
          ))}
        </g>
      </svg>
      {words.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/50">
          Building cloud…
        </div>
      )}
    </div>
  );
}
