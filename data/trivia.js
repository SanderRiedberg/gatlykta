/* global window */
// Gatlykta — handcrafted trivia for districts and streets.
// Pure data: keys are district ids and normalized street slugs. Where we're
// not certain about a date or attribution we use hedged language ("syftar
// på", "anlagd kring") rather than tvärsäkra påståenden.

const DISTRICT_TRIVIA = {
  'gamla-stan': {
    sv: 'Stockholms äldsta stadsdel, känd från 1250-talet då Birger Jarl byggde fästningen som blev stadens kärna. Smala kullerstensgränder, medeltida hus och kungliga kvarter. Mellan 1635 och 1980 hette området bara Staden.',
    en: 'The oldest part of Stockholm, traceable to the 1250s when Birger Jarl raised the fortress at its core. Narrow cobbled lanes, medieval houses and royal quarters. Officially just called "Staden" (the city) from 1635 to 1980.',
  },
  'norrmalm': {
    sv: 'Norra delen av Stockholm, planerad om i grunden under "Norrmalmsregleringen" på 1950- och 60-talen då stora delar revs för att ge plats åt Sergels Torg och Hötorgsskraporna. Här ligger nu Stockholms kommersiella centrum.',
    en: 'Stockholm\'s northern centre, drastically reshaped during the "Norrmalmsregleringen" demolitions of the 1950s and 60s that made way for Sergels Torg and the Hötorget skyscrapers. Now the city\'s commercial core.',
  },
  'ostermalm': {
    sv: 'Övre medelklassens paradkvarter, anlagd som rutnätsstad från slutet av 1800-talet. Innan dess kallades området "Ladugårdslandet" och var militärt övningsfält. Här går både Stockholms bredaste boulevarder och dyraste adresser.',
    en: 'Stockholm\'s upper-class showcase district, laid out on a grid from the late 1800s. Before that it was "Ladugårdslandet" — a military exercise field. Home to both the city\'s widest boulevards and its priciest addresses.',
  },
  'vasastan': {
    sv: 'Byggdes ut mellan 1880 och 1920 norr om Norrmalm. Namnet syftar på Vasaätten. Många gator har namn ur svensk historia och nordisk mytologi: Odengatan, Tegnérgatan, Sveavägen.',
    en: 'Built up between 1880 and 1920 north of Norrmalm. Named after the Vasa dynasty. Many streets reference Swedish history and Norse mythology — Odengatan, Tegnérgatan, Sveavägen.',
  },
  'kungsholmen': {
    sv: 'Egen ö väster om Norrmalm, kallad "Munklägret" i medeltiden efter ett franciskanerkloster. Fick sitt nuvarande namn 1672 efter Karl XI. Här ligger Stadshuset och stora delar av Stockholms juridiska kvarter.',
    en: 'Its own island west of Norrmalm, called "Munklägret" in medieval times after a Franciscan monastery. Renamed in 1672 in honour of Karl XI. Home to the City Hall (Stadshuset) and much of Stockholm\'s legal district.',
  },
  'sodermalm': {
    sv: 'Stockholms södra del på en bergsklippa. Länge en arbetar- och hantverkarstadsdel, nu känd för sin trendiga blandning av kaféer, butiker och utsikter. Götgatan och Hornsgatan är de viktigaste stråken.',
    en: 'Stockholm\'s southern district on a rocky ridge. Long a working-class and craftsmen\'s neighbourhood, now famous for its trendy mix of cafés, shops and sweeping views. Götgatan and Hornsgatan are the main thoroughfares.',
  },
};

