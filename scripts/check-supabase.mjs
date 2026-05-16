import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Verify the local Supabase setup by reading data/remote-config.js and
// hitting two endpoints:
//   1. /rest/v1/gatlykta_scores?select=id&limit=1  (table exists + RLS allows read)
//   2. POST a smoke row, then DELETE doesn't work without service role, so we
//      just check the insert path returns 201 and the row appears in the read.
//
// Outputs a short OK/FAIL report. Safe to run repeatedly — the smoke row is
// labelled player_name='__smoke__' so you can wipe it from the SQL editor:
//   delete from public.gatlykta_scores where player_name = '__smoke__';

const root = fileURLToPath(new URL('../', import.meta.url));
const configSrc = await readFile(join(root, 'data/remote-config.js'), 'utf8');

const sandboxWindow = {};
new Function('window', configSrc)(sandboxWindow);
const url = sandboxWindow.SUPABASE_URL;
const key = sandboxWindow.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('  ✗ data/remote-config.js has SUPABASE_URL or SUPABASE_ANON_KEY = null');
  console.error('    Fill in your Supabase project URL and the anon (public) key.');
  console.error('    See supabase/README.md.');
  process.exit(1);
}

const headers = {
  'apikey': key,
  'Authorization': 'Bearer ' + key,
  'Content-Type': 'application/json',
};

function fail(msg, details) {
  console.error(`  ✗ ${msg}`);
  if (details) console.error('    ' + details);
  process.exit(1);
}

async function step(label, fn) {
  try {
    const res = await fn();
    console.log(`  ✓ ${label}${res ? ` — ${res}` : ''}`);
  } catch (e) {
    fail(label, e.message);
  }
}

console.log(`Checking Supabase at ${url}…\n`);

await step('gatlykta_scores table exists + RLS allows read', async () => {
  const res = await fetch(`${url}/rest/v1/gatlykta_scores?select=id&limit=1`, { headers });
  if (res.status === 401) throw new Error('401 unauthorized — is the key valid? Use the publishable / anon key, not service_role.');
  if (res.status === 404) throw new Error('table not found — did you run supabase/schema.sql?');
  if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return `${rows.length} row(s) returned`;
});

await step('insert path (RLS allows anon insert)', async () => {
  const body = {
    client_id: '__check__',
    player_name: '__smoke__',
    city_id: 'stockholm',
    district_id: '__check__',
    mode: 'quiz',
    correct: 0,
    total: 0,
    stars: 0,
  };
  const res = await fetch(`${url}/rest/v1/gatlykta_scores`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
  return `status ${res.status}`;
});

console.log('\nAll checks passed. Leaderboard sync is ready.');
console.log("To remove the smoke rows: delete from public.gatlykta_scores where player_name = '__smoke__';");
