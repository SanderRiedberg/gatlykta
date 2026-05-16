# Supabase setup

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
