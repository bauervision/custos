import { DataProvider } from "./provider";
import { MockProvider } from "@/providers/mock";
import { ApiProvider } from "@/providers/api";

export function getProvider(): DataProvider {
  const mode = process.env.NEXT_PUBLIC_PROVIDER ?? "mock";
  return mode === "api" ? new ApiProvider() : new MockProvider();
}
