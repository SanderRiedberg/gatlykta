# Supabase setup

**Snabbaste vägen (cirka 2 min):**

1. Gå till https://supabase.com/dashboard/projects → "New project"
   - Namn: `gatlykta` (eller vad du vill)
   - Region: closest, t.ex. `North EU (eu-north-1)`
   - Generera ett databaspassword (du behöver det inte längre)
   - Klicka "Create new project" och vänta ~60 sek
2. När projektet är klart: vänster sidopanel → **SQL Editor** → New query.
   Klistra in hela innehållet i [`schema.sql`](./schema.sql) och tryck Run.
3. Vänster sidopanel → **Project Settings** → **API**.
   Kopiera `Project URL` och `anon public` (NOT service_role).
4. Öppna `data/remote-config.js` lokalt och fyll i:
   ```js
   window.SUPABASE_URL = 'https://abc123.supabase.co';
   window.SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```
5. Verifiera direkt: `node scripts/check-supabase.mjs`
   Tre ✓-rader = klar. Ladda om sidan, spela en runda, kolla att en rad
   dyker upp i `Table editor → gatlykta_scores`.

Tre steg-djup beskrivning nedan om något skiter sig.

---

Three steps to enable global leaderboards:

## 1. Create the table

In your Supabase project's SQL editor, run [`schema.sql`](./schema.sql). It
creates `public.gatlykta_scores`, an index for leaderboard reads, a public
read policy and a public insert policy. No auth needed.

## 2. Drop your credentials in

Create a file `data/remote-config.js` (gitignored) with:

```js
window.SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
window.SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

Both values are in Supabase → Project Settings → API. Use the `anon` /
`public` key, never the service role.

Add `<script src="data/remote-config.js"></script>` to `index.html`
after `data/storage.js` and before `data/remote-sync.js`. The included
`data/remote-sync.js` checks for these values at runtime; if either is
missing the remote sync silently no-ops and the app stays local-only.

## 3. Reload

Open the app, finish a round, and the row should appear in the
`gatlykta_scores` table. The Results screen surfaces the local PR; the
top-10 view in the schema (`gatlykta_top10`) is ready to query if you
want to surface a global leaderboard.

## Notes

- The client generates an anonymous `client_id` on first visit and reuses
  it via localStorage. There's no signup.
- `player_name` is optional; today nothing in the UI sets it. Add a
  prompt in Results when ready.
- Insert is unconditional. If abuse becomes a concern, wrap the insert in
  a Supabase Edge Function and validate there.