const STREET_TRIVIA = {
  // ─── Norrmalm ───
  'drottninggatan': {
    sv: 'Uppkallad efter drottning Hedvig Eleonora (1636-1715). En av Stockholms äldsta paradgator och stadens längsta gågata sedan 1989.',
    en: 'Named after Queen Hedvig Eleonora (1636-1715). One of Stockholm\'s oldest grand avenues and the city\'s longest pedestrian street since 1989.',
  },
  'kungsgatan': {
    sv: 'Anlagd 1911 som ett av Norrmalms breda paradstråk. Var ett av Stockholms första gator med biograf och Kungstornen (1924-25) tronar än idag mitt på gatan.',
    en: 'Laid out in 1911 as one of Norrmalm\'s grand boulevards. Among Stockholm\'s first streets with a cinema, and the Kungstornen (1924-25) still rise mid-street.',
  },
  'sveavagen': {
    sv: 'Planerad som en svensk Champs-Élysées och färdigställd successivt från 1880-talet. Olof Palme mördades på hörnet av Sveavägen och Tunnelgatan 1986.',
    en: 'Planned as a Swedish Champs-Élysées and completed gradually from the 1880s. Olof Palme was assassinated at the corner of Sveavägen and Tunnelgatan in 1986.',
  },
  'vasagatan': {
    sv: 'Leder från Stockholms Central genom Norrmalm. Namnet syftar på Vasaätten, liksom flera av stadens stora gator.',
    en: 'Runs from Stockholm Central Station through Norrmalm. Named after the Vasa dynasty, like several of the city\'s major streets.',
  },
  'hamngatan': {
    sv: 'Gick förr längs Stockholms hamn vid Nybroviken. Idag en av stadens viktigaste shopping- och kollektivtrafikgator, med Kungsträdgården på ena sidan.',
    en: 'Once ran along Stockholm\'s harbour at Nybroviken. Now one of the city\'s key shopping and transit streets, with Kungsträdgården on one side.',
  },
  'klarabergsgatan': {
    sv: 'Namnet kommer från Klara kloster som låg här på medeltiden. Idag löper gatan tvärs över Centralstationen.',
    en: 'Named after the medieval Klara convent that stood here. Today it crosses straight over the Central Station.',
  },
  'tegnergatan': {
    sv: 'Uppkallad efter Esaias Tegnér (1782-1846), präst, professor och en av Sveriges mest lästa skalder under sin tid.',
    en: 'Named after Esaias Tegnér (1782-1846), priest, professor and one of Sweden\'s most widely read poets of his era.',
  },
  'regeringsgatan': {
    sv: 'Pekar mot det gamla regeringskvarteret. Här låg flera departement innan staten centraliserades på Rosenbad.',
    en: 'Points toward the old government quarter. Several ministries sat along this street before being centralised on Rosenbad.',
  },

  // ─── Östermalm ───
  'strandvagen': {
    sv: 'Anlagd inför Stockholmsutställningen 1897 som "Sveriges vackraste gata". Husen i fransk renässans- och nationalromantisk stil ritades av tidens stora arkitekter.',
    en: 'Laid out for the 1897 Stockholm Exhibition as "Sweden\'s most beautiful street". Its French Renaissance and National Romantic façades were drawn by the era\'s star architects.',
  },
  'karlavagen': {
    sv: 'Uppkallad efter Karl XIV Johan. Planerades på 1880-talet som en boulevard med dubbla körbanor och en park på mitten — typiskt Östermalms parad-stil.',
    en: 'Named after Karl XIV Johan. Planned in the 1880s as a boulevard with twin roadways and a central park strip — pure Östermalm parade style.',
  },
  'valhallavagen': {
    sv: 'Namnet syftar på Valhall, asagudarnas boning där fallna krigare samlas. Gatan följer den planerade norra ringen runt innerstaden.',
    en: 'Named after Valhalla, the Æsir hall where slain warriors gather in Norse myth. The street follows the planned northern ring around the inner city.',
  },
  'birger-jarlsgatan': {
    sv: 'Uppkallad efter Birger Jarl, regenten som traditionellt anses ha grundat Stockholm omkring 1250. Sträcker sig från Stureplan rakt upp genom Östermalm och Vasastan.',
    en: 'Named after Birger Jarl, the regent traditionally credited with founding Stockholm around 1250. Runs from Stureplan straight up through Östermalm and Vasastan.',
  },
  'linnegatan': {
    sv: 'Uppkallad efter Carl von Linné (1707-1778), botanikern bakom det moderna systemet för att namnge arter.',
    en: 'Named after Carl von Linné (Linnaeus, 1707-1778), the botanist behind the modern system for naming species.',
  },
  'narvavagen': {
    sv: 'Namnet syftar på slaget vid Narva 1700, en svensk seger tidigt i Stora nordiska kriget.',
    en: 'Named after the Battle of Narva in 1700, a Swedish victory early in the Great Northern War.',
  },
  'sturegatan': {
    sv: 'Uppkallad efter Sture-ätten, en av Sveriges mäktigaste familjer under medeltiden — Sten Sture den äldre och yngre styrde båda riket.',
    en: 'Named after the Sture family, one of Sweden\'s most powerful houses in the late Middle Ages — both Sten Sture the Elder and Younger ruled as regents.',
  },

  // ─── Vasastan ───
  'odengatan': {
    sv: 'Uppkallad efter Oden, allfadern i nordisk mytologi. Vasastans gatunamn är genomgående hämtade ur sagor och svensk historia.',
    en: 'Named after Odin, the All-Father of Norse myth. Vasastan\'s street names are systematically drawn from sagas and Swedish history.',
  },
  'sankt-eriksgatan': {
    sv: 'Uppkallad efter Erik den helige, Sveriges skyddspatron och kung kring 1150-talet. Bron med samma namn binder Vasastan och Kungsholmen.',
    en: 'Named after Erik the Holy, Sweden\'s patron saint and king around the 1150s. The bridge of the same name links Vasastan and Kungsholmen.',
  },
  'karlbergsvagen': {
    sv: 'Leder mot Karlbergs slott, anlagt på 1630-talet och sedan 1792 säte för officersutbildningen — Karlbergs krigsskola är Sveriges äldsta militärakademi.',
    en: 'Leads toward Karlberg Palace, built in the 1630s and since 1792 home to the officers\' academy — the oldest military school in Sweden.',
  },
  'upplandsgatan': {
    sv: 'Namnet syftar på landskapet Uppland, som Stockholm historiskt tillhör.',
    en: 'Named after the historical province of Uppland, of which Stockholm forms part.',
  },
  'roslagsgatan': {
    sv: 'Pekar mot Roslagen, kustområdet norr om Stockholm. Roslagsbanan utgick förr i tiden från Östra station vid Roslagsgatans slut.',
    en: 'Points toward Roslagen, the coastal region north of Stockholm. The Roslagsbanan light rail historically started from Östra station at the end of the street.',
  },

  // ─── Kungsholmen ───
  'hantverkargatan': {
    sv: 'Pekar mot Kungsholmens hantverkar- och tjänstemannakvarter, anlagt på 1700-talet då ön befolkades.',
    en: 'Points toward Kungsholmen\'s artisan and clerk quarters, laid out in the 1700s as the island was populated.',
  },
  'fleminggatan': {
    sv: 'Uppkallad efter Henrik Klasson Fleming, riksamiralen som styrde flottan på 1610-talet.',
    en: 'Named after Henrik Klasson Fleming, the admiral who led the Swedish navy in the 1610s.',
  },
  'norr-malarstrand': {
    sv: 'Följer Mälarens strand på norra sidan av Kungsholmen. Promenadstråk med utsikt mot Riddarfjärden och Stadshuset.',
    en: 'Follows Lake Mälaren\'s shore on the north side of Kungsholmen. A waterfront promenade with views of Riddarfjärden and the City Hall.',
  },

  // ─── Södermalm ───
  'gotgatan': {
    sv: 'En av Stockholms äldsta gator, med ursprung som forntida väg mot Götaland. Idag Söders viktigaste shoppingstråk.',
    en: 'One of Stockholm\'s oldest streets, originating as an ancient road toward Götaland. Today Söder\'s main shopping artery.',
  },
  'hornsgatan': {
    sv: 'Korsar Södermalm öst-västligt. Namnet syftar på det gamla västra "Hornstull" och dess tullport.',
    en: 'Crosses Södermalm east-to-west. Named after the old western "Hornstull" toll gate.',
  },
  'folkungagatan': {
    sv: 'Uppkallad efter Folkungaätten, den medeltida kungaätt som styrde Sverige från 1200- till 1300-talet.',
    en: 'Named after the Folkung dynasty, the medieval royal family that ruled Sweden from the 13th to 14th centuries.',
  },
  'ringvagen': {
    sv: 'Anlagd kring sekelskiftet 1900 som en ringled runt södra Södermalm. Bågformen ger gatan dess namn.',
    en: 'Built around 1900 as a ring road around southern Södermalm. The arc-like shape gives the street its name.',
  },
  'soder-malarstrand': {
    sv: 'Följer Mälarens strand på Södermalms norra sida. Tidigare en hamnkant med skutor och varv, nu strandpromenad mot Gamla stan.',
    en: 'Follows Lake Mälaren\'s shore on Södermalm\'s north side. Once a working harbour lined with boats and wharves, now a waterfront promenade facing Gamla Stan.',
  },
  'skanegatan': {
    sv: 'Som många gator söder om Folkungagatan har Skånegatan namn efter ett svenskt landskap. Den hör till "landskapsgatorna" på Söder.',
    en: 'Like many streets south of Folkungagatan, Skånegatan is named after a Swedish province. Part of Söder\'s "landskapsgator" cluster.',
  },
  'ostgotagatan': {
    sv: 'Tillhör Söders landskapsgator, namngiven efter Östergötland. De parallella gatorna här bär alla landskapsnamn — Skåne, Bohus, Halland, Östgöta.',
    en: 'Part of Söder\'s province streets, named after Östergötland. The parallel streets here all carry province names — Skåne, Bohus, Halland, Östgöta.',
  },

  // ─── Gamla Stan ───
  'vasterlanggatan': {
    sv: 'Gamla Stans västra huvudstråk, en av öns två medeltida längsgator. Trångt, kullerstensbelagt och fullt av butiker mot Riddarholmen.',
    en: 'Gamla Stan\'s main western street, one of the island\'s two medieval longitudinal lanes. Narrow, cobblestoned and shop-lined toward Riddarholmen.',
  },
  'osterlanggatan': {
    sv: 'Den östra motsvarigheten till Västerlånggatan, lugnare och med restauranger mot Skeppsbron. Här ligger flera av Stockholms äldsta krogar.',
    en: 'The eastern counterpart to Västerlånggatan, quieter and lined with restaurants toward Skeppsbron. Home to several of Stockholm\'s oldest taverns.',
  },
  'skeppsbron': {
    sv: 'Kajen mot Saltsjön längs Gamla Stans östra sida. Här lade Stockholms handelsflotta till från 1600-talet och framåt.',
    en: 'The quay facing Saltsjön along Gamla Stan\'s eastern side. Stockholm\'s merchant fleet docked here from the 1600s onward.',
  },
  'kopmangatan': {
    sv: 'Stockholms äldsta dokumenterade gata, omnämnd 1323. Namnet syftar på köpmännen som drev sin handel här.',
    en: 'Stockholm\'s earliest documented street, mentioned in 1323. Named after the merchants who traded along it.',
  },
  // ─── Tillägg ───
  'olof-palmes-gata': {
    sv: 'Bytte namn 1986 till minne av statsministern Olof Palme. Hette tidigare Tunnelgatan, namngett efter den tunnel där Palme sköts.',
    en: 'Renamed in 1986 in memory of Prime Minister Olof Palme. Was previously Tunnelgatan, after the pedestrian tunnel where Palme was shot.',
  },
  'master-samuelsgatan': {
    sv: 'Uppkallad efter "mäster Samuel" som drev en krog vid gatan på 1600-talet. Idag en av Norrmalms genomfartsgator.',
    en: 'Named after "master Samuel" who ran a tavern along the street in the 1600s. Now one of Norrmalm\'s through streets.',
  },
  'storgatan': {
    sv: 'Östermalms huvudaxel och en av stadens äldsta paradgator från regleringen på 1880-talet. Ett tidigt exempel på rutnätsstadens stora boulevarder.',
    en: 'Östermalm\'s main axis and one of the city\'s oldest parade streets from the 1880s planning. An early example of the grid city\'s grand boulevards.',
  },
  'skeppargatan': {
    sv: 'En av Östermalms långa nord-sydliga gator. Namnet syftar på skeppare, alltså båtkaptener som bodde i området under 1800-talet.',
    en: 'One of Östermalm\'s long north-south streets. Named after skeppare — boat captains who lived in the area during the 1800s.',
  },
  'banergatan': {
    sv: 'Uppkallad efter fältmarskalken Johan Banér (1596-1641), en av Sveriges främsta härförare under trettioåriga kriget.',
    en: 'Named after Field Marshal Johan Banér (1596-1641), one of Sweden\'s leading commanders during the Thirty Years\' War.',
  },
  'tunnelgatan': {
    sv: 'Korta gatan som korsar Sveavägen och leder till tunneln upp mot Brunkebergsåsen. Här mördades Olof Palme 1986.',
    en: 'Short street crossing Sveavägen and leading to the tunnel up to the Brunkeberg ridge. Olof Palme was assassinated here in 1986.',
  },
  'bondegatan': {
    sv: 'Söders tvärgata med namn från ätten Bonde, en svensk adelsätt med riksråd och fältherrar under 1500- och 1600-talen.',
    en: 'A cross street on Söder named after the Bonde family, a Swedish noble line with councillors and commanders in the 1500s and 1600s.',
  },
  'krukmakargatan': {
    sv: 'På Söder, namngiven efter krukmakarna som hade sina verkstäder i området under 1700-talet.',
    en: 'On Söder, named after the potters who kept workshops in the area during the 1700s.',
  },
  'pontonjargatan': {
    sv: 'På Kungsholmen, uppkallad efter pontonjärerna — det militära förband som byggde flytbroar. Förbandet hade kasern i området fram till 1958.',
    en: 'On Kungsholmen, named after the pontoniers — the military unit that built pontoon bridges. The regiment was barracked here until 1958.',
  },
  'bergsgatan': {
    sv: 'Löper längs Kungsholmens bergshöjd. En av öns äldsta gator, omnämnd redan på 1700-talet.',
    en: 'Runs along the high ridge of Kungsholmen. One of the island\'s oldest streets, mentioned as early as the 1700s.',
  },
  'pipersgatan': {
    sv: 'Uppkallad efter greve Carl Piper (1647-1716), Karl XII:s mäktigaste rådgivare som dog som rysk fånge efter slaget vid Poltava.',
    en: 'Named after Count Carl Piper (1647-1716), Karl XII\'s most powerful adviser who died as a Russian prisoner after the Battle of Poltava.',
  },
  'kungstradgardsgatan': {
    sv: 'Följer den östra sidan av Kungsträdgården, kunglig trädgård sedan 1400-talet och idag en av Stockholms mest centrala parker.',
    en: 'Runs along the east side of Kungsträdgården, a royal garden since the 1400s and today one of Stockholm\'s most central parks.',
  },
  'biblioteksgatan': {
    sv: 'Lyxshoppinggatan som leder mot Stockholms stadsbibliotek. Området kallas "Bibban" i folkmun.',
    en: 'The luxury shopping street leading toward Stockholm\'s city library. Locals call the area "Bibban".',
  },
  'tegnerlunden': {
    sv: 'En liten park i Vasastan, uppkallad efter skalden Esaias Tegnér precis som Tegnérgatan intill.',
    en: 'A small park in Vasastan, named after the poet Esaias Tegnér just like the neighbouring Tegnérgatan.',
  },
  'klarabergsviadukten': {
    sv: 'Bron som lyfter trafiken över Centralstationens spår. Byggd som del av Norrmalmsregleringen och Stockholms moderna T-bana under 1950-talet.',
    en: 'The viaduct that lifts traffic over the Central Station tracks. Built as part of the Norrmalm redevelopment and Stockholm\'s modern subway in the 1950s.',
  },
  'stortorget': {
    sv: 'Stockholms äldsta torg, omnämnt redan 1300-talet. Här utspelade sig Stockholms blodbad 1520 då Kristian II lät avrätta över 80 personer.',
    en: 'Stockholm\'s oldest square, mentioned as early as the 1300s. The site of the Stockholm Bloodbath of 1520 when Christian II had over 80 people executed.',
  },
  'slottsbacken': {
    sv: 'Sluttar från Stockholms slott ner mot Skeppsbron. En av huvudvägarna in i Gamla stan från öster.',
    en: 'Slopes from the Royal Palace down to Skeppsbron. One of the main approaches into Gamla stan from the east.',
  },
  'mynttorget': {
    sv: 'Torget framför Riksdagshuset. Namnet kommer från det myntverk som låg här fram till 1850.',
    en: 'The square in front of the Riksdag building. Named after the mint that operated here until 1850.',
  },
};

function normalizeTriviaKey(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[':.,]/g, '')
    .replace(/[\s\-]+/g, '-')
    .replace(/^-|-$/g, '');
}

function triviaForStreet(name, lang) {
  if (!name) return null;
  const key = normalizeTriviaKey(name);
  const entry = STREET_TRIVIA[key];
  if (!entry) return null;
  return entry[lang] || entry.sv || null;
}

function triviaForDistrict(districtId, lang) {
  const entry = DISTRICT_TRIVIA[districtId];
  if (!entry) return null;
  return entry[lang] || entry.sv || null;
}

Object.assign(window, {
  STREET_TRIVIA,
  DISTRICT_TRIVIA,
  triviaForStreet,
  triviaForDistrict,
});
