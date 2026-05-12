# Gatlykta roadmap

## Målbild

Gatlykta ska vara ett snyggt, lekfullt webbläsarspel där spelaren lär sig en stad gata för gata. Första prototypen fokuserar på Stockholm innanför tullarna, med svenska som standardspråk och engelska som första alternativa språk. Spelet ska kännas editorialt: varm pappersbas, kolsvarta gatlinjer och lokal färgreveal när spelaren klarar gator.

## Nuvarande prototyp

- Fyra grova spellägen finns: Fyll i, Quiz, Tidspress och Lär-läge.
- Kartan använder Leaflet, satellittiles och OSM-gator som hämtas via Overpass och cacheas i `localStorage`.
- En lokal fallback-karta med verklig OSM-geometri bundlas i `data/fallback-streets.js` och kan testas med `?fallback=1`.
- Stadsdelarna är förenklade bounding boxes för Gamla Stan, Norrmalm, Östermalm, Vasastan, Kungsholmen och Södermalm.
- Stilväljaren har fem presets: Skiss, Litografi, Cartoon, Minimalism och Pop-art.
- Progressionen färgar/revealar lokalt längs klarade gator och deras närområde, utan att visa hela satellitbilden direkt.

## Fas 1: Stabil prototyp

- Säkerställ att alla fyra spellägen startar, går att spela och kan avslutas.
- Gör resultatlogiken konsekvent: rätt, missade, visade svar, tid och bästa kombo.
- Ge varje område stjärnor/medaljer per läge och visa bästa resultat tydligt.
- Håll lokal fallback på verklig OSM-geometri; handritad geometri får bara användas som dekorativt lager, aldrig som facitdata.

## Fas 2: Bättre spelkänsla

- Fyll i: klicka gata, skriv namn, visa smart feedback och lokal reveal.
- Quiz: visa gatunamn, klicka rätt gata, ge andra chans innan facit.
- Tidspress: välj tidsgräns och visa tydlig slutskärm när tiden tar slut.
- Lär-läge: hover/klick visar namn, stadsdel och möjlighet att markera "kan".

## Fas 3: Kart- och stilförfining

- Bestäm långsiktig kartkälla: OSM/tiles som sann geografi, med handritad stil som visuellt lager ovanpå.
- Om handritad SVG används: använd den bara som illustration ovanpå verkliga gatsegment och klickytor.
- Om OSM behålls: förbättra stadsdelsklassning från bounding boxes till polygoner.
- Koppla varje stilpreset till både tile-filter, pappersstruktur och reveal-bredd.

## Fas 4: Språk och fler städer

- Behåll alla UI-texter i `data/i18n.js`.
- Lägg till stadskonfigurationer med egen bbox, centrum, stadsdelar och språkmetadata.
- Förbered engelskt namn: bra kandidater är `Streetlamp`, `Streetlight`, `Name the Streets` eller mer lekfullt `Streetwise`.

## Nästa rimliga steg

1. Göra slutskärmarna mer informativa per spelläge.
2. Förbättra mobilvyn för områdesval och HUD.
3. Välja om kartan ska fortsätta med OSM/Leaflet eller byggas om mot handritad SVG för mer exakt visuell kontroll.
4. Bygga en riktig offline-strategi för tiles om spelet ska fungera utan nät, inte bara utan Overpass.
