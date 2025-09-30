"use client";
import { create } from "zustand";

type Sel = {
  hoverVendor?: string;
  setHoverVendor: (name?: string) => void;
  selectedVendor?: string;
  setSelectedVendor: (name?: string) => void;
};

export const useSelection = create<Sel>((set) => ({
  hoverVendor: undefined,
  setHoverVendor: (name) => set({ hoverVendor: name }),
  selectedVendor: undefined,
  setSelectedVendor: (name) => set({ selectedVendor: name }),
}));
