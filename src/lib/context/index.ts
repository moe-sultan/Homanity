import { mockExtractor } from "./mockExtractor";
import type { ContextExtractor } from "./types";

// The single swap point for context extraction. Replace with an LLM-backed
// extractor (e.g. a Claude call returning the UserContext JSON shape) when an
// API key is available; the rest of the app only sees UserContext.
export function getExtractor(): ContextExtractor {
  return mockExtractor;
}

export type { UserContext, ContextExtractor } from "./types";
