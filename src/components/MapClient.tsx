"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { patchLeafletIcons } from "@/lib/leaflet";
import { useRouter } from "next/navigation";
import { DARK_TILE } from "@/lib/tiles";

type AoiSummary = {
  type: "Polygon" | "Rectangle";
  bounds: { south: number; west: number; north: number; east: number };
  center: { lat: number; lon: number };
  vertices: number;
  geojson: any;
};

function fmt(n: number) {
  return n.toFixed(4);
}

function DrawControls({
  onChange,
  setClearRef,
}: {
  onChange: (summary?: AoiSummary) => void;
  setClearRef: (fn: () => void) => void;
}) {
  const map = useMap();
  const drawn = useRef(L.featureGroup());

  useEffect(() => {
    map.addLayer(drawn.current);

    const control = new (L as any).Control.Draw({
      position: "topleft",
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        rectangle: {},
        marker: false,
        circle: false,
        polyline: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawn.current,
        edit: true,
        remove: true,
      },
    });
    map.addControl(control);

    const summarize = (layer: any): AoiSummary | undefined => {
      if (!layer) return undefined;
      const gj = layer.toGeoJSON();
      const b = layer.getBounds?.() ?? drawn.current.getBounds?.();
      if (!b) return undefined;
      const c = b.getCenter();
      const ll = (layer.getLatLngs?.() ?? []) as any[];
      const verts =
        Array.isArray(ll) && ll.length
          ? Array.isArray(ll[0])
            ? ll[0].length
            : ll.length
          : 0;
      return {
        type: layer instanceof (L as any).Rectangle ? "Rectangle" : "Polygon",
        bounds: {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        },
        center: { lat: c.lat, lon: c.lng },
        vertices: verts,
        geojson: gj,
      };
    };

    const onCreated = (e: any) => {
      drawn.current.clearLayers();
      drawn.current.addLayer(e.layer);
      map.fitBounds(e.layer.getBounds?.() ?? drawn.current.getBounds());
      onChange(summarize(e.layer));
    };

    const onEdited = (e: any) => {
      let first: any;
      e.layers.eachLayer((l: any) => {
        first = l;
      });
      onChange(summarize(first));
    };

    const onDeleted = () => {
      drawn.current.clearLayers();
      onChange(undefined);
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);
    map.on((L as any).Draw.Event.EDITED, onEdited);
    map.on((L as any).Draw.Event.DELETED, onDeleted);

    // expose a clear() for the parent
    setClearRef(() => () => {
      drawn.current.clearLayers();
      onChange(undefined);
    });

    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.off((L as any).Draw.Event.EDITED, onEdited);
      map.off((L as any).Draw.Event.DELETED, onDeleted);
      map.removeControl(control);
      map.removeLayer(drawn.current);
    };
  }, [map, onChange, setClearRef]);

  return null;
}

export default function MapClient() {
  const [aoi, setAoi] = useState<AoiSummary | undefined>(undefined);
  const clearRef = useRef<() => void>(() => {});
  const [material, setMaterial] = useState("raw earth materials");
  const router = useRouter();

  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const centerInitial = useMemo<[number, number]>(() => [-28.47, 24.67], []);

  const runReport = () => {
    // Save AOI to session for /loading → /results
    try {
      if (aoi) {
        sessionStorage.setItem(
          "custos:aoi",
          JSON.stringify({
            type: aoi.type,
            bounds: aoi.bounds,
            center: aoi.center,
            vertices: aoi.vertices,
            geojson: aoi.geojson,
          })
        );
      } else {
        sessionStorage.removeItem("custos:aoi");
      }
    } catch {}

    const seedParts = [material.trim()];
    if (aoi?.center) {
      seedParts.push(
        `AOI ${fmt(aoi.center.lat)}, ${fmt(aoi.center.lon)} (${fmt(
          aoi.bounds.south
        )},${fmt(aoi.bounds.west)}–${fmt(aoi.bounds.north)},${fmt(
          aoi.bounds.east
        )})`
      );
    }
    const seed = seedParts.join(" — ");
    router.push(`/loading/?seed=${encodeURIComponent(seed)}`);
  };

  return (
    <div className="grid gap-4">
      <div className="h-[60vh] w-full rounded-xl overflow-hidden border border-white/10">
        <MapContainer
          center={centerInitial}
          zoom={5}
          className="h-full w-full"
          worldCopyJump
        >
          {/* You can swap this tile for a simpler region style later */}
          <TileLayer url={DARK_TILE.url} attribution={DARK_TILE.attribution} />
          <DrawControls
            onChange={setAoi}
            setClearRef={(fn) => (clearRef.current = fn)}
          />
        </MapContainer>
      </div>

      {/* AOI + Material Panel */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[280px] flex-1">
            <div className="text-sm font-medium text-white/90">Material</div>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder='e.g., "cobalt", "diamond", "rare earths"'
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <div className="mt-1 text-xs text-white/50">
              This seeds the analysis stream. You can type anything.
            </div>
          </div>

          <div className="min-w-[320px] flex-1">
            <div className="text-sm font-medium text-white/90">
              Selected Area
            </div>
            {aoi ? (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-xs text-white/60">Type</div>
                  <div className="font-medium">{aoi.type}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-xs text-white/60">Vertices</div>
                  <div className="font-medium">{aoi.vertices}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 col-span-2">
                  <div className="text-xs text-white/60">Bounds (S/W/N/E)</div>
                  <div className="font-mono text-xs">
                    {fmt(aoi.bounds.south)}, {fmt(aoi.bounds.west)} —{" "}
                    {fmt(aoi.bounds.north)}, {fmt(aoi.bounds.east)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 col-span-2">
                  <div className="text-xs text-white/60">Center</div>
                  <div className="font-mono text-xs">
                    {fmt(aoi.center.lat)}, {fmt(aoi.center.lon)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-white/60">
                Use the toolbar on the map to draw a <b>Rectangle</b> or{" "}
                <b>Polygon</b>. You can edit or delete it after placing.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={runReport}
            className="rounded-lg bg-gradient-to-r from-cyan-400/90 to-emerald-400/90 px-4 py-2 text-black font-semibold hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50"
            disabled={!material.trim()}
          >
            Run Report with AOI
          </button>
          <button
            onClick={() => clearRef.current?.()}
            className="rounded-lg border border-white/20 px-4 py-2 text-white/90 hover:bg-white/10"
          >
            Clear AOI
          </button>
        </div>
      </div>
    </div>
  );
}
