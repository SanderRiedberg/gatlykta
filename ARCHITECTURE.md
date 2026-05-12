# Gatlykta architecture

Strukturen för hur filerna hänger ihop. Den långsiktiga visionen ligger i [`ROADMAP.md`](./ROADMAP.md). Pågående arbete och handover mellan utvecklarsessioner ligger i [`WORKLOG.md`](./WORKLOG.md).

## Tooling

`package.json` finns endast för dev-verktyg (Playwright). Själva appen är fortfarande statisk HTML/JS utan byggsteg. `npm` används bara för att hämta `@playwright/test`; om man inte kör browser-smoke behöver man inte installera något alls. `node scripts/test-all.mjs` kör hela unit-suiten utan dependencies.

## Runtime

Projektet är fortfarande en statisk webbsida utan buildsteg. `index.html` laddar React, Leaflet och Babel från CDN och sedan appens scripts i beroendeordning.

Det är medvetet okej för prototypen, men inför 1.0 bör projektet troligen flyttas till Vite eller motsvarande så vi får riktiga ES-moduler, linting och browser-tester.

## Filansvar

- `app.jsx`: app-root, navigation mellan meny, områdesval, spel och resultat.
- `components.jsx`: gemensamma visuella komponenter, progress och resultathantering.
- `data/city-stockholm.js`: city-konfiguration, bbox, centrum och nuvarande grova stadsdelsbounds.
- `data/osm-pipeline.js`: ren datatransform (Overpass-JSON → Gatlykta-gator). Dual-context (browser via `window`, Node via `module.exports`). Delas mellan livehämtning och bundle-script.
- `data/osm.js`: livehämtning, cache och fallback. Anropar `processOverpass` från pipeline-modulen.
- `data/fallback-streets.js`: genererad OSM-bundle. Ska inte handredigeras.
- `game-utils.jsx`: fuzzy matching, ledtrådar, svårighet, poäng och rundslumpning.
- `map-rendering.jsx`: lågnivåhjälpare för kartstil, street widths och eraser-brush reveal.
- `map/leaflet-core.jsx`: Leaflet-init, focus/zoom, resize och style-progress.
- `map/street-layers.jsx`: street-polylines, hit areas och state styling.
- `map/scratch-overlay.jsx`: paper canvas, street sketch och reveal/scratch-overlay.
- `map/labels.jsx`: street labels och district labels.
- `map.jsx`: tunn React-wrapper som kopplar Leaflet-mapens effekter till helper-filerna.
- `modes/guess-pop.jsx`: delad popover-komponent (input + ledtråd) som Fill och Time använder.
- `modes/fill.jsx`, `modes/quiz.jsx`, `modes/time.jsx`, `modes/learn.jsx`: ett spelläge per fil. Var och en lindar sin React-komponent i en IIFE och exponerar via `window.<Mode>Mode`.
- `screens/menu.jsx`: landningsskärm med spellägesval.
- `screens/area-select.jsx`: områdesval, svårighetsval och kartstilsval.
- `screens/results.jsx`: slutskärm med grand reveal-kaskad, count-up-stats, trivia, solved/missed-listor och share/replay-knappar.
- `screens/loading.jsx`: loading- och error-skärmar.
- `data/map.js`: legacy/stiliserad karta för äldre experiment, inte source of truth.

## Source of truth

OSM-geometri är facit för gatans läge, form och klickyta. All handritad eller stiliserad kartgrafik ska behandlas som ett visuellt lager ovanpå verklig geometri.

## Närmaste refactor-mål

- Datapass: byt rektangulära `bounds` i `data/city-stockholm.js` mot riktiga stadsdelspolygoner. Påverkar `classifyDistrict` i pipelinen, district frames på paper-overlayet och `focusDistrict` flyTo-mål.
- Utvärdera Vite/ES-moduler först när fler browser-/unit-tester kräver riktig modulmiljö.
