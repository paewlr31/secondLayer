// Model może zmyślić cytat. Tutaj sprawdzamy, czy fragment naprawdę siedzi w tekście.
// Dopiero po tym zdanie wolno pokazać jako fakt.

function stripWrap(quote) {
  return String(quote || "")
    .trim()
    .replace(/^["„“«']+/, "")
    .replace(/["”»']+$/, "")
    .trim();
}

function isSpace(ch) {
  return /\s/.test(ch);
}

function foldChar(ch, casefold) {
  if (ch === "\u00a0") return " ";
  if (/[„“”«»]/.test(ch)) return '"';
  if (/[–—]/.test(ch)) return "-";
  return casefold ? ch.toLocaleLowerCase("pl") : ch;
}

export function foldIndex(source, casefold) {
  let text = "";
  const map = [];
  let i = 0;
  while (i < source.length) {
    const raw = source[i];
    if (isSpace(raw) || raw === "\u00a0") {
      const spaceAt = i;
      while (i < source.length && (isSpace(source[i]) || source[i] === "\u00a0")) i++;
      if (text.length === 0 || text.endsWith(" ")) continue;
      text += " ";
      map.push(spaceAt);
      continue;
    }
    text += foldChar(raw, casefold);
    map.push(i);
    i++;
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}

export function foldString(value, casefold) {
  return foldIndex(value, casefold).text;
}

function wordsWithIndex(value) {
  const re = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9]{4,}/g;
  const out = [];
  let match;
  const source = String(value);
  while ((match = re.exec(source))) {
    out.push({
      w: match[0].toLocaleLowerCase("pl"),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return out;
}

function anchorSpan(source, quote) {
  const quoteWords = wordsWithIndex(quote).map((item) => item.w);
  const sourceWords = wordsWithIndex(source);
  if (quoteWords.length < 4) return null;

  let best = null;
  for (let i = 0; i < sourceWords.length; i++) {
    let cursor = i;
    let matched = 0;
    let first = null;
    let last = null;
    for (const word of quoteWords) {
      let scan = cursor;
      while (scan < sourceWords.length && sourceWords[scan].w !== word) scan++;
      if (scan >= sourceWords.length) continue;
      cursor = scan;
      if (!first) first = sourceWords[cursor];
      last = sourceWords[cursor];
      matched += 1;
      cursor += 1;
    }
    if (!first || !last) continue;
    const span = last.end - first.start;
    const coverage = matched / quoteWords.length;
    if (matched < 4 || coverage < 0.72 || span < 15 || span > 520) continue;
    if (!best || matched > best.matched || (matched === best.matched && span < best.span)) {
      best = { start: first.start, end: last.end, matched, span };
    }
  }

  if (!best) return null;
  return { start: best.start, end: best.end, grounding: "partial" };
}

export function locateQuote(source, quote) {
  const cleaned = stripWrap(quote);
  if (!source || cleaned.length < 4) return null;

  for (const casefold of [false, true]) {
    const indexed = foldIndex(source, casefold);
    const needle = foldString(cleaned, casefold);
    if (needle.length < 4) return null;
    const at = indexed.text.indexOf(needle);
    if (at >= 0) {
      const start = indexed.map[at];
      const last = indexed.map[at + needle.length - 1];
      return { start, end: last + 1, grounding: "exact" };
    }
  }

  return anchorSpan(source, cleaned);
}

export function numberTokens(value) {
  return String(value || "").match(/\d{1,4}[:.]\d{2}|\d{2,}/g) || [];
}

export function numbersHold(claim, haystack) {
  const hay = String(haystack || "");
  return numberTokens(claim).every((token) => hay.includes(token));
}

export function assessSegment(sourceText, simple, quote) {
  const located = locateQuote(sourceText, quote);
  if (!located) {
    return { grounding: "missing", start: null, end: null, reason: "missing" };
  }
  const slice = sourceText.slice(located.start, located.end);
  if (!numbersHold(simple, slice)) {
    return { grounding: "missing", start: located.start, end: located.end, reason: "numbers" };
  }
  if (located.grounding === "partial") {
    return { grounding: "partial", start: located.start, end: located.end, reason: "partial" };
  }
  return { grounding: "exact", start: located.start, end: located.end, reason: "exact" };
}

export function assessClaim(sourceText, claim, model) {
  const why = String(model?.why || "").trim();
  const flagged = model?.in_source === true || model?.in_source === "true";
  const located = locateQuote(sourceText, model?.source || "");
  const numsOk = numbersHold(claim, sourceText);
  let verdict = "not_in_source";

  if (flagged && located && numsOk) {
    const slice = sourceText.slice(located.start, located.end);
    const quoteHasNumbers = numbersHold(claim, slice);
    verdict = located.grounding === "exact" && quoteHasNumbers ? "in_source" : "partial";
  }

  const fallback =
    verdict === "not_in_source"
      ? "W tekście nie ma oparcia dla tego zdania."
      : "Fragment źródła pokrywa to zdanie.";

  return {
    verdict,
    why: why || fallback,
    start: located?.start ?? null,
    end: located?.end ?? null,
    showedContrast: verdict === "not_in_source" && Boolean(located),
  };
}
