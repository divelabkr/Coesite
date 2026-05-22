-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WormLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "baseline" JSONB NOT NULL,
    "activeSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "budgetRemaining" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "allowList" JSONB NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WormLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "level" "WormLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WormLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmsTriggerLog" (
    "id" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmsTriggerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofBundle" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofBundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_createdAt_idx" ON "Agent"("createdAt");

-- CreateIndex
CREATE INDEX "Session_agentId_idx" ON "Session"("agentId");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "Policy_createdAt_idx" ON "Policy"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_agentId_idx" ON "AuditLog"("agentId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_hash_idx" ON "AuditLog"("hash");

-- CreateIndex
CREATE INDEX "WormLog_createdAt_idx" ON "WormLog"("createdAt");

-- CreateIndex
CREATE INDEX "WormLog_hash_idx" ON "WormLog"("hash");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_hash_idx" ON "AdminActionLog"("hash");

-- CreateIndex
CREATE INDEX "DmsTriggerLog_createdAt_idx" ON "DmsTriggerLog"("createdAt");

-- CreateIndex
CREATE INDEX "DmsTriggerLog_hash_idx" ON "DmsTriggerLog"("hash");

-- CreateIndex
CREATE INDEX "ProofBundle_createdAt_idx" ON "ProofBundle"("createdAt");

-- CreateIndex
CREATE INDEX "ProofBundle_hash_idx" ON "ProofBundle"("hash");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofBundle" ADD CONSTRAINT "ProofBundle_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
