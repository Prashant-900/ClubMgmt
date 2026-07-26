# ClubMgmt — Current Bugs & Issues

**Generated:** 2026-07-24  
**Source:** Full codebase audit (all backend and frontend files read)

---

## CRITICAL — Deployment Blockers

---

### ~~C-01: No Rate Limiting on Any Endpoint~~ ✅ FIXED

**Description:**  
Zero rate limiting exists across the entire API surface. The authentication endpoints (login, register, Google callback), invite link validation, and every other route are completely unprotected against brute-force and abuse. An attacker can attempt unlimited password guesses or spam the registration endpoint.

**Affected Files:**

- `backend/src/index.js` — no rate limiter middleware registered
- `backend/src/routes/auth.routes.js`

**Root Cause:**  
`express-rate-limit` or equivalent was never added.

**Suggested Fix:**  
Install `express-rate-limit`. Apply aggressive limits to `/api/auth/*` (e.g., 10 req/15min per IP). Apply moderate limits (100 req/min) globally.

**Estimated Difficulty:** Easy (30 min)

---

### C-02: Admin Email List Committed to Git

**Description:**  
`backend/src/config/admin-list.json` contains the hardcoded admin email address. This file is tracked by git and visible in repository history to anyone with repo access.

**Affected Files:**

- `backend/src/config/admin-list.json`
- `backend/src/services/auth.service.js` (getAdminEmails())

**Root Cause:**  
Admin emails stored as a flat JSON file inside the source tree with no `.gitignore` entry.

**Suggested Fix:**  
Move admin emails to `ADMIN_EMAILS` environment variable (comma-separated). Parse in `getAdminEmails()`. Add `admin-list.json` to `.gitignore`. Consider removing from git history.

**Estimated Difficulty:** Easy (20 min)

---

### C-03: Weak or Default JWT Secret

**Description:**  
The example `.env` shows `JWT_SECRET=your-jwt-secret-change-me`. If this value or any short/guessable secret is used in deployment, JWTs can be forged, giving anyone ADMIN access to the entire system.

**Affected Files:**

- `backend/src/services/auth.service.js` (generateToken — no secret validation)

**Root Cause:**  
No startup check that `JWT_SECRET` meets minimum entropy requirements.

**Suggested Fix:**  
Add startup validation: if `JWT_SECRET.length < 32` or equals the default string, throw and refuse to start. Document minimum requirements in README.

**Estimated Difficulty:** Easy (15 min)

---

### C-04: JWT Stored in localStorage (XSS Accessible)

**Description:**  
The JWT token is stored in `localStorage` under key `clubmgmt.auth.token`. Any XSS vulnerability — including one introduced via the unvalidated `attachmentUrl` field — can steal this token and allow full account takeover.

**Affected Files:**

- `frontend/components/providers/AuthProvider.tsx`
- `frontend/app/auth/callback/page.tsx`
- `frontend/app/(standalone)/register/[token]/page.tsx`

**Root Cause:**  
Design decision to use localStorage for token storage. Acceptable for a closed internal dev tool, unacceptable for production.

**Suggested Fix:**  
For production: switch to `HttpOnly`, `SameSite=Strict`, `Secure` cookies set by the backend on the OAuth callback redirect. The JWT never touches JavaScript. This requires backend+frontend coordination.

**Estimated Difficulty:** Hard (2-4 hours)

---

## HIGH — Major Broken Workflows

---

### H-01: N+1 API Calls on Admin Home Page

**Description:**  
`AdminHome` fetches all clubs, then for each club makes 2 additional API calls (member count + coordinator lookup). With N clubs this is `2 + 2N` API calls on a single page load. With 20 clubs: 42 parallel requests. This will fail visibly with any real data.

**Affected Files:**

- `frontend/app/page.tsx` (AdminHome component, `loadData` function, ~lines 368-408)

**Root Cause:**  
No server-side aggregation endpoint for club list with metadata. Frontend compensates by firing per-club requests.

**Suggested Fix:**  
Add `GET /api/clubs?enriched=true` backend endpoint that returns clubs with `memberCount` and `coordinatorName` in a single query using Prisma `_count` and `include`. Replace per-club fetches with one call.

**Estimated Difficulty:** Medium (2-3 hours)

---

### H-02: AdminMembersOverview Fetches 1000 Members Without Virtualization

**Description:**  
`AdminMembersOverview.tsx` fetches `{ limit: 1000 }` for both assigned and pending members. Rendering 2000 DOM nodes without virtual scrolling will freeze browsers. The API response will also be large and slow.

