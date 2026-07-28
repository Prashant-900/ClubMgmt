# ClubMgmt — Agent Rules (Project-Wide)

## Project Overview

ClubMgmt is a role-based club management system for college organizations. It replaces WhatsApp-based coordination with a proper management interface featuring contribution tracking, approval workflows, analytics, leaderboards, and invite-based registration.

## Architecture

```
ClubMgmt/
├── backend/          # Node.js (CommonJS) + Express 5.1 API server
│   ├── src/
│   │   ├── index.js           # Entry point, middleware, rate limiting
│   │   ├── config/db.js       # Prisma singleton client
│   │   ├── controllers/       # Request handlers (thin — delegate to services)
│   │   ├── services/          # Business logic (all DB queries live here)
│   │   ├── middlewares/       # auth, error handling, rate limiting
│   │   ├── routes/            # Express routers with auth + role guards
│   │   └── utils/roles.js     # Role hierarchy helpers
│   └── prisma/
│       ├── schema.prisma      # 4 models: Club, User, InviteLink, Contribution
│       └── seed-clubs.js      # Seeds initial clubs (GDG, KFC)
├── frontend/         # Next.js 16 (App Router), React 19, TypeScript 5
│   ├── app/                   # Pages and layouts (App Router)
│   ├── components/            # Reusable React components
│   │   ├── providers/         # AuthProvider, AuthGuard
│   │   ├── layout/            # Navbar, Footer
│   │   ├── ui/                # Avatar, Badge, Heatmap, RoleGate, etc.
│   │   ├── contributions/     # Form, List, Dashboard, Leaderboard, etc.
│   │   ├── members/           # MemberCard, MemberGrid, InviteForm, etc.
│   │   └── clubs/             # ClubGrid
│   ├── lib/api/               # API client + typed endpoint wrappers
│   └── types/index.ts         # Shared TypeScript interfaces
├── docker-compose.yaml        # PostgreSQL 16 for development
├── goal.md                    # Product vision & roadmap
├── status.md                  # End-to-end status document
└── current_bugs.md            # Known bugs & issues tracker
```

## Tech Stack

| Layer    | Technology                                       |
|----------|--------------------------------------------------|
| Backend  | Node.js (CommonJS), Express 5.1, Prisma 6.9      |
| Frontend | Next.js 16.2 (App Router), React 19, TypeScript 5 |
| Styling  | Tailwind CSS v4 (PostCSS), GitHub-inspired dark theme |
| Database | PostgreSQL 16 (Docker for dev)                    |
| Auth     | JWT (7-day expiry) + Google OAuth 2.0             |
| Font     | Inter (Google Fonts)                              |

## Role Hierarchy

```
ADMIN > COORDINATOR > MEMBER
```

- **ADMIN**: Full system access. No club assignment. Can create/delete clubs, manage all members, view global analytics, approve any contribution.
- **COORDINATOR**: Club-scoped. Can invite members, view/approve contributions from their club, view club analytics.
- **MEMBER**: Personal scope. Can submit contributions (PENDING), view own contributions, view leaderboard.

## Database Models

4 Prisma models connected via relations:
- **Club** — `id`, `name` (unique)
- **User** — `email` (unique), `role` enum, optional `clubId`, optional `password` (Google users have none)
- **InviteLink** — `token` (unique), `role`, `clubId`, `maxUses`, `usedCount`, `expiresAt`
- **Contribution** — `userId`, `clubId`, `title`, `category` enum, `hours`, `status` enum, optional `approvedById`

## Environment Configuration

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://clubmgmt:clubmgmt@localhost:5432/clubmgmt
JWT_SECRET=<min 32 chars, not default>
ADMIN_EMAILS=<comma-separated admin emails>
NODE_ENV=development
LOCAL_ADMIN=true
FRONTEND_URL=http://localhost:3000
PORT=4000
GOOGLE_CLIENT_ID=<from GCP console>
GOOGLE_CLIENT_SECRET=<from GCP console>
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Dev Bypass

When `LOCAL_ADMIN=true` and `NODE_ENV=development`, requests **without** a Bearer token get a synthetic admin user (`id: "local-admin"`). This allows development without OAuth. If a Bearer token IS present, normal JWT flow applies.

To clear stale auth state: `localStorage.removeItem('clubmgmt.auth.token')` in browser console.

## Key Conventions

### Backend
- **CommonJS** — use `require()` / `module.exports`, NOT ES modules
- **Controller → Service** pattern — controllers are thin (parse req, call service, send res). ALL business logic and Prisma queries live in service files
- **Error handling** — use `createError(message, statusCode)` from `middlewares/error.middleware.js`. Thrown errors are caught by the global `errorHandler` middleware
- **Route guards** — routes use `authenticate` (JWT verification) and `authorize(...roles)` middleware. Service-layer club-scoping provides additional authorization
- **Prisma client** — import from `config/db.js` (singleton). In dev, uses `global.__prisma` to avoid connection leaks with nodemon
- **Admin email check** — admin emails are read from `ADMIN_EMAILS` env var (comma-separated), parsed once at module load. NOT from a JSON file

