-- CreateTable
CREATE TABLE "OpposingParty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL DEFAULT 'NATURAL_PERSON',
    "idNumber" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "legalRep" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalCode" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpposingParty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpposingParty_internalCode_key" ON "OpposingParty"("internalCode");
CREATE INDEX "OpposingParty_name_idx" ON "OpposingParty"("name");
CREATE INDEX "OpposingParty_idNumber_idx" ON "OpposingParty"("idNumber");

-- AlterTable
ALTER TABLE "Party" ADD COLUMN "opposingPartyId" TEXT;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_opposingPartyId_fkey"
    FOREIGN KEY ("opposingPartyId") REFERENCES "OpposingParty"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "Party_opposingPartyId_idx" ON "Party"("opposingPartyId");
