-- CreateEnum
CREATE TYPE "SlotConfigurationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SlotSymbolType" AS ENUM ('REGULAR', 'HIGH_VALUE', 'WILD', 'SCATTER', 'BONUS');

-- CreateEnum
CREATE TYPE "SlotSpinStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SlotFeatureType" AS ENUM ('MIEL_SMASH_WILD', 'MIEL_NUDGE', 'DOUBLE_SMASH', 'NUMBER_20_MULTIPLIER', 'BANANA_RAIN', 'MIEL_CELEBRATION');

-- CreateEnum
CREATE TYPE "SlotBonusWheelSegmentType" AS ENUM ('CREDITS', 'FREE_SPINS', 'MULTIPLIER', 'MINI_JACKPOT', 'MAJOR_JACKPOT', 'MIELPOT', 'MYSTERY_CHALLENGE');

-- CreateEnum
CREATE TYPE "SlotFreeSpinSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlotJackpotType" AS ENUM ('MINI', 'MAJOR', 'MIELPOT');

-- CreateEnum
CREATE TYPE "SlotJackpotTriggerType" AS ENUM ('RANDOM', 'BONUS_WHEEL', 'SYMBOL_COMBINATION');

-- CreateEnum
CREATE TYPE "SlotChallengeAssignmentStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_STAKE';
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_WIN';
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_REFUND';
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_JACKPOT_WIN';
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_CHALLENGE_REWARD';
ALTER TYPE "WalletTransactionType" ADD VALUE 'SLOT_ADMIN_BONUS';

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "slotChallengeAssignmentId" TEXT,
ADD COLUMN "slotSpinId" TEXT;

