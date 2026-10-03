"use client";

import { useEffect, useMemo, useState } from "react";
import { READERS, SAMPLE_CLAIMS, SAMPLE_TEXT, SAMPLE_TITLE } from "../lib/sample.mjs";

const MIN = 40;
const MAX = 12000;

function pill(segment) {
  if (segment.reason === "numbers") return { className: "pill bad", text: "Liczba spoza tekstu" };
  if (segment.grounding === "exact") return { className: "pill", text: "W tekście" };
  if (segment.grounding === "partial") return { className: "pill mid", text: "Częściowo" };
  return { className: "pill bad", text: "Bez cytatu" };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Coś poszło nie tak.");
  return data;
}

export default function Studio() {
  const [text, setText] = useState("");
  const [docName, setDocName] = useState("Wklejony tekst");
  const [reader, setReader] = useState("sasiad");
  const [phase, setPhase] = useState("edit");
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState("");
  const [segments, setSegments] = useState([]);
  const [rejected, setRejected] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [claim, setClaim] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [usingSample, setUsingSample] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then(setHealth)
      .catch(() => setHealth({ configured: false, model: "gemini-3.8-flash" }));
  }, []);

  const shownId = hoverId || activeId;
  const shown = segments.find((segment) => segment.id === shownId) || null;

  const highlight = useMemo(() => {
    if (claimResult?.start != null && !hoverId) {
      return {
        start: claimResult.start,
        end: claimResult.end,
        tone: claimResult.verdict === "not_in_source" ? "contrast" : "support",
      };
    }
    if (shown?.start != null) {
      return { start: shown.start, end: shown.end, tone: "support" };
    }
    return null;
  }, [claimResult, hoverId, shown]);

  useEffect(() => {
    const mark = document.getElementById("src-mark");
    if (!mark) return;
    mark.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [highlight?.start, highlight?.end, highlight?.tone]);

  const grounded = segments.filter((segment) => segment.grounding !== "missing" && segment.reason !== "numbers");
  const loose = segments.filter((segment) => segment.grounding === "missing" || segment.reason === "numbers");
  const accepted = grounded.filter((segment) => !rejected[segment.id]);

  async function run(nextReader = reader) {
    const source = text.trim();
    if (source.length < MIN || loading) return;
    setError("");
    setClaimResult(null);
    setLoading(true);
    setPhase("desk");
    setSegments([]);
    setRejected({});
    setActiveId(null);
    try {
      const data = await postJson("/api/rewrite", { text: source, reader: nextReader });
      setSegments(data.segments);
      const first =
        data.segments.find((segment) => segment.grounding !== "missing" && segment.reason !== "numbers") ||
        data.segments[0];
      setActiveId(first?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkClaim(value = claim) {
    const sentence = value.trim();
    if (sentence.length < 3 || claimLoading) return;
    setClaim(sentence);
    setClaimLoading(true);
    setError("");
    try {
      const data = await postJson("/api/check", { text: text.trim(), claim: sentence });
      setClaimResult(data);
      setHoverId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaimLoading(false);
    }
  }

  async function readFile(file) {
    if (!file) return;
    setError("");
    setUsingSample(false);
    if (file.size > 8 * 1024 * 1024) {
      setError("Plik jest większy niż 8 MB.");
      return;
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    try {
      if (isPdf) {
        setReadingFile(true);
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/extract", { method: "POST", body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Nie udało się odczytać PDF.");
        setText(data.text);
      } else {
        setText(await file.text());
      }
      setDocName(file.name);
      setPhase("edit");
    } catch (err) {
      setError(err.message);
    } finally {
      setReadingFile(false);
    }
  }

  function loadSample() {
    setText(SAMPLE_TEXT);
    setDocName(SAMPLE_TITLE);
    setUsingSample(true);
    setError("");
    setPhase("edit");
    setSegments([]);
    setClaimResult(null);
  }

  async function copyAccepted() {
    const payload = accepted.map((segment) => segment.simple).join("\n");
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const area = document.createElement("textarea");
      area.value = payload;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) {
        setError("Nie udało się skopiować. Zaznacz zdania ręcznie.");
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function changeReader(id) {
    setReader(id);
    if (phase === "desk" && text.trim().length >= MIN) run(id);
  }

  return (
    <div className="app">
      <header className="top">
        <button className="brand" type="button" onClick={() => setPhase("edit")}>
          <span className="mark" aria-hidden="true" />
          <span className="brand-name">Druga warstwa</span>
        </button>
        <p className="top-note">
          {`Model: ${health?.model?.startsWith("gemini-") ? health.model : "gemini-3.8-flash"}`}
          <br />
          Każde zdanie ma wskazać fragment oryginału.
        </p>
      </header>

      {phase === "edit" ? (
        <section className="composer">
          <div className="composer-inner">
            <h1>Połóż tekst. Obok powstanie prostsza warstwa.</h1>
            <p className="lede">
              Pismo, regulamin albo artykuł zostaje po lewej. Po prawej jest ten sam sens, krócej.
              Zdanie bez cytatu w oryginale nie wchodzi jako fakt.
            </p>

            <div
              className={dragOver ? "sheet over" : "sheet"}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                readFile(event.dataTransfer.files?.[0]);
              }}
            >
              <textarea
                value={text}
                maxLength={MAX + 200}
                placeholder="Wklej pismo, regulamin, artykuł albo instrukcję…"
                onChange={(event) => {
                  setText(event.target.value);
                  setUsingSample(false);
                  setDocName("Wklejony tekst");
                }}
              />
              <div className="sheet-foot">
                <span>{docName}</span>
                <span>{text.trim().length} / {MAX}</span>
              </div>
            </div>

            <div className="readers" role="group" aria-label="Czytelnik">
              {READERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === reader ? "reader on" : "reader"}
                  aria-pressed={item.id === reader}
                  onClick={() => setReader(item.id)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>

            <div className="actions">
              <button
                className="primary"
                type="button"
                disabled={loading || readingFile || text.trim().length < MIN || health?.configured === false}
                onClick={() => run()}
              >
                {loading ? "Układam warstwę…" : "Połóż drugą warstwę"}
              </button>
              <button className="ghost" type="button" onClick={loadSample}>
                Przykład: zawiadomienie wspólnoty
              </button>
              <label className="file">
                {readingFile ? "Czytam plik…" : "Wczytaj .txt albo PDF"}
                <input
                  type="file"
                  accept=".txt,.md,.pdf,text/plain,application/pdf"
                  onChange={(event) => {
                    readFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {health && !health.configured && (
              <div className="keybox">
                Brak klucza API. W pliku <strong>.env</strong> w tym folderze wpisz GEMINI_API_KEY, zapisz i uruchom ponownie <strong>npm run dev</strong>.
              </div>
            )}
            {error && <div className="error" role="alert">{error}</div>}
            <p className="fine">
              Prostsze zdania układa darmowy model Gemini. Zanim zdanie zostanie pokazane jako fakt, aplikacja szuka cytatu w oryginale.
              Tekst jest wysyłany do API. To nie jest porada prawna.
            </p>
          </div>
        </section>
      ) : (
        <main className="desk">
          <article className="paper">
            <p className="kicker">Źródło</p>
            <h2 className="doc-title">{docName}</h2>
            <SourceText text={text} highlight={highlight} />
          </article>

          <section className="layer" aria-busy={loading}>
            <div className="layer-head">
              <div>
                <h2>Druga warstwa</h2>
                <p className="counts">
                  {loading
                    ? "Szukam zdań, które da się podeprzeć cytatem…"
                    : `${accepted.length} przyjętych · ${loose.length} bez cytatu`}
                </p>
              </div>
              <div className="head-actions">
                {READERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === reader ? "mini on" : "mini"}
                    disabled={loading}
                    onClick={() => changeReader(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                <button className="mini" type="button" onClick={copyAccepted} disabled={!accepted.length}>
                  {copied ? "Skopiowane" : "Kopiuj przyjęte"}
                </button>
                <button className="mini" type="button" onClick={() => setPhase("edit")}>
                  Popraw tekst
                </button>
              </div>
            </div>

            <div className="cards">
              {loading && (
                <>
                  <div className="skeleton" />
                  <div className="skeleton" />
                  <div className="skeleton" />
                </>
              )}
              {!loading && error && segments.length === 0 && (
                <div className="error" role="alert">
                  {error}
                  <div style={{ marginTop: 8 }}>
                    <button className="mini" type="button" onClick={() => run()}>Spróbuj jeszcze raz</button>
                  </div>
                </div>
              )}
              {!loading && segments.length > 0 && (
                <>
                  {grounded.map((segment, index) => (
                    <Card
                      key={segment.id}
                      segment={segment}
                      index={index + 1}
                      active={segment.id === shownId}
                      rejected={Boolean(rejected[segment.id])}
                      onHover={setHoverId}
                      onPick={() => {
                        setHoverId(null);
                        setActiveId(segment.id);
                        setClaimResult(null);
                      }}
                      onReject={() =>
                        setRejected((current) => ({ ...current, [segment.id]: !current[segment.id] }))
                      }
                    />
                  ))}
                  {loose.length > 0 && <p className="group-label">Bez oparcia w tekście</p>}
                  {loose.map((segment) => (
                    <Card
                      key={segment.id}
                      segment={segment}
                      loose
                      active={segment.id === shownId}
                      onHover={setHoverId}
                      onPick={() => {
                        setHoverId(null);
                        setActiveId(segment.id);
                        setClaimResult(null);
                      }}
                    />
                  ))}
                </>
              )}
            </div>

            <form
              className="checker"
              onSubmit={(event) => {
                event.preventDefault();
                checkClaim();
              }}
            >
              <h3>Sprawdź zdanie, którego w piśmie może nie być</h3>
              <div className="claim-row">
                <input
                  value={claim}
                  placeholder="Np. za domofon trzeba dopłacić 500 zł"
                  onChange={(event) => setClaim(event.target.value)}
                />
                <button className="primary" type="submit" disabled={claimLoading || claim.trim().length < 3}>
                  {claimLoading ? "Sprawdzam…" : "Sprawdź"}
                </button>
              </div>
              {usingSample && (
                <div className="chips">
                  {SAMPLE_CLAIMS.map((item) => (
                    <button
                      key={item.label}
                      className="chip"
                      type="button"
                      onClick={() => checkClaim(item.text)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {claimResult && <Verdict result={claimResult} />}
              {error && segments.length > 0 && <div className="error" role="alert">{error}</div>}
              <p className="hint">
                Liczb spoza tekstu nie da się tu przemycić. Zdanie bez liczb ocenia model i musi pokazać cytat.
                Odrzucone karty nie wchodzą do kopii. To nie jest porada prawna.
              </p>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}

function SourceText({ text, highlight }) {
  if (!highlight || highlight.start == null || highlight.end <= highlight.start) return <p className="doc">{text}</p>;
  const { start, end, tone } = highlight;
  return (
    <p className="doc">
      {text.slice(0, start)}
      <mark id="src-mark" className={tone}>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </p>
  );
}

function Card({ segment, index, active, rejected, loose, onHover, onPick, onReject }) {
  const badge = pill(segment);
  return (
    <article
      className={`card${active ? " active" : ""}${loose ? " loose" : ""}${rejected ? " rejected" : ""}`}
      onMouseEnter={() => onHover(segment.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button type="button" className="card-hit" onClick={onPick}>
        <div className="card-top">
          <span className="idx">{loose ? "—" : String(index).padStart(2, "0")}</span>
          <span className={badge.className}>{badge.text}</span>
        </div>
        <p className="simple">{segment.simple}</p>
        <p className="quote">
          {segment.reason === "numbers"
            ? `W cytacie nie ma liczby z tego zdania: ${segment.quote}`
            : segment.grounding === "missing"
              ? `Model podał cytat, którego nie ma w tekście: ${segment.modelQuote || "brak"}`
              : segment.quote}
        </p>
      </button>
      {onReject && (
        <div className="meta">
          <span />
          <button type="button" className="linkish" onClick={onReject}>
            {rejected ? "Przywróć" : "Odrzuć"}
          </button>
        </div>
      )}
    </article>
  );
}

function Verdict({ result }) {
  const tone = result.verdict === "in_source" ? "ok" : result.verdict === "partial" ? "mid" : "bad";
  const title =
    result.verdict === "in_source"
      ? "Jest w tekście"
      : result.verdict === "partial"
        ? "Jest o tym fragment, ale dopasowanie nie jest dosłowne"
        : result.showedContrast
          ? "Tego zdania nie da się oprzeć na tekście"
          : "Tego nie ma w tekście";
  return (
    <div className={`verdict ${tone}`}>
      <strong>{title}</strong>
      {result.why}
    </div>
  );
}
