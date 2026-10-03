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
  const name = process.env.GEMINI_MODEL || "";
  return name.startsWith("gemini-") ? name : "gemini-3.8-flash";
}

export function hasApiKey() {
  const key = process.env.GEMINI_API_KEY || "";
  return Boolean(key.trim()) && !key.includes("tutaj-wklej");
}

function answerText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => part && !part.thought && part.text)
    .map((part) => part.text)
    .join("");
}

export async function chatJson({ system, user, maxTokens = 1800 }) {
  if (!hasApiKey()) {
    const error = new Error(
      "Brak klucza GEMINI_API_KEY. Wpisz go w pliku .env i uruchom ponownie npm run dev."
    );
    error.status = 503;
    throw error;
  }

  const model = readModelName();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(50000),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY.trim(),
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Gemini nie odpowiedziało.");
    error.status = data?.error?.code || response.status;
    throw error;
  }

  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) {
    const error = new Error("Gemini odrzuciło ten tekst. Skróć go albo usuń fragment, który wygląda na wrażliwy.");
    error.status = 400;
    throw error;
  }

  const content = answerText(data);
  if (!content) {
    const error = new Error("Model nic nie zwrócił. Spróbuj jeszcze raz.");
    error.status = 502;
    throw error;
  }
  return parseJson(content);
}

export function publicError(error) {
  const status = error.status || 500;
  if (status === 503) return { status, message: error.message };
  if (status === 400) return { status, message: error.message };
  if (status === 401 || status === 403) {
    return {
      status,
      message: "Klucz Gemini został odrzucony. Sprawdź GEMINI_API_KEY w pliku .env.",
    };
  }
  if (status === 429) {
    return {
      status,
      message: "Darmowy limit Gemini się skończył na tę minutę. Odczekaj chwilę i spróbuj jeszcze raz.",
    };
  }
  return { status, message: error.message || "Nie udało się uzyskać odpowiedzi modelu." };
}
