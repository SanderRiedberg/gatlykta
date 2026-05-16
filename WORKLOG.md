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

### 2026-05-12 — Claude (UX/visual polish round 1)
Triggered by Sander testing live on `?fallback=1`:
- Quiz target gata var svår att se: lägg in `--target-ink` (grön), ta bort dash, +3.6 vikt, dubbel drop-shadow halo (`07fa723`).
- Tom Enter i Quiz typed gjorde inget: nu kallar `missTarget` (skip + visa rätt svar). Submit-knappen aktiv även på tomt, title-attr flippar mellan Skicka/Hoppa över (`07fa723`).
- Wheel-zoom thrashade canvas-rendering: fade canvas till opacity 0 under `zoomstart→zoomend`, droppa `zoom` från continuous listener, kör en enda redraw vid zoomend. Synkron `draw()` före opacity-restore så canvas alltid är repositionerad innan synlig (`fb2e2c4`, `16ecafb`).
- Skrap-animationen var cartoon-explosion: byt ut 3-pass scrape-strokes + `drawScratchChips` mot `drawEraserBrush` med soft radial-gradient stamps. Mjuka kanter, gradient stamps, små jitter (`16ecafb`).
- Multi-way streets animerades parallellt: `drawEraserBrush` tar nu en paths-lista och flattnar till en enda segment-sekvens, så sweepen går ände-till-ände (`7d1be3b`).
- Learn-panelen låg på Leaflet zoom-controls: flyttad till top-right på desktop, top-stretched på mobile (`3b393cd`).

### 2026-05-17 — Claude (rank-feedback + WORKLOG/ROADMAP sync + push)
- Lade `fetchRank(districtId, mode, score)` i `data/remote-sync.js` som använder PostgREST count-headers + två filtrerade counts för tie-breaker.
- Results visar nu "Du hamnade på plats X av Y" efter submit, "Topp 1 av Y — nytt rekord!" om #1. Din rad i topp-10 highlights med accent-bakgrund och `←` (`9168c97`).
- WORKLOG och ROADMAP synkade: alla rundor sen 5-12 är listade som klara, nya kandidat-tasks formulerade, Status och Nästa bästa steg uppdaterade.
- Pushade 18 commits till `origin/main`.

### 2026-05-16 — Claude (profile-sida + Supabase-verifiering)
- `screens/profile.jsx`: ny top-level vy med overall mastery, per-district cards (best per mode), senaste 10 rundor, export/import/reset-knappar. Nås via Profil-länk i ModeMenu topbar (`02b003f`).
- `scripts/check-supabase.mjs`: läser `data/remote-config.js`, hittar URL+key, hits 3 endpoints för att verifiera auth/tabell/RLS. Skriver en `__smoke__`-row som kan rensas med one-liner i SQL editor.
- `supabase/README.md` uppdaterad med 5-stegs snabb-setup (skapa projekt → kör schema → kopiera credentials → klistra in → kör check-script).
- Sander har Supabase-konto. Setup: ~2 min manuell, sen funkar leaderboards.

### 2026-05-16 — Claude (rundinställningar, scoreboards, Supabase, mobil-HUD)
Stort produktiv pass triggat av Sanders "kör på i 40 min"-fönster:
- TimeMode tidsval (60/90/120/180s) på area-select, persistas i useTweaks (`f6084b6`).
- Trivia 29 → 47 entries (Olof Palmes gata, Tunnelgatan, Stortorget m.fl.) + distinkta map-stilar med streetColor/paperTint per preset (sketch neutral, lithograph sepia, cartoon bold med halo, minimalism hårfin, popart blå-på-gult) (`cf93d34`).
- Quiz round-size val (auto/10/20/40) på area-select, override default-mapping (`ed2b0fa`).
- `data/storage.js`: lokal abstraktion för scores + street mastery + import/export-snapshot, med stub-block för remote sync. Lär-läge bygger nu om kring 3-stegs mastery (0/1/2), HUD visar known + review counts, klick på gata toggle:r mastery, två separata knappar för "kan denna"/"behöver öva". Area-select visar PR-poäng per district per mode (`1b1636d`).
- Supabase-integration: `data/remote-sync.js` (klient med graceful no-op om credentials saknas), `supabase/schema.sql` (table + RLS + top10-view), `supabase/README.md` (3-stegs setup). `data/storage.js` recordScore fire-and-forgets push-anrop. Local-only-mode oförändrad (`a5d6c9d`).
- Results-skärm leaderboard-sektion (top 10 från Supabase om configured), player-name-input som persistas. Mobile-HUD-polering under 600px: kompaktare pills, wrappable actions-row (`e63297e`).

