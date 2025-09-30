"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function MapClient() {
  return (
    <MapContainer
      center={[-28.47, 24.67]}
      zoom={5}
      className="h-full w-full rounded-xl overflow-hidden border border-white/10"
    >
      <TileLayer
        // Simple OSM for now; later: a minimal/regional style
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      <Marker position={[-29, 24]}>
        <Popup>Example vendor (placeholder)</Popup>
      </Marker>
    </MapContainer>
  );
}
