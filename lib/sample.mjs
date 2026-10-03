export const READERS = [
  {
    id: "sasiad",
    label: "Mam minutę",
    hint: "Same decyzje: co, kiedy, ile",
    instruction:
      "Czytelnik ma jedną minutę. Zostaw tylko informacje, po których trzeba coś zrobić albo o których trzeba wiedzieć: data, godzina, kwota, termin, zakaz, kontakt. Jedno zdanie na informację. Bez powitania i bez powtarzania nagłówka.",
  },
  {
    id: "pierwszy",
    label: "Pierwszy raz",
    hint: "Krótkie zdania, zwykłe słowa",
    instruction:
      "Czytelnik widzi takie pismo pierwszy raz. Pisz bardzo prostym polskim, krótkimi zdaniami. Każde zdanie ma mówić, co z tego wynika. Słowa urzędowe zamieniaj na zwykłe, ale nie zmieniaj liczb ani dat.",
  },
  {
    id: "dokladnie",
    label: "Bez skrótów",
    hint: "Warunki, wyjątki, terminy",
    instruction:
      "Czytelnik nie chce nic zgubić. Nie pomijaj warunków, wyjątków i terminów. Pisz prościej niż oryginał, ale każda liczba, data i warunek, który zmienia skutek, ma się pojawić.",
  },
];

export const SAMPLE_TITLE = "Zawiadomienie wspólnoty";

export const SAMPLE_TEXT = `Wspólnota Mieszkaniowa „Słowiańska 12”
ul. Słowiańska 12, 30-001 Kraków

Zawiadomienie o zebraniu właścicieli

Szanowni Państwo,

informujemy, że zebranie właścicieli odbędzie się 18 listopada 2026 r. o godzinie 18:00 w sali na parterze. Osoby, które nie mogą przyjść, mogą oddać głos przez pełnomocnictwo złożone w administracji do 17 listopada 2026 r. do godziny 15:00.

Porządek zebrania:

1. Malowanie klatki schodowej planowane jest na kwiecień 2027. Koszt dla mieszkania o powierzchni 50 m² wynosi 240 zł i należy go wpłacić do 15 marca 2027 r. na konto wspólnoty. Mieszkania o innej powierzchni rozliczane są proporcjonalnie do metrażu.

2. Wymiana domofonu nastąpi 1 grudnia 2026 r. Od tego dnia wejście na klatkę będzie możliwe kodem wysłanym SMS-em. Stare klucze działają do 30 listopada 2026 r. Wymiana nie wiąże się z dodatkową opłatą.

3. Właściciele z zaległościami wobec wspólnoty nie mogą głosować, dopóki zaległość nie zostanie spłacona najpóźniej w dniu zebrania, przed jego otwarciem.

Nie przewiduje się podwyżki czynszu na 2026 rok.

Kontakt z administracją: administracja@slowianska12.pl, telefon 12 400 20 20, dni robocze od 9:00 do 14:00.
`;

export const SAMPLE_CLAIMS = [
  {
    label: "Zebranie o 18:00",
    text: "Zebranie właścicieli jest 18 listopada 2026 o godzinie 18:00.",
  },
  {
    label: "Malowanie 240 zł",
    text: "Za malowanie klatki mieszkanie 50 m² płaci 240 zł do 15 marca 2027.",
  },
  {
    label: "Domofon 500 zł",
    text: "Za wymianę domofonu trzeba dopłacić 500 zł.",
  },
  {
    label: "Czynsz w górę",
    text: "Czynsz wzrośnie od stycznia 2026.",
  },
];

export function readerById(id) {
  return READERS.find((reader) => reader.id === id) || READERS[0];
}
