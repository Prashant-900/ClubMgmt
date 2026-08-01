# ClubMgmt — End-to-End Status

**Last updated:** 2026-08-01
**Audited by:** Full codebase read (all backend and frontend source files); web frontend redesigned to Google-light theme per `REDESIGN_PLAN.md` (web only)

---

## 1. Current Architecture

### Backend
- Runtime: Node.js (CommonJS) + Express 5.1
- ORM: Prisma 6.9 + PostgreSQL 16
- Auth: short-lived access JWT (`ACCESS_TOKEN_TTL`, default 1h) + 30-day rotating refresh token (SHA-256 hashed in DB, delivered as HttpOnly cookie) + Google OAuth 2.0 (server-side code exchange, no Passport)
  - NOTE: backend refresh/logout logic is built (`refresh-token.service.js`, `auth.service.js`, cookie middleware), but the `POST /api/auth/refresh` and `POST /api/auth/logout` routes are NOT yet wired in `auth.routes.js`. Frontend still reads the access token from localStorage (cookie migration pending). So the refresh flow is not yet end-to-end.
- Admin bootstrap: `ADMIN_EMAILS` env var (comma-separated), parsed once at module load
- Dev bypass: `LOCAL_ADMIN=true` + `NODE_ENV=development` injects a synthetic admin user when no Bearer token is present
- Rate limiting: `express-rate-limit` — 10 req/15min on auth (skipSuccessfulRequests), 100 req/min global, 30 req/min analytics
- Base API URL: http://localhost:4000/api

### Frontend
- Framework: Next.js 16.2 (App Router), React 19, TypeScript 5
- Styling: Tailwind CSS v4 (via PostCSS), Google-inspired light design system (white surfaces, near-black text, four Google brand hues; solid colors only — no gradients/glassmorphism). Legacy `gh-*` token names retained but their values remapped to the light palette.
- Fonts: Poppins (display/headings, Product Sans stand-in), Inter (body/UI), JetBrains Mono (code, stats, `</>` motifs) — all via next/font/google
- Global chrome: GDSC 7-dot loading overlay, Google-colored scrollbar + `</>` scroll-progress gauge, custom `</>`→`<` bracket cursor (desktop-web only, gated on hover/pointer), prefers-reduced-motion honored
- Auth token storage: access token in localStorage key `clubmgmt.auth.token` (migration to HttpOnly cookie still pending on the frontend); backend already sets an HttpOnly refresh cookie `clubmgmt.refresh`
- API base: `NEXT_PUBLIC_API_URL` env var, defaults to http://localhost:4000/api
- Base app URL: http://localhost:3000

### Database
- PostgreSQL 16 (Docker for development only)
- 5 models: Club, User, InviteLink, Contribution, RefreshToken
- 3 enums: Role, ContributionStatus, ContributionCategory
- 7 applied migrations (init, invite, optional creator, contributions x2, cascade delete, mvp_hardening)

### Role Hierarchy
ADMIN > COORDINATOR > MEMBER

- ADMIN: Full system access. No club assignment. Can create/delete clubs, manage all members, view global analytics, approve any contribution.
- COORDINATOR: Club-scoped. Can invite members, view/approve contributions from their club, view club analytics.
- MEMBER: Personal scope. Can submit contributions (PENDING), view own contributions, view leaderboard.

---

## 2. Implemented Features (Verified Against Source Code)

