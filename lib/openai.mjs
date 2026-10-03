function parseJson(content) {
  const trimmed = String(content || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Model nie zwrócił JSON.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

export function readModelName() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function hasApiKey() {
  const key = process.env.OPENAI_API_KEY || "";
  return Boolean(key.trim()) && !key.includes("tutaj-wklej");
}

export async function chatJson({ system, user, maxTokens = 1800 }) {
  if (!hasApiKey()) {
    const error = new Error(
      "Brak klucza OPENAI_API_KEY. Wpisz go w pliku .env i uruchom ponownie npm run dev."
    );
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(50000),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: readModelName(),
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "OpenAI nie odpowiedziało.");
    error.status = response.status;
    throw error;
  }

  const content = data.choices?.[0]?.message?.content || "";
  return parseJson(content);
}

export function publicError(error) {
  const status = error.status || 500;
  if (status === 503) return { status, message: error.message };
  if (status === 401) {
    return { status, message: "Klucz OpenAI został odrzucony. Sprawdź OPENAI_API_KEY w pliku .env." };
  }
  if (status === 429) {
    return { status, message: "OpenAI ograniczyło liczbę zapytań. Odczekaj chwilę i spróbuj jeszcze raz." };
  }
  return { status, message: error.message || "Nie udało się uzyskać odpowiedzi modelu." };
}
