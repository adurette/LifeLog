# LifeLog

A private, flexible life tracker for noticing patterns in the things that shape your days.

## Local development

```bash
npm install
npm run dev
```

The app runs in local demo mode when Supabase variables are absent. Data is stored in IndexedDB and seeded with two weeks of example history.

To enable cloud accounts and synchronization:

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations` in timestamp order.
3. Copy `.env.example` to `.env.local` and add the project URL and anonymous key.
4. Configure the app URL as an allowed Supabase authentication redirect.

## Verification

```bash
npm test
npm run build
```
