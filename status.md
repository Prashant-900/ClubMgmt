# ClubMgmt — End-to-End Status

**Last updated:** 2026-07-24
**Audited by:** Principal Software Engineer audit (full codebase read)

---

## 1. Current Architecture

### Backend
- Runtime: Node.js (CommonJS) + Express 5.1
- ORM: Prisma 6.9 + PostgreSQL 16
- Auth: JWT (7-day expiry) + Google OAuth 2.0 (server-side code exchange, no Passport)
- Admin bootstrap: config/admin-list.json — hardcoded email list grants ADMIN role on Google login
- Dev bypass: LOCAL_ADMIN=true + NODE_ENV=development injects a synthetic admin user when no Bearer token is present
- Base API URL: http://localhost:4000/api

### Frontend
- Framework: Next.js 16.2 (App Router), React 19, TypeScript 5
- Styling: Tailwind CSS v4 (via PostCSS), GitHub-inspired dark design system
- Font: Inter (Google Fonts)
- Auth token storage: localStorage key clubmgmt.auth.token
- API base: NEXT_PUBLIC_API_URL env var, defaults to http://localhost:4000/api
- Base app URL: http://localhost:3000

### Database
- PostgreSQL 16 (Docker for development only)
- 4 models: Club, User, InviteLink, Contribution
- 6 applied migrations (init, invite, optional creator, contributions x2, cascade delete)

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
- [x] Admin-list bootstrap from config/admin-list.json
- [x] Token stored in localStorage, loaded by AuthProvider via /auth/profile
- [x] Logout (token removed from localStorage)
- [x] AuthGuard redirects unauthenticated users to /login
- [x] Waiting for club assignment screen for users with no club

### Clubs
- [x] List clubs (public endpoint, no auth required)
- [x] Create club (ADMIN only)
- [x] Delete club with cascade: unassigns members, deletes invite links, deletes contributions (ADMIN only)
- [ ] Edit club name
- [ ] Club profile/description
- [ ] Club avatar/logo

### Members
- [x] List members with pagination, search, role filter, clubStatus filter
- [x] Get member by ID
- [x] Remove member (ADMIN: any COORDINATOR/MEMBER; COORDINATOR: own club MEMBERs)
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
- [x] Create contribution (MEMBER -> PENDING; COORDINATOR/ADMIN -> auto-APPROVED)
- [x] List own contributions (/contributions/me)
- [x] List contributions by role scope (ADMIN: all/by club; COORDINATOR: own club)
- [x] Get contribution by ID (MEMBER: own only; COORDINATOR: own club; ADMIN: any)
- [x] Approve contribution (ADMIN/COORDINATOR, club-scoped for COORDINATOR)
- [x] Reject contribution with optional reason
- [x] Delete contribution (ADMIN only)
- [x] Contribution detail page with approve/reject/delete actions
- [x] Contribution submission form
- [x] Approval queue UI (pending contributions list with inline approve/reject)

### Analytics
- [x] Club analytics: total approved/pending/rejected counts, approved hours, category breakdown, top 5 contributors, recent 10, 8-week weekly trend (raw SQL)
- [x] Global analytics: same as club analytics plus top clubs
- [x] Leaderboard: ranked by approved hours, period filter (weekly/monthly/semester/all), paginated

### Frontend UI
- [x] GitHub-inspired dark design system (tokens in globals.css @theme block)
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
- [ ] Events tab content (placeholder: Events coming soon)
- [ ] Member profile page
- [ ] Contribution edit/update page
- [ ] Search functionality (navbar search bar is disabled)
- [ ] Notifications (bell icon is non-functional)

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

### Members
- GET /api/members (ADMIN, COORDINATOR, MEMBER - role-scoped)
- GET /api/members/:id (authenticated)
- POST /api/members/:id/assign (ADMIN)
- POST /api/members/:id/promote (ADMIN)
- DELETE /api/members/:id (ADMIN)

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
- GET /api/contributions/:id (authenticated, role-scoped)
- PATCH /api/contributions/:id/approve (ADMIN, COORDINATOR)
- PATCH /api/contributions/:id/reject (ADMIN, COORDINATOR)
- DELETE /api/contributions/:id (ADMIN)

