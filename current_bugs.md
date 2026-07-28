# ClubMgmt — Current Bugs & Issues

**Last updated:** 2026-07-28
**Source:** Full codebase audit (all backend and frontend files read)

---

## CRITICAL — Deployment Blockers

---

### ~~C-01: No Rate Limiting on Any Endpoint~~ ✅ FIXED

**Status:** Fixed. `express-rate-limit` is active via `backend/src/middlewares/rate-limit.middleware.js`.
- Auth endpoints: 10 req/15min per IP (applied per-route in `auth.routes.js`, `skipSuccessfulRequests: true`)
- Global API: 100 req/min per IP
- Analytics/leaderboard/heatmap: 30 req/min per IP

---

### ~~C-02: Admin Email List Committed to Git~~ ✅ FIXED

**Status:** Fixed. Admin emails now read from `ADMIN_EMAILS` environment variable (comma-separated), parsed once at module load in `auth.service.js`. The old `admin-list.json` approach is gone.

---

### ~~C-03: Weak or Default JWT Secret~~ ✅ FIXED

**Status:** Fixed. `auth.service.js` validates `JWT_SECRET` at startup — rejects if missing, <32 chars, or equals the default placeholder. Server refuses to start with a weak secret.

---

### C-04: JWT Stored in localStorage (XSS Accessible) — ⚠️ PARTIAL

**Description:**
The access token is stored in `localStorage` under key `clubmgmt.auth.token`. Any XSS vulnerability could steal this token and allow account takeover.

**Status:** Partially addressed.
- **Backend (done):** refresh tokens are issued as opaque, HttpOnly, rotated cookies (`clubmgmt.refresh`) — never exposed to JavaScript. `auth.service.js` has `refreshSession` and `logout` built. The M-01 attachment-URL XSS vector this bug referenced is closed (see M-01).
- **Frontend (pending):** the short-lived *access* token is still read from and written to `localStorage` in `AuthProvider.tsx` (`clubmgmt.auth.token`, lines 15/52/68/86). Migrating the access token off localStorage onto the cookie flow is still open.
- **Route gap:** `POST /api/auth/refresh` and `POST /api/auth/logout` are **not yet wired** in `auth.routes.js`, so the frontend cannot exercise the rotation flow even though the service supports it.

**Affected Files:**

- `frontend/components/providers/AuthProvider.tsx`
- `backend/src/routes/auth.routes.js` (refresh/logout routes not wired)

**Suggested Fix:**
Wire the `/refresh` + `/logout` routes, then switch the frontend to rely on the HttpOnly cookie so the access token never touches JavaScript.

**Estimated Difficulty:** Hard (2-4 hours)

---

## HIGH — Major Broken Workflows

---

### ~~H-01: N+1 API Calls on Admin Home Page~~ ✅ FIXED

**Status:** Fixed. `club.service.js` `listClubs({ enriched: true })` returns each club with `memberCount`, `contributionCount`, and `coordinatorName` in a single Prisma query using `_count` and `include`. `AdminHome`/`ClubDrilldown` now make one `listEnrichedClubs()` call instead of `2 + 2N` per-club requests.

---

### ~~H-02: AdminMembersOverview Fetches 1000 Members Without Virtualization~~ ✅ FIXED

**Status:** Fixed. `AdminMembersOverview.tsx` now uses server-side pagination with a `PAGE_SIZE` limit and separate `assignedPage`/`pendingPage` controls, plus a debounced search term. The `limit: 1000` workaround is gone.

---

### H-03: Admin Email List Read from Disk on Every Google Login ✅ FIXED

**Description:**
~~`getAdminEmails()` read and `JSON.parse`d `admin-list.json` on every Google OAuth callback.~~

**Status:** Fixed. Admin emails are now read from `ADMIN_EMAILS` env var and parsed once at module load time. No file system reads on the auth path.

---

### ~~H-04: Coordinator Cannot Remove Members (Route Blocks Them)~~ ✅ FIXED

**Status:** Fixed. `DELETE /api/members/:id` route now uses `authorize("ADMIN", "COORDINATOR")` (`member.routes.js` line 29). The coarse route guard admits coordinators; `member.service.js` `removeMember` enforces the fine-grained rule (a coordinator may only remove MEMBERs within their own club, and a coordinator targeting an admin or another club still gets a 403).

---

### ~~H-05: 401 Token Expiry Not Handled Globally~~ ✅ FIXED

**Status:** Fixed. `frontend/lib/api/client.ts` now has a global `handleUnauthorized(endpoint)` handler: when a response returns 401 (outside the credential-check endpoints where 401 just means "wrong credentials"), it clears the stored token and redirects to login. A module-level guard ensures several concurrent 401s only trigger one redirect.

---

