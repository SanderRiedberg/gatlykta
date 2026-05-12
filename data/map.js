/* global window */
// Gatlykta — stiliserad SVG-karta över Stockholms innerstad.
// ViewBox: 1600 × 1100. Inte geografiskt exakt — abstraherad form som
// fångar de stora dragen (Mälaren/Strömmen/Saltsjön, Gamla Stan-ön,
// Södermalm söder, Kungsholmen väst, Östermalm/Norrmalm/Vasastan norr).

const MAP = {
  viewBox: '0 0 1600 1100',
};

// Vatten — komplext path med flera sub-shapes (Mälaren-vik, Riddarfjärden,
// Strömmen, Saltsjön). Gamla Stan är "hål" mellan dem.
const WATER = [
  // Mälaren-vik från väster + Riddarfjärden + Strömmen + Saltsjön, sammanvävt
  // 1. Mälaren in från väster, sveper söder om Kungsholmen
  'M -20 560 Q 60 580 140 600 Q 230 615 320 630 Q 400 642 470 655 Q 550 670 620 678 Q 680 685 700 700 L 700 770 Q 600 778 480 770 Q 340 760 200 758 Q 80 758 -20 762 Z',
  // 2. Strömmen — smal kanal mellan Norrmalm och Gamla Stan
  'M 700 595 Q 740 612 790 626 Q 830 636 870 644 Q 880 660 870 680 Q 820 700 760 698 Q 720 692 700 678 Z',
  // 3. Saltsjön — österut, mellan Östermalm och Södermalm (öster om Gamla Stan)
  'M 870 600 Q 980 590 1100 590 Q 1280 595 1450 600 Q 1560 605 1620 615 L 1620 800 Q 1500 790 1340 790 Q 1180 795 1020 798 Q 920 800 880 770 Z',
  // 4. Klara sjö — smal slits mellan Kungsholmen och Norrmalm
  'M 392 400 Q 408 470 405 540 Q 402 590 388 638 L 422 640 Q 436 590 438 510 Q 440 440 425 392 Z',
];

// "Land-konturer" — fina streckade linjer för att antyda kvartersgränser
const LAND_OUTLINES = [
  // Kungsholmens södra kontur
  'M -10 640 Q 100 620 240 632 Q 340 640 380 650',
  // Norrmalms södra kontur mot Strömmen
  'M 440 640 Q 560 645 690 658',
  // Gamla Stans kontur
  'M 720 615 Q 770 605 820 612 Q 855 620 868 642 Q 880 670 870 700 Q 855 730 820 758 Q 770 770 720 758 Q 695 740 695 700 Q 690 660 720 615 Z',
  // Södermalms norra kontur
  'M -20 770 Q 200 762 440 770 Q 700 778 870 776 Q 1100 800 1340 798 Q 1500 798 1620 808',
];

// Stadsdelar — för områdesval + label-position
const DISTRICTS = [
  { id: 'gamla-stan',  name: 'Gamla Stan',  nameEn: 'Old Town',     label: { x: 795,  y: 690, w: 110 } },
  { id: 'norrmalm',    name: 'Norrmalm',    nameEn: 'Norrmalm',     label: { x: 660,  y: 470, w: 180 } },
  { id: 'ostermalm',   name: 'Östermalm',   nameEn: 'Östermalm',    label: { x: 1180, y: 370, w: 200 } },
  { id: 'vasastan',    name: 'Vasastan',    nameEn: 'Vasastan',     label: { x: 460,  y: 200, w: 180 } },
  { id: 'kungsholmen', name: 'Kungsholmen', nameEn: 'Kungsholmen',  label: { x: 220,  y: 510, w: 220 } },
  { id: 'sodermalm',   name: 'Södermalm',   nameEn: 'Södermalm',    label: { x: 760,  y: 920, w: 180 } },
];

