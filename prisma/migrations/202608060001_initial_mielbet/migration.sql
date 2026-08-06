-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MIEL', 'VIEWER');

-- CreateEnum
CREATE TYPE "GameFormat" AS ENUM ('TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN_FOR_SELECTION', 'ODDS_READY', 'BET_PLACED', 'IN_PROGRESS', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('STARTING_BALANCE', 'BET_STAKE', 'BET_WIN', 'BET_REFUND', 'ADMIN_ADJUSTMENT', 'BONUS');

-- CreateEnum
CREATE TYPE "GameSuggestionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "FootballMatchStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'LIVE', 'FINISHED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FootballMarketStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FootballMarketType" AS ENUM ('MATCH_RESULT', 'YES_NO', 'OVER_UNDER', 'PLAYER_SPECIAL', 'TEAM_SPECIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FootballEligibilityType" AS ENUM ('ALWAYS_ALLOWED', 'POSITIVE_MIEL_ONLY', 'NOT_WHEN_MIEL_PLAYS', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "SelectionResultStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');

-- CreateEnum
CREATE TYPE "FootballBetBuilderStatus" AS ENUM ('DRAFT', 'PLACED', 'WON', 'LOST', 'REFUNDED', 'PARTIALLY_VOID');

-- CreateEnum
CREATE TYPE "SelectionRelationType" AS ENUM ('INCOMPATIBLE', 'DEPENDENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "participantId" TEXT,
    "displayName" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "photoUrl" TEXT,
    "shirtSize" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minValue" INTEGER NOT NULL DEFAULT 1,
    "maxValue" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantAttribute" (
    "participantId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantAttribute_pkey" PRIMARY KEY ("participantId","attributeId")
);

-- CreateTable
CREATE TABLE "GameTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "format" "GameFormat" NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "minPlayersPerTeam" INTEGER NOT NULL,
    "maxPlayersPerTeam" INTEGER NOT NULL,
    "exactTeamSize" INTEGER,
    "defaultMargin" DECIMAL(6,4) NOT NULL DEFAULT 0.10,
    "defaultSensitivity" DECIMAL(6,4) NOT NULL DEFAULT 1.20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTemplateAttribute" (
    "gameTemplateId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "weight" DECIMAL(8,6) NOT NULL,

    CONSTRAINT "GameTemplateAttribute_pkey" PRIMARY KEY ("gameTemplateId","attributeId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "gameTemplateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "marginOverride" DECIMAL(6,4),
    "sensitivityOverride" DECIMAL(6,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("eventId","participantId")
);

-- CreateTable
CREATE TABLE "EventTeam" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calculatedScore" DECIMAL(8,6),
    "calculatedProbability" DECIMAL(8,6),
    "calculatedOdds" DECIMAL(8,2),
    "overriddenOdds" DECIMAL(8,2),
    "finalOdds" DECIMAL(8,2),
    "isWinningTeam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTeamMember" (
    "eventTeamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "EventTeamMember_pkey" PRIMARY KEY ("eventTeamId","participantId")
);

-- CreateTable
CREATE TABLE "EventBet" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mielUserId" TEXT NOT NULL,
    "selectedTeamId" TEXT NOT NULL,
    "stake" DECIMAL(10,2) NOT NULL,
    "oddsAtPlacement" DECIMAL(8,2) NOT NULL,
    "potentialPayout" DECIMAL(10,2) NOT NULL,
    "payout" DECIMAL(10,2),
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "EventBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "eventBetId" TEXT,
    "footballBetBuilderId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSuggestion" (
    "id" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposedRules" TEXT,
    "proposedFormat" "GameFormat",
    "proposedTeamCount" INTEGER,
    "proposedPlayersPerTeam" INTEGER,
    "proposedAttributesJson" JSONB,
    "status" "GameSuggestionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsOverride" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "originalOdds" DECIMAL(8,2) NOT NULL,
    "overriddenOdds" DECIMAL(8,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "overriddenByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballMatch" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "venue" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "status" "FootballMatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballMarket" (
    "id" TEXT NOT NULL,
    "footballMatchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "marketType" "FootballMarketType" NOT NULL,
    "status" "FootballMarketStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballSelection" (
    "id" TEXT NOT NULL,
    "footballMarketId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "line" TEXT,
    "calculatedOdds" DECIMAL(8,2),
    "overriddenOdds" DECIMAL(8,2),
    "finalOdds" DECIMAL(8,2) NOT NULL,
    "eligibilityType" "FootballEligibilityType" NOT NULL DEFAULT 'ALWAYS_ALLOWED',
    "isManipulable" BOOLEAN NOT NULL DEFAULT false,
    "isWinningSelection" BOOLEAN NOT NULL DEFAULT false,
    "resultStatus" "SelectionResultStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballSelectionRelation" (
    "id" TEXT NOT NULL,
    "selectionAId" TEXT NOT NULL,
    "selectionBId" TEXT NOT NULL,
    "type" "SelectionRelationType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FootballSelectionRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballBetBuilder" (
    "id" TEXT NOT NULL,
    "footballMatchId" TEXT NOT NULL,
    "mielUserId" TEXT NOT NULL,
    "status" "FootballBetBuilderStatus" NOT NULL DEFAULT 'DRAFT',
    "stake" DECIMAL(10,2) NOT NULL,
    "rawCombinedOdds" DECIMAL(10,2) NOT NULL,
    "correctionFactor" DECIMAL(6,4) NOT NULL DEFAULT 0.90,
    "calculatedOdds" DECIMAL(10,2) NOT NULL,
    "overriddenOdds" DECIMAL(10,2),
    "finalOdds" DECIMAL(10,2) NOT NULL,
    "potentialPayout" DECIMAL(10,2) NOT NULL,
    "payout" DECIMAL(10,2),
    "placedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballBetBuilder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballBetBuilderSelection" (
    "betBuilderId" TEXT NOT NULL,
    "footballSelectionId" TEXT NOT NULL,
    "oddsAtPlacement" DECIMAL(8,2) NOT NULL,
    "resultStatus" "SelectionResultStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "FootballBetBuilderSelection_pkey" PRIMARY KEY ("betBuilderId","footballSelectionId")
);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_participantId_idx" ON "User"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_name_key" ON "Participant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "Attribute"("name");

-- CreateIndex
CREATE INDEX "ParticipantAttribute_attributeId_idx" ON "ParticipantAttribute"("attributeId");

-- CreateIndex
CREATE INDEX "GameTemplate_isActive_idx" ON "GameTemplate"("isActive");

-- CreateIndex
CREATE INDEX "GameTemplate_format_idx" ON "GameTemplate"("format");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "EventTeam_eventId_idx" ON "EventTeam"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTeamMember_eventId_participantId_key" ON "EventTeamMember"("eventId", "participantId");

-- CreateIndex
CREATE INDEX "EventBet_status_idx" ON "EventBet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventBet_eventId_mielUserId_key" ON "EventBet"("eventId", "mielUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "GameSuggestion_status_idx" ON "GameSuggestion"("status");

-- CreateIndex
CREATE INDEX "OddsOverride_entityType_entityId_idx" ON "OddsOverride"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "FootballMatch_status_idx" ON "FootballMatch"("status");

-- CreateIndex
CREATE INDEX "FootballMatch_startsAt_idx" ON "FootballMatch"("startsAt");

-- CreateIndex
CREATE INDEX "FootballMarket_footballMatchId_sortOrder_idx" ON "FootballMarket"("footballMatchId", "sortOrder");

-- CreateIndex
CREATE INDEX "FootballMarket_status_idx" ON "FootballMarket"("status");

-- CreateIndex
CREATE INDEX "FootballSelection_footballMarketId_idx" ON "FootballSelection"("footballMarketId");

-- CreateIndex
CREATE INDEX "FootballSelection_eligibilityType_idx" ON "FootballSelection"("eligibilityType");

-- CreateIndex
CREATE UNIQUE INDEX "FootballSelectionRelation_selectionAId_selectionBId_type_key" ON "FootballSelectionRelation"("selectionAId", "selectionBId", "type");

-- CreateIndex
CREATE INDEX "FootballBetBuilder_status_idx" ON "FootballBetBuilder"("status");

-- CreateIndex
CREATE INDEX "FootballBetBuilder_footballMatchId_idx" ON "FootballBetBuilder"("footballMatchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAttribute" ADD CONSTRAINT "ParticipantAttribute_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAttribute" ADD CONSTRAINT "ParticipantAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateAttribute" ADD CONSTRAINT "GameTemplateAttribute_gameTemplateId_fkey" FOREIGN KEY ("gameTemplateId") REFERENCES "GameTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTemplateAttribute" ADD CONSTRAINT "GameTemplateAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_gameTemplateId_fkey" FOREIGN KEY ("gameTemplateId") REFERENCES "GameTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeam" ADD CONSTRAINT "EventTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_eventTeamId_fkey" FOREIGN KEY ("eventTeamId") REFERENCES "EventTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBet" ADD CONSTRAINT "EventBet_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBet" ADD CONSTRAINT "EventBet_mielUserId_fkey" FOREIGN KEY ("mielUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBet" ADD CONSTRAINT "EventBet_selectedTeamId_fkey" FOREIGN KEY ("selectedTeamId") REFERENCES "EventTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_eventBetId_fkey" FOREIGN KEY ("eventBetId") REFERENCES "EventBet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_footballBetBuilderId_fkey" FOREIGN KEY ("footballBetBuilderId") REFERENCES "FootballBetBuilder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSuggestion" ADD CONSTRAINT "GameSuggestion_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsOverride" ADD CONSTRAINT "OddsOverride_overriddenByUserId_fkey" FOREIGN KEY ("overriddenByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballMarket" ADD CONSTRAINT "FootballMarket_footballMatchId_fkey" FOREIGN KEY ("footballMatchId") REFERENCES "FootballMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballSelection" ADD CONSTRAINT "FootballSelection_footballMarketId_fkey" FOREIGN KEY ("footballMarketId") REFERENCES "FootballMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballSelectionRelation" ADD CONSTRAINT "FootballSelectionRelation_selectionAId_fkey" FOREIGN KEY ("selectionAId") REFERENCES "FootballSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballSelectionRelation" ADD CONSTRAINT "FootballSelectionRelation_selectionBId_fkey" FOREIGN KEY ("selectionBId") REFERENCES "FootballSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballBetBuilder" ADD CONSTRAINT "FootballBetBuilder_footballMatchId_fkey" FOREIGN KEY ("footballMatchId") REFERENCES "FootballMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballBetBuilder" ADD CONSTRAINT "FootballBetBuilder_mielUserId_fkey" FOREIGN KEY ("mielUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballBetBuilderSelection" ADD CONSTRAINT "FootballBetBuilderSelection_betBuilderId_fkey" FOREIGN KEY ("betBuilderId") REFERENCES "FootballBetBuilder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballBetBuilderSelection" ADD CONSTRAINT "FootballBetBuilderSelection_footballSelectionId_fkey" FOREIGN KEY ("footballSelectionId") REFERENCES "FootballSelection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

