import { integrationStatus } from "@/lib/integrations";

// Which data sources are live, so the UI can say where numbers come from.
export async function GET() {
  return Response.json(integrationStatus());
}
