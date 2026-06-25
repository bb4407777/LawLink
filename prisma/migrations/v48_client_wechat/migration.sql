-- Add wechat field to Client
ALTER TABLE "Client" ADD COLUMN "wechat" TEXT;

-- CreateIndex (optional, for search)
CREATE INDEX IF NOT EXISTS "Client_wechat_idx" ON "Client"("wechat");
