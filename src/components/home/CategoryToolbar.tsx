// components/home/CategoryToolbar.tsx
"use client";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

export default function CategoryToolbar({
  selected,
  onSelect,
}: {
  selected: CategoryKey;
  onSelect: (key: CategoryKey) => void;
}) {
  return (
    // not fixed; sits in the flow, scrolls with page
    <aside
      role="toolbar"
      aria-orientation="vertical"
      className="hidden md:flex shrink-0 w-14 rounded-2xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur flex-col items-center gap-2 overflow-x-hidden" // ← no horizontal scrollbar
    >
      {CATEGORIES.map(({ key, label, iconPath }) => {
        const active = key === selected;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            aria-pressed={active}
            title={label}
            className={`group w-12 h-12 grid place-items-center rounded-xl transition
              ${
                active
                  ? "bg-emerald-400/20 border border-emerald-400/40"
                  : "hover:bg-white/10 border border-white/10"
              }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-5 h-5 ${
                active
                  ? "text-emerald-300"
                  : "text-white/70 group-hover:text-white/90"
              }`}
              aria-hidden
            >
              <path d={iconPath} fill="currentColor" />
            </svg>
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
