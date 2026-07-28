-- MVP hardening migration
--
-- Written by hand (no database was reachable to run `prisma migrate dev`).
-- Verify with `npx prisma migrate diff --from-migrations ./prisma/migrations \
--   --to-schema-datamodel ./prisma/schema.prisma --shadow-database-url <url>`
-- before applying to anything you care about.
--
-- Covers:
--   M-07  missing indexes on hot query paths
--   M-09  club deletion now cascades in the database
--   MVP   club description field
--   MVP   refresh token sessions

-- ─────────────────────────────────────────────────────────────────────────────
-- Club: description + updatedAt
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "clubs" ADD COLUMN "description" TEXT;

-- `updatedAt` is NOT NULL, so backfill existing rows with a default and then
-- drop the default to match what Prisma's own generated migrations produce.
ALTER TABLE "clubs" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "clubs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ─────────────────────────────────────────────────────────────────────────────
-- M-09: cascade club deletion at the database level
--
-- contributions.clubId was ON DELETE RESTRICT and invite_links.clubId was
-- ON DELETE SET NULL. Both become CASCADE so deleting a club cleans up after
-- itself instead of depending on a manual $transaction in the service layer.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "contributions" DROP CONSTRAINT "contributions_clubId_fkey";

ALTER TABLE "contributions" ADD CONSTRAINT "contributions_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_clubId_fkey";

ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Refresh token sessions
--
-- Only a SHA-256 hash of each token is stored. Rotation is recorded via
-- replacedByTokenId so reuse of a stolen token can be detected.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- M-07: indexes on frequently queried columns
--
-- Every one of these backs a query that currently triggers a sequential scan.
-- ─────────────────────────────────────────────────────────────────────────────

-- Coordinator/member club scoping on the members list
CREATE INDEX "users_clubId_idx" ON "users"("clubId");

-- Role filter on the members list
CREATE INDEX "users_role_idx" ON "users"("role");

-- "My contributions" and per-user leaderboard grouping
CREATE INDEX "contributions_userId_idx" ON "contributions"("userId");

-- Approval queue and club analytics (club scope is nearly always paired with status)
CREATE INDEX "contributions_clubId_status_idx" ON "contributions"("clubId", "status");

-- Heatmap aggregation and leaderboard period windows
CREATE INDEX "contributions_datePerformed_idx" ON "contributions"("datePerformed");

-- Default list ordering (ORDER BY "createdAt" DESC)
CREATE INDEX "contributions_createdAt_idx" ON "contributions"("createdAt");

-- Invite link lookups by club and creator
CREATE INDEX "invite_links_clubId_idx" ON "invite_links"("clubId");

CREATE INDEX "invite_links_createdById_idx" ON "invite_links"("createdById");