### 2026-05-13 — Claude (öar som districts + coastline + quiz auto-zoom)
Triggered by Sander testing the district polygons live:
- Kungsholmen-halva-buggen: admin_level=10 "Kungsholmen" är bara östra halvan (resten är Stadshagen/Kristineberg). Bytt till `place=island` polygon för Kungsholmen, Stadsholmen och Södermalm; admin behållen för Norrmalm/Östermalm/Vasastan. Kungsholmen 41 → 227 polygon-punkter (hela ön). Bundle 656 → 733 streets (`940ff55`).
- Coastline-orientering: nytt `scripts/build-coastline.mjs` hämtar alla place=island/islet i bbox, stitchar rings, filtrerar <1500 m². 15 öar i `data/coastline.js` (Södermalm, Kungsholmen, Djurgården, Långholmen, Stadsholmen, Skeppsholmen, Reimersholme osv.). Paper-overlayet ritar nu öarnas konturer istället av administrativa district-rektanglar — naturlig "Norr Mälarstrand följer Kungsholmens nordkant"-orientering utan att avslöja gator (`940ff55`).
- Quiz auto-zoom: i typed-mode flyger kartan nu in på varje ny target med padding och maxZoom 17. Ny helper `focusGatlyktaStreet` + ny `focusStreet`-prop på LeafletMap. Click-mode lämnas oförändrad (zoom dit skulle avslöja svaret). Fill/Time påverkas inte (`e948b39`).

### 2026-05-12 — Claude (screens split + district polygons)
- Delade `screens.jsx` (341 rader) i fyra filer under `screens/`: `menu.jsx`, `area-select.jsx`, `results.jsx`, `loading.jsx`. Samma IIFE-pattern som `modes/`. `screens/results.jsx` är ~180 rader och håller hela grand-reveal- och trivia-logiken (`650006a`).
- Datapass: hämtade admin_level=10 boundary relations för 6 stadsdelar från Overpass via nytt `scripts/build-district-polygons.mjs`. Stitchar outer ways till closed rings, decimerar till ~25m spacing, sparar som `data/district-polygons.js` (18-116 punkter per district). Vasastan mappas från OSM:s officiella `Vasastaden` (`9bc835d`).
- `processOverpass` får `pointInPolygon` (ray casting) och en `polygons`-option. Live fetch och bundle-builder passerar `DISTRICT_POLYGONS`. Polygon vinner över bounds när finns; bounds är fallback (`9bc835d`).
- Bundle regenererad: 933 → 656 streets. De 277 borttagna var false positives som låg i bounding-rektangelns yttre kanter (Solna, Norra Djurgården, parts of Vasaparken). 12 nyckelgator spot-checkade och finns exakt en gång var (`9bc835d`).
- `map/scratch-overlay.jsx` `drawDistrictFrames` ritar nu polygon-konturen istället för rektangel när polygon finns. Samma alpha 0.18 och dashed style, mer naturlig form (`9bc835d`).
- 3 nya pipeline-tester för pointInPolygon och polygon-override av bounds. 4/4 suites + 3/3 e2e gröna.

### 2026-05-12 — Claude (Results-skärm + trivia + parallellgators-feedback)
Polish triggered by Sander's live testing:
- Results-skärmen var glesare än den borde: grand reveal-kaskad där streets unscratch:as i sekvens, count-up-animation på stat-siffror, separata solved/missed-listor, "Annat spelläge"-knapp och Web Share API + clipboard-fallback (`cb9cb13`).
- Trivia om Stockholm: 6 stadsdelar och 29 gator handkurerade i `data/trivia.js` (sv + en). Visas i Lär-läge under hovered gata och i Results "Visste du?"-sektion. 12 tester i `scripts/test-trivia.mjs` (`1c86416`).
- "Du tänkte på X"-feedback: när en gissning matchar en annan riktig gata (parallellgators-förvirring), visa "Du tänkte på {name}. Försök igen" istället för generisk "fel". Funkar i Fill, Quiz typed och Quiz click. 5 tester för `findGuessedStreet` (`ff7bad5`).

### 2026-05-12 — Codex (map split pass)
- Pushade först allt lokalt arbete till `origin/main` (`4f48f1c`).
- Delade upp `map.jsx` i `map/leaflet-core.jsx`, `map/street-layers.jsx`, `map/scratch-overlay.jsx` och `map/labels.jsx`.
- `map.jsx` är nu en tunn React-wrapper som bara kopplar effekter till helper-filerna.
- `index.html`, `scripts/check-static.mjs` och `ARCHITECTURE.md` uppdaterade för den nya strukturen.

### 2026-05-12 — Codex (e2e results pass)
- Utökade `e2e/smoke.spec.mjs` med ett tredje fallback-test: meny → Gamla Stan → Lär-läge → Results.
- Testet verifierar att Results renderas, att "Visste du?"-trivia visas för stadsdelen och att Dela-knappen skriver en resultattext till clipboard-fallbacken.
- Testet hittade en layoutbugg: Results-map preview saknade `position: relative`, så `.leaflet-host` kunde täcka hela viewporten och fånga klick på action-knappar. Fixat i `styles.css`.
- Det täcker nu den nyligen byggda Results/Trivia/Share-ytan utan att kräva live-Overpass eller browser permissions.

