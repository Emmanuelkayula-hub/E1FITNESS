-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'USER_INPUT', 'OFFICIAL', 'ASSUMPTION', 'UNVERIFIED', 'CONFLICTING', 'ESTIMATED', 'STALE');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'USER_DOCUMENT', 'MANUAL', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "LockMethodology" AS ENUM ('PER_CONTRIBUTION', 'FROM_FIRST_INVESTMENT', 'CUSTOM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('NOT_STARTED', 'STUDYING', 'REVISION', 'MOCK_EXAMS', 'COMPLETED', 'PASSED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'REVIEWED', 'ACCEPTED_A', 'ACCEPTED_B', 'KEPT_BOTH', 'MARKED_STALE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "monthlyEssentials" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "emergencyFundMonthsTarget" DECIMAL(5,2) NOT NULL DEFAULT 6,
    "inflationAssumption" DECIMAL(7,4) NOT NULL DEFAULT 0.065,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentFund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "fundType" TEXT NOT NULL DEFAULT 'Unit Trust / Equity Fund',
    "annualFeePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "entryFeePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "exitFeePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "minimumInvestment" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minimumHoldingMonths" INTEGER NOT NULL DEFAULT 12,
    "earlyWithdrawalPenaltyPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "lockMethodology" "LockMethodology" NOT NULL DEFAULT 'PER_CONTRIBUTION',
    "custodian" TEXT,
    "trustee" TEXT,
    "regulator" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentLot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "units" DECIMAL(24,8) NOT NULL,
    "purchasePrice" DECIMAL(18,6) NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "unitPriceAtPurchase" DECIMAL(18,6) NOT NULL,
    "fees" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "netInvested" DECIMAL(18,4) NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundPrice" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "unitPrice" DECIMAL(18,6) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundResearchProfile" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "unitPrice" DECIMAL(18,6),
    "twelveMonthReturnPercent" DECIMAL(9,4),
    "annualFeePercent" DECIMAL(7,4),
    "source" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundResearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketIndex" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "level" DECIMAL(18,4) NOT NULL,
    "dailyChangePercent" DECIMAL(9,4),
    "volume" DECIMAL(20,4),
    "valueTraded" DECIMAL(20,4),
    "trades" INTEGER,
    "source" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'THIRD_PARTY',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dividend" (
    "id" TEXT NOT NULL,
    "instrumentCode" TEXT NOT NULL,
    "exDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,6),
    "yieldPercent" DECIMAL(9,4),
    "source" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'ESTIMATED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dividend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "compounding" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsRate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balanceBandMin" DECIMAL(18,4) NOT NULL,
    "balanceBandMax" DECIMAL(18,4),
    "annualRatePercent" DECIMAL(7,4) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'USER_INPUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "balanceAfter" DECIMAL(18,4),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyStipend" DECIMAL(18,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionPlanPhase" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "monthStart" INTEGER NOT NULL,
    "monthEnd" INTEGER NOT NULL,
    "equityAmount" DECIMAL(18,4) NOT NULL,
    "savingsAmount" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "ContributionPlanPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualification" TEXT,
    "institution" TEXT,
    "graduationDate" TIMESTAMP(3),
    "currentRole" TEXT,
    "currentEmployer" TEXT,
    "department" TEXT,
    "internshipStartDate" TIMESTAMP(3),
    "internshipMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sitting" TEXT,
    "examDate" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3),
    "studyStartDate" TIMESTAMP(3),
    "targetStudyHours" DECIMAL(8,2),
    "mockAverage" DECIMAL(6,2),
    "status" "ExamStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "questionsCompleted" INTEGER DEFAULT 0,
    "topic" TEXT,
    "mockScorePercent" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyContribution" DECIMAL(18,4) NOT NULL,
    "initialInvestment" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "annualNominalReturnPercent" DECIMAL(7,4) NOT NULL,
    "annualFeePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "inflationPercent" DECIMAL(7,4) NOT NULL,
    "contributionGrowthPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "horizonYears" INTEGER NOT NULL,
    "savingsRatePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "startingSavings" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioResult" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "simType" TEXT NOT NULL,
    "totalContributions" DECIMAL(18,4) NOT NULL,
    "nominalPortfolioValue" DECIMAL(18,4) NOT NULL,
    "realPortfolioValue" DECIMAL(18,4) NOT NULL,
    "investmentGrowth" DECIMAL(18,4) NOT NULL,
    "feesPaid" DECIMAL(18,4) NOT NULL,
    "savingsBalance" DECIMAL(18,4) NOT NULL,
    "percentiles" JSONB,
    "assumptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "urlOrDomain" TEXT,
    "description" TEXT,
    "reliability" TEXT,
    "lastChecked" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataObservation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataConflict" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "observationAId" TEXT NOT NULL,
    "observationBId" TEXT NOT NULL,
    "difference" DECIMAL(18,6),
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "InvestmentFund_userId_idx" ON "InvestmentFund"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentLot_contributionId_key" ON "InvestmentLot"("contributionId");

