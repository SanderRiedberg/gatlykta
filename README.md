# Gatlykta

Gatlykta är en webbläsarprototyp för att lära sig gatunamn i Stockholm innanför tullarna. Spelaren klickar gator, gissar namn och skrapar fram kartan lokalt allt eftersom gator klaras.

Quizläget kan köras utan musklick: appen markerar en gata, spelaren skriver eller dikterar namnet och trycker Enter. Det går även att växla till klick-quiz.

## Kör lokalt

```bash
python3 -m http.server 8765
```

Öppna sedan `http://127.0.0.1:8765`.

För att tvinga den bundlade OSM-kartan i stället för livehämtning från Overpass:

```text
http://127.0.0.1:8765/?fallback=1
```

Kör en snabb statisk sanity-check:

```bash
node scripts/check-static.mjs
```

Kör enhetstesterna för spelreglerna (fuzzy matching, ledtrådar, poäng, svårighetsfilter, quiz-slumpning):

```bash
node scripts/test-game-utils.mjs
```

Kör enhetstesterna för OSM-pipelinen (geometri, distriktsklassning, length-filter, weight-upgrade, rank):

```bash
node scripts/test-osm-pipeline.mjs
```

Eller kör allt på en gång:

```bash
node scripts/test-all.mjs
```

Kör browser-smoke över `?fallback=1`-flödet (kräver Node deps via `npm install` första gången):

```bash
npm install
npx playwright install chromium  # första gången
npm run test:e2e
```

## Publicering

Projektet är statiskt och kan publiceras direkt från repo-roten.

Bra första alternativ:

- GitHub Pages: publicera `main` från `/root`.
- Cloudflare Pages: build command tom, output directory `/`.
- Vercel/Netlify: statisk site utan buildsteg.

För `gatlykta.riedberg.se` pekas DNS vanligtvis som `CNAME gatlykta -> <github-användare>.github.io` om GitHub Pages används. Lägg sedan in custom domain i GitHub Pages-inställningarna.

## Data

Appen använder livegator från OpenStreetMap via Overpass när det går, cachear resultatet i `localStorage` och faller tillbaka på OSM-exporten i `data/fallback-streets.js` vid problem eller när `?fallback=1` används. Uppdatera den bundlade datan med `node scripts/build-osm-bundle.mjs`.

Svårigheterna filtrerar på gatans längdrankning per stadsdel: lätt och medel tar de mest framträdande gatorna, medan svår använder hela OSM-urvalet. Quizläget tar sedan ett slumpat delurval per omgång så rundorna varierar.