**Affected Files:**

- `frontend/components/members/AdminMembersOverview.tsx` (lines 25-26)

**Root Cause:**  
Pagination was not implemented in this component; `limit: 1000` is a lazy workaround.

**Suggested Fix:**  
Implement server-side pagination with page controls. Reduce default `limit` to 50. Optionally add virtual scrolling with `react-window` for very large lists.

**Estimated Difficulty:** Medium (2-4 hours)

---

### H-03: Admin Email List Read from Disk on Every Google Login

**Description:**  
`getAdminEmails()` in `auth.service.js` reads and `JSON.parse`s `admin-list.json` synchronously on every Google OAuth callback invocation. This is a blocking, synchronous file-system read on the hot authentication path.

**Affected Files:**

- `backend/src/services/auth.service.js` (getAdminEmails, lines 9-19)

**Root Cause:**  
No caching or environment-variable-based approach.

**Suggested Fix:**  
Cache at module load time: `const ADMIN_EMAILS = getAdminEmails()` outside the function. Or move to `ADMIN_EMAILS` environment variable entirely.

**Estimated Difficulty:** Easy (15 min)

---

### H-04: Coordinator Cannot Remove Members (Route Blocks Them)

**Description:**  
`DELETE /api/members/:id` is protected by `authorize("ADMIN")` at the route level. The `removeMember` service function has full club-scoping logic for COORDINATORs (lines 132-136), but it is completely unreachable because the route rejects any non-ADMIN request first.

**Affected Files:**

- `backend/src/routes/member.routes.js` (line 23)
- `backend/src/services/member.service.js` (removeMember — dead code for COORDINATOR)

**Root Cause:**  
Route-level authorization is more restrictive than the service layer intends.

**Suggested Fix:**  
Change route to `authorize("ADMIN", "COORDINATOR")`. The service layer already enforces the club-scope restriction. No service changes needed.

**Estimated Difficulty:** Trivial (5 min)

---

### H-05: 401 Token Expiry Not Handled Globally

**Description:**  
JWTs expire after 7 days. When this happens mid-session, any API call returns 401. Each component handles this independently as a generic error message. There is no global interceptor to redirect the user to `/login` with a meaningful message like "Your session has expired."

**Affected Files:**

- `frontend/lib/api/client.ts` (apiRequest — no 401 interception)
- `frontend/components/providers/AuthProvider.tsx`

**Root Cause:**  
No global API response interceptor pattern.

**Suggested Fix:**  
In `apiRequest`, when response status is 401, call `localStorage.removeItem('clubmgmt.auth.token')` and `window.location.replace('/login?reason=expired')`. Or use React Context to expose a `handleUnauthorized` callback.

**Estimated Difficulty:** Medium (1-2 hours)

---

### H-06: MemberCard Promote Allows Cross-Club Promotion Silently

**Description:**  
In `MemberCard`, the club dropdown for promotion defaults to the member's current club but allows selecting any club. An ADMIN could accidentally promote a member to coordinator of a different club than intended, with no confirmation of the cross-club change.

**Affected Files:**

- `frontend/components/members/MemberCard.tsx` (handlePromote, selectedClubId state)

**Root Cause:**  
UI design decision unclear — intentional or oversight.

**Suggested Fix:**  
If cross-club promotion is intentional: add a warning message when selected club differs from member's current club. If not intentional: default the dropdown to the member's current club and disable changing it.

**Estimated Difficulty:** Easy (30 min)

---

### H-07: CORS Single-Origin — React Native Will Be Blocked

**Description:**  
CORS is configured to accept only `FRONTEND_URL` (a single string). The React Native app (planned) will need a different origin, which will be blocked. There is no mechanism for multiple allowed origins.

**Affected Files:**

- `backend/src/index.js` (cors configuration, lines 12-19)

**Root Cause:**  
Single-origin CORS assumption baked in from initial implementation.

**Suggested Fix:**  
Support `CORS_ORIGINS` as comma-separated env var. Parse into array and use origin callback: `origin: (origin, cb) => cb(null, allowedOrigins.includes(origin))`.

**Estimated Difficulty:** Easy (30 min)

---

## MEDIUM — Important But Non-Blocking

---

### M-01: Unvalidated Attachment URL (Potential XSS Vector)

