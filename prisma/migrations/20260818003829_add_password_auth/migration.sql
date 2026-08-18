-- CreateEnum
CREATE TYPE "TournamentDayStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'FINALIZING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'VOTING', 'UNDERDOG', 'ALL_STAR', 'ELIMINATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarketDuration" AS ENUM ('ONE_MIN', 'THREE_MIN', 'FIVE_MIN');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('SCHEDULED', 'OPEN', 'PREDICTIONS_CLOSED', 'SETTLING', 'SETTLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('UP', 'DOWN', 'PUSH');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameLower" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentDay" (
    "id" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "TournamentDayStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "TournamentDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "contractAddr" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenLineup" (
    "id" TEXT NOT NULL,
    "tournamentDayId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "role" "TokenStatus" NOT NULL,

    CONSTRAINT "TokenLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "tournamentDayId" TEXT NOT NULL,
    "tokenAId" TEXT NOT NULL,
    "tokenBId" TEXT NOT NULL,
    "volumeA" INTEGER NOT NULL DEFAULT 0,
    "volumeB" INTEGER NOT NULL DEFAULT 0,
    "winnerTokenId" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "tournamentDayId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "duration" "MarketDuration" NOT NULL,
    "status" "MarketStatus" NOT NULL DEFAULT 'SCHEDULED',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "settlesAt" TIMESTAMP(3) NOT NULL,
    "startMarketCapUsd" DECIMAL(20,2),
    "endMarketCapUsd" DECIMAL(20,2),
    "outcome" "Outcome",

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "stake" INTEGER NOT NULL,
    "payout" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "tournamentDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "netCreditsWon" INTEGER NOT NULL DEFAULT 0,
    "predictionCount" INTEGER NOT NULL DEFAULT 0,
    "bestMultiple" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_usernameLower_key" ON "User"("usernameLower");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_usernameLower_idx" ON "User"("usernameLower");

-- CreateIndex
CREATE UNIQUE INDEX "MagicToken_token_key" ON "MagicToken"("token");

-- CreateIndex
CREATE INDEX "MagicToken_userId_idx" ON "MagicToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDay_dayNumber_key" ON "TournamentDay"("dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Token_contractAddr_key" ON "Token"("contractAddr");

-- CreateIndex
CREATE INDEX "Token_status_idx" ON "Token"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TokenLineup_tournamentDayId_tokenId_key" ON "TokenLineup"("tournamentDayId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Battle_tournamentDayId_key" ON "Battle"("tournamentDayId");

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "Market"("status");

-- CreateIndex
CREATE INDEX "Market_tokenId_duration_idx" ON "Market"("tokenId", "duration");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_idempotencyKey_key" ON "Prediction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Prediction_userId_idx" ON "Prediction"("userId");

-- CreateIndex
CREATE INDEX "Prediction_marketId_idx" ON "Prediction"("marketId");

-- CreateIndex
CREATE INDEX "DailyStat_tournamentDayId_netCreditsWon_idx" ON "DailyStat"("tournamentDayId", "netCreditsWon");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_tournamentDayId_userId_key" ON "DailyStat"("tournamentDayId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "MagicToken" ADD CONSTRAINT "MagicToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenLineup" ADD CONSTRAINT "TokenLineup_tournamentDayId_fkey" FOREIGN KEY ("tournamentDayId") REFERENCES "TournamentDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenLineup" ADD CONSTRAINT "TokenLineup_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_tournamentDayId_fkey" FOREIGN KEY ("tournamentDayId") REFERENCES "TournamentDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_tokenAId_fkey" FOREIGN KEY ("tokenAId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_tokenBId_fkey" FOREIGN KEY ("tokenBId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_tournamentDayId_fkey" FOREIGN KEY ("tournamentDayId") REFERENCES "TournamentDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_tournamentDayId_fkey" FOREIGN KEY ("tournamentDayId") REFERENCES "TournamentDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
