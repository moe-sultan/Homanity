// Server-only view of which real integrations are switched on. Each one is
// optional: with no key the app falls back to curated data and estimates, so
// the demo always runs.
export const integrations = {
  claude: () => !!process.env.ANTHROPIC_API_KEY,
  googleMaps: () => !!process.env.GOOGLE_MAPS_API_KEY,
};

export type IntegrationStatus = {
  contextExtraction: "claude" | "rules";
  travelTimes: "google" | "estimate";
  placeSearch: "google" | "curated";
  streetView: boolean;
};

export function integrationStatus(): IntegrationStatus {
  const google = integrations.googleMaps();
  return {
    contextExtraction: integrations.claude() ? "claude" : "rules",
    travelTimes: google && process.env.GOOGLE_ROUTES_DISABLED !== "1" ? "google" : "estimate",
    placeSearch: google ? "google" : "curated",
    streetView: google && process.env.GOOGLE_STREETVIEW_DISABLED !== "1",
  };
}
