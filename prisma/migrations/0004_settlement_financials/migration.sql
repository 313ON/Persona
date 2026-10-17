ALTER TABLE "public"."Settlement" ADD COLUMN "amount" DECIMAL(18,2), ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'IRR';
ALTER TABLE "public"."Document" ADD COLUMN "settlementId" TEXT;
CREATE INDEX "Document_settlementId_idx" ON "public"."Document"("settlementId");
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
