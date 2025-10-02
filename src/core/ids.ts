// src/core/ids.ts
/** Lightweight slug (ASCII, lowercase) */
export function toSlug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "") // drop apostrophes
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum -> dash
    .replace(/^-+|-+$/g, ""); // trim dashes
}

/** Stable vendor id derived from name + country */
export function makeVendorId(name: string, country: string) {
  return `${toSlug(name)}__${toSlug(country)}`;
}
