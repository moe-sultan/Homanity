import { claudeExtractor } from "./claudeExtractor";
import { mockExtractor } from "./mockExtractor";
import type { ContextExtractor, UserContext } from "./types";

// The single swap point for context extraction. With ANTHROPIC_API_KEY set,
// Claude reads the renter's description; otherwise (or if the call fails)
// the rule-based extractor runs, so the demo always works.
export function getExtractor(): ContextExtractor {
  if (!process.env.ANTHROPIC_API_KEY) return mockExtractor;
  return {
    async extract(text: string): Promise<UserContext> {
      try {
        return await claudeExtractor.extract(text);
      } catch (e) {
        console.warn("Claude extraction failed, using the rule-based extractor instead:", e);
        return mockExtractor.extract(text);
      }
    },
  };
}

export type { UserContext, ContextExtractor } from "./types";
