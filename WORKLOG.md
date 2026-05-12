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

### 2026-05-12 — Claude (OSM-pipeline dedup)
- La till `data/osm-pipeline.js` som dual-context modul (browser via `window`, Node via `module.exports`). Innehåller `inBounds`, `classifyDistrict`, `metersBetween`, `highwayWeight` och `processOverpass`.
- `data/osm.js` slimmad: tar nu in `processOverpass(json, DISTRICTS)` från pipeline-modulen i stället för lokal definition.
- `scripts/build-osm-bundle.mjs` läser pipeline-modulen via sandbox-eval. Bundle-resultat ska vara byte-stabilt om Overpass returnerar samma JSON.
- La till `scripts/test-osm-pipeline.mjs` — 15 tester med syntetiska Overpass-svar (grupperning, weight-upgrade, length-filter, rank, distrikt-classification, coordPrecision, immutability).
- `index.html` laddar `data/osm-pipeline.js` innan `data/osm.js`. `scripts/check-static.mjs` har pipeline-filen i expected-listan.
- ARCHITECTURE.md uppdaterad med ny filansvarsrad; "närmaste refactor-mål" tappar OSM-dedup-punkten.

## Öppna frågor (väntar på Sander)

### Tweaks-panel.jsx framtid
`tweaks-panel.jsx` är 568 rader. `useTweaks` används för `theme/lang/difficulty/mapStyle`, men ingen `<TweaksPanel>` renderas i app:en, och `TWEAK_DEFAULTS.scratch` + `TWEAK_DEFAULTS.showDistrictLabels` passas aldrig vidare till `LeafletMap`. Två val:

- **Aktivera UI:** rendera en knapp/handtag som öppnar panelen, wira in `scratch` + `showDistrictLabels` som props till `LeafletMap`.
- **Stryk filen:** ersätt `useTweaks` med en ~30 rader localStorage-hook och plocka bort `tweaks-panel.jsx` ur `index.html`.

### Vite/byggsteg
Inte nu, men trigger är en av: enhetstester utöver `game-utils.jsx`, linting, TypeScript, eller modul-import. Flagga när någon blir aktuell.

### Lazy-load av fallback-streets.js (807 KB)
Skulle spara FCP-kostnad när live-fetch + cache funkar (= normalflödet). Inte kritiskt nu, men på listan om vi vill polera laddningstid.

## Nästa kandidat-tasks

Sorterat efter storlek/risk. Plocka uppifrån och ner om inget annat trycker.

1. [x] **Enhetstestsvit för `game-utils.jsx`** — levererad 2026-05-12. `scripts/test-game-utils.mjs`, 26 tester, kör med `node scripts/test-game-utils.mjs`. Bygg vidare här när nya spelregler läggs till.
2. [x] **Lyft OSM-processing till delad modul** — levererad 2026-05-12. `data/osm-pipeline.js` delas mellan live-fetch och bundle-script. 15 enhetstester i `scripts/test-osm-pipeline.mjs`.
3. **Dela upp `modes.jsx`** (mekanisk, medel storlek). Mål: `modes/fill.jsx`, `modes/quiz.jsx`, `modes/time.jsx`, `modes/learn.jsx`, `modes/guess-pop.jsx`. Glöm inte att uppdatera `index.html` script-ordningen och `scripts/check-static.mjs` expected-listan.
4. **Dela upp `map.jsx`** (stor, högre risk). Mål: `map/leaflet-init.jsx`, `map/street-layers.jsx`, `map/labels.jsx`, `map/scratch-overlay.jsx`. Var försiktig med Leaflet-livscykeln; nuvarande effekter ordnas medvetet.
5. **Stadsdelspolygoner** (datapass, separat). Byt rektangulära `bounds` i `data/city-stockholm.js` mot riktiga polygoner. Påverkar `classifyDistrict`, `LeafletMap` district labels och `flyToBounds`.

## Kontaktytor

Vilka filer hör ihop. Två agenter som båda rör samma rad är en merge-konflikt; två agenter som båda rör samma område är ofta ändå en konflikt i intentionen.

| Område | Filer |
|---|---|
| OSM-data + bundeln | `data/osm.js`, `scripts/build-osm-bundle.mjs`, `data/fallback-streets.js` |
| Spelregler och matchning | `game-utils.jsx`, `modes.jsx` |
| Karta + rendering | `map.jsx`, `map-rendering.jsx`, `styles.css` |
| Skärmar och layout | `screens.jsx`, `components.jsx`, `tweaks-panel.jsx` |
| Konfiguration och i18n | `data/city-stockholm.js`, `data/i18n.js`, `app.jsx` |
| Legacy (decorative only) | `data/map.js`, `v1 sketched.html` |

## Konventioner

- Commits: conventional commits format (`fix:`, `refactor:`, `docs:`, `feat:`). Två rader: titel + körkort beskrivning i body.
- Verifiering före commit: `node scripts/check-static.mjs` ska passera. När det finns enhetstester ska de också passera.
- Stora refactors: gör ett pass per commit. Inte städ + ny funktion i samma commit.
- ROADMAP är långsiktig. Denna fil är operativ. ARCHITECTURE är strukturell.
