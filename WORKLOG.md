# Worklog

En arbetslogg som lever mellan utvecklarsessioner. Här samlas:

- Vad är klart sen förra passet.
- Öppna frågor som väntar på beslut (Sander avgör).
- Nästa kandidat-tasks med kort kontext, så vem som tar nästa pass kan plocka upp utan att läsa hela historiken.

Långsiktig riktning hör hemma i `ROADMAP.md`. Filansvar och refactor-mål hör hemma i `ARCHITECTURE.md`. Den här filen är operativ.

Skriv kort. Datera entries. Markera tasks som klara med [x] när de committas.

## Klart sen senaste pass

### 2026-05-12 — Codex (städpass)
- Bröt ut Stockholm-konfig till `data/city-stockholm.js`.
- Bröt ut fuzzy matching, hintar, poäng, svårighetsfilter och quiz-slumpning till `game-utils.jsx`.
- Bröt ut kartstil/scratch-renderhjälpare till `map-rendering.jsx`.
- Slimmade `data/osm.js` och `map.jsx`.
- La till `ARCHITECTURE.md` + `scripts/check-static.mjs`.
- Uppdaterade ROADMAP och README.

### 2026-05-12 — Claude (fix-runda + worklog)
- QuizMode skickar `roundIds`; Results visar nu rundans gator i stället för hela district-filtret.
- TimeMode-stjärnor skalas mot total (3 stjärnor = 20+ eller 70% av totalen).
- `data/osm.js`: `withRanks` och `loadCachedOSM` muterar inte längre cache.
- `data/i18n.js` och `data/osm.js` laddas som plain script (innehåller ingen JSX).
- Förenklad `useTweaks`-ternär i `app.jsx`.
- Skapade `WORKLOG.md` (denna fil) och länkade från `ROADMAP.md` + `ARCHITECTURE.md`.

### 2026-05-12 — Claude (game-utils enhetstester)
- La till `scripts/test-game-utils.mjs` — 26 tester över `normalizeStreet`, `evaluateGuess`, `matchesGuess`, `pointsForGuess`, `streetHint`, `DIFFICULTY_CAPS`, `filterByDifficulty`, `streetsForDistricts`, `quizRoundSize`, `shuffleStreets`. Kör utan byggsteg via Node-sandbox med fake `window`.
- Inga regressioner avslöjades; alla 26 testerna passerar mot nuvarande `game-utils.jsx`.
- README uppdaterad med körinstruktion.

### 2026-05-12 — Claude (Playwright smoke-test)
- La till `package.json` med `@playwright/test` som enda devDep. `npm install` + `npx playwright install chromium` engångskostnad.
- `playwright.config.mjs`: startar `python3 -m http.server 8765` automatiskt via webServer-config, headless Chromium, retain trace + screenshot on failure.
- `e2e/smoke.spec.mjs`: två tester över `?fallback=1`-flödet (meny → område → quiz typed; meny → område → fill mode med map). Lyssnar på `pageerror`/`console.error` och fail:ar testet vid runtime-fel. Filtrerar bort den ofarliga Babel-in-production-varningen.
- Båda tester går på ~6.5s total. Hittade inga regressioner i nuvarande build.
- `.gitignore` utökad med `test-results/`, `playwright-report/`, `playwright/.cache/`.
- README + ARCHITECTURE uppdaterade. Notera i ARCHITECTURE: `package.json` finns endast för dev-tooling, själva appen är fortsatt statisk utan byggsteg.

### 2026-05-12 — Claude (test-all runner)
- La till `scripts/test-all.mjs` som kör `check-static`, `test-game-utils` och `test-osm-pipeline` i sekvens. Exit-code är icke-noll om någon misslyckas.
- README uppdaterad med körinstruktion. Använd `node scripts/test-all.mjs` som en-knapps-verifiering före commit.

### 2026-05-12 — Claude (modes.jsx split)
- Delade `modes.jsx` (474 rader) i fem filer under `modes/`: `guess-pop.jsx`, `fill.jsx`, `quiz.jsx`, `time.jsx`, `learn.jsx`.
- Varje fil är inlindad i en IIFE som destrukturerar sina dependencies från `window` vid load-tid och registrerar sin huvudkomponent via `window.<X>Mode` (eller `window.GuessPop`).
- `index.html` och `scripts/check-static.mjs` uppdaterade. 16 lokala scripts laddas nu.
- Ingen logik ändrad; endast strukturell uppdelning.
- ARCHITECTURE.md uppdaterad. `modes/`-listan tar plats av den gamla `modes.jsx`-raden; "närmaste refactor-mål" tappar modes-split-punkten.

### 2026-05-12 — Claude (skip Tweaks-panel)
- Sander valde att skippa Tweaks-panelen (568 rader, ingen synlig användning).
- `tweaks-panel.jsx` borttagen ur repo, `<script>`-raden borta ur `index.html`.
- `useTweaks` ersatt med en ~20 rader localStorage-hook direkt i `app.jsx`. Storage-nyckel: `gatlykta.tweaks.v1`.
- `TWEAK_DEFAULTS` rensade från `scratch` och `showDistrictLabels` (de skickades aldrig vidare till `LeafletMap`). `theme`, `lang`, `difficulty`, `mapStyle` är kvar — de används.
- `/*EDITMODE-BEGIN*/`-markörerna borta eftersom edit-mode-protokollet hörde till panelen.