**Description:**  
The `attachmentUrl` field in contributions accepts any string. A `javascript:alert(1)` URI or `data:` URI could be stored and rendered as a clickable link in the contribution detail page, potentially enabling XSS combined with the localStorage token theft (C-04).

**Affected Files:**

- `backend/src/services/contribution.service.js` (createContribution)
- `frontend/app/contributions/[id]/page.tsx` (attachment `<a>` link)

**Suggested Fix:**  
Server-side: validate URL scheme is `http:` or `https:` using `URL` constructor. Frontend: also validate before rendering. Add `rel="noopener noreferrer"` (already present).

**Estimated Difficulty:** Easy (30 min)

---

### M-02: Future Date Contributions Allowed

**Description:**  
`datePerformed` can be set to any future date. Users can log contributions for events that haven't happened yet.

**Affected Files:**

- `backend/src/services/contribution.service.js` (createContribution)

**Suggested Fix:**  
`if (new Date(datePerformed) > new Date()) throw createError('Date performed cannot be in the future', 400)`

**Estimated Difficulty:** Trivial (5 min)

---

### M-03: No Input Length Limits on Text Fields

**Description:**  
`title`, `description`, and `club name` have no server-side maximum length. A 100KB title would be accepted and stored.

**Affected Files:**

- `backend/src/services/contribution.service.js`
- `backend/src/services/club.service.js`

**Suggested Fix:**  
Add max-length checks: title ≤ 200, description ≤ 2000, club name ≤ 100. Use Zod or Joi for structured validation.

**Estimated Difficulty:** Easy (1 hour)

---

### M-04: Contribution `hours` Minimum Validation Off

**Description:**  
Backend rejects `hours <= 0`, so `0` is rejected but `0.001` is accepted. Frontend minimum is `0.25`. Direct API calls can bypass frontend validation.

**Affected Files:**

- `backend/src/services/contribution.service.js` (line 95)

**Suggested Fix:**  
Change to `hours < 0.25 || hours > 24`. This also prevents submissions below meaningful granularity.

**Estimated Difficulty:** Trivial (5 min)

---

### M-05: `bg-glass` and `border-glass-border` CSS Classes Undefined

**Description:**  
Multiple components use `bg-glass` and `border-glass-border` Tailwind classes that do not exist in `globals.css` or the Tailwind theme. These components render without background or border styles.

**Affected Files:**

- `frontend/components/contributions/GlobalDashboard.tsx` (lines 21, 141, 172, 201, 231)
- `frontend/app/contributions/[id]/page.tsx` (lines 129, 219)

**Root Cause:**  
CSS classes planned but never implemented.

**Suggested Fix:**  
Add to `globals.css`:

```css
.bg-glass {
  background-color: rgba(22, 27, 34, 0.85);
}
.border-glass-border {
  border-color: rgba(48, 54, 61, 0.6);
}
```

**Estimated Difficulty:** Trivial (10 min)

---

### M-06: Search Input Causes API Blast (No Debouncing)

**Description:**  
`AdminMembersOverview` fires 3 API calls on every keystroke in the search input, because `searchTerm` is a `useCallback` dependency that triggers `fetchData`. Typing a 10-character search fires 30 API calls.

**Affected Files:**

- `frontend/components/members/AdminMembersOverview.tsx` (fetchData useCallback + useEffect)

**Suggested Fix:**  
Debounce the search input state update by 300ms before it propagates to `searchTerm`. Use a `useDebouncedValue` hook.

**Estimated Difficulty:** Easy (30 min)

---

### M-07: Missing Database Indexes on Queried Fields

**Description:**  
The schema has no explicit indexes beyond `@id` and `@unique`. Frequently queried fields are unindexed: `Contribution.userId`, `Contribution.clubId`, `Contribution.status`, `Contribution.datePerformed`, `User.clubId`, `User.role`.

**Affected Files:**

- `backend/prisma/schema.prisma`

**Suggested Fix:**  
Add to Contribution model: `@@index([userId])`, `@@index([clubId, status])`, `@@index([datePerformed])`.  
Add to User model: `@@index([clubId])`.  
Create a new migration.

**Estimated Difficulty:** Easy (30 min + migration)

---

### M-08: Admin Home Fetches 500 Contributions for Heatmap

**Description:**  
`AdminHome` calls `listContributions({ limit: 500 })` to compute the global heatmap and total hours. This is an arbitrary hard limit that will silently miss data when more than 500 contributions exist.

**Affected Files:**

