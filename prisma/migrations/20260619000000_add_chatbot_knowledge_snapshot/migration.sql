CREATE TABLE "ChatbotKnowledgeSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "lastSyncedAt" DATETIME,
    "lastErrorAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ChatbotKnowledgeSnapshot_key_key" ON "ChatbotKnowledgeSnapshot"("key");
CREATE INDEX "ChatbotKnowledgeSnapshot_status_idx" ON "ChatbotKnowledgeSnapshot"("status");
CREATE INDEX "ChatbotKnowledgeSnapshot_lastSyncedAt_idx" ON "ChatbotKnowledgeSnapshot"("lastSyncedAt");
