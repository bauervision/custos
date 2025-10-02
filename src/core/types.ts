export type VendorId = string;

export type Breakdown = { finance: number; ethics: number; logistics: number };

export type Vendor = {
  id: VendorId; // stable id (not just name)
  name: string;
  country: string;
  keywords: string[];
  breakdown: Breakdown; // rolling (computed or provided)
};

export type Aoi = {
  bounds: { north: number; south: number; east: number; west: number };
};

export type StreamEvent = {
  vendorId: VendorId;
  name: string;
  country: string;
  keywords: string[]; // raw signals
  at: number; // epoch ms
};

export type RunPayload = {
  vendors: Vendor[];
  counts: Record<string, number>;
  aoi?: Aoi | null;
  seed?: string;
  createdAt: number;
};