### Auth
- [x] Google OAuth login (server-side code exchange, redirect to /auth/callback)
- [x] Email+password registration (invite-token gated only)
- [x] JWT issuance and verification
- [x] Auth middleware with role injection
- [x] Dev admin bypass (LOCAL_ADMIN=true)
- [x] Admin-list bootstrap from ADMIN_EMAILS env var (comma-separated)
- [x] JWT_SECRET startup validation (≥32 chars, not default)
- [x] Refresh-token service: 30-day opaque token, SHA-256 hashed in DB, rotated on use, reuse detection revokes sessions (`refresh-token.service.js`)
- [x] HttpOnly refresh cookie layer on backend (`cookie.middleware.js` — `clubmgmt.refresh`)
- [ ] Wire `POST /api/auth/refresh` and `POST /api/auth/logout` routes in `auth.routes.js` (service logic done, routes not registered)
- [x] Access token stored in localStorage, loaded by AuthProvider via /auth/profile
- [ ] Migrate frontend access token off localStorage onto the HttpOnly cookie flow (C-04 frontend half)
- [x] Logout (token removed from localStorage, redirects to /login)
- [x] AuthGuard redirects unauthenticated users to /login
- [x] Waiting for club assignment screen for users with no club

### Security
- [x] Rate limiting on auth endpoints (10 req/15min per IP, successful requests skipped)
- [x] Global rate limiting (100 req/min per IP) + analytics limiter (30 req/min)
- [x] Admin emails moved to environment variable (ADMIN_EMAILS)
- [x] JWT secret entropy enforcement at startup
- [~] HttpOnly cookie token storage — backend sets refresh cookie; frontend access token still on localStorage (partial)
- [x] Attachment URL scheme validation (only http/https, via `utils/validate.js`)
- [x] Input length limits on all text fields (title/description/club name via `utils/validate.js`)
- [x] Server-side future date validation on contributions
- [x] Page/limit parameter clamping
- [x] CORS multi-origin support via `CORS_ORIGINS` (comma-separated), credentials enabled

### Clubs
- [x] List clubs (public endpoint, no auth required)
- [x] Create club (ADMIN only)
- [x] Delete club with cascade: unassigns members, DB-cascade deletes invite links and contributions (ADMIN only)
- [ ] Edit club name
- [x] Club description field (optional, up to 500 chars — schema + service validation; UI to edit it still pending)

### Members
- [x] List members with pagination, search, role filter, clubStatus filter
- [x] Get member by ID
- [x] Remove member (ADMIN: any COORDINATOR/MEMBER; COORDINATOR: own club MEMBERs — route now allows COORDINATOR, H-04 fixed, fine-grained rules enforced in service)
- [x] Promote member to COORDINATOR with club assignment
- [x] Assign pending member to club with role selection
- [x] COORDINATOR-scoped listing (own club only, enforced server-side)
- [ ] Edit member profile
- [ ] Member profile page
- [ ] Batch operations

### Invite Links
- [x] Create invite link (ADMIN: COORDINATOR or MEMBER with club; COORDINATOR: MEMBER auto-club)
- [x] List invite links (ADMIN sees all, COORDINATOR sees own)
- [x] Validate invite link (public endpoint, expiry + usage checked)
- [x] Revoke invite link
- [x] Invite link consumed on registration
- [x] Google OAuth flow with invite token passed as OAuth state parameter
- [x] Email+password registration form at /register/[token]

### Contributions
- [x] Create contribution (MEMBER → PENDING; COORDINATOR/ADMIN → auto-APPROVED)
- [x] List own contributions (/contributions/me)
- [x] List contributions by role scope (ADMIN: all/by club; COORDINATOR: own club)
- [x] Get contribution by ID (MEMBER: own only; COORDINATOR: own club; ADMIN: any)
- [x] Approve contribution (ADMIN/COORDINATOR, club-scoped for COORDINATOR)
- [x] Reject contribution with optional reason
- [x] Delete contribution (ADMIN only)
- [x] Edit contribution (owner may edit their own PENDING contribution — service `updateContribution`)
- [x] Server-side heatmap aggregation endpoint (`getHeatmap`, M-08) and pending-review count badge (`getPendingReviewCount`, in-app coordinator notification)
- [x] Contribution detail page with approve/reject/delete actions
- [x] Contribution submission form
- [x] Approval queue UI (pending contributions list with inline approve/reject)

