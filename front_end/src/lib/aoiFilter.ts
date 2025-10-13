// lib/aoiFilter.ts
import type { AoiSummary } from "./aoi";
import { inAoi } from "./aoi";

export type Company = {
  name: string;
  coords?: { lat: number; lon: number }; // preferred
  // optional fallbacks if you have them:
  countryCode?: string;
  locationText?: string;
  // ...other fields
};

export function filterByAoiStrict(items: Company[], aoi: AoiSummary | null) {
  if (!aoi) return items;
  return items.filter((c) => {
    if (!c.coords) return false; // strict: drop if no coords
    return inAoi(c.coords.lat, c.coords.lon, aoi);
  });
}

/** Inside-AOI first; keep others but demote them */
export function rankByAoi(items: Company[], aoi: AoiSummary | null) {
  if (!aoi) return items;
  return items.slice().sort((a, b) => {
    const ia = a.coords ? +inAoi(a.coords.lat, a.coords.lon, aoi) : 0;
    const ib = b.coords ? +inAoi(b.coords.lat, b.coords.lon, aoi) : 0;
    return ib - ia; // 1 before 0
  });
}
