// src/lib/types.ts
export type VendorMode = "vetting" | "discovery";

export type Prescreen = {
  include: string[]; // positive topics
  exclude: string[]; // negative topics
};

// what you already had
export type Vendor = {
  id: string;
  name: string;
  country: string; // human name (e.g., "South Africa")
  // optional: countryCode?: string; // if you want ISO-2 later
};