### Analytics
- [x] Club analytics: total approved/pending/rejected counts, approved hours, category breakdown, top 5 contributors, recent 10, 8-week weekly trend (raw SQL)
- [x] Global analytics: same as club analytics plus top clubs
- [x] Leaderboard: ranked by approved hours, period filter (weekly/monthly/semester/all), paginated

### Frontend UI
- [x] Google-inspired light design system (tokens in globals.css @theme block; legacy `gh-*` names remapped to light values)
- [x] GDSC 7-dot morphing loading overlay on first load
- [x] Google-colored custom scrollbar + `</>` scroll-progress gauge
- [x] Custom `</>`→`<` bracket cursor (desktop-web only, gated on hover/pointer, respects prefers-reduced-motion)
- [x] Multi-font typography (Poppins display / Inter body / JetBrains Mono)
- [x] Navbar with role-aware tab visibility, avatar dropdown
- [x] Skeleton loaders throughout
- [x] Empty states throughout
- [x] Error states throughout
- [x] Contribution heatmap (GitHub-style)
- [x] Profile sidebar with stats
- [x] Club repo-card grid (admin home)
- [x] Club drill-down with tabs (Overview, Members, Contributions, Analytics, Events)
- [x] Contribution list with filters
- [x] Leaderboard with period tabs
- [x] Admin global analytics dashboard
- [x] Club-level analytics dashboard
- [x] Role-gated UI components (RoleGate)
- [x] Fade-in animations, scale-in dropdowns
- [ ] Events tab content (placeholder: "Events coming soon")
- [ ] Member profile page
- [ ] Contribution edit/update page
- [ ] Search functionality (navbar search bar is disabled)
- [~] Notifications — web bell UI + `useNotifications` 30s polling wired on the frontend; degrades gracefully when backend endpoints are absent (backend notifications API still pending)

---

## 3. Important URLs

### App
- Frontend root: http://localhost:3000
- Login: http://localhost:3000/login
- Contributions: http://localhost:3000/contributions
- Submit contribution: http://localhost:3000/contributions/submit
- Contribution detail: http://localhost:3000/contributions/[id]
- Invite management: http://localhost:3000/invite
- Register (via invite): http://localhost:3000/register/[token]

### Backend API
- Health: http://localhost:4000/api/health
- Google auth start: http://localhost:4000/api/auth/google
- Google callback (must match GCP): http://localhost:4000/api/auth/google/callback

---

## 4. Full API Surface

### Auth
- POST /api/auth/register (public, invite token required)
- POST /api/auth/login (public)
- GET /api/auth/google (public)
- GET /api/auth/google/callback (public)
- GET /api/auth/profile (authenticated)
- POST /api/auth/refresh (public — rotate refresh cookie) — service ready, route NOT yet registered
- POST /api/auth/logout (authenticated — revoke refresh token) — service ready, route NOT yet registered

### Members
- GET /api/members (ADMIN, COORDINATOR, MEMBER - role-scoped)
- GET /api/members/:id (authenticated)
- POST /api/members/:id/assign (ADMIN)
- POST /api/members/:id/promote (ADMIN)
- DELETE /api/members/:id (ADMIN, COORDINATOR — club-scoped for COORDINATOR)

### Invite Links
- GET /api/invite-links/validate/:token (public)
- POST /api/invite-links (ADMIN, COORDINATOR)
- GET /api/invite-links (ADMIN, COORDINATOR)
- DELETE /api/invite-links/:id (ADMIN, COORDINATOR)

### Clubs
- GET /api/clubs (public)
- POST /api/clubs (ADMIN)
- DELETE /api/clubs/:id (ADMIN)