### Frontend
- **`"use client"` directive** — required at the top of any component using hooks, browser APIs, or interactivity
- **Auth pattern** — `AuthProvider` at root provides `useAuth()` hook with `user`, `token`, `hasRole()`, `logout()`. `AuthGuard` wraps pages that require authentication
- **API calls** — all go through `lib/api/client.ts` (`apiRequest()`) which handles JSON, auth headers, and error parsing. Each domain has its own API module (e.g., `contribution.api.ts`)
- **Token storage** — `localStorage` key `clubmgmt.auth.token`. Read by `AuthProvider` on mount
- **Design system** — GitHub-inspired dark theme. Tokens defined in `globals.css` `@theme` block (`--color-gh-*`, `--color-role-*`, `--color-heatmap-*`). Utility classes: `.gh-input`, `.gh-select`, `.gh-btn`, `.gh-btn-primary`, `.skeleton`
- **Animations** — use existing keyframes: `animate-fade-in`, `animate-scale-in`, `animate-slide-down`
- **Component location** — `components/<domain>/` for feature components, `components/ui/` for generic reusable elements, `components/layout/` for structural components, `components/providers/` for context providers

### Shared
- **UUIDs everywhere** — all IDs are UUID v4 strings, not integers
- **Pagination** — `{ page, limit, total, totalPages }` shape. Default: `page=1, limit=20`
- **API response shape** — `{ success: boolean, data?: T, message?: string }`
- **Date handling** — store as ISO strings, use `Date` constructor for parsing

## API Surface

| Method | Endpoint                              | Auth Required | Roles               |
|--------|---------------------------------------|---------------|----------------------|
| POST   | `/api/auth/register`                  | No (invite)   | Public               |
| POST   | `/api/auth/login`                     | No            | Public               |
| GET    | `/api/auth/google`                    | No            | Public               |
| GET    | `/api/auth/google/callback`           | No            | Public               |
| GET    | `/api/auth/profile`                   | Yes           | All                  |
| GET    | `/api/members`                        | Yes           | Admin, Coord, Member |
| GET    | `/api/members/:id`                    | Yes           | All                  |
| POST   | `/api/members/:id/assign`             | Yes           | Admin                |
| POST   | `/api/members/:id/promote`            | Yes           | Admin                |
| DELETE | `/api/members/:id`                    | Yes           | Admin                |
| GET    | `/api/invite-links/validate/:token`   | No            | Public               |
| POST   | `/api/invite-links`                   | Yes           | Admin, Coordinator   |
| GET    | `/api/invite-links`                   | Yes           | Admin, Coordinator   |
| DELETE | `/api/invite-links/:id`               | Yes           | Admin, Coordinator   |
| GET    | `/api/clubs`                          | No            | Public               |
| POST   | `/api/clubs`                          | Yes           | Admin                |
| DELETE | `/api/clubs/:id`                      | Yes           | Admin                |
| POST   | `/api/contributions`                  | Yes           | All                  |
| GET    | `/api/contributions`                  | Yes           | Admin, Coordinator   |
| GET    | `/api/contributions/me`               | Yes           | All                  |
| GET    | `/api/contributions/analytics/club`   | Yes           | Admin, Coordinator   |
| GET    | `/api/contributions/analytics/global` | Yes           | Admin                |
| GET    | `/api/contributions/leaderboard`      | Yes           | All                  |
| GET    | `/api/contributions/:id`              | Yes           | All (scoped)         |
| PATCH  | `/api/contributions/:id/approve`      | Yes           | Admin, Coordinator   |
| PATCH  | `/api/contributions/:id/reject`       | Yes           | Admin, Coordinator   |
| DELETE | `/api/contributions/:id`              | Yes           | Admin                |
| GET    | `/api/health`                         | No            | Public               |

## Running the App

```bash
# 1. Start database
docker compose up -d

# 2. Backend (Terminal A)
cd backend && npm install && npx prisma migrate deploy && npx prisma generate && npm run dev

# 3. Frontend (Terminal B)
cd frontend && npm install && npm run dev
```

- Backend: http://localhost:4000 (health: /api/health)
- Frontend: http://localhost:3000

## Important Files to Read Before Editing

| Before editing...          | Read first...                                         |
|---------------------------|-------------------------------------------------------|
| Any backend service        | `services/*.service.js`, `utils/roles.js`             |
| Any backend route          | `middlewares/auth.middleware.js`, the route file       |
| Frontend page              | `app/page.tsx` (massive file — the main page)         |
| Auth flow                  | `AuthProvider.tsx`, `AuthGuard.tsx`, `auth.service.js` |
| Design/styling             | `globals.css` (design tokens), existing components    |
| Database schema            | `prisma/schema.prisma`                                |
| API calls from frontend    | `lib/api/client.ts` + relevant `*.api.ts`             |

## Reference Documents

- **`goal.md`** — Product vision, roadmap, and feature checklist
- **`status.md`** — End-to-end status, setup commands, flows, troubleshooting
- **`current_bugs.md`** — Known bugs with severity, affected files, and fixes

## Rules

1. **Never commit secrets** — `.env` files, API keys, and credentials must stay out of git
2. **Preserve the controller → service pattern** — don't put business logic in controllers or routes
3. **Respect the role hierarchy** — always check role-based access at both route and service level
4. **Use `createError()`** — don't throw plain `Error` objects in backend service code
5. **Mobile-first** — any frontend changes must work well on 375px screens
6. **GitHub dark theme** — all UI must use the `--color-gh-*` design tokens, not arbitrary colors
7. **Don't break the dev bypass** — the `LOCAL_ADMIN` flow must continue working for development
8. **Test after changes** — verify backend health check, frontend rendering, and auth flow
