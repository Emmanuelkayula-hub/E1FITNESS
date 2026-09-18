# Assumptions & unresolved data questions

This file exists because the master spec is explicit: **do not silently
guess** on anything that affects financial correctness. Every assumption
below is configurable in Settings or the database, not hardcoded in a way
that would require a code change to correct.

## Unresolved — needs an answer from Longhorn (highest priority)

These come directly from the user's own `Assumptions` and `Questions`
worksheet tabs and are **not yet answered**:

1. **Does the 12-month lock restart per deposit, or run only from the
   first investment?** Defaulted to `PER_CONTRIBUTION` in
   `InvestmentFund.lockMethodology`. If Longhorn confirms it actually runs
   from the first investment only, switch the setting — the app
   recomputes every lot's unlock date from the stored methodology, it
   doesn't bake the assumption into stored data.
2. **Is 3.50% the full Total Expense Ratio, or do custodian/audit/trustee
   fees sit on top?** Modelled as the full annual drag. If more fees
   apply, real returns are lower than every fee-adjusted projection in
   this app.
3. **Is the published return (65.59%, or 12.4% — see the conflict below)
   quoted before or after the 3.50% fee?** Unknown. Projections apply the
   fee themselves regardless, which could double-count the fee if the
   published return is already net.
4. **Does the early withdrawal penalty apply to the whole gross value, or
   only to gains?** `calculateEarlyWithdrawalEstimate` assumes gross value
   (the fact sheet's "5% early withdrawal penalty" reads as a flat charge
   on the amount withdrawn, not a tax on gains) — unconfirmed.
5. **Is withdrawal all-or-nothing per lot, or can it be partial?**
   Unknown; the app estimates per-lot, whole-lot withdrawal only.

## An open, real data conflict (not demo data)

The user's own spreadsheets disagree with each other on the fund's
12-month return:

- `longhorn-starter-tracker.xlsx` / `internship-12-month-plan.xlsx`
  (Assumptions tab, sourced from the user-verified fact sheet, 25 Aug
  2026): **+65.59%**
- `longhorn-investment-tracker.xlsx` (Fee Comparison tab, A30): *"Longhorn's
  published 12-month Equity Fund return was 12.4%
  (longhorn-associates.com/insights)"*

This is seeded as an **open** `DataConflict` row (see `prisma/seed.ts`) —
neither value was picked as "correct." Resolve it from Research > Data
Conflicts once you know which figure the fund currently stands behind and
why the two differ (different measurement window? Before/after fees?
Marketing copy vs. fact sheet?).

## Modelling assumptions made explicit in code

- **Fee drag**: an annual management fee is modelled as a straight
  subtraction from the gross annual return (`netRate = grossRate -
  feeRate`), matching `Fee Comparison!A28`'s own documented assumption
  ("Fees are modelled as a straight reduction in the annual return, which
  is how a TER behaves"). This is not a claim about Longhorn's actual fee
  mechanics (§1–§4 above).
- **Contribution timing / compounding convention — a discrepancy found
  between the user's own workbook tabs, resolved one way, documented
  here rather than silently picked:**
  - The `Month by Month` tab recursion (`D_n = (D_{n-1} + contribution) *
    (1 + monthlyRate)`) is an **annuity-due** convention — each deposit
    starts growing the same month it's made.
  - The `Fee Comparison` and `Projections` tabs instead use a closed-form
    **ordinary annuity** formula (`C * (((1+i)^n - 1) / i)`, no extra
    `(1+i)` factor) — deposits effectively grow from the *end* of their
    month.
  - These two conventions do not agree (e.g. K1,000/mo at 12% for 5 years:
    annuity-due ≈ K82,486; ordinary annuity ≈ K81,670 per the workbook).
  - `lib/calculations/finance.ts#calculateFutureValue` implements the
    **annuity-due** convention, because it matches the more granular,
    row-by-row `Month by Month` projection (independently verified against
    that tab's actual cell values) rather than the summary tabs' simplified
    closed form. If you specifically need to reproduce the Fee Comparison
    tab's numbers, expect a small (~1%) difference — this is a known,
    intentional divergence, not a bug.
- **Dividend-adjusted benchmark**: LASI is price-only. The "fair gap"
  approximates a total-return index by compounding a configurable
  estimated dividend yield (default 4%, from `Benchmark!B15`) over
  elapsed time. This is **not** a real dividend-reinvestment
  calculation — it's explicitly labelled an approximation everywhere it's
  shown.
- **Monte Carlo model**: monthly returns drawn from
  `Normal(mu/12, sigma/sqrt(12))`, applied multiplicatively. No fat tails,
  no mean reversion, no serial correlation. "Illustrative stochastic
  scenario — not a forecast," per spec §36.
- **Savings interest**: monthly compounding on the running balance at
  whichever tier the balance currently sits in, matching
  `Month by Month!E5`'s IF-ladder. FNB's real product terms (compounding
  frequency, whether interest is paid monthly or at maturity) are
  unconfirmed — flagged as `USER_INPUT`, not `OFFICIAL`.
- **Emergency fund target months**: defaults to 6 (from
  `My Plan!B8`), configurable in Settings.
- **Inflation**: 6.5%, ZamStats July 2026 (`Assumptions!B15`), an input a
  user can update, not a permanent constant.

## Explicitly out of scope for this build

- **Authentication**: single-user, no login screen. See
  `lib/currentUser.ts` for the reasoning — this is a stated
  non-goal per spec §45 ("do not over-engineer"), not an oversight.
- **Live external data feeds**: no LuSE or Longhorn API integration exists
  yet. `MarketDataProvider` / `FundDataProvider` abstractions are designed
  for in `/docs/DATA_SOURCES.md` but not implemented — every market/fund
  price in the seed data is a manually recorded historical observation.