-- CreateTable
CREATE TABLE "SlotConfiguration" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SlotConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "availableStakesJson" JSONB NOT NULL,
    "targetRtp" DECIMAL(5,2),
    "volatility" TEXT NOT NULL,
    "maxWinMultiplier" INTEGER NOT NULL DEFAULT 50,
    "gorillaFeatureChance" DECIMAL(7,6) NOT NULL DEFAULT 0.12,
    "scatterFeatureChance" DECIMAL(7,6) NOT NULL DEFAULT 0.10,
    "bonusFeatureChance" DECIMAL(7,6) NOT NULL DEFAULT 0.08,
    "freeSpinRetriggerChance" DECIMAL(7,6) NOT NULL DEFAULT 0.06,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotSymbol" (
    "id" TEXT NOT NULL,
    "slotConfigurationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "type" "SlotSymbolType" NOT NULL,
    "reelWeight" INTEGER NOT NULL,
    "payoutMultiplierTwo" INTEGER,
    "payoutMultiplierThree" INTEGER,
    "isWild" BOOLEAN NOT NULL DEFAULT false,
    "isScatter" BOOLEAN NOT NULL DEFAULT false,
    "isBonus" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotPayline" (
    "id" TEXT NOT NULL,
    "slotConfigurationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "positionsJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotPayline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "configurationVersionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "stake" DECIMAL(10,2) NOT NULL,
    "initialGridJson" JSONB NOT NULL,
    "finalGridJson" JSONB NOT NULL,
    "evaluatedPaylinesJson" JSONB NOT NULL,
    "baseWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "scatterWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "featureWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonusWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "jackpotWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "uncappedWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "featureType" "SlotFeatureType",
    "featurePayloadJson" JSONB,
    "bonusResultJson" JSONB,
    "jackpotResultJson" JSONB,
    "status" "SlotSpinStatus" NOT NULL DEFAULT 'COMPLETED',
    "randomReference" TEXT,
    "freeSpinSessionId" TEXT,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfterStake" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "freeSpinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SlotSpin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotWinLine" (
    "id" TEXT NOT NULL,
    "slotSpinId" TEXT NOT NULL,
    "slotPaylineId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "winAmount" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "SlotWinLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotFeatureResult" (
    "id" TEXT NOT NULL,
    "slotSpinId" TEXT NOT NULL,
    "type" "SlotFeatureType" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "multiplier" INTEGER,
    "winAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlotFeatureResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBonusWheelConfiguration" (
    "id" TEXT NOT NULL,
    "slotConfigurationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotBonusWheelConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBonusWheelSegment" (
    "id" TEXT NOT NULL,
    "bonusWheelConfigurationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SlotBonusWheelSegmentType" NOT NULL,
    "value" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "challengeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SlotBonusWheelSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotFreeSpinSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggeringSpinId" TEXT NOT NULL,
    "stake" DECIMAL(10,2) NOT NULL,
    "awardedSpins" INTEGER NOT NULL,
    "remainingSpins" INTEGER NOT NULL,
    "totalWin" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "SlotFreeSpinSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SlotFreeSpinSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotJackpot" (
    "id" TEXT NOT NULL,
    "type" "SlotJackpotType" NOT NULL,
    "startAmount" DECIMAL(10,2) NOT NULL,
    "currentAmount" DECIMAL(10,2) NOT NULL,
    "contributionRate" DECIMAL(7,6) NOT NULL,
    "maxAmount" DECIMAL(10,2),
    "triggerType" "SlotJackpotTriggerType" NOT NULL,
    "triggerChance" DECIMAL(7,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastWinnerUserId" TEXT,
    "lastWonAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotJackpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotJackpotWin" (
    "id" TEXT NOT NULL,
    "jackpotId" TEXT NOT NULL,
    "slotSpinId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "jackpotBefore" DECIMAL(10,2) NOT NULL,
    "jackpotAfter" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlotJackpotWin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardCredits" INTEGER,
    "requiresAdminCompletion" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotChallengeAssignment" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "slotSpinId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SlotChallengeAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlotChallengeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotConfiguration_version_key" ON "SlotConfiguration"("version");

-- CreateIndex
CREATE INDEX "SlotConfiguration_status_isPublished_idx" ON "SlotConfiguration"("status", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "SlotConfiguration_single_active_published_key" ON "SlotConfiguration"("isPublished") WHERE "status" = 'ACTIVE' AND "isPublished" = true;

-- CreateIndex
CREATE INDEX "SlotSymbol_slotConfigurationId_sortOrder_idx" ON "SlotSymbol"("slotConfigurationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSymbol_slotConfigurationId_slug_key" ON "SlotSymbol"("slotConfigurationId", "slug");

-- CreateIndex
CREATE INDEX "SlotPayline_slotConfigurationId_sortOrder_idx" ON "SlotPayline"("slotConfigurationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SlotPayline_slotConfigurationId_name_key" ON "SlotPayline"("slotConfigurationId", "name");

-- CreateIndex
CREATE INDEX "SlotSpin_createdAt_idx" ON "SlotSpin"("createdAt");

-- CreateIndex
CREATE INDEX "SlotSpin_status_idx" ON "SlotSpin"("status");

-- CreateIndex
CREATE INDEX "SlotSpin_freeSpinSessionId_idx" ON "SlotSpin"("freeSpinSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSpin_userId_idempotencyKey_key" ON "SlotSpin"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SlotWinLine_slotSpinId_idx" ON "SlotWinLine"("slotSpinId");

-- CreateIndex
CREATE INDEX "SlotBonusWheelSegment_bonusWheelConfigurationId_sortOrder_idx" ON "SlotBonusWheelSegment"("bonusWheelConfigurationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SlotBonusWheelSegment_bonusWheelConfigurationId_label_key" ON "SlotBonusWheelSegment"("bonusWheelConfigurationId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "SlotFreeSpinSession_triggeringSpinId_key" ON "SlotFreeSpinSession"("triggeringSpinId");

-- CreateIndex
CREATE INDEX "SlotFreeSpinSession_userId_status_idx" ON "SlotFreeSpinSession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SlotJackpot_type_key" ON "SlotJackpot"("type");

-- CreateIndex
CREATE INDEX "SlotJackpotWin_slotSpinId_idx" ON "SlotJackpotWin"("slotSpinId");

-- CreateIndex
CREATE INDEX "SlotChallengeAssignment_status_idx" ON "SlotChallengeAssignment"("status");

-- CreateIndex
CREATE INDEX "SlotChallengeAssignment_userId_idx" ON "SlotChallengeAssignment"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_slotSpinId_idx" ON "WalletTransaction"("slotSpinId");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_slotSpinId_fkey" FOREIGN KEY ("slotSpinId") REFERENCES "SlotSpin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_slotChallengeAssignmentId_fkey" FOREIGN KEY ("slotChallengeAssignmentId") REFERENCES "SlotChallengeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotConfiguration" ADD CONSTRAINT "SlotConfiguration_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSymbol" ADD CONSTRAINT "SlotSymbol_slotConfigurationId_fkey" FOREIGN KEY ("slotConfigurationId") REFERENCES "SlotConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotPayline" ADD CONSTRAINT "SlotPayline_slotConfigurationId_fkey" FOREIGN KEY ("slotConfigurationId") REFERENCES "SlotConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSpin" ADD CONSTRAINT "SlotSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSpin" ADD CONSTRAINT "SlotSpin_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSpin" ADD CONSTRAINT "SlotSpin_configurationVersionId_fkey" FOREIGN KEY ("configurationVersionId") REFERENCES "SlotConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSpin" ADD CONSTRAINT "SlotSpin_freeSpinSessionId_fkey" FOREIGN KEY ("freeSpinSessionId") REFERENCES "SlotFreeSpinSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotWinLine" ADD CONSTRAINT "SlotWinLine_slotSpinId_fkey" FOREIGN KEY ("slotSpinId") REFERENCES "SlotSpin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotWinLine" ADD CONSTRAINT "SlotWinLine_slotPaylineId_fkey" FOREIGN KEY ("slotPaylineId") REFERENCES "SlotPayline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotWinLine" ADD CONSTRAINT "SlotWinLine_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "SlotSymbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotFeatureResult" ADD CONSTRAINT "SlotFeatureResult_slotSpinId_fkey" FOREIGN KEY ("slotSpinId") REFERENCES "SlotSpin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBonusWheelConfiguration" ADD CONSTRAINT "SlotBonusWheelConfiguration_slotConfigurationId_fkey" FOREIGN KEY ("slotConfigurationId") REFERENCES "SlotConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBonusWheelSegment" ADD CONSTRAINT "SlotBonusWheelSegment_bonusWheelConfigurationId_fkey" FOREIGN KEY ("bonusWheelConfigurationId") REFERENCES "SlotBonusWheelConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBonusWheelSegment" ADD CONSTRAINT "SlotBonusWheelSegment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SlotChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotFreeSpinSession" ADD CONSTRAINT "SlotFreeSpinSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotFreeSpinSession" ADD CONSTRAINT "SlotFreeSpinSession_triggeringSpinId_fkey" FOREIGN KEY ("triggeringSpinId") REFERENCES "SlotSpin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotJackpot" ADD CONSTRAINT "SlotJackpot_lastWinnerUserId_fkey" FOREIGN KEY ("lastWinnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotJackpotWin" ADD CONSTRAINT "SlotJackpotWin_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "SlotJackpot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotJackpotWin" ADD CONSTRAINT "SlotJackpotWin_slotSpinId_fkey" FOREIGN KEY ("slotSpinId") REFERENCES "SlotSpin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotJackpotWin" ADD CONSTRAINT "SlotJackpotWin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotChallengeAssignment" ADD CONSTRAINT "SlotChallengeAssignment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SlotChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotChallengeAssignment" ADD CONSTRAINT "SlotChallengeAssignment_slotSpinId_fkey" FOREIGN KEY ("slotSpinId") REFERENCES "SlotSpin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotChallengeAssignment" ADD CONSTRAINT "SlotChallengeAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotChallengeAssignment" ADD CONSTRAINT "SlotChallengeAssignment_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
