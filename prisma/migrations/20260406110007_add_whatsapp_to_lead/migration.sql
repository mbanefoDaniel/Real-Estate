-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "ownerEmail" SET DEFAULT 'unknown@christoland.ng';
