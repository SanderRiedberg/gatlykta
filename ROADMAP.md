# Gatlykta roadmap

Den långsiktiga riktningen. Vad som ligger i postlådan just nu (öppna frågor, nästa kandidat-tasks, arbetslogg mellan utvecklarsessioner) ligger i [`WORKLOG.md`](./WORKLOG.md). Filansvar och refactor-mål ligger i [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Målbild

Gatlykta ska bli ett snyggt, lekfullt webbläsarspel där spelaren lär sig en stad gata för gata. Första versionen fokuserar på Stockholm innanför tullarna, med svenska som standardspråk och engelska som första alternativa språk.

Kärnan är geografisk igenkänning: gatans position, form och sammanhang måste stämma med verkligheten. Visuell stil får vara lekfull, men facitdata och klickytor ska bygga på verklig geometri.

## Status nu

- Fyra spellägen finns: Fyll i, Quiz, Tidspress och Lär-läge.
- Kartan kör Leaflet med satellittiles och verkliga OSM-gator.
- Overpass hämtas live när det går, cacheas i `localStorage` och faller tillbaka på `data/fallback-streets.js`.
- `?fallback=1` tvingar lokal OSM-bundle och är det bästa testläget för stabil utveckling.
- Quiz kan köras med tangentbord/diktering eller klick.
- Fuzzy matching, ledtrådar, facit efter miss och lokal scratch-reveal finns i prototypform.
- Hard mode använder hela bundlade OSM-urvalet; quiz rundar av till slumpade delomgångar.

## Teknisk riktning

Den viktiga principen framåt:

1. OSM/fallback är source of truth för gator.
2. City-konfiguration ligger separat från datahämtning.
3. Spellogik, fuzzy matching och scoring ligger separat från UI.
4. Kartans visuella renderhjälpare ligger separat från Leaflet-komponenten.
5. Handritad/stiliserad karta får bara vara dekorativt lager, inte facit eller klickgeometri.

## Fas 0: Städad prototypbas

Målet med fasen är att göra projektet lätt att vidareutveckla utan att ändra spelets känsla.

- Flytta Stockholm-konfiguration till egen fil.
- Flytta fuzzy matching, hintar, svårighetsfilter, poäng och quiz-slumpning till gemensamma spelhjälpare.
- Flytta scratch-/kartstilshjälpare ur `map.jsx`.
- Markera legacy-karta tydligt så den inte blandas ihop med riktig geografi.
- Dokumentera arkitektur och 1.0-plan.
- Behåll statisk hosting tills features stabiliserats; ta Vite/byggsteg när behovet av tester och moduler väger tyngre.

## Fas 1: Stabilt spelbar helhet

- Säkerställ att alla fyra spellägen startar, går att spela och kan avslutas.
- Gör resultatlogiken konsekvent: rätt, missade, visade svar, tid, poäng och bästa streak.
- Inför tydliga slutskärmar per spelläge.
- Ge varje område medaljer/stjärnor per spelläge och visa bästa resultat.
- Gör mobil-HUD och områdesval användbara på små skärmar.

## Fas 2: Game feel

- Fyll i: bättre popover-position, tydligare fel/ledtråd/facit och mer tillfredsställande reveal.
- Quiz: tydligt val mellan skrivläge och klickläge, snabbare tempo och bättre feedback vid miss.
- Tidspress: välj tidsgräns och antal gator, visa tydlig slutskärm när tiden tar slut.
- Lär-läge: hover/klick visar namn, stadsdel, "kan denna" och enkel repetition.
- Slumpa fler och smartare rundor så spelet inte känns statiskt.

## Fas 3: Karta, data och stil

- Byt förenklade bounding boxes mot bättre stadsdelspolygoner.
- Deduplikera uppdelade vägsegment så samma gata känns som en enhet.
- Förfina click precision och visuella konturer för smala gator.
- Gör stilarna mer distinkta: Skiss, Litografi, Cartoon, Minimalism och Pop-art ska faktiskt kännas olika.
- Förbättra scratch-reveal mot mer lottskrap/myntdrag med kantigare, organiska kanter.
- Utred riktig offline-strategi för tiles om appen ska fungera helt utan nät.

## Fas 4: 1.0-produkt

- City-konfig för fler städer: bbox, centrum, stadsdelar, språkmetadata och data-bundle.
- Full svensk/engelsk UI via `data/i18n.js`.
- Delbara resultat och tydlig progress per område.
- Hosting, domän och enkel publiceringspipeline.
- Liten testsvit som kör smoke-flöden i browser innan deploy.

## Nästa bästa steg

1. Slutför städpasset och verifiera att nuvarande spelbeteende fortfarande fungerar.
2. Gör ett datapass för stadsdelspolygoner och bättre hantering av områdesklassning.
3. Gör en UX-runda på rundinställningar, medaljer och replay-loop.
4. Utöka smoke-testet med Results/Share/Trivia när den ytan stabiliserats.
5. Planera Vite/ES-moduler först när statisk scriptordning blir ett verkligt hinder.
