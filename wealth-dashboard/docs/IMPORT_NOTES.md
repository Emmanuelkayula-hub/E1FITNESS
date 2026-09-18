# Import notes — what came from the spreadsheets

Three workbooks were inspected cell-by-cell (formulas and values, via
openpyxl) before writing any application code: `internship-12-month-
plan.xlsx`, `longhorn-investment-tracker.xlsx`, and `longhorn-starter-
tracker.xlsx`. Nothing below was recreated as a spreadsheet clone — the
formulas were extracted and reimplemented as tested TypeScript functions
in `lib/calculations/`.

## internship-12-month-plan.xlsx

| Sheet | What was extracted | Where it landed |
|---|---|---|
| `Plan` | The 3-phase glide schedule (700/300, 600/400, 550/450 over months 1–4/5–8/9–12), monthly stipend K2,500, monthly essentials K1,500 | Seeded as `ContributionPlan` + `ContributionPlanPhase` rows |
| `Month by Month` | The exact recursive equity/savings growth formula | `runMonthByMonthProjection` (verified against this tab's own month-12 total) |
| `Scenarios` | −20%/0%/+10%/+20% return scenarios | Superseded by the interactive Projections/Monte Carlo pages — no fixed scenario table needed |
| `Unlock Schedule` | Month-13-onward unlock table, "the clock likely restarts on each deposit — CONFIRM THIS" | `PER_CONTRIBUTION` default lock methodology + the explicit "unconfirmed" framing in Settings and ASSUMPTIONS.md |
| `If Income Changes` | Survival-first override, K100 equity floor | `allocateIncome` |
| `Assumptions` | Every verified fact and estimate, plus "THE TWO QUESTIONS THAT COULD CHANGE THIS PLAN" | Seeded `FundResearchProfile`, `DataSource`/`DataObservation` rows, and ASSUMPTIONS.md's unresolved-questions section |

## longhorn-investment-tracker.xlsx

| Sheet | What was extracted | Where it landed |
|---|---|---|
| `Contributions` | Per-row unit calculation (`deposit / price`), cumulative units/invested/value | `calculateUnits` + the `InvestmentLot` model (one lot per contribution, not one running row) |
| `Quarterly Review` | Fund-vs-LASI review cadence and a Y/N checklist | Informed the Benchmark page's period framing; the checklist items are process guidance, not something the app enforces |
| `Fee Comparison` | The **ordinary-annuity** FV formula, and the sentence "Longhorn's published 12-month Equity Fund return was 12.4% (longhorn-associates.com/insights)" | The 12.4% figure became one side of the seeded `DataConflict` against the fact sheet's 65.59%. The FV formula conflicts with `Month by Month`'s annuity-due recursion — see ASSUMPTIONS.md for how that was resolved (not silently) |
| `Investment Plan` | A personal-commitment worksheet (why I'm investing, valid/invalid reasons to sell) | Not modelled as data — this is reflective/journaling content, not a number to track. Worth adding as a free-text field in a future iteration |

## longhorn-starter-tracker.xlsx

| Sheet | What was extracted | Where it landed |
|---|---|---|
| `Start Here` | The confirmed fact-sheet values (K8.03, 65.59%, 3.50% fee, 0%/0% entry/exit, K100 min, 12mo, 5% penalty, Stanbic Nominees/AMG Global) | Seeded `FundResearchProfile`, `InvestmentFund` defaults |
| `My Plan` | An alternative (savings-heavier) split — 700/300 then 450/550 — with a 6-month emergency-fund target | Not seeded as the active plan (the internship-plan workbook's glide schedule was used instead, since it's the more detailed/later one); the 6-month emergency-fund-target default came from here |
| `Fund Tracker` | Same per-row contribution structure as the investment-tracker workbook, **with an example row at K1.25/unit** | The K1.25 example row is explicitly the *other* half of a realistic data-discrepancy scenario used in tests (`tests/conflicts.test.ts`) — never seeded as real data |
| `Savings` | The exact tier boundaries (K100–249→3%, K250–499→3.5%, K500–999→4%, K1,000+→5%) and the running-balance-only caveat ("ignores interest earned") | `findSavingsTier` + the seeded `SavingsRate` rows; the savings ledger separately tracks an `interest` transaction type for *actual* interest vs. the calculator's *estimated* interest |
| `Benchmark` | The exact rebasing formula, the dividend-yield-addback formula, and the ±2-point verdict thresholds | `calculateBenchmarkIndex`, `calculateDividendAdjustedIndex`, `classifyBenchmarkGap` — transcribed formula-for-formula |
| `Projections` | 1/3/5-year outcome table at bad/middle/strong return assumptions | Superseded by the interactive Projections page |
| `Questions` | 15 questions to ask Longhorn, grouped by topic | Reproduced as the "unresolved questions" list in ASSUMPTIONS.md |

## Where the application's formula differs from a workbook's

Documented explicitly in ASSUMPTIONS.md rather than silently changed:
the `Month by Month` tab's recursive (annuity-due) contribution-growth
formula and the `Fee Comparison`/`Projections` tabs' closed-form
(ordinary-annuity) formula do not agree with each other by about 1% over
long horizons. The application implements the annuity-due convention,
matching the more granular, independently-verifiable `Month by Month`
tab.
