# Testing

## Unit tests (Vitest)

```
npm run test         # run once
npm run test:watch   # watch mode
```

112 tests across 12 files: most in `lib/calculations/*` (pure functions,
no database), plus `lib/csvParse.ts` and the CSV import header-mapping
layer. Run `npm run test` before every commit; CI-equivalent manual gate
used throughout this build was: `tsc --noEmit` → `eslint .` → `vitest
run` → `next build`, every phase.

| File | Covers | Notable edge cases |
|---|---|---|
| `finance.test.ts` | Units, portfolio value, simple return, XIRR, real value, future value | K700/K8.03 exact match, zero/negative price, XIRR degenerate cash flows, inflation over 1/5/10 years |
| `lockIn.test.ts` | Unlock dates, liquidity classification, early withdrawal | Leap years, month-end clamping (31 Jan → 28/29 Feb), UNKNOWN/CUSTOM methodology returning null not a guess |
| `savings.test.ts` | Tier lookup, monthly interest, emergency fund | Every tier boundary (K99/100/249/250/499/500/999/1000), zero essentials |
| `benchmark.test.ts` | Rebasing, dividend adjustment, gap/verdict | Baseline always = 100, zero-day dividend adjustment, ±2pt verdict boundary |
| `montecarlo.test.ts` | Percentile ordering, real-vs-nominal | Deterministic seeded PRNG for reproducibility, zero-simulation error |
| `conflicts.test.ts` | Conflict detection | **The real Longhorn 65.59%-vs-12.4% and K8.03-vs-K1.25 discrepancies found in the source workbooks**, not synthetic data |
| `internshipPlan.test.ts` | Month-by-month projection, income allocation | Verified against the workbook's actual month-1/2/12 cell values |
| `projections.test.ts` | Scenario engine | **Regression test for a real bug** (inflationPercent passed unconverted into calculateRealValue — see below), fee monotonicity |
| `studyAnalytics.test.ts` | Study hour/question/mock aggregation | Empty session list, no-score mock average |
| `csv.test.ts` | CSV export builder | Comma/quote/newline escaping per RFC 4180 |
| `csvParse.test.ts` | CSV import parser | Quoted fields with commas/newlines/doubled quotes, CRLF |
| `csvImportMapping.test.ts` | Column-alias resolution | "Contribution Date"/"transaction_date" both resolve to the same field |

## End-to-end tests (Playwright)

```
npm run test:e2e
```

11 tests in `e2e/`, run against a real `next dev` server (port 3100) and
the real Postgres dev database — no mocking, matching this project's
verify-against-real-data approach used throughout every phase's manual
smoke-testing. `playwright.config.ts` points `launchOptions.executablePath`
at this sandbox's pre-installed Chromium directly (`/opt/pw-browsers/chromium`),
since the `@playwright/test` version installed via npm didn't match the
browser revision baked into the image.

| File | Covers |
|---|---|
| `dashboard.spec.ts` | Dashboard loads with real aggregated figures; every nav link resolves |
| `investments.spec.ts` | Recording a contribution creates a new lot with correctly computed units; the early-withdrawal calculator renders |
| `savings.spec.ts` | Recording a deposit updates the running balance; the income-allocation calculator applies the survival-first floor |
| `research.spec.ts` | The real Longhorn conflict is visible and resolvable end-to-end (resets itself back to OPEN in `afterAll`) |
| `reports.spec.ts` | Generating a report adds it to history with a working PDF download link (verified as a real `%PDF`-prefixed response); the report's net-worth figure matches the Dashboard's; CSV export endpoints return real CSV |
| `csvImport.spec.ts` | Uploading a CSV previews with correct valid/invalid classification and imports only the valid rows |

Because these tests mutate the same dev database rather than a scratch
one, each was written to tolerate re-running: unique per-run values
(timestamps) where a natural key would otherwise collide, and an
`afterAll` reset for the one test (`research.spec.ts`) that changes
long-lived seed state. Confirmed stable across two consecutive full runs.

## A bug this test suite caught mid-build