### Contributions
- POST /api/contributions (authenticated)
- GET /api/contributions (ADMIN, COORDINATOR)
- GET /api/contributions/me (authenticated)
- GET /api/contributions/analytics/club (ADMIN, COORDINATOR)
- GET /api/contributions/analytics/global (ADMIN)
- GET /api/contributions/leaderboard (authenticated)
- GET /api/contributions/heatmap (authenticated, club-scoped in service — M-08)
- GET /api/contributions/pending-count (authenticated — coordinator review badge)
- GET /api/contributions/:id (authenticated, role-scoped)
- PATCH /api/contributions/:id/approve (ADMIN, COORDINATOR)
- PATCH /api/contributions/:id/reject (ADMIN, COORDINATOR)
- DELETE /api/contributions/:id (ADMIN)
- PATCH /api/contributions/:id (owner, PENDING only — edit own contribution)

---

## 5. Environment Configuration

### Backend .env expected values
```
DATABASE_URL=postgresql://clubmgmt:clubmgmt@localhost:5432/clubmgmt
JWT_SECRET=<min 32 chars, generated via `openssl rand -hex 32`>
ADMIN_EMAILS=admin@example.com
NODE_ENV=development
LOCAL_ADMIN=true
FRONTEND_URL=http://localhost:3000
PORT=4000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

### Frontend .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Google Cloud OAuth App Settings
- Authorized JavaScript origins: http://localhost:3000
- Authorized redirect URIs: http://localhost:4000/api/auth/google/callback

### Admin Bootstrap
Admin emails are configured via the `ADMIN_EMAILS` environment variable (comma-separated).
Parsed once at module load time in `auth.service.js`.

---

## 6. One-Time Setup Commands

Run from repository root: C:\workspace\club_projects\ClubMgmt

### 6.1 Install dependencies
```bash
cd backend && npm install
cd ..\frontend && npm install
```

### 6.2 Start PostgreSQL (Docker)
```bash
docker compose up -d
```

### 6.3 Apply migrations and generate Prisma client
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 6.4 Seed clubs
```bash
node prisma/seed-clubs.js
```
Expected seed result: GDG, KFC

---

## 7. Daily Run Commands

### Terminal A — Backend
```bash
cd C:\workspace\club_projects\ClubMgmt\backend
npm run dev
```

### Terminal B — Frontend
```bash
cd C:\workspace\club_projects\ClubMgmt\frontend
npm run dev
```

### Optional: Type-check frontend
```bash
cd C:\workspace\club_projects\ClubMgmt\frontend
npx tsc --noEmit
```

---

## 8. End-to-End Functional Flows (Verified)

### 8.1 Admin Dev Bypass
With `LOCAL_ADMIN=true` and `NODE_ENV=development`, requests without a Bearer token get a synthetic admin user (id: `local-admin`). Allows development without OAuth.

Clear stored token if you see wrong role:
```js
// Browser console
localStorage.removeItem('clubmgmt.auth.token')
```

### 8.2 Google OAuth Login
1. User visits /login, clicks Continue with Google
2. Frontend redirects to GET /api/auth/google (optionally with ?inviteToken=...)
3. Backend builds Google OAuth URL with state=inviteToken and redirects
4. Google redirects to /api/auth/google/callback?code=...&state=...
5. Backend exchanges code, fetches Google profile
6. Backend upserts user (grants ADMIN if email in ADMIN_EMAILS)
7. Backend redirects to {FRONTEND_URL}/auth/callback?token=JWT
8. Frontend stores JWT, redirects to /

### 8.3 Invite Registration
1. Admin/Coordinator creates invite link at /invite
2. Share link: {origin}/register/{token}
3. Invitee opens link, link validated, form shown
4. Register with email+password OR Google OAuth with ?inviteToken=
5. Account created with role+club from invite link

### 8.4 Contribution Workflow
1. User goes to /contributions/submit
2. MEMBER submits → status: PENDING
3. COORDINATOR/ADMIN submits → status: APPROVED (auto)
4. Coordinator reviews pending queue at /contributions (Pending approvals tab)
5. Approve or reject with optional reason

### 8.5 Admin Club Management
1. Admin sees club cards at / (home)
2. Click club → drill-down with tabs: Overview, Members, Contributions, Analytics, Events
3. Create new club or delete club from home

### 8.6 Make an Existing User a Club Lead
- UI: Members tab → member card → actions (hover) → Make coordinator → select club
- API: POST /api/members/:id/promote { clubId }

---

## 9. Quick Verification Checklist
1. Start DB, backend, frontend
2. Confirm health: GET http://localhost:4000/api/health
3. Confirm clubs exist: check /invite page club dropdown
4. Promote a user to coordinator
5. Login as that coordinator
6. Verify members list only shows same-club users
7. Generate member invite link as coordinator
8. Open invite link in private window
9. Complete signup
10. Verify new user role=MEMBER and correct club assignment

---

## 10. Troubleshooting

### Error: table does not exist
```bash
cd C:\workspace\club_projects\ClubMgmt\backend
npx prisma migrate deploy
```

### Error: P2003 Foreign key constraint when deleting user
Fixed: cascade_user_deletion migration applied. `contributions.userId` uses `ON DELETE CASCADE`.

### Error: EPERM during prisma generate on Windows
Stop backend Node process, then run: `npx prisma generate`

### Google redirect mismatch
Ensure .env and Google Console both use exact URI: `http://localhost:4000/api/auth/google/callback`

