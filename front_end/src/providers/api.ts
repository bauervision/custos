import { DataProvider } from "@/core/provider";
import { Vendor, StreamEvent, RunPayload, Aoi } from "@/core/types";
import { z } from "zod";

const StreamZ = z.object({
  vendorId: z.string(),
  name: z.string(),
  country: z.string(),
  keywords: z.array(z.string()),
  at: z.number(),
});

export class ApiProvider implements DataProvider {
  constructor(private baseUrl = process.env.NEXT_PUBLIC_API_URL) {}

  async fetchVendors({
    aoi,
    seed,
  }: {
    aoi?: Aoi | null;
    seed?: string;
  }): Promise<Vendor[]> {
    const res = await fetch(
      `${this.baseUrl}/vendors?seed=${encodeURIComponent(seed ?? "")}`,
      {
        cache: "no-store",
      }
    );
    // TODO: validate with zod schema
    return (await res.json()) as Vendor[];
  }

  streamSignals({
    seed,
    intervalMs,
    totalMs,
    onEvent,
  }: {
    seed?: string;
    intervalMs?: number;
    totalMs?: number;
    onEvent: (e: StreamEvent) => void;
  }): () => void {
    // EventSource / WebSocket in real impl.
    const es = new EventSource(
      `${this.baseUrl}/stream?seed=${encodeURIComponent(seed ?? "")}`
    );
    es.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      const safe = StreamZ.parse(parsed);
      onEvent(safe);
    };
    // Optional: client-side cutoff for demo parity
    const t0 = Date.now();
    const id = setInterval(() => {
      if (Date.now() - t0 >= (totalMs ?? 60_000)) {
        es.close();
        clearInterval(id);
      }
    }, intervalMs ?? 2000);
    return () => {
      es.close();
      clearInterval(id);
    };
  }

  async saveRun(run: RunPayload): Promise<void> {
    await fetch(`${this.baseUrl}/runs`, {
      method: "POST",
      body: JSON.stringify(run),
    });
  }
  async loadLastRun(): Promise<RunPayload | null> {
    const res = await fetch(`${this.baseUrl}/runs/last`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as RunPayload;
  }
}
