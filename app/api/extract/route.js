import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Nie przesłano pliku PDF." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: "PDF jest większy niż 8 MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(extracted?.text) ? extracted.text.join("\n\n") : String(extracted?.text || "");
    const text = raw
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 40) {
      return Response.json(
        {
          error:
            "W tym PDF-ie nie ma warstwy tekstu. Skan bez tekstu tu nie zadziała — wklej treść albo użyj pliku .txt.",
        },
        { status: 422 }
      );
    }

    return Response.json({ text: text.slice(0, 12000) });
  } catch {
    return Response.json(
      { error: "Nie udało się odczytać PDF. Wklej tekst albo użyj pliku .txt." },
      { status: 422 }
    );
  }
}
