// lib/aoi.ts
export type BBox = { south: number; west: number; north: number; east: number };
export type AoiSummary = {
  type: "Polygon" | "Rectangle";
  bounds: BBox;
  center: { lat: number; lon: number };
  vertices: number;
  geojson: any;
};

type Ring = [number, number][]; // [lng, lat][]

function toRing(coords: any): Ring {
  if (!Array.isArray(coords)) return [];
  const ring = coords
    .map((p: any) =>
      Array.isArray(p) && p.length >= 2
        ? ([Number(p[0]), Number(p[1])] as [number, number])
        : null
    )
    .filter(Boolean) as Ring;
  return ring;
}

const NEW_KEY = "kustos:aoi";
const OLD_KEY = "custos:aoi";

/** Read AOI from session (migrates old key). */
export function readAoiFromSession(): AoiSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const rawNew = sessionStorage.getItem(NEW_KEY);
    if (rawNew) return JSON.parse(rawNew) as AoiSummary;

    const rawOld = sessionStorage.getItem(OLD_KEY);
    if (rawOld) {
      const aoi = JSON.parse(rawOld) as AoiSummary;
      sessionStorage.setItem(NEW_KEY, rawOld);
      sessionStorage.removeItem(OLD_KEY);
      return aoi;
    }
  } catch {}
  return null;
}

/** Write/clear AOI in session (clears old key too). */
export function writeAoiToSession(aoi: AoiSummary | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (aoi) {
      sessionStorage.setItem(NEW_KEY, JSON.stringify(aoi));
    } else {
      sessionStorage.removeItem(NEW_KEY);
    }
    sessionStorage.removeItem(OLD_KEY);
  } catch {}
}

export function getAoiFromSession(): AoiSummary | null {
  try {
    const raw = sessionStorage.getItem("kustos:aoi");
    return raw ? (JSON.parse(raw) as AoiSummary) : null;
  } catch {
    return null;
  }
}

// --- Geometry helpers ---

// Normalize longitude to [-180, 180]
export function normLon(lon: number) {
  let x = lon;
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

export function inBbox(lat: number, lon: number, b: BBox) {
  const LON = normLon(lon);
  const W = normLon(b.west);
  const E = normLon(b.east);
  // handle dateline-crossing rectangles
  const withinLon = W <= E ? LON >= W && LON <= E : LON >= W || LON <= E;
  return lat >= b.south && lat <= b.north && withinLon;
}

// Ray-casting point-in-polygon; GeoJSON rings are [lng, lat]
export function inPolygon(lat: number, lon: number, ring: Ring) {
  const x = normLon(lon);
  const y = lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = normLon(ring[i][0]);
    const yi = ring[i][1];
    const xj = normLon(ring[j][0]);
    const yj = ring[j][1];

    // Only consider edges that straddle the horizontal ray
    const straddles = yi > y !== yj > y;
    if (!straddles) continue;

    const denom = yj - yi || 1e-12; // guard against divide by zero
    const xIntersect = ((xj - xi) * (y - yi)) / denom + xi;

    if (x < xIntersect) inside = !inside;
  }

  return inside;
}

export function inAoi(lat: number, lon: number, aoi: AoiSummary): boolean {
  if (aoi.type === "Rectangle") return inBbox(lat, lon, aoi.bounds);

  const g = aoi.geojson?.geometry;
  if (!g) return inBbox(lat, lon, aoi.bounds);

  if (g.type === "Polygon") {
    const outer: Ring = toRing(g.coordinates?.[0]);
    return outer.length
      ? inPolygon(lat, lon, outer)
      : inBbox(lat, lon, aoi.bounds);
  }

  if (g.type === "MultiPolygon") {
    const polys: any[] = g.coordinates ?? [];
    for (const poly of polys) {
      const outer: Ring = toRing(poly?.[0]);
      if (outer.length && inPolygon(lat, lon, outer)) return true;
    }
    return false;
  }

  return inBbox(lat, lon, aoi.bounds);
}
