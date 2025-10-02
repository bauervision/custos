// src/components/home/PrescreenDialog.tsx
"use client";
import { useState } from "react";
import { useKustos } from "@/lib/provider";

export default function PrescreenDialog() {
  const { prescreen, setPrescreen } = useKustos();
  const [open, setOpen] = useState(false);
  const [include, setInclude] = useState(prescreen.include.join(", "));
  const [exclude, setExclude] = useState(prescreen.exclude.join(", "));

  const save = () => {
    setPrescreen({
      include: include
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      exclude: exclude
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="cta-secondary">
        Prescreen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-black p-4">
            <div className="text-lg font-semibold mb-3">Prescreen</div>
            <div className="grid gap-4">
              <div>
                <div className="text-sm text-white/80 mb-1">
                  Include (positive topics)
                </div>
                <input
                  value={include}
                  onChange={(e) => setInclude(e.target.value)}
                  placeholder='e.g., "Company in business 10 years", "ISO 14001"'
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2"
                />
              </div>
              <div>
                <div className="text-sm text-white/80 mb-1">
                  Exclude (negative topics)
                </div>
                <input
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                  placeholder='e.g., "Not from China", "Sanctions"'
                  className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1.5"
              >
                Cancel
              </button>
              <button onClick={save} className="cta-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
