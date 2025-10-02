import { Breakdown } from "@/core/types";
import {
  scoreKeywords as score,
  riskFromBreakdown as risk,
  recommendationScore as rec,
} from "@/lib/scoring";

export function scoreKeywords(keywords: string[]): Breakdown {
  return score(keywords);
}
export function riskFromBreakdown(b: Breakdown): number {
  return risk(b);
}
export function recommendationScore(r: number): number {
  return rec(r);
}
