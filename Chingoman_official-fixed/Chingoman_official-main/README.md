# Chin-go-man

A marketplace for importing verified used vehicles from China to Ghana, Nigeria, and West Africa — vehicle browsing, CIF landed-cost calculator, seller listings, and a Supabase-backed auth/dashboard system.

Built with Vite + React + TypeScript + Tailwind CSS + Supabase.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the SQL Editor and run the migration in `supabase/migrations/0001_init.sql`. This creates every table the app needs (`profiles`, `vehicles`, `inspections`, `shipping_quotes`, `favorites`, `messages`) with Row Level Security policies already configured.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials for local development:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Deploy to Vercel

The repo already includes a `vercel.json` configured for a Vite SPA (build command, output directory, and a catch-all rewrite to `index.html`), so you don't need to change any project settings in the Vercel dashboard.

1. Push this repo to GitHub (or use the one you already have connected).
2. In Vercel, click **Add New → Project** and import the repo.
3. Vercel will auto-detect the Vite framework preset from `vercel.json`.
4. Under **Project Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (same values as your local `.env` — set these for the Production, Preview, and Development environments)
5. Click **Deploy**.

Because these are `VITE_`-prefixed variables, they're baked into the client bundle at build time — if you add or change them after the first deploy, trigger a new deployment (Vercel does this automatically on the next push, or you can hit **Redeploy**) for the change to take effect.

## Notes

- Navigation is handled by a lightweight in-memory router (`src/context/RouterContext.tsx`) rather than URL-based routing, so the whole app lives at a single path — the `vercel.json` rewrite exists mainly as a safety net.
- Auth, listings, favorites, and shipping-quote requests all read/write directly to Supabase from the client using the anon key, protected by the RLS policies in the migration file.