`runScenario` (Phase 6) passed `inflationPercent` (e.g. `6.5`) directly
into `calculateRealValue`, which expects a **fraction** (`0.065`). This
produced a real portfolio value of `0.0002` instead of the correct
~K62,555 for any nonzero inflation input — an silent, dramatically wrong
number, exactly the kind of error the spec's "no silent rounding /
calculation transparency" priority exists to prevent. Found by manually
smoke-testing the Projections page against the real dev database (not by
the test suite, since this module had no tests yet at the time) — fixed,
and `tests/projections.test.ts` was added specifically so this class of
unit-mismatch bug can't regress silently again.

## What is NOT covered

- **Only one browser/viewport in the E2E suite.** `playwright.config.ts`
  runs a single Chromium desktop project — no Firefox/WebKit, no mobile
  viewport, no CI matrix. Every module not covered by an `e2e/*.spec.ts`
  file (Benchmark, Projections/Monte Carlo, Career) was instead manually
  smoke-tested against the real local Postgres database via `tsx`
  scripts and `curl` at the end of its phase (see the phase-by-phase
  commit messages for the specific numbers verified) rather than getting
  a browser-driven test.
- **No database-integration tests** (e.g. testing `lib/data/*` functions
  against a test database in CI). The calculation engine they call is
  fully unit-tested; the data-layer functions themselves were verified
  manually per phase rather than with an automated integration suite.
- **No load/performance tests.** The Monte Carlo engine was timed once
  manually (10,000 simulations in ~67ms on this machine) but there's no
  regression guard against that getting slower.
- **PDF output was validated structurally, not visually.** `file
  /tmp/test-report.pdf` confirmed a well-formed single-page PDF 1.3
  document, and the data it renders is the same `ReportSnapshot` already
  verified correct elsewhere — but no `pdftotext`/screenshot tool was
  available in this sandbox (`apt-get install poppler-utils` and a `pip`
  fallback both failed to reach a package mirror), so the actual laid-out
  page was never visually confirmed. Worth opening one generated PDF by
  hand before relying on it.

## Manual verification log (spec §89 quality-control checklist)

Each item below was actually run against the real dev database during
this build, not assumed:

1. K700 / K8.03 → 87.17310087 units — confirmed via `recordContribution`.
2. Current portfolio value uses the current unit price — confirmed
   (740.971357395 = 87.17310087 × 8.5).
3. Multiple contributions produce separate lots — by construction (one
   `InvestmentLot` per `Contribution`, enforced by a 1:1 schema relation).
4. Lock dates calculated correctly — confirmed (01/09/2026 contribution →
   01/09/2027 unlock under `PER_CONTRIBUTION`).
5. 5% early withdrawal penalty — confirmed via unit test and the
   calculator's rendered output.
6. K100 savings tier boundary — confirmed via `findSavingsTier` unit
   tests at every boundary value.
7. LASI rebased to 100 — confirmed (`calculateBenchmarkIndex` unit test
   + a live paired-series smoke test).
8. Longhorn and LASI never compared by raw values — enforced by
   construction (the UI only ever renders the rebased index columns
   alongside the raw ones, both are shown, but the "gap" figures are
   always index-point differences).
9. Fee modelling — confirmed via `runScenario`'s fee-monotonicity test.
10. Inflation adjustment — confirmed (and the bug above was caught here).
11. Monte Carlo percentile ordering — confirmed via unit test and a live
    10,000-run smoke test.
12. Career progress persists — confirmed (exam + study session smoke
    test, survived a page reload against the real DB).
13. Reports match dashboard numbers — confirmed (the generated report
    snapshot's net worth, XIRR, and emergency-fund figures exactly match
    the values independently verified on the Dashboard/Investments/
    Savings pages in earlier phases).
14. Imported Excel transactions reconcile with the original spreadsheet —
    **not applicable in this build**: no Excel import UI was built (see
    known limitations); the spreadsheets' *formulas and seed values* were
    reconciled by hand during the Phase 1 extraction (see IMPORT_NOTES.md
    and CALCULATIONS.md), not via an automated import-and-diff.
15. Conflicting data is not silently overwritten — confirmed: the seeded
    Longhorn conflict was resolved via `resolveConflict` and the audit
    log correctly recorded the before/after status and reason, then the
    conflict was manually reset to OPEN so it continues to demonstrate
    the live detection path.
