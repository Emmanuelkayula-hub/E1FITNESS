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
npm run test:e2e           # Playwright — starts its own dev server on :3100
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
  manually or via CSV import (Reports page) — see DATA_SOURCES.md for
  the provider abstraction this is designed to slot into next.
- **PDF export exists but wasn't visually/text verified by an automated
  renderer.** `lib/pdf/reportPdf.ts` (pdfkit) is confirmed to produce a
  structurally valid PDF (checked with `file`, and its PDF-response
  Content-Type/magic-bytes are asserted in `e2e/reports.spec.ts`), and
  it maps the exact same `ReportSnapshot` data already verified correct
  on the Reports page — but no `pdftotext`/screenshot-based check
  confirmed the rendered layout, because this sandbox had no
  PDF-rendering tool available and couldn't reach one via `apt`/`pip`.
  Worth a manual look before relying on it.
- **E2E coverage is Chromium-only, single viewport, and doesn't reach
  every module.** `e2e/` covers Dashboard, Investments, Savings,
  Research (the conflict-resolution flow), Reports, and CSV import.
  Benchmark, Projections/Monte Carlo, and Career were manually
  smoke-tested per phase instead — see docs/TESTING.md.

## Deployment

Designed for Vercel + a managed Postgres (Neon/Supabase/Vercel Postgres).
Set `DATABASE_URL` and `APP_USER_EMAIL` as environment variables, run
`npx prisma migrate deploy` against the production database once, then
`npm run db:seed` if this is a fresh database that should start from the
user's verified historical data.
