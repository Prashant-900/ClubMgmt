# Remove Ranking System & Approval Workflow

Every member can directly log contributions/learnings without needing approval. The leaderboard/ranking system is removed entirely. The app becomes a pure contribution & learning logger with a timeline view.

> [!IMPORTANT]
> **"domain" (frontend/app) = "club" (backend)**. All changes use the correct alias per layer.

## Proposed Changes

### Backend — Prisma Schema

#### [MODIFY] [schema.prisma](file:///c:/ClubMgmt/backend/prisma/schema.prisma)

- Remove `ContributionStatus` enum (`PENDING`, `APPROVED`, `REJECTED`)
- Remove from `Contribution` model:
  - `status` field
  - `rejectionReason` field
  - `approvedById` / `approvedBy` relation
  - `approvedAt` field
  - `@@index([clubId, status])` → simplify to `@@index([clubId])`
- Remove from `User` model:
  - `approvedContributions` relation (`Approvals`)
- A **migration** will be created to drop these columns

---

### Backend — Contribution Service

#### [MODIFY] [contribution.service.js](file:///c:/ClubMgmt/backend/src/services/contribution.service.js)

- Remove `resolveInitialStatus()` helper
- Remove `STATUSES` constant
- `createContribution()` — remove `statusData` logic; just create the record without status
- `updateContribution()` — remove the `PENDING`-only restriction; any owner can edit their own contribution anytime
- `listMyContributions()` — remove `status` filter
- `listContributions()` — remove `status` filter, open to all authenticated users (not just ADMIN/COORDINATOR)
- Remove `approveContribution()` entirely
- Remove `rejectContribution()` entirely
- Remove `getPendingReviewCount()` entirely
- Remove `getLeaderboard()` entirely
- Remove leaderboard date helpers (`getStartOfWeek`, `getStartOfMonth`, `getStartOfSemester`)
- `contributionSelect` — remove `status`, `rejectionReason`, `approvedAt`, `approvedBy`
- `getClubAnalytics()` — remove status-based counting (`totalPending`, `totalRejected`), count all contributions as logged; rename `totalApproved` → `totalContributions`, `totalApprovedHours` → `totalHours`
- `getGlobalAnalytics()` — same simplification as club analytics
- `getHeatmap()` — remove the `REJECTED` exclusion filter; count all contributions

---

### Backend — Contribution Controller

#### [MODIFY] [contribution.controller.js](file:///c:/ClubMgmt/backend/src/controllers/contribution.controller.js)

- Remove `approve`, `reject`, `leaderboard`, `pendingCount` handlers
- Remove them from `module.exports`

---

### Backend — Contribution Routes

#### [MODIFY] [contribution.routes.js](file:///c:/ClubMgmt/backend/src/routes/contribution.routes.js)

- Remove routes: `PATCH /:id/approve`, `PATCH /:id/reject`, `GET /leaderboard`, `GET /pending-count`
- `GET /contributions` — open to all roles (ADMIN, COORDINATOR, MEMBER), not just ADMIN + COORDINATOR

---

### Frontend — Types

#### [MODIFY] [index.ts](file:///c:/ClubMgmt/frontend/types/index.ts)

- Remove `ContributionStatus` type
- Remove from `Contribution` interface: `status`, `rejectionReason`, `approvedAt`, `approvedBy`
- Remove `LeaderboardPeriod`, `LeaderboardEntry`, `LeaderboardResponse` types
- Remove from `ClubStats`: `totalPending`, `totalRejected` → rename `totalApproved` → `totalContributions`, `totalApprovedHours` → `totalHours`
- Remove from `MemberStats`: `pendingCount`, `approvedCount`, `rejectedCount` → rename `approvedHours` → `totalHours`
- Remove `CONTRIBUTION_APPROVED`, `CONTRIBUTION_REJECTED`, `CONTRIBUTION_PENDING` from `NotificationType`

---

### Frontend — Contribution API

#### [MODIFY] [contribution.api.ts](file:///c:/ClubMgmt/frontend/lib/api/contribution.api.ts)

- Remove `approveContribution()`, `rejectContribution()`, `getLeaderboard()` functions
- Remove `status` from `ContributionFilters`
- Remove imports of `LeaderboardResponse`, `LeaderboardPeriod`

---

### Frontend — Components to DELETE

#### [DELETE] [Leaderboard.tsx](file:///c:/ClubMgmt/frontend/components/contributions/Leaderboard.tsx)
#### [DELETE] [ApprovalQueue.tsx](file:///c:/ClubMgmt/frontend/components/contributions/ApprovalQueue.tsx)

---

### Frontend — Contributions Page

#### [MODIFY] [page.tsx](file:///c:/ClubMgmt/frontend/app/contributions/page.tsx)

- Remove `Leaderboard` and `ApprovalQueue` imports
- Remove `"pending"` and `"leaderboard"` tabs
- Remove their tab content rendering

---

### Frontend — Main Page (page.tsx)

#### [MODIFY] [page.tsx](file:///c:/ClubMgmt/frontend/app/page.tsx)

- **MemberHome**: Remove `rank`/`rankError` state, remove `getLeaderboard` call from `loadData`, remove "Domain Rank" stat, remove "Pending" stat
- **ClubDrilldown**: Remove `"overview"` tab (which only showed the Leaderboard), or replace it with a timeline/recent contributions view
- Remove `Leaderboard` import and `getLeaderboard` import