-- CreateIndex
CREATE INDEX "InvestmentLot_userId_idx" ON "InvestmentLot"("userId");

-- CreateIndex
CREATE INDEX "InvestmentLot_fundId_idx" ON "InvestmentLot"("fundId");

-- CreateIndex
CREATE INDEX "InvestmentLot_unlockDate_idx" ON "InvestmentLot"("unlockDate");

-- CreateIndex
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");

-- CreateIndex
CREATE INDEX "Contribution_fundId_idx" ON "Contribution"("fundId");

-- CreateIndex
CREATE INDEX "Contribution_date_idx" ON "Contribution"("date");

-- CreateIndex
CREATE INDEX "FundPrice_fundId_idx" ON "FundPrice"("fundId");

-- CreateIndex
CREATE INDEX "FundPrice_date_idx" ON "FundPrice"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FundResearchProfile_fundId_key" ON "FundResearchProfile"("fundId");

-- CreateIndex
CREATE INDEX "MarketIndex_code_date_idx" ON "MarketIndex"("code", "date");

-- CreateIndex
CREATE INDEX "Dividend_instrumentCode_exDate_idx" ON "Dividend"("instrumentCode", "exDate");

-- CreateIndex
CREATE INDEX "SavingsAccount_userId_idx" ON "SavingsAccount"("userId");

-- CreateIndex
CREATE INDEX "SavingsRate_accountId_idx" ON "SavingsRate"("accountId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_accountId_idx" ON "SavingsTransaction"("accountId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_date_idx" ON "SavingsTransaction"("date");

-- CreateIndex
CREATE INDEX "ContributionPlan_userId_idx" ON "ContributionPlan"("userId");

-- CreateIndex
CREATE INDEX "ContributionPlanPhase_planId_idx" ON "ContributionPlanPhase"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");

-- CreateIndex
CREATE INDEX "Exam_userId_idx" ON "Exam"("userId");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudySession_examId_idx" ON "StudySession"("examId");

-- CreateIndex
CREATE INDEX "StudySession_date_idx" ON "StudySession"("date");

-- CreateIndex
CREATE INDEX "CareerExpense_userId_idx" ON "CareerExpense"("userId");

-- CreateIndex
CREATE INDEX "CareerExpense_date_idx" ON "CareerExpense"("date");

-- CreateIndex
CREATE INDEX "Scenario_userId_idx" ON "Scenario"("userId");

-- CreateIndex
CREATE INDEX "ScenarioResult_scenarioId_idx" ON "ScenarioResult"("scenarioId");

-- CreateIndex
CREATE INDEX "DataSource_userId_idx" ON "DataSource"("userId");

-- CreateIndex
CREATE INDEX "DataObservation_sourceId_idx" ON "DataObservation"("sourceId");

-- CreateIndex
CREATE INDEX "DataObservation_entityType_entityId_field_idx" ON "DataObservation"("entityType", "entityId", "field");

-- CreateIndex
CREATE INDEX "DataConflict_userId_idx" ON "DataConflict"("userId");

-- CreateIndex
CREATE INDEX "DataConflict_entityType_entityId_field_idx" ON "DataConflict"("entityType", "entityId", "field");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_periodStart_periodEnd_idx" ON "Report"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSetting_userId_key_key" ON "ApplicationSetting"("userId", "key");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentFund" ADD CONSTRAINT "InvestmentFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentLot" ADD CONSTRAINT "InvestmentLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentLot" ADD CONSTRAINT "InvestmentLot_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "InvestmentFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentLot" ADD CONSTRAINT "InvestmentLot_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "InvestmentFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundPrice" ADD CONSTRAINT "FundPrice_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "InvestmentFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundResearchProfile" ADD CONSTRAINT "FundResearchProfile_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "InvestmentFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsAccount" ADD CONSTRAINT "SavingsAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsRate" ADD CONSTRAINT "SavingsRate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SavingsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SavingsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPlanPhase" ADD CONSTRAINT "ContributionPlanPhase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContributionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerProfile" ADD CONSTRAINT "CareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerExpense" ADD CONSTRAINT "CareerExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioResult" ADD CONSTRAINT "ScenarioResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataObservation" ADD CONSTRAINT "DataObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataConflict" ADD CONSTRAINT "DataConflict_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSetting" ADD CONSTRAINT "ApplicationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
