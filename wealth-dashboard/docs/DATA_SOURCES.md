# Data sources

## Source hierarchy (spec §59)

1. Official source (e.g. a regulator or the fund's own audited fact sheet)
2. User-verified document (e.g. the fact sheet the user was personally handed)
3. Manual observation (the user's own entry, no document backing it)
4. Third-party source (a public website, a marketing page)

This hierarchy is a **prior**, not a rule that auto-resolves conflicts —
when two sources at different tiers disagree (as the Longhorn 65.59%-
vs-12.4% conflict does: a user-verified fact sheet vs. a public website),
the conflict is surfaced for the user to resolve, never auto-picked by
tier. See `lib/calculations/conflicts.ts` and the Research page.

## Sources currently in the seed data

| Source | Type | What it backs |
|---|---|---|
| Longhorn official fact sheet (user-verified, handed over in person, 25 Aug 2026) | User document | `FundResearchProfile` (unit price K8.03, 12mo return 65.59%, fee 3.5%, etc.) |
| Longhorn public website (`longhorn-associates.com/insights`) | Third party | The conflicting 12.4% return observation |
| User's own figures (starter-tracker.xlsx) | Manual | FNB Savings Pocket tier rates |
| luse.co.zm | Third party | LuSE All Share Index baseline observation |
| User's own estimate | Estimated | LASI dividend-yield-approximation input (4%) |

## External data provider architecture (spec §57–§58)

**Not implemented in this build.** The schema and calculation engine are
designed so a live provider could be added without restructuring:

- A `MarketDataProvider` interface (`getLASIHistory()`,
  `getLatestLASI()`, `getDividends()`) would write into the existing
  `MarketIndex`/`Dividend` tables with `sourceType: THIRD_PARTY` and a
  `retrievedAt` timestamp — the Benchmark page already reads from these
  tables generically, so it would pick up live data with zero UI changes.
- A `FundDataProvider` interface (`getFundPrice()`, `getFundHistory()`)
  would write into `FundPrice` the same way.
- Until one exists, every price and index observation is either seeded
  from the user's own verified documents or entered manually through the
  Investments/Benchmark forms, each carrying its own `source`,
  `sourceType`, and `verificationStatus` — there is no code path that
  fabricates a "live" value, per spec §3.

## Data freshness (spec §46)

Thresholds are stored as `ApplicationSetting` rows
(`dataFreshnessMarketDataFreshDays` / `...StaleDays`, seeded to 2/5) and
read by `lib/data/alerts.ts` to flag a fund's latest price observation
as stale. Not yet wired to every table (only fund prices currently
trigger a staleness alert) — extending this to `MarketIndex` and
`Dividend` observations is straightforward follow-up work using the same
pattern.
