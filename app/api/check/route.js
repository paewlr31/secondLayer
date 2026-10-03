import { assessClaim } from "../../../lib/ground.mjs";
import { chatJson, publicError } from "../../../lib/openai.mjs";
import { CHECK_SYSTEM } from "../../../lib/prompts.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Niepoprawne żądanie." }, { status: 400 });
    }
    const text = String(body.text || "").trim();
    const claim = String(body.claim || "").replace(/\s+/g, " ").trim();

    if (text.length < 40) {
      return Response.json({ error: "Najpierw wklej tekst źródłowy." }, { status: 400 });
    }
    if (claim.length < 3 || claim.length > 400) {
      return Response.json(
        { error: "Wpisz jedno zdanie do sprawdzenia, do 400 znaków." },
        { status: 400 }
      );
    }

    const parsed = await chatJson({
      system: CHECK_SYSTEM,
      user: `Zdanie:\n${claim}\n\nTekst źródłowy:\n${text}`,
      maxTokens: 500,
    });

    const result = assessClaim(text, claim, parsed);
    return Response.json({
      claim,
      ...result,
      quote: result.start != null ? text.slice(result.start, result.end) : "",
    });
  } catch (error) {
    const pub = publicError(error);
    return Response.json({ error: pub.message }, { status: pub.status });
  }
}
