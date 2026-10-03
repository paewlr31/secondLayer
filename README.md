# Druga warstwa

Trudny tekst zostaje po lewej. Po prawej jest prostsza wersja. Każde zdanie musi wskazać cytat, który aplikacja sama znajduje w oryginale. Liczby spoza tekstu są odrzucane, nawet jeśli model uzna je za prawdziwe.

## Uruchomienie

Potrzebny jest Node 20 i klucz OpenAI.

```powershell
cd C:\Users\pryce\Desktop\praca\hackaton
npm install
```

W pliku `.env` wpisz:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Potem:

```powershell
npm run dev
```

Otwórz http://localhost:3000

Na starcie kliknij „Przykład: zawiadomienie wspólnoty”, potem „Połóż drugą warstwę”. Na dole są cztery zdania do sprawdzenia. Dwa ostatnie („Domofon 500 zł” i „Czynsz w górę”) nie wynikają z pisma.

Można wkleić własny tekst albo wczytać `.txt` / PDF z warstwą tekstu.

## Co jest czym

- `components/Studio.js` — ekran
- `app/api/rewrite` — uproszczenie
- `app/api/check` — sprawdzenie jednego zdania
- `app/api/extract` — tekst z PDF
- `lib/ground.mjs` — szukanie cytatu w oryginale

Tekst jest wysyłany do API OpenAI. To nie jest porada prawna.

Regulamin HackYeah każe oddzielić pracę sprzed startu (3 października, 23:00) od pracy z hackathonu i nie przedstawiać gotowca sprzed czasu jako projektu zrobionego na miejscu. Jeśli ten kod powstanie przed startem, napiszcie to w zgłoszeniu.
