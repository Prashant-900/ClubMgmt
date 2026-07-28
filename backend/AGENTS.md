# Backend Agent Rules — ClubMgmt

## Stack

- Node.js (CommonJS — NOT ES modules)
- Express 5.1
- Prisma 6.9 ORM + PostgreSQL 16
- JWT authentication (jsonwebtoken)
- bcryptjs for password hashing
- Google OAuth 2.0 (server-side code exchange, no Passport)

## Project Structure

```
backend/
├── src/
│   ├── index.js                    # App entry point, middleware registration, rate limiting
│   ├── config/
│   │   └── db.js                   # Prisma singleton client (dev: global.__prisma)
│   ├── controllers/
│   │   ├── auth.controller.js      # Login, register, Google OAuth, profile
│   │   ├── club.controller.js      # Club CRUD
│   │   ├── contribution.controller.js  # Contribution CRUD, analytics, leaderboard
│   │   ├── invite-link.controller.js   # Invite link management
│   │   └── member.controller.js    # Member listing, assignment, promotion, removal
│   ├── services/
│   │   ├── auth.service.js         # Auth logic, JWT generation, Google OAuth flow, admin bootstrap
│   │   ├── club.service.js         # Club business logic
│   │   ├── contribution.service.js # Contribution CRUD, analytics, leaderboard (largest service)
│   │   ├── invite-link.service.js  # Invite link creation, validation, consumption
│   │   └── member.service.js       # Member management, role hierarchy enforcement
│   ├── middlewares/
│   │   ├── auth.middleware.js      # authenticate (JWT) + authorize (...roles) + LOCAL_ADMIN bypass
│   │   ├── error.middleware.js     # errorHandler + createError helper
│   │   └── rate-limit.middleware.js  # Rate limiter definitions (not imported — inline in index.js)
│   ├── routes/
│   │   ├── index.js                # Route aggregator
│   │   ├── auth.routes.js
│   │   ├── club.routes.js
│   │   ├── contribution.routes.js
│   │   ├── health.routes.js
│   │   ├── invite-link.routes.js
│   │   └── member.routes.js
│   └── utils/
│       └── roles.js                # ROLE_HIERARCHY, canInvite, canRemove, getInvitableRoles
├── prisma/
│   ├── schema.prisma               # Database schema (4 models, 3 enums)
│   ├── migrations/                 # 6 applied migrations
│   └── seed-clubs.js               # Seeds GDG and KFC clubs
├── package.json
├── .env                            # Environment config (NEVER commit to production)
└── test.js, scratch_test.js, test_frontend.js  # Dev test scripts
```

## Architecture Pattern: Controller → Service

```
Request → Route (auth + role guard) → Controller (parse, call service, respond) → Service (business logic + Prisma) → Response
```

### Controllers
- Thin handlers that parse `req.params`, `req.query`, `req.body`
- Call the corresponding service function
- Send the response: `res.status(200).json({ success: true, data: result })`
- **Never** contain business logic or direct Prisma calls

### Services
- All business logic lives here
- All Prisma database queries live here
- Throw errors using `createError(message, statusCode)` from `error.middleware.js`
- Export plain functions (not classes)

### Routes
- Define Express routers
- Apply `authenticate` and `authorize(...roles)` middleware
- Map HTTP methods to controller functions
- **Important**: specific routes (e.g., `/analytics/club`) must come before parameterized routes (e.g., `/:id`) to avoid route conflicts

## Database Schema