---

### Frontend — Other Components

#### [MODIFY] [ContributionCard.tsx](file:///c:/ClubMgmt/frontend/components/contributions/ContributionCard.tsx)
- Remove status badge display (`PENDING`, `APPROVED`, `REJECTED` styling)

#### [MODIFY] [ContributionForm.tsx](file:///c:/ClubMgmt/frontend/components/contributions/ContributionForm.tsx)
- Remove auto-approve notice for coordinators/admins
- Remove edit-only-while-pending notice

#### [MODIFY] [ContributionList.tsx](file:///c:/ClubMgmt/frontend/components/contributions/ContributionList.tsx)
- Remove status filter options (`Open`, `Closed`, `Rejected`)

#### [MODIFY] [ClubDashboard.tsx](file:///c:/ClubMgmt/frontend/components/contributions/ClubDashboard.tsx)
- Remove "Pending" and "Rejected" stat cards; rename "Approved Hours" → "Total Hours", "Approved" count → "Total"

#### [MODIFY] [GlobalDashboard.tsx](file:///c:/ClubMgmt/frontend/components/contributions/GlobalDashboard.tsx)
- Same stat card simplification as ClubDashboard

#### [MODIFY] [Badge.tsx](file:///c:/ClubMgmt/frontend/components/ui/Badge.tsx)
- Remove `StatusBadge` PENDING/APPROVED/REJECTED config (or remove the component if unused elsewhere)

#### [MODIFY] [NotificationBell.tsx](file:///c:/ClubMgmt/frontend/components/layout/NotificationBell.tsx)
- Remove `CONTRIBUTION_PENDING`, `CONTRIBUTION_APPROVED`, `CONTRIBUTION_REJECTED` notification type handlers

---

### Mobile App — Screens to DELETE/MODIFY

#### [DELETE] [LeaderboardScreen.tsx](file:///c:/ClubMgmt/app/src/screens/leaderboard/LeaderboardScreen.tsx)
The entire leaderboard screen directory is removed.

#### [MODIFY] [TabNavigator.tsx](file:///c:/ClubMgmt/app/src/navigation/TabNavigator.tsx)
- Remove `Leaderboard` tab (4th tab), remove import of `LeaderboardScreen`
- Adjust `INDICATOR_BG` and `TABS` arrays to 4 items: Home, Contributions, Members, Profile

#### [MODIFY] [types.ts](file:///c:/ClubMgmt/app/src/navigation/types.ts)
- Remove `Leaderboard` from `TabParamList`

#### [MODIFY] [MemberHome.tsx](file:///c:/ClubMgmt/app/src/screens/home/MemberHome.tsx)
- Remove `rank` state and `getLeaderboard` call
- Remove "Domain Rank" and "Pending" stat cards

#### [MODIFY] [ContributionsScreen.tsx](file:///c:/ClubMgmt/app/src/screens/contributions/ContributionsScreen.tsx)
- Remove `"pending"` tab and `ApprovalQueue` import

#### [DELETE] [ApprovalQueue.tsx](file:///c:/ClubMgmt/app/src/screens/contributions/tabs/ApprovalQueue.tsx)

#### [MODIFY] [ContributionDetailScreen.tsx](file:///c:/ClubMgmt/app/src/screens/contributions/ContributionDetailScreen.tsx)
- Remove approve/reject review section (`canModerate` logic, `handleApprove`, `handleReject`, rejection form)
- Remove `StatusBadge` display
- `canEdit` — allow edit anytime by owner (remove PENDING check)

#### [MODIFY] [EditContributionScreen.tsx](file:///c:/ClubMgmt/app/src/screens/contributions/EditContributionScreen.tsx)
- Remove PENDING-only edit restriction; owners can always edit
- Remove locked messages about approved/rejected status
- Remove "pending review" notice

#### [MODIFY] [SubmitContributionScreen.tsx](file:///c:/ClubMgmt/app/src/screens/contributions/SubmitContributionScreen.tsx)
- Remove auto-approve notice

#### [MODIFY] [contribution.api.ts](file:///c:/ClubMgmt/app/src/api/contribution.api.ts)
- Remove `approveContribution()`, `rejectContribution()`, `getLeaderboard()` functions
- Remove leaderboard-related types import

#### [MODIFY] [index.ts](file:///c:/ClubMgmt/app/src/types/index.ts)
- Same type changes as frontend types

#### [MODIFY] [ProfileScreen.tsx](file:///c:/ClubMgmt/app/src/screens/profile/ProfileScreen.tsx)
- Remove pending/approved/rejected stat cards, simplify to total contributions + total hours

---

## Verification Plan

### Automated Tests
```bash
cd backend && npx prisma migrate dev --name remove-ranking-and-approval
cd backend && npm run dev   # verify no crash
cd frontend && npx next build  # verify no TS errors
```

### Manual Verification
- POST a contribution as MEMBER → stored directly (no PENDING status)
- GET contributions → no `status` field in response
- Verify leaderboard routes return 404
- Verify approval routes return 404
- Frontend: contributions page shows "My contributions" and "Domain contributions" tabs only (no Pending, no Leaderboard)
- Mobile: 4 tabs in bottom bar (no Leaderboard)
- Mobile: contribution detail shows no approve/reject buttons