### ~~H-06: MemberCard Promote Allows Cross-Club Promotion Silently~~ ✅ FIXED

**Status:** Fixed. `MemberCard.tsx` now computes `isCrossClubPromotion` (selected club differs from the member's current club) and requires an explicit confirmation (`confirmCrossClub`) before promoting someone out of their current club. The move is no longer silent.

---

### ~~H-07: CORS Single-Origin — React Native Will Be Blocked~~ ✅ FIXED

**Status:** Fixed. `index.js` now parses a comma-separated `CORS_ORIGINS` env var into an `allowedOrigins` array and uses an origin callback (`allowedOrigins.includes(origin)`), allowing multiple front-ends. Requests with no `Origin` header (e.g. server-to-server) are permitted; unlisted origins are rejected with a CORS error.

---

## MEDIUM — Important But Non-Blocking

---

### ~~M-01: Unvalidated Attachment URL (Potential XSS Vector)~~ ✅ FIXED

**Status:** Fixed. `contribution.service.js` validates `attachmentUrl` through `validateHttpUrl()` (utils/validate.js), which rejects anything that isn't an `http:`/`https:` URL — so `javascript:` and `data:` URLs are blocked server-side. Length is also capped at `LIMITS.contribution.attachmentUrl` (2048).

---

### ~~M-02: Future Date Contributions Allowed~~ ✅ FIXED

**Status:** Fixed. `contribution.service.js` validates `datePerformed` via `validateDate(..., { allowFuture: false })`, rejecting any future date server-side.

---

### ~~M-03: No Input Length Limits on Text Fields~~ ✅ FIXED

**Status:** Fixed. `utils/validate.js` defines a `LIMITS` table (contribution title ≤ 200, description ≤ 2000, attachmentUrl ≤ 2048; club name and description ≤ 500) and the contribution/club services validate against it. (Implemented with a hand-rolled validator rather than Zod/Joi, because the npm registry is unavailable in this environment.)

---

### ~~M-04: Contribution `hours` Minimum Validation Off~~ ✅ FIXED

**Status:** Fixed. `hours` is now validated against `LIMITS.contribution.hoursMin` (0.25) and `hoursMax` (24), so sub-granularity values like `0.001` are rejected server-side and direct API calls can no longer bypass the frontend minimum.

---

### ~~M-05: `bg-glass` and `border-glass-border` CSS Classes Undefined~~ ✅ FIXED

**Status:** Fixed. `globals.css` now defines `--color-glass` (`rgb(22 27 34 / 0.72)`) and `--color-glass-border` (`rgb(48 54 61 / 0.8)`) in the `@theme` block, so Tailwind v4 generates the `bg-glass` / `border-glass-border` utilities.

---

### ~~M-06: Search Input Causes API Blast (No Debouncing)~~ ✅ FIXED

**Status:** Fixed. A reusable `useDebouncedValue` hook (`lib/hooks/useDebouncedValue.ts`) debounces search input by 300ms. `AdminMembersOverview.tsx`, `ClubGrid.tsx`, and `MemberGrid.tsx` all fetch off the debounced value, so keystrokes no longer fire a request each.

---

### ~~M-07: Missing Database Indexes on Queried Fields~~ ✅ FIXED

**Status:** Fixed (schema + migration). `schema.prisma` now has, on Contribution: `@@index([userId])`, `@@index([clubId, status])`, `@@index([datePerformed])`, `@@index([createdAt])`; and on User: `@@index([clubId])`, `@@index([role])`.

---

### ~~M-08: Admin Home Fetches 500 Contributions for Heatmap~~ ✅ FIXED

**Status:** Fixed. A dedicated `GET /api/contributions/heatmap` endpoint returns pre-aggregated per-day `{ date, count, hours }` data (backed by a `to_char("datePerformed", 'YYYY-MM-DD')` group-by in `contribution.service.js`). `ClubDrilldown` now loads a single enriched club request and no longer pulls 500 contributions for a heatmap that wasn't rendered.

---

### ~~M-09: Club Deletion Does Not Use Database Cascade~~ ✅ FIXED

**Status:** Fixed (schema + migration `cascade_delete`). `schema.prisma` sets `onDelete: Cascade` on `InviteLink.club`, `Contribution.club`, `Contribution.user`, and `RefreshToken.user`, so deleting a club/user cascades at the DB level instead of via manual `deleteMany`.

---

### ~~M-10: Heatmap Date Source Inconsistency~~ ✅ FIXED

**Status:** Fixed. The weekly-trend SQL in `contribution.service.js` now uses `DATE_TRUNC('week', "datePerformed")` (and filters on `datePerformed`), matching the frontend heatmap. Retroactively logged contributions land in the same week on both.

---

## LOW — Minor Issues

---

### ~~L-01: `window.confirm()` and `window.alert()` for Destructive Actions~~ ✅ FIXED

**Status:** Fixed. A reusable `ConfirmModal` component (`components/ui/ConfirmModal.tsx`) replaces native `window.confirm`/`window.alert` for destructive actions (e.g. `AdminMembersOverview.tsx` uses it for member removal).

---

### ~~L-02: No Favicon Configured~~ ✅ FIXED

**Status:** Fixed. `app/icon.svg` is present, so Next.js serves it as the app icon/favicon.

---

### L-03: Inconsistent Design Language (Two Separate Systems) — ⚠️ MOSTLY FIXED

**Description:** Main app uses GitHub-inspired tokens (`gh-*` classes). Most of the earlier violet/indigo glassmorphism components have been standardized onto the GitHub-inspired system; a few violet/indigo utility usages remain (notably `components/contributions/ClubDashboard.tsx`).

**Affected Files:** `components/contributions/ClubDashboard.tsx` (remaining)
**Fix:** Replace the last violet/indigo utilities with the `gh-*` tokens for full consistency.
**Difficulty:** Easy (remaining scope is small)

---

### L-04: No Per-Page SEO Metadata

**Affected Files:** `app/contributions/page.tsx`, `app/invite/page.tsx`, `app/login/page.tsx`
**Fix:** Export `metadata` or `generateMetadata` from each page.
**Difficulty:** Trivial (30 min)

---

### L-05: Docker Compose Uses Default Credentials

**Affected Files:** `docker-compose.yaml`
**Fix:** Use environment variables from a `.env` file. Document that production requires strong credentials.
**Difficulty:** Trivial (10 min)

---

### L-06: Events Tab Is a Placeholder with No Content

**Affected Files:** `frontend/app/page.tsx` (ClubDrilldown), `frontend/components/layout/Navbar.tsx`
**Fix:** Remove tab until the feature is built, or implement basic event listing.
**Difficulty:** N/A (feature not yet built)

---

### ~~L-07: No Input Validation on `page`/`limit` Query Params~~ ✅ FIXED

**Status:** Fixed. `page`/`limit` are clamped in the service layer via `clampPagination()` (utils/validate.js), used by `member.service.js` and `contribution.service.js` (list, scoped list, and leaderboard). Clamping lives in the service so every caller — including direct API calls — is covered.

---

### ~~L-08: No React Error Boundary~~ ✅ FIXED

**Status:** Fixed. `app/error.tsx` (route-segment error boundary) and `app/global-error.tsx` (root-level boundary) are both present.

---

### ~~L-09: Admin Home Has No Loading State for Individual Club Enrichment~~ ✅ FIXED

**Status:** Fixed. `AdminHome`/`loadData` now uses `Promise.allSettled` (not `Promise.all`) for the independent club-grid and sidebar-counter requests, so one failing request no longer blanks the whole view. (The N+1 enrichment that motivated this bug is also gone — see H-01.)

---

### ~~L-10: No Logout Redirect~~ ✅ FIXED

**Status:** Fixed. `AuthProvider.tsx` `logout()` now calls `router.replace("/login")` after clearing the token.

---

## Summary

| Severity | Total | Fixed | Partial | Open | N/A |
|----------|-------|-------|---------|------|-----|
| CRITICAL | 4     | 3     | 1       | 0    | 0   |
| HIGH     | 7     | 7     | 0       | 0    | 0   |
| MEDIUM   | 10    | 10    | 0       | 0    | 0   |
| LOW      | 10    | 6     | 1       | 2    | 1   |
| **Total** | **31** | **26** | **2**  | **2** | **1** |

- **Partial:** C-04 (backend HttpOnly refresh cookie done; frontend access token still on localStorage), L-03 (one violet/indigo component — `ClubDashboard.tsx` — remains).
- **Open:** L-04 (per-page SEO metadata), L-05 (docker-compose default credentials).
- **N/A:** L-06 (Events tab — feature not built; intentionally out of MVP scope).

### Remaining Known Gaps (verified against source)
1. **Auth routes not wired:** `POST /api/auth/refresh` and `POST /api/auth/logout` are not registered in `backend/src/routes/auth.routes.js`, even though `auth.service.js` implements `refreshSession` and `logout`. (An edit to wire these was previously declined — left as a deliberate next step.)
2. **Frontend token storage:** the access token still lives in `localStorage` (`clubmgmt.auth.token`) in `AuthProvider.tsx`; the migration onto the HttpOnly cookie flow depends on gap #1.
3. **L-04 / L-05:** minor production-polish items (SEO metadata, docker credentials) still open.

These three gaps are the only material differences between the docs and the code; `status.md` and `goal.md` describe the same state.