### 2026-05-12 — Codex (scratch helper cleanup)
- Rensade bort pensionerade `drawScrapeStroke`/`offsetPoint` från `map-rendering.jsx`.
- Kvarvarande reveal-väg är nu bara `drawEraserBrush`, vilket matchar den faktiska scratch-overlayn och minskar dubbel logik inför nästa animationsrunda.
- `ARCHITECTURE.md` uppdaterad så filansvaret beskriver eraser-brush reveal i stället för gamla scratch-strokes.

### 2026-05-12 — Claude (OSM pipeline merge + orienteringshint)
- Strandvägen kom som två frågor i Quiz: OSM:s ways för en gata som korsar district-bounds blev två separata entities (`norrmalm::strandvägen` + `ostermalm::strandvägen`). `processOverpass` grupperar nu by name only och bestämmer primärt district by majoritet av way-points. Bundle regenererad: 933 streets (-43 = duplikaterna borta). +1 test för cross-district-fallet (`23932b9`).
- Paper-vyn var svår att orientera sig på (bara ett "streck"): lägg in svaga streckade rektangel-ramar per active district med alpha 0.18, under streetskissen. Ingen kustlinje eller geometri avslöjas (`8623d76`).

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

1. [x] **Enhetstestsvit för `game-utils.jsx`** — `scripts/test-game-utils.mjs`, 31 tester.
2. [x] **Lyft OSM-processing till delad modul** — `data/osm-pipeline.js`, 20 tester.
3. [x] **Dela upp `modes.jsx`** — fem filer under `modes/`.
4. [x] **Dela upp `map.jsx`** — Codex pass.
5. [x] **Smoke-test för `?fallback=1`-flödet** — `e2e/smoke.spec.mjs`, 3 specs.
6. [x] **Stadsdelspolygoner** — `data/district-polygons.js` (admin för fastland, place=island för öar). `data/coastline.js` ritas på paper-overlay.
7. [x] **Quiz auto-zoom till target** — `focusGatlyktaStreet` + `focusStreet`-prop.
8. [x] **Dela `screens.jsx`** — fyra filer under `screens/`.
9. [x] **TimeMode tidsval + Quiz round-size** — i area-select, persistas i useTweaks.
10. [x] **Lokal scoreboard + street mastery** — `data/storage.js`, Lär-läge byggt om kring mastery.
11. [x] **Supabase remote sync (optional)** — `data/remote-sync.js` + schema + check-script. Explicit submit-knapp i Results. `fetchRank` ger "plats X av Y"-feedback.
12. [x] **Profile-sida** — `screens/profile.jsx` med export/import/reset.
13. [x] **Mobil-HUD-polering** — `<= 600px` media query.

Nya kandidater:

A. **Fill mode popover viewport clamp** — när popover hamnar utanför viewport, klampa position. Liten polish.
B. **Snabbare quiz-tempo** — confirma-delay 700ms → 400ms efter correct, så fart blir lite mer responsiv.
C. **Spaced repetition i Lär-läge** — sortera så needs-work + learning kommer först i hovered-listan, inte by length.
D. **Mer trivia → 70+ entries** — fokus på Kungsholmens västra (Stadshagen, Kristineberg) och mindre Söder-gator.
E. **DELETE-policy i RLS** — bara för matching client_id, så users kan rensa sina egna rader. Edge function bättre.
F. **Onboarding-toast** — första gången man landar i Fyll/Quiz, en kort introduktion.

## Kontaktytor

Vilka filer hör ihop. Två agenter som båda rör samma rad är en merge-konflikt; två agenter som båda rör samma område är ofta ändå en konflikt i intentionen.

| Område | Filer |
|---|---|
| OSM-data + bundeln | `data/osm.js`, `scripts/build-osm-bundle.mjs`, `data/fallback-streets.js` |
| Spelregler och matchning | `game-utils.jsx`, `modes.jsx` |
| Karta + rendering | `map.jsx`, `map-rendering.jsx`, `map/*.jsx`, `styles.css` |
| Skärmar och layout | `screens.jsx`, `components.jsx` |
| Konfiguration och i18n | `data/city-stockholm.js`, `data/i18n.js`, `app.jsx` |
| Legacy (decorative only) | `data/map.js`, `v1 sketched.html` |

## Konventioner

- Commits: conventional commits format (`fix:`, `refactor:`, `docs:`, `feat:`). Två rader: titel + körkort beskrivning i body.
- Verifiering före commit: `node scripts/test-all.mjs` ska passera. Det kör check-static + alla enhetstester.
- Stora refactors: gör ett pass per commit. Inte städ + ny funktion i samma commit.
- ROADMAP är långsiktig. Denna fil är operativ. ARCHITECTURE är strukturell.
