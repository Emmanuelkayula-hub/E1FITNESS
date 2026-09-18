# Calculations

Every formula below is implemented as a pure function in `lib/calculations/`
and has at least one Vitest test in `tests/` — see TESTING.md for the
full list. Nothing here is duplicated inline in a component.

## Investments (`lib/calculations/finance.ts`)

**Units**
```
Units = Contribution Amount / Purchase Unit Price
```
`calculateUnits`. Worked example: K700 / K8.03 = 87.17309... units.

**Portfolio value**
```
Portfolio Value = Σ(units_i × currentUnitPrice)
```
`calculatePortfolioValue`, summed per fund across every lot.

**Simple contribution return**
```
Return = (Current Value − Total Contributions) / Total Contributions
```
`calculateSimpleReturn`. Distinct from fund-stated return — this is the
user's own money-in-vs-money-now number.

**Money-weighted return (XIRR)**
`calculateXIRR` solves `Σ CF_i / (1+r)^(days_i/365) = 0` via Newton-
Raphson with a bisection fallback over `[-99.99%, 1000%]`. Throws
(caught by the caller, shown as "insufficient history" rather than a
number) when there are fewer than two cash flows, when all cash flows
share a sign, or when no root exists in that range.

**Real value**
```
Real Value = Nominal Value / (1 + Inflation)^Years
```
`calculateRealValue`. Inflation is a fraction (0.065), not a percent —
see the regression test in `tests/projections.test.ts` for a bug this
distinction caused and fixed.

**Future value of level monthly contributions**
```
FV = C × (1+i) × (((1+i)^n − 1) / i)      [i = 0 → FV = C × n]
```
`calculateFutureValue`. This is an **annuity-due** convention (deposit
grows from the start of its own month) — see ASSUMPTIONS.md for why this
was chosen over the ordinary-annuity formula the source workbook's
summary tabs use.

## Lock-in / liquidity (`lib/calculations/lockIn.ts`)

**Unlock date**
```
PER_CONTRIBUTION:       unlockDate = contributionDate + minimumHoldingMonths
FROM_FIRST_INVESTMENT:  unlockDate = firstInvestmentDate + minimumHoldingMonths
CUSTOM / UNKNOWN:        null (no fabricated date)
```
`calculateUnlockDate` + `addMonthsClamped` (clamps to the last day of the
target month — e.g. 31 Jan + 1mo → 28/29 Feb, not 3 Mar; handles leap
years via native `Date` arithmetic).

**Liquidity classification**
`classifyLotLiquidity`: `UNLOCKED` once the unlock date has passed,
`UNLOCKING_SOON` within a configurable window (default 30 days),
otherwise `LOCKED`; `UNKNOWN` when the methodology yields no date.

**Early withdrawal estimate**
```
Penalty Amount = Gross Value × PenaltyPercent
Amount After Penalty = Gross Value − Penalty Amount
```
`calculateEarlyWithdrawalEstimate`. Assumes the penalty applies to the
full gross value (unconfirmed with Longhorn — see ASSUMPTIONS.md).

## Savings (`lib/calculations/savings.ts`)

**Tier lookup**: `findSavingsTier` matches a balance against configurable
`[min, max]` bands (K100–249 → 3%, K250–499 → 3.5%, K500–999 → 4%,
K1,000+ → 5%), tested at every boundary value (K99/K100/K249/K250/...).

**Monthly interest**
```
Interest = Balance × (TierAnnualRate / 12)
```
`calculateMonthlySavingsInterest`.

**Emergency fund coverage**
```
Target = MonthlyEssentialExpenses × TargetMonths
% Funded = CurrentSavings / Target × 100
Months Covered = CurrentSavings / MonthlyEssentialExpenses
```
`calculateEmergencyFundCoverage`. Handles zero essentials without
dividing by zero.

## Benchmark (`lib/calculations/benchmark.ts`)

**Rebasing**
```
Indexed Value = (Value at t / Value at Start) × 100
```
`calculateBenchmarkIndex`. Both the fund and LASI are rebased to 100 at
the same start date before any comparison — never compared as raw
values (a K8 price vs. a 26,000-point index is meaningless directly).

**Dividend-adjusted approximation**
```
Adjusted = PriceRebasedIndex × (1 + EstimatedYield)^(DaysElapsed / 365.25)
```
`calculateDividendAdjustedIndex`. An approximation of total return using
a configurable estimated yield (default 4%), not real dividend data —
labelled as such everywhere it's shown.

**Gap / verdict**
```
Gap = FundIndex − BenchmarkIndex
Verdict: > +2 pts "Fund clearly ahead", < −2 pts "Fund clearly behind", else "About level"
```
`calculateBenchmarkGap`, `classifyBenchmarkGap`.

## Projections (`lib/calculations/projections.ts`)

`runScenario` runs year-by-year (not a single closed-form annuity,
because contribution growth makes the stream non-level), applying
`calculateFutureValue` at both the gross and fee-adjusted ("net") annual
rate to isolate `feesPaid = grossFV − netFV`. The fee is modelled as a
straight subtraction from the annual return (`netRate = grossRate −
feeRate`) — documented in the source workbook itself as how a TER
behaves. `realPortfolioValue` applies `calculateRealValue` with the
inflation percentage converted to a fraction.

## Monte Carlo (`lib/calculations/montecarlo.ts`)

Monthly returns: `r ~ Normal(mu/12, sigma/sqrt(12))`, applied
multiplicatively to a running portfolio value with a (optionally
growing) monthly contribution added at the start of each month, over
`numSimulations` independent paths. Percentiles (`p5/p25/p50/p75/p95`)
via linear interpolation between order statistics. Uses `number`
throughout (not `Decimal`) — at 10,000+ paths in a hot loop, Decimal's
overhead is prohibitive and path-level precision isn't meaningful for a
distribution. **Illustrative — no fat tails, no mean reversion, no
serial correlation.**

## Internship allocation (`lib/calculations/internshipPlan.ts`)

`runMonthByMonthProjection` reproduces the source workbook's
`Month by Month` tab recursion exactly:
```
equity_n  = (equity_{n-1}  + equityIn_n)  × (1 + annualEquityRate/12)
savings_n = (savings_{n-1} + savingsIn_n) × (1 + tierRate(savings_{n-1}+savingsIn_n)/12)
```
Verified against the workbook's own month-12 total: K7,834.40 equity +
K4,714.55 savings = K12,548.95 on K12,000 contributed.

`allocateIncome` implements the survival-first override (spec §31):
proportional split above a configurable threshold, floored at a
configurable equity minimum (default K100) below it.

## Data conflicts (`lib/calculations/conflicts.ts`)

`checkConflict` flags two observations of the same field as conflicting
when they differ by more than a tolerance (default 1% relative
difference for numeric values; exact string mismatch for non-numeric
ones). Used to detect the real Longhorn 65.59%-vs-12.4% discrepancy
found in the user's own workbooks.

## Study analytics (`lib/calculations/studyAnalytics.ts`)

Total/weekly hours, questions-per-hour, mock average (only over scored
sessions), days-until-exam, hours-remaining-vs-target — all pure
aggregations over `StudySession` rows.
