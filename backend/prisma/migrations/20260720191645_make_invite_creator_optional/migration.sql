-- DropForeignKey
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_createdById_fkey";

-- AlterTable
ALTER TABLE "invite_links" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
