/* global window */
// Gatlykta — shared game rules, fuzzy matching and hint helpers.

function normalizeStreetName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[':\.\-,]/g, '').replace(/\s+/g, ' ').trim();
}

function withoutStreetSuffix(s) {
  return s.replace(/(gatan|vagen|brinken|torget|bron|strand|grand|leden|plan|torg|kajen|kaj)$/, '').trim();
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev[j - 2] + 1);
      }
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function fuzzyLimit(len) {
  if (len < 6) return 0;
  if (len < 10) return 1;
  if (len < 16) return 2;
  return 3;
}

function evaluateGuess(street, guess) {
  const g = normalizeStreetName(guess);
  if (!g) return { accepted: false, quality: 'empty', distance: Infinity };
  const candidates = [street.name, ...(street.aliases || [])].map(normalizeStreetName);
  const expanded = candidates.flatMap(c => [c, withoutStreetSuffix(c)]);
  let best = { accepted: false, quality: 'wrong', distance: Infinity, candidate: expanded[0] || '' };
  for (const c of expanded) {
    if (!c) continue;
    if (g === c) return { accepted: true, quality: 'exact', distance: 0, candidate: c };
    const d = editDistance(g, c);
    if (d < best.distance) best = { accepted: false, quality: 'wrong', distance: d, candidate: c };
    const maxLen = Math.max(g.length, c.length);
    const lengthClose = Math.abs(g.length - c.length) <= fuzzyLimit(maxLen);
    if (lengthClose && d <= fuzzyLimit(maxLen)) {
      best = { accepted: true, quality: 'fuzzy', distance: d, candidate: c };
    }
  }
  return best;
}

function matchesGuess(street, guess) {
  return evaluateGuess(street, guess).accepted;
}

const TRIVIA_HINTS = {
  drottninggatan: 'Namnet hör till Stockholms äldre kungliga gatunamn.',
  kungsgatan: 'Ett av Stockholms mest centrala öst-västliga stråk.',
  sveavagen: 'En lång nord-sydlig huvudgata genom Norrmalm och Vasastan.',
  strandvagen: 'Namnet passar läget: gatan följer vattnet vid Nybroviken.',
  valhallavagen: 'Namnet anknyter till nordisk mytologi.',
  karlavagen: 'Ett brett paradstråk på Östermalm.',
  gotgatan: 'En klassisk huvudgata genom Södermalm.',
  hornsgatan: 'Ett långt öst-västligt stråk på Södermalm.',
  ringvagen: 'Namnet antyder gatans bågformade drag runt södra Södermalm.',
  vasterlanggatan: 'Namnet beskriver läget på västra sidan av Gamla stan.',
  osterlanggatan: 'Namnet beskriver läget på östra sidan av Gamla stan.',
  skeppsbron: 'Namnet hänger ihop med kajen och sjöfarten vid Gamla stan.',
};

function maskName(name) {
  return name.split(/\s+/).map(part => {
    if (part.length <= 2) return part[0] + '·'.repeat(Math.max(0, part.length - 1));
    return part[0] + '·'.repeat(Math.max(1, part.length - 2)) + part[part.length - 1];
  }).join(' ');
}

function streetHint(street, level = 1) {
  const name = street.name || '';
  const norm = normalizeStreetName(name);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (level <= 1) {
    return `Börjar på ${name[0] || '?'} och har ${words.length} ${words.length === 1 ? 'ord' : 'ord'}.`;
  }
  if (level === 2 && TRIVIA_HINTS[norm]) return TRIVIA_HINTS[norm];
  if (level <= 2) {
    const suffix = name.match(/(gatan|vägen|brinken|torget|bron|strand|gränd|leden|plan|torg|kajen|kaj)$/i);
    return suffix ? `Slutar på "${suffix[0]}".` : `Namnet är ungefär ${name.replace(/\s/g, '').length} bokstäver långt.`;
  }
  return `Mönster: ${maskName(name)}`;
}

const DIFFICULTY_CAPS = { easy: 8, medium: 16, hard: 999 };

function filterByDifficulty(streets, difficulty) {
  const cap = DIFFICULTY_CAPS[difficulty] !== undefined ? DIFFICULTY_CAPS[difficulty] : 999;
  return streets.filter(s => (s.rank == null ? 0 : s.rank) < cap);
}

function streetsForDistricts(streets, districtIds, difficulty) {
  let out = streets;
  if (districtIds) {
    const set = new Set(districtIds);
    out = out.filter(x => set.has(x.district));
  }
  return filterByDifficulty(out, difficulty || 'hard');
}

function pointsForGuess({ wrongs = 0, hints = 0, quality = 'exact' }) {
  return Math.max(35, 100 - wrongs * 15 - hints * 20 - (quality === 'fuzzy' ? 5 : 0));
}

function shuffleStreets(streets) {
  const out = [...streets];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function quizRoundSize(difficulty, total) {
  const base = difficulty === 'hard' ? 40 : difficulty === 'medium' ? 24 : 14;
  return Math.min(total, base);
}

// If the user's guess looks like a real street in the active set, return that
// street so the UI can show "you were thinking of X" rather than just "wrong".
// Returns null if the guess isn't fuzzy-close to any street in the list.
function findGuessedStreet(guess, streets) {
  if (!guess || !guess.trim() || !streets || !streets.length) return null;
  let best = null;
  for (const s of streets) {
    const r = evaluateGuess(s, guess);
    if (!r.accepted) continue;
    if (!best || r.distance < best.distance) {
      best = { street: s, distance: r.distance, quality: r.quality };
    }
  }
  return best;
}

Object.assign(window, {
  normalizeStreet: normalizeStreetName,
  evaluateGuess,
  matchesGuess,
  streetHint,
  DIFFICULTY_CAPS,
  filterByDifficulty,
  streetsForDistricts,
  pointsForGuess,
  shuffleStreets,
  quizRoundSize,
  findGuessedStreet,
});
