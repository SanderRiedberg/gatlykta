# Gatlykta

Gatlykta är en webbläsarprototyp för att lära sig gatunamn i Stockholm innanför tullarna. Spelaren klickar gator, gissar namn och skrapar fram kartan lokalt allt eftersom gator klaras.

Quizläget kan köras utan musklick: appen markerar en gata, spelaren skriver eller dikterar namnet och trycker Enter. Det går även att växla till klick-quiz.

## Kör lokalt

```bash
python3 -m http.server 8765
```

Öppna sedan `http://127.0.0.1:8765`.

För att tvinga den bundlade demokartan i stället för livehämtning från Overpass:

```text
http://127.0.0.1:8765/?fallback=1
```

## Publicering

Projektet är statiskt och kan publiceras direkt från repo-roten.

Bra första alternativ:

- GitHub Pages: publicera `main` från `/root`.
- Cloudflare Pages: build command tom, output directory `/`.
- Vercel/Netlify: statisk site utan buildsteg.

För `gatlykta.riedberg.se` pekas DNS vanligtvis som `CNAME gatlykta -> <github-användare>.github.io` om GitHub Pages används. Lägg sedan in custom domain i GitHub Pages-inställningarna.

## Data

Appen använder livegator från OpenStreetMap via Overpass när det går, cachear resultatet i `localStorage` och faller tillbaka på `data/fallback-streets.js` vid problem eller när `?fallback=1` används.
