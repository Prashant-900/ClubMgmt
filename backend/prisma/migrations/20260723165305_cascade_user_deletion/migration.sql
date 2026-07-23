-- DropForeignKey
ALTER TABLE "contributions" DROP CONSTRAINT "contributions_userId_fkey";

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