---

## 5. Environment Configuration

### Backend .env expected values
DATABASE_URL=postgresql://clubmgmt:clubmgmt@localhost:5432/clubmgmt
JWT_SECRET=your-jwt-secret-change-me
NODE_ENV=development
LOCAL_ADMIN=true
FRONTEND_URL=http://localhost:3000
PORT=4000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

### Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api

### Google Cloud OAuth App Settings
- Authorized JavaScript origins: http://localhost:3000
- Authorized redirect URIs: http://localhost:4000/api/auth/google/callback

### Admin Bootstrap
File: backend/src/config/admin-list.json
Contains array of email addresses automatically granted ADMIN role on Google login.
WARNING: This file is committed to git and must be moved to environment variable or database for production.

---

## 6. One-Time Setup Commands

Run from repository root: C:\workspace\club_projects\ClubMgmt

### 6.1 Install dependencies
cd backend && npm install
cd ..\frontend && npm install

### 6.2 Start PostgreSQL (Docker)
docker compose up -d

### 6.3 Apply migrations and generate Prisma client
cd backend
npx prisma migrate deploy
npx prisma generate

### 6.4 Seed clubs
node prisma/seed-clubs.js

Expected seed result: GDG, KFC

---

## 7. Daily Run Commands

### Terminal A — Backend
cd C:\workspace\club_projects\ClubMgmt\backend
npm run dev

### Terminal B — Frontend
cd C:\workspace\club_projects\ClubMgmt\frontend
npm run dev

### Optional: Type-check frontend
cd C:\workspace\club_projects\ClubMgmt\frontend
npx tsc --noEmit

---

## 8. End-to-End Functional Flows (Verified)

### 8.1 Admin Dev Bypass
With LOCAL_ADMIN=true and NODE_ENV=development, requests without a Bearer token get a synthetic admin user (id: local-admin). Allows development without OAuth.

Clear stored token if you see wrong role:
Browser console: localStorage.removeItem('clubmgmt.auth.token')

### 8.2 Google OAuth Login
1. User visits /login, clicks Continue with Google
2. Frontend redirects to GET /api/auth/google (optionally with ?inviteToken=...)
3. Backend builds Google OAuth URL with state=inviteToken and redirects
4. Google redirects to /api/auth/google/callback?code=...&state=...
5. Backend exchanges code, fetches Google profile
6. Backend upserts user (grants ADMIN if email in admin-list)
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
2. MEMBER submits -> status: PENDING
3. COORDINATOR/ADMIN submits -> status: APPROVED (auto)
4. Coordinator reviews pending queue at /contributions (Pending approvals tab)
5. Approve or reject with optional reason

### 8.5 Admin Club Management
1. Admin sees club cards at / (home)
2. Click club -> drill-down with tabs: Overview, Members, Contributions, Analytics, Events
3. Create new club or delete club from home

### 8.6 Make an Existing User a Club Lead
UI: Members tab -> member card -> actions (hover) -> Make coordinator -> select club
API: POST /api/members/:id/promote { clubId }

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
cd C:\workspace\club_projects\ClubMgmt\backend
npx prisma migrate deploy

### Error: P2003 Foreign key constraint when deleting user
Fixed: cascade_user_deletion migration applied. contributions.userId uses ON DELETE CASCADE.

### Error: EPERM during prisma generate on Windows
Stop backend Node process, then run: npx prisma generate

### Google redirect mismatch
Ensure .env and Google Console both use exact URI: http://localhost:4000/api/auth/google/callback

### Stale frontend behavior after role changes
Browser console: localStorage.removeItem('clubmgmt.auth.token') then refresh and sign in again.

---

## 11. Script Reference

### Backend scripts
- npm run dev         (nodemon hot-reload)
- npm run start       (production)
- npm run prisma:generate
- npm run prisma:migrate  (creates migration + applies)
- npm run prisma:studio
- npm run seed:clubs

### Frontend scripts
- npm run dev
- npm run build
- npm run start
- npm run lint
