# ClubMgmt Redesign — Implementation Plan

**Goal:** Complete UI/UX overhaul of web + mobile to a Google-style light theme, port the GDSC loader from Krackhack, add custom scrollbar/cursor (web), SVG icons, tasteful animations, multi-font typography, and a full-stack notification system.

**Locked decisions:**
- **Base theme:** Light/white base — white backgrounds, Google colors as accents, dark text. Replaces GitHub-dark entirely.
- **Red usage:** Full Google palette (blue #4285F4, green #34A853, yellow #FBBC05, red #EA4335) used freely.
- **Notifications:** Full-stack with ~30s polling — Prisma model + migration + REST endpoints + generated events + web bell dropdown + app screen.
- **Rollout:** Phased, design-system first (foundation, then page-by-page migration; web before app).

---

## Design System Foundation

### Color tokens (both platforms)
| Role | Value | Notes |
|---|---|---|
| Blue (primary) | `#4285F4` | Primary actions, links, focus rings |
| Green (success) | `#34A853` | Approved, positive, primary CTA alt |
| Yellow (warning) | `#FBBC05` | Pending, highlights, accents |
| Red (danger) | `#EA4335` | Rejected, destructive |
| Canvas | `#FFFFFF` | Page background |
| Surface | `#F8F9FA` | Cards, raised surfaces |
| Border | `#DADCE0` | Google's standard divider grey |
| Text primary | `#202124` | Google grey-900 |
| Text secondary | `#5F6368` | Google grey-700 |

**Rule:** solid colors only, no gradients. Accents used deliberately, not everywhere (avoid "AI slop").

### Typography (few, professional)
- **Display / headings:** Google Sans (or Product Sans fallback → `Poppins`) — hero, page titles, nav brand.
- **Body / UI:** `Inter` (already in web) — paragraphs, labels, tables.
- **Mono / code + "</>" motifs:** `JetBrains Mono` — code, stats, the GDG `</>` brand touches.
- App uses the RN equivalents bundled as font files.

### Fonts loading
- Web: `next/font/google` for Poppins + Inter; self-host JetBrains Mono.
- App: add `.ttf` files under `app/assets/fonts/` + `react-native.config.js` assets + `npx react-native-asset`.

---

## Phase 1 — Design-System Foundation

### 1A. Web token rewrite
- Rewrite `frontend/app/globals.css` `@theme` block: replace all `--color-gh-*` with light Google tokens (`--color-brand-blue`, `--color-brand-green`, `--color-brand-yellow`, `--color-brand-red`, `--color-canvas`, `--color-surface`, `--color-border`, `--color-fg`, `--color-fg-muted`).
- Update `.gh-*` utilities (`.gh-input`, `.gh-select`, `.gh-btn*`, `.skeleton`) to the light theme. Keep class names to minimize churn, or alias to new `.ui-*` names.
- `frontend/app/layout.tsx`: `themeColor: "#ffffff"`, `colorScheme: "light"`.
- Update `frontend/AGENTS.md` token documentation.

### 1B. App token rewrite
- Rewrite `app/src/theme/colors.ts` to the light Google palette + updated `heatmapRamp` (white→green ramp for contribution heatmap).
- `app/App.tsx`: navTheme → light, `StatusBar barStyle="dark-content"`.

### 1C. Loader port (GDSC 7-dot morphing loader)
**Reference source:** `ClubMgmt/loading/` at the project root — `loading.css`, `Loading.jsx`, `LoadingOverlay.jsx` (GDSC Danang chapter, 7-dot morph). Use these as the canonical source to port from.
- Behavior to preserve: 7 absolutely-positioned dots in the Google palette; a single ~6s `forwards` morph sequence (plays once, does not loop); `LoadingOverlay` renders `Loading` then unmounts after ~4000ms. `Loading.jsx` currently backs the overlay with `var(--primary)` — remap to the light `--color-canvas` (white) token.
- **Web:** port `loading/loading.css` keyframes into `globals.css` (or a CSS module) and reimplement `<Loading/>` + `<LoadingOverlay/>` as TSX under `frontend/components/ui/`. Show on first app load (~4s) and on route/auth transitions.
- **App:** reimplement the same 7-dot morph with RN `Animated` (no CSS). Fullscreen overlay component shown on cold start.

### 1D. Custom scrollbar — "</>" theme (web only)
- Style `::-webkit-scrollbar` in Google colors; thumb in brand blue with subtle track.
- GDG `</>` motif: a small fixed scroll-progress indicator in the corner using the `</>` glyph (JetBrains Mono) that fills/rotates with scroll position, in the scroll-icon color.
- Firefox fallback via `scrollbar-color`.

### 1E. Custom cursor — "<" shape (web only, desktop)
- Port Krackhack `TargetCursor.jsx` concept → a `<` bracket cursor in the same color as the scroll icon.
- Disable on touch / `width<=768` / `pointer: coarse`; respect `prefers-reduced-motion`.
- Add `gsap` dependency to `frontend/package.json`.

### 1F. SVG icon system
- **Web:** create `components/icons/` set (nav, notification bell, contributions, events, invite, avatar, status icons) as inline SVG React components. Replace emoji/text icons.
- **App:** add `react-native-svg`; mirror the same icon set. Replace emoji tab icons in `TabNavigator.tsx`.

### 1G. Notification backend (full-stack foundation)
- **Schema:** add `Notification` model to `backend/prisma/schema.prisma`:
  - `id, userId (FK User), type (enum), title, body, read (bool, default false), linkTo (string?), createdAt`.
  - `NotificationType` enum: `CONTRIBUTION_APPROVED`, `CONTRIBUTION_REJECTED`, `CONTRIBUTION_PENDING`, `INVITE_USED`.
  - Relation on `User`.
- **Migration:** `prisma migrate dev --name add_notifications`.
- **Service:** `backend/src/services/notification.service.js` — `createNotification()`, hook into existing flows (contribution approve/reject, new pending submission, invite used).
- **Routes:** `GET /notifications` (list, paginated), `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- Wire into existing controllers; respect current auth middleware + rate limiting.

---

## Phase 2 — Web page migration (screen-by-screen)
Order chosen for lowest risk → highest visibility:
1. **Navbar** (`components/layout/Navbar.tsx`): new SVG logo/brand, restructured nav, functional notification bell dropdown (polling `unread-count` every 30s, mark-as-read), avatar menu. Spacing/breathing room.
2. **Overview/dashboard:** spacious card grid, contribution heatmap in green ramp, tasteful entrance animations (staggered fade/slide, respect reduced-motion).
3. **Contributions:** table/list restyle, status chips (green/yellow/red), approve/reject flows.
4. **Invite:** cleaner single-purpose page.
5. **Events:** implement or keep clearly-labeled placeholder in new theme.
6. **Auth screens** + loader integration.
7. Sprinkle **FloatingCircles**-style ambient animation (Google colors) on landing/empty states only — "not too pushy."

## Phase 3 — App screen migration
> **Status (2026-08-02): DONE.** The React Native app was fully migrated to the Google-light theme, mirroring every web decision (blue active labels, green/red/yellow cycling accents, solid opaque chips, pill buttons, white cards + soft shadow, no purple). The bottom tab bar was rebuilt as a **floating pill** (`FloatingTabBar` custom `tabBar`, rounded white bar detached from screen edges, safe-area padded, per-tab colored icon chips). All screens are token-driven off `app/src/theme/colors.ts`; `tsc --noEmit` passes clean. Deferred: `react-native-svg` icons (kept crisp text glyphs to avoid a native rebuild) and the notifications screen.

1. **TabNavigator:** SVG icons + light theme.
2. Home, Contributions, Members, Leaderboard, Profile — restyle to tokens, spacing, section headers in Poppins.
3. **Notifications screen** + unread badge on a tab/header, polling every 30s.
4. Loader overlay on cold start; tasteful `Animated` micro-interactions.

## Phase 4 — Polish & QA
- Reduced-motion + accessibility (contrast on all Google colors vs white text — red/blue pass, yellow needs dark text).
- Cross-browser scrollbar/cursor checks; touch fallback verified.
- Notification end-to-end test (generate → poll → read).
- Update `status.md`, `AGENTS.md`, memory.

---

## Dependencies to add
- **Web:** `gsap` (cursor), `@fontsource/jetbrains-mono` (or self-host), Poppins/Inter via `next/font`.
- **App:** `react-native-svg`, font `.ttf` assets. (Use built-in `Animated`; add `react-native-reanimated` only if micro-interactions demand it.)
- **Backend:** none (Prisma already present).

## Risks / notes
- Custom cursor + scrollbar are **desktop-web only** — RN has no equivalent; app gets tasteful `Animated` touches instead.
- Theme switch touches every component + both token files — the `.gh-*` class aliasing keeps the blast radius manageable.
- Yellow (#FBBC05) fails contrast with white text → always pair with dark text `#202124`.
- Loader must be genuinely reimplemented for RN (not a CSS port).
