import { makeVendorId } from "@/core/ids";
import { DataProvider } from "@/core/provider";
import { Vendor, StreamEvent, RunPayload, Aoi } from "@/core/types";
import { startStream } from "@/lib/stream"; // your existing simulator

export class MockProvider implements DataProvider {
  async fetchVendors(_params: {
    aoi?: Aoi | null;
    seed?: string;
  }): Promise<Vendor[]> {
    // For now, we don’t prefetch; results come from saved run.
    const last = await this.loadLastRun();
    return last?.vendors ?? [];
  }

  streamSignals(params: {
    seed?: string;
    intervalMs?: number;
    totalMs?: number;
    onEvent: (evt: StreamEvent) => void;
  }): () => void {
    return startStream({
      totalMs: params.totalMs ?? 60_000,
      intervalMs: params.intervalMs ?? 2_000,
      seed: params.seed,
      onEvent(hit) {
        params.onEvent({
          vendorId: makeVendorId(hit.name, hit.country),
          name: hit.name,
          country: hit.country,
          keywords: hit.keywords,
          at: Date.now(),
        });
      },
    });
  }

  async saveRun(run: RunPayload): Promise<void> {
    sessionStorage.setItem("kustos:run", JSON.stringify(run));
  }
  async loadLastRun(): Promise<RunPayload | null> {
    const raw = sessionStorage.getItem("kustos:run");
    return raw ? (JSON.parse(raw) as RunPayload) : null;
  }
}
