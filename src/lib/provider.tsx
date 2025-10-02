// src/lib/provider.tsx
"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { VendorMode, Prescreen, Vendor } from "@/lib/types";

type ProviderAPI = {
  vendorMode: VendorMode;
  setVendorMode: (m: VendorMode) => void;

  prescreen: Prescreen;
  setPrescreen: (p: Prescreen) => void;

  // discovery results (fast)
  discoveryVendors: Vendor[];
  setDiscoveryVendors: (v: Vendor[]) => void;

  // proceed with vetting
  startVetting: (seed: string, aoi?: any) => void;
};

const KustosContext = createContext<ProviderAPI | null>(null);

export function KustosProvider({ children }: { children: React.ReactNode }) {
  const [vendorMode, setVendorMode] = useState<VendorMode>("discovery");
  const [prescreen, setPrescreen] = useState<Prescreen>({
    include: [],
    exclude: [],
  });
  const [discoveryVendors, setDiscoveryVendors] = useState<Vendor[]>([]);

  const routerRef = useRef<any>(null);

  const startVetting = (seed: string, aoi?: any) => {
    const url = new URL("/loading/", window.location.origin);
    url.searchParams.set("seed", seed);
    if (aoi?.center) url.searchParams.set("zoom", "aoi");
    window.location.href = url.toString();
  };

  return (
    <KustosContext.Provider
      value={{
        vendorMode,
        setVendorMode,
        prescreen,
        setPrescreen,
        discoveryVendors,
        setDiscoveryVendors,
        startVetting,
      }}
    >
      {children}
    </KustosContext.Provider>
  );
}

export const useKustos = () => {
  const ctx = useContext(KustosContext);
  if (!ctx) throw new Error("KustosProvider missing");
  return ctx;
};