// Hjälpfunktioner för fuzzy matching
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[':\.\-,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesGuess(street, guess) {
  const g = normalize(guess);
  if (!g) return false;
  const candidates = [street.name, ...(street.aliases || [])].map(normalize);
  // Also accept without "-gatan", "-vägen" etc. — common shorthand
  const more = candidates.flatMap(c => [c, c.replace(/(gatan|vagen|brinken|torget|bron|strand)$/, '').trim()]);
  return more.some(c => c === g || (c.length > 4 && g.length > 4 && c === g));
}

// Gator — id, name, district, d (SVG path), weight, labelAt: {x, y, rot}
// Stylized; not GPS-accurate. Layout aims to look like Stockholm.
const STREETS = [
  // ─────────────── GAMLA STAN ───────────────
  { id: 'vasterlanggatan',    district: 'gamla-stan', weight: 'medium', name: 'Västerlånggatan',
    d: 'M 750 620 Q 740 660 745 700 Q 750 735 760 760', labelAt: { x: 720, y: 710, rot: -88 } },
  { id: 'osterlanggatan',     district: 'gamla-stan', weight: 'medium', name: 'Österlånggatan',
    d: 'M 815 620 Q 822 660 818 700 Q 815 735 805 760', labelAt: { x: 845, y: 710, rot: 88 } },
  { id: 'skeppsbron',         district: 'gamla-stan', weight: 'thick',  name: 'Skeppsbron',
    d: 'M 845 615 Q 858 660 858 700 Q 855 735 845 760', labelAt: { x: 880, y: 690, rot: 88 } },
  { id: 'munkbron',           district: 'gamla-stan', weight: 'thin',   name: 'Munkbron',
    d: 'M 720 660 Q 715 695 720 740', labelAt: { x: 692, y: 700, rot: -88 } },
  { id: 'pragatan',           district: 'gamla-stan', weight: 'thin',   name: 'Prästgatan',
    d: 'M 765 635 Q 760 680 765 740', labelAt: { x: 780, y: 642, rot: -88 } },
  { id: 'kopmangatan',        district: 'gamla-stan', weight: 'thin',   name: 'Köpmangatan',
    d: 'M 770 680 L 815 680', labelAt: { x: 770, y: 674, rot: 0 } },
  { id: 'stora-nygatan',      district: 'gamla-stan', weight: 'thin',   name: 'Stora Nygatan',
    d: 'M 730 660 Q 728 700 735 740', labelAt: { x: 716, y: 700, rot: -88 } },
  { id: 'tyska-brinken',      district: 'gamla-stan', weight: 'thin',   name: 'Tyska Brinken',
    d: 'M 745 705 L 815 700', labelAt: { x: 760, y: 695, rot: 0 } },
  { id: 'jarntorgsgatan',     district: 'gamla-stan', weight: 'thin',   name: 'Järntorgsgatan',
    d: 'M 760 745 L 815 745', labelAt: { x: 770, y: 757, rot: 0 } },
  { id: 'tradgardsgatan',     district: 'gamla-stan', weight: 'thin',   name: 'Trädgårdsgatan',
    d: 'M 745 625 L 815 625', labelAt: { x: 760, y: 620, rot: 0 } },

  // ─────────────── NORRMALM ───────────────
  { id: 'drottninggatan',     district: 'norrmalm', weight: 'thick',  name: 'Drottninggatan',
    d: 'M 680 360 Q 680 430 680 500 Q 680 560 685 600', labelAt: { x: 660, y: 430, rot: -90 } },
  { id: 'sveavagen',          district: 'norrmalm', weight: 'thick',  name: 'Sveavägen',
    d: 'M 760 180 Q 758 280 752 380 Q 748 480 745 555', labelAt: { x: 775, y: 320, rot: 90 } },
  { id: 'vasagatan',          district: 'norrmalm', weight: 'medium', name: 'Vasagatan',
    d: 'M 595 440 Q 600 490 605 540 Q 608 570 612 595', labelAt: { x: 580, y: 510, rot: -90 } },
  { id: 'klarabergsgatan',    district: 'norrmalm', weight: 'medium', name: 'Klarabergsgatan',
    d: 'M 540 540 L 760 540', labelAt: { x: 580, y: 533, rot: 0 } },
  { id: 'hamngatan',          district: 'norrmalm', weight: 'medium', name: 'Hamngatan',
    d: 'M 760 565 L 960 555', labelAt: { x: 800, y: 550, rot: -3 } },
  { id: 'kungsgatan',         district: 'norrmalm', weight: 'thick',  name: 'Kungsgatan',
    d: 'M 540 470 L 905 460', labelAt: { x: 600, y: 453, rot: -1.5 } },
  { id: 'master-samuelsgatan',district: 'norrmalm', weight: 'thin',   name: 'Mäster Samuelsgatan',
    d: 'M 565 505 L 855 500', labelAt: { x: 620, y: 495, rot: -1 } },
  { id: 'tegnergatan',        district: 'norrmalm', weight: 'medium', name: 'Tegnérgatan',
    d: 'M 500 360 L 820 358', labelAt: { x: 540, y: 352, rot: 0 } },
  { id: 'olof-palmes-gata',   district: 'norrmalm', weight: 'thin',   name: 'Olof Palmes gata',
    d: 'M 605 400 L 820 395', labelAt: { x: 640, y: 391, rot: -1 } },
  { id: 'regeringsgatan',     district: 'norrmalm', weight: 'thin',   name: 'Regeringsgatan',
    d: 'M 830 450 Q 832 495 838 540 Q 842 565 848 580', labelAt: { x: 815, y: 510, rot: -88 } },

  // ─────────────── ÖSTERMALM ───────────────
  { id: 'strandvagen',        district: 'ostermalm', weight: 'thick',  name: 'Strandvägen',
    d: 'M 925 575 Q 1040 580 1180 583 Q 1280 585 1320 585', labelAt: { x: 1040, y: 569, rot: 1 } },
  { id: 'karlavagen',         district: 'ostermalm', weight: 'thick',  name: 'Karlavägen',
    d: 'M 920 300 Q 1080 295 1240 295 Q 1380 295 1480 295', labelAt: { x: 1100, y: 288, rot: 0 } },
  { id: 'valhallavagen',      district: 'ostermalm', weight: 'thick',  name: 'Valhallavägen',
    d: 'M 905 175 Q 1100 175 1300 175 Q 1450 175 1540 178', labelAt: { x: 1180, y: 168, rot: 0 } },
  { id: 'nybrogatan',         district: 'ostermalm', weight: 'medium', name: 'Nybrogatan',
    d: 'M 970 405 Q 968 460 970 520 Q 972 555 974 580', labelAt: { x: 955, y: 470, rot: -90 } },
  { id: 'sturegatan',         district: 'ostermalm', weight: 'medium', name: 'Sturegatan',
    d: 'M 905 460 Q 920 410 935 360 Q 950 320 970 300', labelAt: { x: 905, y: 395, rot: -68 } },
  { id: 'grev-turegatan',     district: 'ostermalm', weight: 'thin',   name: 'Grev Turegatan',
    d: 'M 935 305 Q 940 380 945 460 Q 948 490 950 510', labelAt: { x: 952, y: 395, rot: 90 } },
  { id: 'linnegatan',         district: 'ostermalm', weight: 'medium', name: 'Linnégatan',
    d: 'M 975 388 Q 1100 385 1240 385 Q 1310 387 1340 390', labelAt: { x: 1080, y: 379, rot: 0 } },
  { id: 'narvavagen',         district: 'ostermalm', weight: 'medium', name: 'Narvavägen',
    d: 'M 1280 302 Q 1280 380 1278 460 Q 1278 530 1280 580', labelAt: { x: 1263, y: 440, rot: -90 } },
  { id: 'storgatan',          district: 'ostermalm', weight: 'thin',   name: 'Storgatan',
    d: 'M 1020 422 Q 1140 420 1240 420 Q 1270 420 1290 420', labelAt: { x: 1100, y: 414, rot: 0 } },
  { id: 'birger-jarlsgatan',  district: 'ostermalm', weight: 'thick',  name: 'Birger Jarlsgatan',
    d: 'M 780 540 Q 820 480 855 420 Q 890 360 920 305 Q 940 270 960 220', labelAt: { x: 820, y: 410, rot: -55 } },

  // ─────────────── VASASTAN ───────────────
  { id: 'odengatan',          district: 'vasastan', weight: 'thick',  name: 'Odengatan',
    d: 'M 290 240 Q 420 235 540 235 Q 640 235 700 235', labelAt: { x: 360, y: 228, rot: 0 } },
  { id: 'sankt-eriksgatan',   district: 'vasastan', weight: 'thick',  name: 'S:t Eriksgatan',
    d: 'M 220 160 Q 218 240 215 320 Q 213 380 218 440', labelAt: { x: 200, y: 290, rot: -90 } },
  { id: 'karlbergsvagen',     district: 'vasastan', weight: 'medium', name: 'Karlbergsvägen',
    d: 'M 150 160 Q 280 158 420 158 Q 520 158 580 158', labelAt: { x: 200, y: 152, rot: 0 } },
  { id: 'upplandsgatan',      district: 'vasastan', weight: 'medium', name: 'Upplandsgatan',
    d: 'M 520 120 Q 522 200 524 280 Q 526 330 528 360', labelAt: { x: 540, y: 220, rot: 90 } },
  { id: 'norrtullsgatan',     district: 'vasastan', weight: 'medium', name: 'Norrtullsgatan',
    d: 'M 605 80 Q 608 140 610 200 Q 612 230 614 250', labelAt: { x: 625, y: 160, rot: 90 } },
  { id: 'surbrunnsgatan',     district: 'vasastan', weight: 'thin',   name: 'Surbrunnsgatan',
    d: 'M 530 178 L 800 178', labelAt: { x: 580, y: 171, rot: 0 } },
  { id: 'roslagsgatan',       district: 'vasastan', weight: 'medium', name: 'Roslagsgatan',
    d: 'M 800 130 Q 800 200 800 280 Q 800 320 800 350', labelAt: { x: 818, y: 220, rot: 90 } },
  { id: 'tegnerlundenvagen',  district: 'vasastan', weight: 'thin',   name: 'Tegnérlunden',
    d: 'M 580 320 Q 600 330 640 332', labelAt: { x: 590, y: 310, rot: 0 } },

  // ─────────────── KUNGSHOLMEN ───────────────
  { id: 'hantverkargatan',    district: 'kungsholmen', weight: 'thick',  name: 'Hantverkargatan',
    d: 'M 60 505 Q 160 500 240 498 Q 320 497 380 500', labelAt: { x: 120, y: 491, rot: -0.5 } },
  { id: 'fleminggatan',       district: 'kungsholmen', weight: 'medium', name: 'Fleminggatan',
    d: 'M 60 460 Q 160 458 240 456 Q 320 455 380 458', labelAt: { x: 120, y: 451, rot: 0 } },
  { id: 'bergsgatan',         district: 'kungsholmen', weight: 'thin',   name: 'Bergsgatan',
    d: 'M 100 545 Q 180 543 260 540 Q 320 540 370 542', labelAt: { x: 150, y: 558, rot: 0 } },
  { id: 'norr-malarstrand',   district: 'kungsholmen', weight: 'medium', name: 'Norr Mälarstrand',
    d: 'M 30 615 Q 130 605 230 605 Q 310 608 380 615', labelAt: { x: 100, y: 600, rot: -2 } },
  { id: 'pipersgatan',        district: 'kungsholmen', weight: 'thin',   name: 'Pipersgatan',
    d: 'M 290 465 Q 292 510 294 545', labelAt: { x: 280, y: 510, rot: -88 } },
  { id: 'polhemsgatan',       district: 'kungsholmen', weight: 'thin',   name: 'Polhemsgatan',
    d: 'M 200 420 Q 202 470 205 540', labelAt: { x: 188, y: 480, rot: -90 } },
  { id: 'kungsholmsgatan',    district: 'kungsholmen', weight: 'medium', name: 'Kungsholmsgatan',
    d: 'M 140 418 Q 240 416 320 416 Q 360 416 380 418', labelAt: { x: 180, y: 411, rot: 0 } },
  { id: 'scheelegatan',       district: 'kungsholmen', weight: 'thin',   name: 'Scheelegatan',
    d: 'M 320 420 Q 322 470 324 545', labelAt: { x: 310, y: 485, rot: -90 } },

  // ─────────────── SÖDERMALM ───────────────
  { id: 'gotgatan',           district: 'sodermalm', weight: 'thick',  name: 'Götgatan',
    d: 'M 720 800 Q 722 880 724 960 Q 725 1010 728 1040', labelAt: { x: 738, y: 870, rot: 90 } },
  { id: 'folkungagatan',      district: 'sodermalm', weight: 'medium', name: 'Folkungagatan',
    d: 'M 620 860 Q 760 858 900 855 Q 1020 853 1110 853', labelAt: { x: 760, y: 850, rot: -0.5 } },
  { id: 'hornsgatan',         district: 'sodermalm', weight: 'thick',  name: 'Hornsgatan',
    d: 'M 200 850 Q 360 848 520 848 Q 640 848 720 850', labelAt: { x: 300, y: 842, rot: 0 } },
  { id: 'ringvagen',          district: 'sodermalm', weight: 'thick',  name: 'Ringvägen',
    d: 'M 300 1010 Q 500 1005 720 1005 Q 950 1005 1180 1005 Q 1290 1005 1340 1005', labelAt: { x: 420, y: 998, rot: 0 } },
  { id: 'bondegatan',         district: 'sodermalm', weight: 'thin',   name: 'Bondegatan',
    d: 'M 720 915 Q 850 913 980 913 Q 1060 913 1110 913', labelAt: { x: 770, y: 907, rot: 0 } },
  { id: 'ostgotagatan',       district: 'sodermalm', weight: 'medium', name: 'Östgötagatan',
    d: 'M 860 805 Q 862 880 864 950 Q 865 985 866 1005', labelAt: { x: 875, y: 880, rot: 90 } },
  { id: 'renstiernas-gata',   district: 'sodermalm', weight: 'medium', name: 'Renstiernas gata',
    d: 'M 1020 810 Q 1022 880 1024 960 Q 1025 990 1026 1005', labelAt: { x: 1037, y: 890, rot: 90 } },
  { id: 'skanegatan',         district: 'sodermalm', weight: 'thin',   name: 'Skånegatan',
    d: 'M 720 945 L 1020 945', labelAt: { x: 800, y: 940, rot: 0 } },
  { id: 'soder-malarstrand',  district: 'sodermalm', weight: 'medium', name: 'Söder Mälarstrand',
    d: 'M 200 790 Q 330 790 460 790 Q 580 790 700 790', labelAt: { x: 280, y: 783, rot: 0 } },
  { id: 'tjarhovsgatan',      district: 'sodermalm', weight: 'thin',   name: 'Tjärhovsgatan',
    d: 'M 800 825 L 1080 825', labelAt: { x: 860, y: 819, rot: 0 } },
  { id: 'wollmar-yxkullsgatan', district: 'sodermalm', weight: 'thin', name: 'Wollmar Yxkullsgatan',
    d: 'M 440 920 L 700 920', labelAt: { x: 480, y: 914, rot: 0 } },
  { id: 'katarina-bangata',   district: 'sodermalm', weight: 'thin',   name: 'Katarina Bangata',
    d: 'M 820 890 L 1170 890', labelAt: { x: 880, y: 883, rot: 0 } },
];

// Build derived lookups
const STREET_BY_ID = Object.fromEntries(STREETS.map(s => [s.id, s]));
const STREETS_BY_DISTRICT = STREETS.reduce((acc, s) => {
  (acc[s.district] = acc[s.district] || []).push(s);
  return acc;
}, {});

window.MAP = MAP;
window.WATER = WATER;
window.LAND_OUTLINES = LAND_OUTLINES;
window.DISTRICTS = DISTRICTS;
window.STREETS = STREETS;
window.STREET_BY_ID = STREET_BY_ID;
window.STREETS_BY_DISTRICT = STREETS_BY_DISTRICT;
window.matchesGuess = matchesGuess;
window.normalizeStreet = normalize;
