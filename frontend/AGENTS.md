<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Agent Rules — ClubMgmt

## Stack

- Next.js 16.2 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Google-inspired light design system (white surfaces, near-black text, four Google brand hues; solid colors only — no gradients/glassmorphism)
- Fonts (all Google Fonts, loaded in `layout.tsx`): Poppins (display/headings, Product Sans stand-in), Inter (body/UI), JetBrains Mono (code, stats, `</>` motifs)

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

> **Migration note:** the legacy `gh-*` token *names* were kept, but their *values* were remapped from the old GitHub-dark palette to the Google light palette. So token-class consumers (`bg-gh-canvas-*`, `text-gh-text-*`, etc.) auto-convert. New code may keep using these names, or the semantic aliases below.

| Token prefix         | Purpose                                    |
|----------------------|-------------------------------------------|
| `--color-gh-canvas-*`  | Background/surface (`default`=`#ffffff`, `subtle`=`#f8f9fa`, `inset`=`#ffffff`) |
| `--color-gh-border-*`  | Border colors (`default`=`#dadce0`, `muted`=`#f1f3f4`)  |
| `--color-gh-text-*`    | Text (`primary`=`#202124`, `secondary`=`#5f6368`, `tertiary`=`#80868b`) |
| `--color-gh-accent-*`  | Google blue accent (`emphasis`=`#1a73e8`/`#4285f4`)     |
| `--color-gh-success-*` | Google green (`#34a853` / `#188038` fg)                 |
| `--color-gh-danger-*`  | Google red (`#ea4335` / `#c5221f` fg)                   |
| `--color-gh-warning-*` | Google yellow (`#fbbc05`; **pair with dark text** — fails contrast on white) |
| `--color-brand-*`      | Semantic Google hues: `brand-blue`, `brand-green`, `brand-yellow`, `brand-red` (+ `-fg` accessible text variants) |
| `--color-role-*`       | Role colors (`admin`=red, `coordinator`=blue, `member`=green) |
| `--color-heatmap-*`    | White→green heatmap ramp (0-4 levels)                   |

### Utility Classes

- `.gh-input` — styled text input (white bg, `#dadce0` border, blue focus ring)
- `.gh-select` — styled select dropdown
- `.gh-btn` / `.gh-btn-primary` / `.gh-btn-default` / `.gh-btn-danger` — button variants
- `.gh-btn-sm` — small button size
- `.skeleton` — shimmer loading placeholder
- `.animate-fade-in` / `.animate-scale-in` / `.animate-slide-down` — entry animations

### Global chrome & motion (mounted in `layout.tsx`)

- `LoadingOverlay` + `GdscLoader` — GDSC 7-dot morphing loader shown on first load
- `ScrollProgress` — circular `</>` scroll-progress gauge (bottom corner)
- `CustomCursor` — `</>` → `<` bracket cursor, **desktop-web only** (gated on `(hover: hover)` + `(pointer: fine)`)
- Google-colored custom scrollbar (defined in `globals.css`)
- All motion respects `prefers-reduced-motion`

### Color Rules

- Backgrounds: `#ffffff` (base/card/input), `#f8f9fa` (subtle), `#f1f3f4` (muted fill)
- Borders: `#dadce0` (default), `#f1f3f4` (muted)
- Text: `#202124` (primary), `#5f6368` (secondary), `#80868b` (tertiary)
- Google brand hues: blue `#4285F4`/`#1a73e8`, green `#34A853`/`#188038`, yellow `#FBBC05`, red `#EA4335`/`#c5221f`
- Role badges: red=ADMIN, blue=COORDINATOR, green=MEMBER
- Status colors: green=APPROVED, yellow=PENDING, red=REJECTED
- **Yellow (`#FBBC05`) fails contrast against white** — never use it for text or thin icons on white; pair it with dark text (`brand-yellow-fg`) or use it only as a fill/dot
- **Solid colors only** — no gradients, no glassmorphism/`backdrop-blur` surfaces
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

- Do not reintroduce `bg-glass`, `border-glass-border`, gradients, or `backdrop-blur` surfaces — the design system is solid-color light only
- Notification system degrades gracefully: `useNotifications` polls every 30s but the backend endpoints may not exist yet — never assume a notifications API response is present
- `app/page.tsx` is ~750 lines with multiple role-based views — consider extracting if adding features

## Rules

1. **Always use `"use client"` directive** for components with hooks, event handlers, or browser APIs
2. **Type everything** — no `any` types. Use interfaces from `types/index.ts`
3. **Follow existing design system** — use `gh-*`/`brand-*` tokens and utility classes; light Google theme, solid colors only
4. **Component files go in the correct domain folder** — not dumped into `app/`
5. **Test on mobile (375px)** — touch targets ≥44×44px, no hover-only interactions
6. **No raw `fetch()` calls** — use the API client modules
7. **Handle all three states** — loading, error, and empty for every data-driven component
8. **Preserve existing comments and docstrings** unless directly related to your change