### 2026-05-12 — Claude (OSM-pipeline dedup)
- La till `data/osm-pipeline.js` som dual-context modul (browser via `window`, Node via `module.exports`). Innehåller `inBounds`, `classifyDistrict`, `metersBetween`, `highwayWeight` och `processOverpass`.
- `data/osm.js` slimmad: tar nu in `processOverpass(json, DISTRICTS)` från pipeline-modulen i stället för lokal definition.
- `scripts/build-osm-bundle.mjs` läser pipeline-modulen via sandbox-eval. Bundle-resultat ska vara byte-stabilt om Overpass returnerar samma JSON.
- La till `scripts/test-osm-pipeline.mjs` — 15 tester med syntetiska Overpass-svar (grupperning, weight-upgrade, length-filter, rank, distrikt-classification, coordPrecision, immutability).
- `index.html` laddar `data/osm-pipeline.js` innan `data/osm.js`. `scripts/check-static.mjs` har pipeline-filen i expected-listan.
- ARCHITECTURE.md uppdaterad med ny filansvarsrad; "närmaste refactor-mål" tappar OSM-dedup-punkten.

## Öppna frågor (väntar på Sander)

### Vite/byggsteg
Sander har inte tagit ställning till Vite men sagt "bygg långsiktigt hållbart". Triggers att fundera på det igen: enhetstester utöver Node-sandboxen (UI-tester via Vitest + jsdom), linting, TypeScript, eller riktiga ES-moduler. Inte nu.

### Lazy-load av fallback-streets.js (807 KB)
Förklarat 2026-05-12: bundeln laddas idag inline även när Overpass-fetch eller cache funkar (90% av sidvisningar). Lazy-load skulle dynamiskt injicera scripten bara när bundeln behövs. Vinst: ~800 KB nedladdning + parsetid sparat per normal sidvisning, märkbart på långsam mobil. Kostnad: aningen mer komplex laddningslogik; cold-start utan nät blir minimalt långsammare. Sander har skjutit upp beslutet — sätts på listan inför 1.0-polering.

## Nästa kandidat-tasks

Sorterat efter storlek/risk. Plocka uppifrån och ner om inget annat trycker.

1. [x] **Enhetstestsvit för `game-utils.jsx`** — levererad 2026-05-12. `scripts/test-game-utils.mjs`, 26 tester, kör med `node scripts/test-game-utils.mjs`. Bygg vidare här när nya spelregler läggs till.
2. [x] **Lyft OSM-processing till delad modul** — levererad 2026-05-12. `data/osm-pipeline.js` delas mellan live-fetch och bundle-script. 15 enhetstester i `scripts/test-osm-pipeline.mjs`.
3. [x] **Dela upp `modes.jsx`** — levererad 2026-05-12. Fem filer under `modes/`, IIFE-mönster, scriptordning i `index.html` uppdaterad.
4. **Dela upp `map.jsx`** (stor, högre risk). Mål: `map/leaflet-init.jsx`, `map/street-layers.jsx`, `map/labels.jsx`, `map/scratch-overlay.jsx`. Var försiktig med Leaflet-livscykeln; nuvarande effekter ordnas medvetet.
5. **Stadsdelspolygoner** (datapass, separat). Byt rektangulära `bounds` i `data/city-stockholm.js` mot riktiga polygoner. Påverkar `classifyDistrict`, `LeafletMap` district labels och `flyToBounds`.
6. [x] **Smoke-test för `?fallback=1`-flödet** — levererad 2026-05-12. `e2e/smoke.spec.mjs` via Playwright. Bygg vidare här när nya spelflöden behöver täckning.

## Kontaktytor

Vilka filer hör ihop. Två agenter som båda rör samma rad är en merge-konflikt; två agenter som båda rör samma område är ofta ändå en konflikt i intentionen.

| Område | Filer |
|---|---|
| OSM-data + bundeln | `data/osm.js`, `scripts/build-osm-bundle.mjs`, `data/fallback-streets.js` |
| Spelregler och matchning | `game-utils.jsx`, `modes.jsx` |
| Karta + rendering | `map.jsx`, `map-rendering.jsx`, `styles.css` |
| Skärmar och layout | `screens.jsx`, `components.jsx` |
| Konfiguration och i18n | `data/city-stockholm.js`, `data/i18n.js`, `app.jsx` |
| Legacy (decorative only) | `data/map.js`, `v1 sketched.html` |

## Konventioner

- Commits: conventional commits format (`fix:`, `refactor:`, `docs:`, `feat:`). Två rader: titel + körkort beskrivning i body.
- Verifiering före commit: `node scripts/test-all.mjs` ska passera. Det kör check-static + alla enhetstester.
- Stora refactors: gör ett pass per commit. Inte städ + ny funktion i samma commit.
- ROADMAP är långsiktig. Denna fil är operativ. ARCHITECTURE är strukturell.
