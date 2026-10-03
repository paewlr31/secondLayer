import { assessClaim, assessSegment, locateQuote, numbersHold } from "../lib/ground.mjs";
import { SAMPLE_TEXT } from "../lib/sample.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const meeting = "zebranie właścicieli odbędzie się 18 listopada 2026 r. o godzinie 18:00 w sali na parterze";
const found = locateQuote(SAMPLE_TEXT, meeting);
assert(found?.grounding === "exact", "dokładny cytat ma być exact");
assert(SAMPLE_TEXT.slice(found.start, found.end).includes("18:00"), "wycinek ma zawierać godzinę");

const spaced = locateQuote(
  "Koszt   wynosi\n240 zł.",
  "Koszt wynosi 240 zł."
);
assert(spaced?.grounding === "exact", "różne białe znaki nadal są dokładnym trafieniem");
assert(numbersHold("dopłata 500 zł", SAMPLE_TEXT) === false, "500 zł nie występuje w piśmie");
assert(numbersHold("240 zł do 15 marca 2027", SAMPLE_TEXT) === true, "240 i 2027 są w piśmie");

const almost =
  "Koszt dla mieszkania o powierzchni 50 m² wynosi około 240 zł i należy go wpłacić do 15 marca 2027 r. na konto wspólnoty";
const partial = assessSegment(SAMPLE_TEXT, "Mieszkanie 50 m² płaci 240 zł do 15 marca 2027.", almost);
assert(partial.grounding === "partial", "dopisek «około» nie może być dokładnym cytatem");
assert(partial.start != null, "częściowe trafienie nadal wskazuje fragment");

const invented = assessSegment(SAMPLE_TEXT, "Za domofon dopłacasz 500 zł.", "Za domofon dopłacasz 500 zł.");
assert(invented.grounding === "missing", "zmyślone zdanie nie dostaje cytatu");

const boosted = assessSegment(
  SAMPLE_TEXT,
  "Za domofon dopłacasz 500 zł.",
  "Wymiana nie wiąże się z dodatkową opłatą."
);
assert(boosted.reason === "numbers", "liczba spoza cytatu wyrzuca zdanie z faktów");

const wrapped = locateQuote(SAMPLE_TEXT, `„${meeting}”`);
assert(wrapped?.grounding === "exact", "cudzysłów wokół cytatu nie psuje trafienia");

const lie = assessClaim(SAMPLE_TEXT, "Za wymianę domofonu trzeba dopłacić 500 zł.", {
  in_source: true,
  source: "Wymiana nie wiąże się z dodatkową opłatą.",
  why: "Tekst mówi, że dopłaty nie ma.",
});
assert(lie.verdict === "not_in_source", "liczba spoza tekstu obala werdykt modelu");
assert(lie.showedContrast === true, "przy fałszu zostaje fragment, który model wskazał");

const truth = assessClaim(SAMPLE_TEXT, "Zebranie jest o godzinie 18:00.", {
  in_source: true,
  source: meeting,
  why: "Godzina jest w zawiadomieniu.",
});
assert(truth.verdict === "in_source", "prawdziwe zdanie z cytatem przechodzi");

const opposite = assessClaim(SAMPLE_TEXT, "Czynsz wzrośnie od stycznia 2026.", {
  in_source: false,
  source: "Nie przewiduje się podwyżki czynszu na 2026 rok.",
  why: "Tekst mówi, że podwyżki nie będzie.",
});
assert(opposite.verdict === "not_in_source", "sprzeczne zdanie zostaje poza źródłem");
assert(opposite.showedContrast === true, "widać zdanie o braku podwyżki");

console.log("ground: ok");
