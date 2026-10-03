import { hasApiKey, readModelName } from "../../../lib/openai.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    configured: hasApiKey(),
    model: readModelName(),
  });
}
