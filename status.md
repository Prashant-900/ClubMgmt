# ClubMgmt End-to-End Status

Last updated: 2026-07-21

## 1. Current Architecture

### Backend
- Runtime: Node.js + Express
- ORM: Prisma + PostgreSQL
- Auth: JWT + Google OAuth callback flow
- Base API URL: http://localhost:4000/api

### Frontend
- Runtime: Next.js
- Base app URL: http://localhost:3000
- API base (default): http://localhost:4000/api
- Auth token storage: localStorage key `clubmgmt.auth.token`

### Role hierarchy implemented
- ADMIN
- COORDINATOR (club lead)
- MEMBER

Behavior:
- Admin dashboard displays a grid of all clubs. Clicking a club shows its members.
- Admin can create coordinator invite links, choose club.
- Coordinator can create member invite links, club auto-assigned.
- Coordinator access is club-scoped for member listing/detail/removal.
- Admin can promote an existing user to coordinator for a selected club.

## 2. Important URLs

### App
- Frontend: http://localhost:3000
- Login page: http://localhost:3000/login
- Invite links management page: http://localhost:3000/invite

### Backend API
- Health: http://localhost:4000/api/health
- Google auth start: http://localhost:4000/api/auth/google
- Google callback (must match GCP): http://localhost:4000/api/auth/google/callback

## 3. Environment Configuration

Backend .env expected values:

```env
DATABASE_URL=postgresql://clubmgmt:clubmgmt@localhost:5432/clubmgmt
JWT_SECRET=your-jwt-secret-change-me
NODE_ENV=development
LOCAL_ADMIN=true
FRONTEND_URL=http://localhost:3000
PORT=4000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

Google Cloud OAuth app settings:
- Authorized JavaScript origins: http://localhost:3000
- Authorized redirect URIs: http://localhost:4000/api/auth/google/callback

## 4. One-Time Setup Commands

Run from repository root: C:\workspace\club_projects\ClubMgmt

### 4.1 Install dependencies

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

### 4.2 Start PostgreSQL (Docker)

```powershell
cd ..
docker compose up -d
```

### 4.3 Apply migrations and generate Prisma client

```powershell
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 4.4 Seed clubs

```powershell
cd backend
node prisma/seed-clubs.js
```

Expected seed result:
- GDG
- KFC

## 5. Daily Run Commands

Open separate terminals.

### Terminal A: Backend

```powershell
cd C:\workspace\club_projects\ClubMgmt\backend
npm run dev
```

### Terminal B: Frontend

```powershell
cd C:\workspace\club_projects\ClubMgmt\frontend
npm run dev
```

### Optional: Type-check frontend

```powershell
cd C:\workspace\club_projects\ClubMgmt\frontend
npx tsc --noEmit
```

## 6. API Surface Summary

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/google
- GET /api/auth/google/callback
- GET /api/auth/profile

### Members
- GET /api/members (Accepts `?clubId=` filter for ADMIN)
- GET /api/members/:id
- POST /api/members/:id/promote (ADMIN)
- DELETE /api/members/:id (ADMIN)

### Invite Links
- GET /api/invite-links/validate/:token (public)
- POST /api/invite-links (ADMIN, COORDINATOR)
- GET /api/invite-links (ADMIN, COORDINATOR)
- DELETE /api/invite-links/:id (ADMIN, COORDINATOR)

### Clubs
- GET /api/clubs (public)

## 7. End-to-End Functional Flows

### 7.1 View as admin now
- In development with LOCAL_ADMIN=true and no stored JWT, app can behave as local admin.
- Open http://localhost:3000 to view the list of clubs. Click on a club to inspect its members.

If old token causes unexpected role:

```powershell
# in browser devtools console
localStorage.removeItem('clubmgmt.auth.token')
```

Refresh page.

### 7.2 Make an existing user a club lead

UI path:
1. Open members page as admin.
2. On a member card, use "Promote to club lead".
3. Select club.
4. Click "Make club lead".

API equivalent (PowerShell):

```powershell
$memberId = "<USER_ID>"
$clubId = "<CLUB_ID>"

Invoke-RestMethod \
  -Method POST \
  -Uri "http://localhost:4000/api/members/$memberId/promote" \
  -ContentType "application/json" \
  -Body (@{ clubId = $clubId } | ConvertTo-Json)
```

### 7.3 Club lead visibility restriction
- Coordinator should only see users from their own club.
- Backend enforces this in member listing/detail/removal logic.

### 7.4 Club lead invite flow
1. Club lead opens /invite.
2. Creates member invite link.
3. Share link.
4. Invitee opens link.
5. Invitee can register by:
   - Email + password, or
   - Continue with Google
6. If invitee is new in DB, account is created with:
   - role from invite link
   - club from invite link

## 8. Quick Verification Checklist

Run in order:
1. Start DB, backend, frontend.
2. Confirm health: GET http://localhost:4000/api/health
3. Confirm clubs exist by opening invite page and checking club dropdown for admin.
4. Promote a user to coordinator.
5. Login as that coordinator.
6. Verify members list only includes same-club users.
7. Generate member invite link as coordinator.
8. Open invite link in private window.
9. Complete Google signup.
10. Verify new user role/member + correct club assignment.

## 9. Troubleshooting

### Error: table does not exist
Run:

```powershell
cd C:\workspace\club_projects\ClubMgmt\backend
npx prisma migrate deploy
```

### Error: EPERM during prisma generate on Windows
Cause: Node process locking Prisma engine file.

Fix:
1. Stop backend Node process.
2. Run:

```powershell
cd C:\workspace\club_projects\ClubMgmt\backend
npx prisma generate
```

### Google redirect mismatch
Ensure .env and Google Console both use:
- http://localhost:4000/api/auth/google/callback

### Seeing stale frontend behavior after role changes
Clear token and refresh:

```powershell
# browser console
localStorage.removeItem('clubmgmt.auth.token')
```

## 10. Script Reference

### Backend scripts
- npm run dev
- npm run start
- npm run prisma:generate
- npm run prisma:migrate
- npm run prisma:studio
- npm run seed:clubs

### Frontend scripts
- npm run dev
- npm run build
- npm run start
- npm run lint
