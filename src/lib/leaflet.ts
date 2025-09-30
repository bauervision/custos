// No top-level leaflet imports here — keeps SSR safe.

let alreadyPatched = false;

/**
 * Patch Leaflet's default marker icon URLs (client-only).
 * Safe to call multiple times; it's a no-op after the first patch.
 */
export async function patchLeafletIcons() {
  if (alreadyPatched) return;
  if (typeof window === "undefined") return;

  const L = (await import("leaflet")).default;

  const iconUrl = "/leaflet/marker-icon.png";
  const iconRetinaUrl = "/leaflet/marker-icon-2x.png";
  const shadowUrl = "/leaflet/marker-shadow.png";

  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
  });

  alreadyPatched = true;
}