- `frontend/app/page.tsx` (AdminHome, loadData, ~line 376)

**Suggested Fix:**  
Add a dedicated `/api/contributions/heatmap` endpoint that returns pre-aggregated `{ date, count, hours }[]` data. Remove the large frontend fetch.

**Estimated Difficulty:** Medium (2-3 hours)

---

### M-09: Club Deletion Does Not Use Database Cascade

**Description:**  
`deleteClub` manually deletes contributions and invite links via `$transaction`. However, `Contribution.clubId` has no `onDelete: Cascade` in the schema. If the database is manipulated directly or the transaction fails partway, orphaned contributions could exist pointing to a deleted club.

**Affected Files:**

- `backend/src/services/club.service.js` (deleteClub)
- `backend/prisma/schema.prisma` (Contribution.club relation)

**Suggested Fix:**  
Add `onDelete: Cascade` to `Contribution.club` and `InviteLink.club` relations. Remove manual deleteMany from the service. Create a migration.

**Estimated Difficulty:** Easy (15 min + migration)

---

### M-10: Heatmap Date Source Inconsistency

**Description:**  
Frontend heatmap builds from `datePerformed` (when work was done). Backend weekly trend SQL uses `createdAt` (when it was submitted). Contributions logged retroactively will appear in different weeks/dates across these two displays.

**Affected Files:**

- `frontend/app/page.tsx` (buildHeatmap — uses datePerformed)
- `backend/src/services/contribution.service.js` (weeklyTrend raw SQL — uses createdAt)

**Suggested Fix:**  
Decide canonical date. `datePerformed` is semantically correct for "when was this contribution made." Update weeklyTrend SQL to `DATE_TRUNC('week', "datePerformed")`.

**Estimated Difficulty:** Easy (30 min)

---

## LOW — Minor Issues

---

### L-01: `window.confirm()` and `window.alert()` for Destructive Actions

**Affected Files:** `frontend/app/page.tsx`, `frontend/components/members/AdminMembersOverview.tsx`, `frontend/components/members/InviteForm.tsx`  
**Fix:** Implement a reusable ConfirmModal component using React Portal.  
**Difficulty:** Medium (2-3 hours)

---

### L-02: No Favicon Configured

**Affected Files:** `frontend/app/layout.tsx`  
**Fix:** Add `favicon.ico` to `/public` or create `app/icon.tsx`.  
**Difficulty:** Trivial (10 min)

---

### L-03: Inconsistent Design Language (Two Separate Systems)

**Description:**  
Main app uses GitHub-inspired tokens (`gh-*` classes, `#0d1117` backgrounds). Several components use a different violet/indigo glassmorphism style. Visually inconsistent to users.

**Affected Files:** `ContributionForm.tsx`, `GlobalDashboard.tsx`, `contributions/[id]/page.tsx`, `register/[token]/page.tsx`  
**Fix:** Standardize on one system throughout.  
**Difficulty:** Medium (4-8 hours)

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

### L-07: No Input Validation on `page`/`limit` Query Params

**Affected Files:** `backend/src/controllers/member.controller.js`, `backend/src/controllers/contribution.controller.js`  
**Fix:** Clamp: `page = Math.max(1, page)`, `limit = Math.min(100, Math.max(1, limit))`.  
**Difficulty:** Trivial (10 min)

---

### L-08: No React Error Boundary

**Affected Files:** `frontend/app/layout.tsx`  
**Fix:** Wrap app in a global `ErrorBoundary`. Add `error.tsx` at route segment level.  
**Difficulty:** Easy (30-60 min)

---

### L-09: Admin Home Has No Loading State for Individual Club Enrichment

**Description:**  
While club enrichment is loading (member counts, coordinator names), the entire clubs grid shows skeleton cards. But if enrichment of one club fails, the entire Promise.all rejects and no clubs render.

**Affected Files:** `frontend/app/page.tsx` (AdminHome, loadData)  
**Fix:** Use `Promise.allSettled` instead of `Promise.all` for individual club enrichment.  
**Difficulty:** Easy (30 min)

---

### L-10: No Logout Redirect

**Affected Files:** `frontend/components/providers/AuthProvider.tsx` (logout)  
**Description:** `logout()` clears the token and nulls the user but does not redirect. The user stays on the current page, which may show an infinite spinner or empty state until they navigate manually.  
**Fix:** Add `window.location.replace('/login')` or use `router.replace('/login')` in the logout callback.  
**Difficulty:** Trivial (5 min)
