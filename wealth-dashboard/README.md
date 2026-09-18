# EK Wealth & Career Dashboard

A personal financial operating system: net worth, investment ledger,
savings, benchmark comparison, projections, Monte Carlo simulation,
career/exam tracking, and data-provenance/conflict tracking — built for
one user, on real data extracted from that user's own spreadsheets.

Not investment advice. See `/docs/ASSUMPTIONS.md` for what is verified
vs. assumed, and `/docs/CALCULATIONS.md` for every formula used.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4
· PostgreSQL + Prisma 6.19 · Zod · decimal.js · Recharts · Vitest

See `/docs/ARCHITECTURE.md` for the full module map and reasoning behind
these choices (notably: Prisma pinned to the stable 6.19 line rather
than the just-released, breaking-change Prisma 7).

## Setup

```bash
npm install

# Postgres must be running and reachable at DATABASE_URL (see .env.example)
npx prisma migrate deploy   # or `npx prisma migrate dev` in development
npm run db:seed             # seeds the user's own verified historical data

npm run dev                 # http://localhost:3000
```

Copy `.env.example` to `.env` and set `DATABASE_URL` and `APP_USER_EMAIL`
first — see that file for what each variable does.

## Scripts

```bash
npm run dev          # start the dev server
npm run build         # production build (also type-checks)
npm run test           # run the Vitest suite once
npm run test:watch      # watch mode
npm run db:migrate       # prisma migrate dev
npm run db:seed           # re-seed (idempotent — upserts, safe to re-run)
npm run db:studio          # Prisma Studio, browse the DB visually
```

## Documentation

| File | What it covers |
|---|---|
| `docs/ARCHITECTURE.md` | Stack choices, module map, data-provenance model |
| `docs/CALCULATIONS.md` | Every formula, with its source and test |
| `docs/ASSUMPTIONS.md` | Every assumption, and every unresolved data question |
| `docs/DATA_SOURCES.md` | Source hierarchy, seeded sources, the (unimplemented) live-provider architecture |
| `docs/IMPORT_NOTES.md` | Exactly what was extracted from each of the three source spreadsheets |
| `docs/TESTING.md` | Test coverage, the manual verification log, and a real bug this suite caught |

## Known limitations (be honest about these — don't claim otherwise)

- **No authentication.** Single deployed user, identified by
  `APP_USER_EMAIL`. Do not deploy this publicly without putting it behind
  some access control (e.g. Vercel password protection).
- **No live external data feed.** LuSE and Longhorn prices are entered
  manually or (not yet built) via CSV import — see DATA_SOURCES.md for
  the provider abstraction this is designed to slot into.
- **No CSV import UI.** CSV *export* works (Reports page). Import (spec
  §49) was not built in this session — see the final status report.
- **No PDF export.** Reports render as a printable page (browser
  print-to-PDF works); no server-side PDF generation library was added.
- **No end-to-end (Playwright) tests.** Every module was manually
  smoke-tested against the real dev database instead — see TESTING.md.

## Deployment

Designed for Vercel + a managed Postgres (Neon/Supabase/Vercel Postgres).
Set `DATABASE_URL` and `APP_USER_EMAIL` as environment variables, run
`npx prisma migrate deploy` against the production database once, then
`npm run db:seed` if this is a fresh database that should start from the
user's verified historical data.