### Enums
- `Role`: `ADMIN`, `COORDINATOR`, `MEMBER`
- `ContributionStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `ContributionCategory`: `DEVELOPMENT`, `WORKSHOP`, `PRESENTATION`, `DESIGN`, `EVENT_SUPPORT`, `DOCUMENTATION`, `MEETING`, `OTHER`

### Models
| Model        | Key Fields                                                                 |
|-------------|---------------------------------------------------------------------------|
| Club         | `id` (UUID), `name` (unique)                                              |
| User         | `id` (UUID), `email` (unique), `password?`, `role`, `clubId?`, `isVerified` |
| InviteLink   | `id` (UUID), `token` (unique UUID), `role`, `clubId?`, `maxUses`, `usedCount`, `expiresAt` |
| Contribution | `id` (UUID), `userId`, `clubId`, `title`, `category`, `hours`, `status`, `approvedById?`, `approvedAt?` |

### Important Relations
- `User.clubId` → `Club.id` (nullable for ADMINs)
- `Contribution.userId` → `User.id` (CASCADE on delete)
- `Contribution.clubId` → `Club.id` (no cascade — manual cleanup in `deleteClub`)
- `InviteLink.createdById` → `User.id` (nullable for local-admin created links)

## Auth Flow

### JWT
- Secret validated at startup: must be ≥32 chars and not the default placeholder
- Tokens expire in 7 days (`{ expiresIn: "7d" }`)
- Payload: `{ id, email, role }`
- Sent in `Authorization: Bearer <token>` header

### LOCAL_ADMIN Bypass
When `NODE_ENV=development` AND `LOCAL_ADMIN=true`:
- If request has NO Bearer token → inject synthetic admin user (`id: "local-admin"`)
- If request HAS a Bearer token → normal JWT verification applies

### Google OAuth
1. `GET /api/auth/google` → redirect to Google consent screen (inviteToken passed as `state`)
2. Google callback → `GET /api/auth/google/callback?code=...&state=...`
3. Backend exchanges code for tokens, fetches Google profile
4. Upserts user (grants ADMIN if email in `ADMIN_EMAILS` env var)
5. Redirects to `{FRONTEND_URL}/auth/callback?token=JWT`

### Admin Bootstrap
Admin emails configured via `ADMIN_EMAILS` environment variable (comma-separated).
Parsed once at module load time in `auth.service.js`. Users with matching email get `ADMIN` role on Google login.

## Error Handling

```js
const { createError } = require("../middlewares/error.middleware");

// In service code:
throw createError("Descriptive message", 400);  // 400, 401, 403, 404, 409, 500

// In controller code (for unexpected):
next(error);
```

The global `errorHandler` middleware catches all errors and returns:
```json
{ "success": false, "message": "...", "stack": "..." }  // stack only in development
```

## Rate Limiting

Defined inline in `src/index.js` (NOT imported from the middleware file):
- **Auth endpoints** (`/api/auth/*`): 20 requests per 15 minutes per IP
- **All API routes** (`/api/*`): 200 requests per minute per IP

## Key Business Rules

### Contributions
- MEMBER submits → `status: PENDING`
- COORDINATOR/ADMIN submits → `status: APPROVED` (auto-approved with `approvedById` = self)
- `hours` validation: `> 0` and `<= 24` (backend), `>= 0.25` (frontend)
- `datePerformed` is semantic (when work happened); `createdAt` is record creation time

### Members
- Role hierarchy enforced via `utils/roles.js` (`canRemove`, `canInvite`)
- COORDINATOR can only view/manage members from their own club
- MEMBER can only view members from their own club
- Promote always sets role to `COORDINATOR` with the specified `clubId`

### Invite Links
- ADMIN invites COORDINATOR or MEMBER (must specify club)
- COORDINATOR invites MEMBER (auto-assigned to coordinator's club)
- Invite tokens are UUID v4, validated for expiry and usage count
- Consumed by incrementing `usedCount` on registration

### Club Deletion
- Uses a `$transaction` to: unassign members → delete invite links → delete contributions → delete club
- **Known gap**: No `onDelete: Cascade` on `Contribution.clubId` in schema (M-09)

## Running

```bash
# Start database
docker compose up -d

# Install dependencies
npm install

# Apply migrations & generate client
npx prisma migrate deploy
npx prisma generate

# Seed clubs
node prisma/seed-clubs.js

# Start dev server (hot reload via nodemon)
npm run dev
```

Server runs at `http://localhost:4000`. Health check: `GET /api/health`.

## Rules

1. **CommonJS only** — `require()` and `module.exports`. No `import`/`export` syntax
2. **Service layer owns all business logic** — controllers just parse and respond
3. **Always use `createError()`** for application errors — never throw plain `Error` objects
4. **Import Prisma from `config/db.js`** — do not create new `PrismaClient` instances
5. **Always validate required fields** at the start of service functions
6. **Respect role hierarchy** — use `authorize()` at route level + club-scoping in service layer
7. **Never hardcode admin emails** — they come from the `ADMIN_EMAILS` env var
8. **Run `npx prisma generate`** after any schema changes
9. **Add `@@index()` directives** for any new frequently-queried fields (existing gap: M-07)
10. **Preserve the local-admin bypass** — it's essential for development workflow
