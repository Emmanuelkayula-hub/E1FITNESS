/**
 * Seed script — populates the database with the user's own verified
 * historical research (spec §74–§75), imported from:
 *   - internship-12-month-plan.xlsx  (Plan / Assumptions sheets)
 *   - longhorn-starter-tracker.xlsx  (Start Here / My Plan / Savings sheets)
 *   - longhorn-investment-tracker.xlsx (Fee Comparison sheet)
 * See /docs/IMPORT_NOTES.md for the full mapping from spreadsheet cells to
 * these rows, and /docs/ASSUMPTIONS.md for what is a fact vs. a guess.
 *
 * Everything here is marked with its real source and observation date —
 * nothing is seeded as a "live" or "current" value.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "misoagathachipende@gmail.com";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: {
      email: USER_EMAIL,
      name: "EK",
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: "EK",
      currency: "ZMW",
      monthlyEssentials: 1500,
      emergencyFundMonthsTarget: 6,
      inflationAssumption: 0.065, // ZamStats, July 2026 — see Assumptions!B15
    },
  });

  await prisma.careerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      qualification: "BSc Actuarial Science",
      institution: "University of Zambia (UNZA)",
      graduationDate: new Date("2026-05-22"),
      currentRole: "Intern",
      currentEmployer: "NAPSA",
      department: "DCB / Accounts Management",
      internshipStartDate: new Date("2026-09-01"),
      internshipMonths: 12,
    },
  });

  // -------------------------------------------------------------------
  // Investment fund: Longhorn Associates Equity Fund
  // -------------------------------------------------------------------
  const fund = await prisma.investmentFund.upsert({
    where: { id: "longhorn-equity-fund-seed" },
    update: {},
    create: {
      id: "longhorn-equity-fund-seed",
      userId: user.id,
      name: "Longhorn Associates Equity Fund",
      provider: "Longhorn Associates",
      fundType: "Unit Trust / Equity Fund",
      annualFeePercent: 3.5,
      entryFeePercent: 0,
      exitFeePercent: 0,
      minimumInvestment: 100,
      minimumHoldingMonths: 12,
      earlyWithdrawalPenaltyPercent: 5,
      lockMethodology: "PER_CONTRIBUTION", // planning assumption — unconfirmed, see ASSUMPTIONS.md
      custodian: "Stanbic Nominees",
      trustee: "AMG Global",
      regulator: "SEC Zambia",
    },
  });

  // Verified historical research snapshot — NOT today's live value.
  await prisma.fundResearchProfile.upsert({
    where: { fundId: fund.id },
    update: {},
    create: {
      fundId: fund.id,
      observationDate: new Date("2026-08-25"),
      unitPrice: 8.03,
      twelveMonthReturnPercent: 65.59,
      annualFeePercent: 3.5,
      source: "Longhorn official fact sheet (user-verified, WhatsApp 0770668766)",
      verificationStatus: "VERIFIED",
      notes:
        "Custodian: Stanbic Nominees. Trustee: AMG Global. Minimum investment K100. " +
        "Minimum holding period 12 months. Early withdrawal penalty 5%. " +
        "Entry/exit fee 0%. Risk classification: HIGH RISK (fund's own label).",
    },
  });

  // Two named data sources so the conflict below has real provenance.
  // create() (not upsert) is used throughout this block, so it's guarded
  // by an existence check to keep the whole script idempotent/safe to re-run.
  const existingConflict = await prisma.dataConflict.findFirst({
    where: { entityType: "InvestmentFund", entityId: fund.id, field: "twelveMonthReturnPercent" },
  });

  if (!existingConflict) {
    const factSheetSource = await prisma.dataSource.create({
      data: {
        userId: user.id,
        name: "Longhorn official fact sheet",
        sourceType: "USER_DOCUMENT",
        urlOrDomain: null,
        description: "User-verified fact sheet obtained directly from Longhorn, 25 Aug 2026",
        reliability: "High — primary document, user has physical/PDF copy",
        lastChecked: new Date("2026-08-25"),
      },
    });

    const publicSiteSource = await prisma.dataSource.create({
      data: {
        userId: user.id,
        name: "Longhorn public website (insights page)",
        sourceType: "THIRD_PARTY",
        urlOrDomain: "longhorn-associates.com/insights",
        description:
          "Public marketing page cited in the user's own Fee Comparison workbook: " +
          '"Longhorn\'s published 12-month Equity Fund return was 12.4%"',
        reliability: "Unverified — public marketing content, not a signed fact sheet",
        lastChecked: new Date("2026-09-01"),
      },
    });

    const obsA = await prisma.dataObservation.create({
      data: {
        sourceId: factSheetSource.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "twelveMonthReturnPercent",
        value: "65.59",
        unit: "%",
        observedAt: new Date("2026-08-25"),
        verificationStatus: "VERIFIED",
        notes: "From the fact sheet handed to the user directly.",
      },
    });

    const obsB = await prisma.dataObservation.create({
      data: {
        sourceId: publicSiteSource.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "twelveMonthReturnPercent",
        value: "12.4",
        unit: "%",
        observedAt: new Date("2026-09-01"),
        verificationStatus: "UNVERIFIED",
        notes: "Cited in longhorn-investment-tracker.xlsx, Fee Comparison!A30.",
      },
    });

    // This is a REAL discrepancy discovered in the user's own spreadsheets —
    // not manufactured demo data. Preserved as an open conflict per spec §17.
    await prisma.dataConflict.create({
      data: {
        userId: user.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "twelveMonthReturnPercent",
        observationAId: obsA.id,
        observationBId: obsB.id,
        difference: 53.19,
        status: "OPEN",
        resolutionNote:
          "Two of the user's own source workbooks disagree: the fact sheet " +
          "(user-verified, 25 Aug 2026) states 65.59%; the Fee Comparison " +
          "workbook separately cites the public website as stating 12.4% for " +
          "the same 12-month period. Do not average or silently pick one — " +
          "ask Longhorn which figure is current and on what basis (see " +
          "Research > Questions to Ask).",
      },
    });
  }

  const existingUnitPriceConflict = await prisma.dataConflict.findFirst({
    where: { entityType: "InvestmentFund", entityId: fund.id, field: "unitPrice" },
  });

  if (!existingUnitPriceConflict) {
    const factSheetSource =
      (await prisma.dataSource.findFirst({ where: { userId: user.id, name: "Longhorn official fact sheet" } })) ??
      (await prisma.dataSource.create({
        data: {
          userId: user.id,
          name: "Longhorn official fact sheet",
          sourceType: "USER_DOCUMENT",
          description: "User-verified fact sheet obtained directly from Longhorn, 25 Aug 2026",
          reliability: "High — primary document, user has physical/PDF copy",
          lastChecked: new Date("2026-08-25"),
        },
      }));

    const publicSiteSource =
      (await prisma.dataSource.findFirst({
        where: { userId: user.id, name: "Longhorn public website (insights page)" },
      })) ??
      (await prisma.dataSource.create({
        data: {
          userId: user.id,
          name: "Longhorn public website (insights page)",
          sourceType: "THIRD_PARTY",
          urlOrDomain: "longhorn-associates.com",
          description: "Public Longhorn website product pages",
          reliability: "Unverified — public marketing content, not a signed fact sheet",
          lastChecked: new Date("2026-09-22"),
        },
      }));

    const priceA = await prisma.dataObservation.create({
      data: {
        sourceId: factSheetSource.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "unitPrice",
        value: "8.03",
        unit: "K",
        observedAt: new Date("2026-08-25"),
        verificationStatus: "VERIFIED",
        notes: "From the fact sheet handed to the user directly.",
      },
    });

    const priceB = await prisma.dataObservation.create({
      data: {
        sourceId: publicSiteSource.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "unitPrice",
        value: "1.25",
        unit: "K",
        // The website shows no "as of" date; this is the date it was found.
        observedAt: new Date("2026-09-22"),
        verificationStatus: "UNVERIFIED",
        notes:
          "Equity Fund listing on longhorn-associates.com/products (found via web search, " +
          "not read directly). Listed alongside the 12.4% 12-month return. No date shown.",
      },
    });

    await prisma.dataConflict.create({
      data: {
        userId: user.id,
        entityType: "InvestmentFund",
        entityId: fund.id,
        field: "unitPrice",
        observationAId: priceA.id,
        observationBId: priceB.id,
        difference: 6.78,
        status: "OPEN",
        resolutionNote:
          "The fact sheet (25 Aug 2026) gives K8.03 per unit; the public website lists K1.25 " +
          "with no date — more than 6x lower, which suggests the website figures are stale. " +
          "Ask Longhorn for today's unit price and why the website shows K1.25.",
      },
    });
  }

  // -------------------------------------------------------------------
  // Savings: FNB Savings Pocket, tier assumptions from Savings!A6:B9
  // -------------------------------------------------------------------
  const savings = await prisma.savingsAccount.upsert({
    where: { id: "fnb-savings-pocket-seed" },
    update: {},
    create: {
      id: "fnb-savings-pocket-seed",
      userId: user.id,
      name: "FNB Savings Pocket",
      provider: "FNB Zambia",
      compounding: "monthly",
    },
  });

  const existingRateCount = await prisma.savingsRate.count({ where: { accountId: savings.id } });
  if (existingRateCount === 0) {
    const tierData: Array<[number, number | null, number]> = [
      [100, 249, 3],
      [250, 499, 3.5],
      [500, 999, 4],
      [1000, null, 5],
    ];
    for (const [min, max, rate] of tierData) {
      await prisma.savingsRate.create({
        data: {
          accountId: savings.id,
          balanceBandMin: min,
          balanceBandMax: max,
          annualRatePercent: rate,
          effectiveDate: new Date("2026-08-24"),
          source: "User's own figures (starter-tracker.xlsx, Savings tab)",
          verificationStatus: "USER_INPUT",
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // Internship contribution plan — the "glide" schedule from
  // internship-12-month-plan.xlsx, Plan!A15:F19
  // -------------------------------------------------------------------
  const plan = await prisma.contributionPlan.upsert({
    where: { id: "internship-glide-plan-seed" },
    update: {},
    create: {
      id: "internship-glide-plan-seed",
      userId: user.id,
      name: "12-month internship glide plan",
      monthlyStipend: 2500,
      active: true,
    },
  });

  const existingPhaseCount = await prisma.contributionPlanPhase.count({ where: { planId: plan.id } });
  if (existingPhaseCount === 0) {
    const phases: Array<[string, number, number, number, number]> = [
      ["Phase 1 - Build", 1, 4, 700, 300],
      ["Phase 2 - Balance", 5, 8, 600, 400],
      ["Phase 3 - Prepare", 9, 12, 550, 450],
    ];
    for (const [label, monthStart, monthEnd, equity, savingsAmt] of phases) {
      await prisma.contributionPlanPhase.create({
        data: {
          planId: plan.id,
          label,
          monthStart,
          monthEnd,
          equityAmount: equity,
          savingsAmount: savingsAmt,
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // Market data: LuSE All Share Index baseline observation
  // -------------------------------------------------------------------
  const existingLasi = await prisma.marketIndex.findFirst({ where: { code: "LASI" } });
  if (!existingLasi) {
    await prisma.marketIndex.create({
      data: {
        code: "LASI",
        name: "LuSE All Share Index",
        date: new Date("2026-08-24"),
        level: 26423.95,
        source: "luse.co.zm",
        sourceType: "THIRD_PARTY",
        retrievedAt: new Date("2026-08-25"),
      },
    });
  }

  const existingDividend = await prisma.dividend.findFirst({ where: { instrumentCode: "LASI" } });
  if (!existingDividend) {
    await prisma.dividend.create({
      data: {
        instrumentCode: "LASI",
        exDate: new Date("2026-08-24"),
        yieldPercent: 4,
        source: "User's own estimate (starter-tracker.xlsx, Benchmark!B15)",
        verificationStatus: "ESTIMATED",
        notes:
          "LASI counts share prices only, no dividends. This estimated yield " +
          "is added back to build a dividend-adjusted approximation — see " +
          "/docs/CALCULATIONS.md, calculateDividendAdjustedIndex.",
      },
    });
  }

  // -------------------------------------------------------------------
  // Application settings — defaults that mirror the workbook assumptions
  // -------------------------------------------------------------------
  const settings: Array<[string, unknown]> = [
    ["lockMethodologyConfirmed", false],
    ["benchmarkDividendYieldEstimatePercent", 4],
    ["monteCarloDefaultSimulations", 10000],
    ["dataFreshnessMarketDataFreshDays", 2],
    ["dataFreshnessMarketDataStaleDays", 5],
  ];
  for (const [key, value] of settings) {
    await prisma.applicationSetting.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: { value: value as never },
      create: { userId: user.id, key, value: value as never },
    });
  }

  console.log("Seed complete.");
  console.log(`User: ${user.email} (${user.id})`);
  console.log(`Fund: ${fund.name} (${fund.id})`);
  console.log("Seeded open DataConflicts: Longhorn 12-month return (65.59% vs 12.4%), unit price (K8.03 vs K1.25).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
