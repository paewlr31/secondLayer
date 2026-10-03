import { assessSegment } from "../../../lib/ground.mjs";
import { chatJson, publicError } from "../../../lib/model.mjs";
import { REWRITE_SYSTEM } from "../../../lib/prompts.mjs";
import { readerById } from "../../../lib/sample.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN = 40;
const MAX = 12000;

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Niepoprawne żądanie." }, { status: 400 });
    }
    const text = String(body.text || "").trim();
    const reader = readerById(body.reader);

    if (text.length < MIN) {
      return Response.json(
        { error: "Wklej dłuższy tekst. Jedno zdanie to za mało na drugą warstwę." },
        { status: 400 }
      );
    }
    if (text.length > MAX) {
      return Response.json(
        { error: "Tekst ma więcej niż 12 000 znaków. Wklej fragment, który naprawdę czytacie." },
        { status: 413 }
      );
    }

    const parsed = await chatJson({
      system: REWRITE_SYSTEM,
      user: `Czytelnik: ${reader.instruction}\n\nTekst źródłowy:\n${text}`,
      maxTokens: 4096,
    });

    const raw = Array.isArray(parsed.segments) ? parsed.segments : [];
    const seen = new Set();
    const segments = [];

    for (const item of raw) {
      const simple = String(item?.simple || "").replace(/\s+/g, " ").trim();
      const quote = String(item?.source || "").trim();
      if (simple.length < 2 || seen.has(simple)) continue;
      seen.add(simple);
      const assessed = assessSegment(text, simple, quote);
      segments.push({
        id: `s${segments.length + 1}`,
        simple,
        quote: assessed.start != null ? text.slice(assessed.start, assessed.end) : quote,
        modelQuote: quote,
        grounding: assessed.grounding,
        reason: assessed.reason,
        start: assessed.start,
        end: assessed.end,
      });
      if (segments.length >= 12) break;
    }

    if (segments.length === 0) {
      return Response.json(
        { error: "Model nie ułożył żadnego zdania. Spróbuj jeszcze raz albo skróć tekst." },
        { status: 502 }
      );
    }

    return Response.json({
      reader: reader.id,
      segments,
    });
  } catch (error) {
    const pub = publicError(error);
    return Response.json({ error: pub.message }, { status: pub.status });
  }
}
