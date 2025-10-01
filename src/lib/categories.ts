// lib/categories.ts
export type CategoryKey =
  | "materials"
  | "tech"
  | "services"
  | "equipment"
  | "furniture"
  | "parts"
  | "other";

export type CategoryDef = {
  key: CategoryKey;
  label: string;
  /** Path data for a 24x24 icon (no JSX so this file can stay .ts) */
  iconPath: string;
};

export const CATEGORIES: CategoryDef[] = [
  {
    key: "materials",
    label: "Materials",
    iconPath: "M12 2 2 7l10 5 10-5-10-5Zm0 7L2 4v13l10 5 10-5V4l-10 5Z",
  },
  {
    key: "tech",
    label: "Tech",
    iconPath:
      "M8 3h8a2 2 0 0 1 2 2v2h-2V5H8v2H6V5a2 2 0 0 1 2-2Zm8 18H8a2 2 0 0 1-2-2v-2h2v2h8v-2h2v2a2 2 0 0 1-2 2ZM3 13V11h5v2H3Zm13 0v-2h5v2h-5ZM9 11h6v2H9Z",
  },
  {
    key: "services",
    label: "Services",
    iconPath: "M12 6a6 6 0 1 1-6 6H3a9 9 0 1 0 9-9v3Z",
  },
  {
    key: "equipment",
    label: "Equipment",
    iconPath:
      "M7 3h10l1 4H6l1-4Zm-1 6h12l2 10H4L6 9Zm3 2v6h2v-6h-2Zm4 0v6h2v-6h-2Z",
  },
  {
    key: "furniture",
    label: "Furniture",
    iconPath:
      "M4 10h16v4H4v-4Zm0 4H2v2h2v3h2v-3h12v3h2v-3h2v-2h-2v-4a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v4Z",
  },
  {
    key: "parts",
    label: "Parts",
    iconPath: "M7 2h10v4H7V2Zm-2 6h14v4H5V8Zm-2 6h18v8H3v-8Z",
  },
  {
    key: "other",
    label: "Other",
    iconPath:
      "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-1 4h2v6h-2V7Zm0 8h2v2h-2v-2Z",
  },
];

export const CATEGORY_PLACEHOLDER: Record<CategoryKey, string> = {
  materials: 'e.g., "cobalt", "rare earths", "lithium carbonate"',
  tech: 'e.g., "edge compute routers", "LoRa gateways"',
  services: 'e.g., "customs brokerage", "QA audit"',
  equipment: 'e.g., "centrifuges", "CNC mill", "3D printer"',
  furniture: 'e.g., "ESD benches", "lab stools"',
  parts: 'e.g., "M3 fasteners", "ceramic bearings"',
  other: "Describe what you need…",
};

export function getCategory(key: CategoryKey): CategoryDef {
  const hit = CATEGORIES.find((c) => c.key === key);
  if (!hit) return CATEGORIES[0];
  return hit;
}
