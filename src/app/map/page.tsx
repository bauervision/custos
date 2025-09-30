"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { patchLeafletIcons } from "@/lib/leaflet";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
});

export default function MapPage() {
  useEffect(() => {
    patchLeafletIcons();
  }, []);
  return (
    <div className="h-[calc(100vh-120px)] mx-auto max-w-6xl px-4 py-6">
      <MapClient />
    </div>
  );
}