### Stale frontend behavior after role changes
```js
// Browser console
localStorage.removeItem('clubmgmt.auth.token')
```
Then refresh and sign in again.

### JWT_SECRET startup error
Ensure `JWT_SECRET` in `.env` is ≥32 characters and not the default `"your-jwt-secret-change-me"`.
Generate one: `openssl rand -hex 32`

---

## 11. Script Reference

### Backend scripts
- `npm run dev`           (nodemon hot-reload)
- `npm run start`         (production)
- `npm run prisma:generate`
- `npm run prisma:migrate`  (creates migration + applies)
- `npm run prisma:studio`
- `npm run seed:clubs`

### Frontend scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

---

## 12. Completion Estimates

### Backend Completion: ~70%
Core CRUD and auth are solid. Security hardening largely done: rate limiting (10/15min auth, 100/min global), admin env var, JWT entropy validation, input validation middleware (`utils/validate.js`), attachment URL validation, server-side date validation, page/limit clamping, DB indexes (M-07), cascade deletes (M-09), server-side heatmap (M-08), weekly trend by datePerformed (M-10), CORS multi-origin (H-07). Refresh-token service is built. Remaining gaps: wire `/refresh` + `/logout` routes; events, announcements, notifications (email), advanced admin tooling.

### Frontend Completion: ~50%
Core views built and functional. Design system now consistent — full Google-light redesign complete (web only): remapped tokens, multi-font typography, GDSC loader, custom scrollbar/scroll-progress gauge, bracket cursor, SVG icons, notification bell + polling. TypeScript typecheck passes clean (`npx tsc --noEmit` → 0 errors). Missing: events, backend notifications API, mobile polish, member profiles, edit-contribution UI (backend route exists), search, onboarding, error boundaries, and the localStorage→HttpOnly-cookie migration.

### Overall Product Completion: ~35%
The foundation (auth, clubs, members, contributions, basic analytics) is working and the MVP security/hardening pass is mostly complete on the backend. Still missing the product-defining features: events, announcements, notifications, mobile app, export, search, achievement system.

### Deployment Readiness: ~40%
Most security blockers fixed (rate limiting, JWT validation, admin env var, input validation, URL validation, CORS multi-origin). Remaining blockers: frontend still on localStorage JWT (C-04 half done), refresh/logout routes not wired, no production infrastructure documented (.env.example, docker creds, backup/deploy docs).

### Production Readiness: ~25%
Below production standard. Needs the refresh flow finished end-to-end, cookie migration, error monitoring, test coverage, mobile app, and core feature parity.
