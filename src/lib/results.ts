import type { VendorAgg } from "@/components/loading/VendorCard";

export type RunData = {
  vendors: VendorAgg[];
  counts: Record<string, number>;
  seed?: string;
  aoi?: any;
  createdAt: number;
};

export function loadLatestRun(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const rawNew = sessionStorage.getItem("kustos:run");
    if (rawNew) return JSON.parse(rawNew);
    const rawOld = sessionStorage.getItem("custos:run");
    if (rawOld) return JSON.parse(rawOld);
  } catch {}
  return null;
}
