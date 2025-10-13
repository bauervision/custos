// src/app/vendor/[slug]/page.tsx
"use client";
import { useMemo } from "react";
import { loadLatestRun } from "@/lib/results";
import VendorCard from "@/components/loading/VendorCard";

export default function VendorDetail({ params }: { params: { slug: string } }) {
  const data = useMemo(() => loadLatestRun(), []);
  const vendors = (data?.vendors ?? []) as any[];
  const vendor = vendors.find(
    (v) => v.name.toLowerCase().replace(/\s+/g, "-") === params.slug
  );

  if (!vendor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-white/70">Vendor not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">{vendor.name}</h1>
      <VendorCard v={vendor} />
      {/* add deeper sections: docs, signals timeline, audits, etc. */}
    </div>
  );
}
