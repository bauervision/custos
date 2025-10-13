import { Aoi, RunPayload, StreamEvent, Vendor } from "./types";

export interface DataProvider {
  // one-shot fetch (e.g., for results/dashboard)
  fetchVendors(params: { aoi?: Aoi | null; seed?: string }): Promise<Vendor[]>;

  // streaming signals -> caller applies scoring
  streamSignals(params: {
    seed?: string;
    intervalMs?: number;
    totalMs?: number;
    onEvent: (evt: StreamEvent) => void;
  }): () => void; // returns stop()

  // persistence (local/session or server)
  saveRun(run: RunPayload): Promise<void>;
  loadLastRun(): Promise<RunPayload | null>;
}
