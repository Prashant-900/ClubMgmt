<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Agent Rules — ClubMgmt

## Stack

- Next.js 16.2 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- GitHub-inspired dark design system
- Font: Inter (Google Fonts, loaded in `layout.tsx`)

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (AuthProvider + Navbar wrapper)
│   ├── globals.css             # Design tokens (@theme), base styles, utility classes
│   ├── page.tsx                # Main page (~750 lines — ADMIN, COORDINATOR, MEMBER views)
│   ├── login/page.tsx          # Login page
│   ├── auth/callback/page.tsx  # OAuth callback (stores JWT, redirects)
│   ├── contributions/
│   │   ├── page.tsx            # Contributions list
│   │   ├── submit/page.tsx     # Contribution submission form
│   │   └── [id]/page.tsx       # Contribution detail + approve/reject
│   ├── invite/page.tsx         # Invite link management
│   └── (standalone)/
│       └── register/[token]/page.tsx  # Invite registration form
├── components/
│   ├── providers/
│   │   ├── AuthProvider.tsx    # Auth context (user, token, hasRole, logout)
│   │   └── AuthGuard.tsx       # Route guard — redirects to /login if unauthenticated
│   ├── layout/
│   │   ├── Navbar.tsx          # Top nav with role-aware tabs, avatar dropdown
│   │   └── Footer.tsx          # Page footer
│   ├── ui/
│   │   ├── Avatar.tsx          # User avatar (initials-based)
│   │   ├── Badge.tsx           # RoleBadge, StatusBadge, CategoryBadge
│   │   ├── ContributionHeatmap.tsx  # GitHub-style contribution heatmap
│   │   ├── PageTabs.tsx        # Tab navigation component
│   │   ├── ProfilePopup.tsx    # Profile popup/modal
│   │   └── RoleGate.tsx        # Conditional render by role
│   ├── contributions/
│   │   ├── ContributionForm.tsx     # Submission form
│   │   ├── ContributionList.tsx     # Paginated contribution list
│   │   ├── ContributionCard.tsx     # Single contribution card
│   │   ├── ApprovalQueue.tsx        # Pending contributions for review
│   │   ├── ClubDashboard.tsx        # Club-level analytics dashboard
│   │   ├── GlobalDashboard.tsx      # System-wide analytics dashboard
│   │   └── Leaderboard.tsx          # Ranked leaderboard with period filter
│   ├── members/
│   │   ├── MemberCard.tsx           # Member card with actions
│   │   ├── MemberGrid.tsx           # Paginated member grid
│   │   ├── AdminMembersOverview.tsx  # Admin members management view
│   │   └── InviteForm.tsx           # Invite link creation form
│   └── clubs/
│       └── ClubGrid.tsx             # Club cards grid (admin home)
├── lib/api/
│   ├── client.ts              # Base API client (apiRequest function)
│   ├── auth.api.ts            # Auth endpoints (login, register, profile)
│   ├── club.api.ts            # Club CRUD endpoints
│   ├── contribution.api.ts    # Contribution CRUD + analytics + leaderboard
│   ├── invite-link.api.ts     # Invite link endpoints
│   └── member.api.ts          # Member management endpoints
├── types/index.ts             # All TypeScript interfaces and type definitions
└── hooks/.gitkeep             # Custom hooks directory (currently empty)
```

## Design System

### Theme Tokens (defined in `globals.css` @theme block)

| Token prefix         | Purpose                                    |
|----------------------|-------------------------------------------|
| `--color-gh-canvas-*`  | Background colors (`default`, `subtle`, `inset`) |
| `--color-gh-border-*`  | Border colors (`default`, `muted`, `subtle`)     |
| `--color-gh-text-*`    | Text colors (`primary`, `secondary`, `tertiary`) |
| `--color-gh-accent-*`  | Blue accent (`emphasis`, `subtle`)               |
| `--color-gh-success-*` | Green/success (`emphasis`, `muted`, `fg`)        |
| `--color-gh-danger-*`  | Red/danger (`emphasis`, `muted`, `fg`)           |
| `--color-gh-warning-*` | Yellow/warning (`emphasis`, `muted`, `fg`)       |
| `--color-role-*`       | Role colors (`admin`=purple, `coordinator`=blue, `member`=green) |
| `--color-heatmap-*`    | Heatmap gradient (0-4 levels)                    |

### Utility Classes

- `.gh-input` — styled text input (dark bg, border, focus ring)
- `.gh-select` — styled select dropdown
- `.gh-btn` / `.gh-btn-primary` / `.gh-btn-default` / `.gh-btn-danger` — button variants
- `.gh-btn-sm` — small button size
- `.skeleton` — shimmer loading placeholder
- `.animate-fade-in` / `.animate-scale-in` / `.animate-slide-down` — entry animations

### Color Rules

- Backgrounds: `#0d1117` (base), `#161b22` (subtle/card), `#010409` (inset/input)
- Borders: `#30363d` (default), `#21262d` (muted)
- Text: `#e6edf3` (primary), `#8b949e` (secondary), `#6e7681` (tertiary)
- Role badges: purple=ADMIN, blue=COORDINATOR, green=MEMBER
- Status colors: green=APPROVED, yellow=PENDING, red=REJECTED
- **Never use arbitrary colors** — always use the established tokens

