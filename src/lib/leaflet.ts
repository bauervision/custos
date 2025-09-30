// Fix Leaflet marker icon paths in Next build
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconUrl = "/leaflet/marker-icon.png";
const iconRetinaUrl = "/leaflet/marker-icon-2x.png";
const shadowUrl = "/leaflet/marker-shadow.png";

export function patchLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
}
