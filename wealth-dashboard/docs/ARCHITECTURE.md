# Architecture

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript strict mode.
- **Tailwind CSS v4** for styling (`app/globals.css`, tokens in `:root` /
  `@theme inline`, dark mode via `prefers-color-scheme`).
- **PostgreSQL 16 + Prisma 6.19** (pinned to a stable major — Prisma 7 was
  available but ships a breaking `prisma.config.ts` / driver-adapter
  change so recent it has no established local docs; 6.19 is the
  well-documented stable line and keeps the familiar `url = env(...)`
  schema config).
- **Zod** for input validation on every server action.
- **decimal.js** for money/unit-quantity arithmetic (spec §64–§65 — no
  silent rounding, no native-float financial math).
- **Recharts** for charts.
- **Vitest** for the calculation-engine unit tests.

## Why this repo, why a subdirectory

This session's repository (`E1FITNESS`) already contains an unrelated,
single-file fitness-tracking app (`e1fitness.html`) with its own commit
history. The wealth dashboard is a structurally unrelated project (a full
Next.js/Postgres app vs. a static HTML file), so it lives in
`wealth-dashboard/` at the repo root rather than overwriting or
interleaving with the fitness app. Nothing outside `wealth-dashboard/` was
touched.

## Module map

```
app/
  dashboard/        Net worth, liquidity, alerts — the command centre
  investments/       Contribution ledger, lots, unlock calendar
  savings/            FNB Savings Pocket tracker, emergency fund
  benchmark/          LASI rebasing, fair-gap analysis
  projections/        Deterministic scenario engine
  research/            Fund research profiles, data conflicts
  career/               Exam tracker, study analytics, trade-off view
  reports/               Monthly/quarterly report generation, CSV export
  settings/               Profile & fund assumptions, audit-logged writes

lib/
  calculations/    Pure functions only — the single source of truth for
                    every formula. Nothing here touches Prisma or React.
                    See CALCULATIONS.md for the formula-by-formula spec.
  data/            Server-side data-access helpers that call calculations/
                    and write through Prisma (audit-logged where the spec
                    requires it).
  validation/      Zod schemas for every server-action input.
  prisma.ts        Prisma client singleton.
  currentUser.ts   Single-user identity helper (see ASSUMPTIONS.md).

components/
  ui/          Design-system primitives (Card, Badge/VerificationBadge).
  nav/         NavShell — desktop sidebar + mobile bottom bar.
  forms/       Client components wrapping server actions with
               useActionState for inline validation feedback.
  charts/      Recharts wrappers (added as each phase needs them).
  tables/      Data-table components (added as each phase needs them).

prisma/
  schema.prisma   Full data model (spec §47).
  seed.ts         Seeds the user's own verified historical data — see
                   IMPORT_NOTES.md for the spreadsheet-to-row mapping.

tests/     Vitest specs, one file per lib/calculations/* module.
docs/      This file, plus CALCULATIONS.md, ASSUMPTIONS.md,
           DATA_SOURCES.md, IMPORT_NOTES.md, TESTING.md.
```

## Data provenance model

Every financially meaningful fact is stored as an **observation** with a
source, not as a bare column value that gets overwritten:

- `FundPrice` — a time series of unit-price observations, each with
  `source`, `sourceType`, `verificationStatus`.
- `FundResearchProfile` — a point-in-time fact-sheet snapshot (fee,
  penalty, minimum, etc.), kept as history rather than overwritten.
- `DataSource` / `DataObservation` — the general-purpose provenance model
  used by the conflict engine: any field on any entity can have multiple
  sourced observations.
- `DataConflict` — created when two observations of the same field
  disagree beyond a tolerance (`lib/calculations/conflicts.ts`); resolved
  explicitly by the user, never silently.
- `AuditLog` — every settings/assumption change writes a before/after row
  (spec §48).

## Server actions, not a separate API layer

Mutations are plain Next.js Server Actions (`"use server"` functions in
`app/*/actions.ts`), validated with Zod, calling Prisma directly. This
avoids a redundant REST/GraphQL layer for what is, by design, a
single-user application — see spec §57/§81 for the intended structure;
nothing here prevents adding a `/api` layer later if the app grows
multi-user.

## Known limitations (see ASSUMPTIONS.md for the full list)

- No authentication — single deployed user, identified by `APP_USER_EMAIL`.
- No live external data provider is wired up; all market/fund data is
  manually entered or CSV-imported.
- Built phase-by-phase in one session — modules not yet reached are
  placeholder pages, not silently faked. See the final status report for
  exactly which phases shipped.