## Auth Pattern

1. `AuthProvider` wraps the entire app in `layout.tsx`
2. On mount, reads JWT from `localStorage('clubmgmt.auth.token')`
3. Calls `GET /api/auth/profile` to hydrate the `user` object
4. Components use `useAuth()` hook to access `user`, `token`, `hasRole()`, `logout()`
5. `AuthGuard` component wraps pages that require authentication — redirects to `/login` if no user

### Token flow
- OAuth: Backend redirects to `/auth/callback?token=JWT` → frontend stores in localStorage
- Email: Frontend calls POST `/api/auth/login` or `/api/auth/register` → receives JWT in response

## API Client Pattern

All API calls go through `lib/api/client.ts`:
```ts
const response = await apiRequest<ResponseType>('/endpoint', {
  method: 'POST',
  body: { ... },
  token: token,  // from useAuth()
});
```

Each domain has a typed API module (e.g., `contribution.api.ts`) that wraps `apiRequest` with proper types. **Always use these modules** — do not call `fetch()` directly from components.

## Component Patterns

### State management
- No global state library — React Context (`AuthProvider`) + component-level `useState`
- Data fetching: `useEffect` + `useCallback` pattern with loading/error states

### Conditional rendering by role
```tsx
<RoleGate roles={["ADMIN", "COORDINATOR"]}>
  <AdminOnlyContent />
</RoleGate>
```

### Loading states
- Use `.skeleton` class for shimmer placeholders
- Every async page/component must have a loading state

## Known Issues (Do Not Introduce More)

- `bg-glass` and `border-glass-border` CSS classes are undefined (M-05) — do not use these
- Some components use a violet/glassmorphism style inconsistent with GitHub theme (L-03) — new components must use `gh-*` tokens
- `app/page.tsx` is ~750 lines with multiple role-based views — consider extracting if adding features

## Rules

1. **Always use `"use client"` directive** for components with hooks, event handlers, or browser APIs
2. **Type everything** — no `any` types. Use interfaces from `types/index.ts`
3. **Follow existing design system** — use `gh-*` tokens and utility classes
4. **Component files go in the correct domain folder** — not dumped into `app/`
5. **Test on mobile (375px)** — touch targets ≥44×44px, no hover-only interactions
6. **No raw `fetch()` calls** — use the API client modules
7. **Handle all three states** — loading, error, and empty for every data-driven component
8. **Preserve existing comments and docstrings** unless directly related to your change
