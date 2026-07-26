# ClubMgmt — Product Vision & Roadmap

**Document type:** Master vision document  
**Last updated:** 2026-07-24

---

## Vision

ClubMgmt exists to be the operating system for college clubs.

The product should feel like the intersection of GitHub's clarity, Linear's speed, and Discord's community warmth — but built specifically for the rhythms of student-run organizations.

Today, clubs run on WhatsApp groups. Everything is in threads that scroll away. Announcements get buried. Contributions go untracked. Nobody knows who did what. The club lead is the bottleneck for everything. New members don't know where to start. By the time someone tries to write a contribution record months later, half the details are gone.

ClubMgmt solves this by giving every person in a club a clear, always-accurate record of their work — and giving club leads a real management interface instead of a group chat.

**The replacement test:** A club lead should be able to stop using WhatsApp for operational tasks. If they still need WhatsApp to coordinate work, we have failed.

**The adoption test:** A first-year student joining via an invite link should understand the system within 5 minutes, without needing any training.

---

## Core Principles

**Fast.** Every interaction should feel instant. Optimistic UI updates. No spinners for operations that should be fast.

**Role-aware without being confusing.** Each user sees exactly what they need, nothing more. The UI adapts to role — not via hidden screens, but via thoughtful defaults.

**Mobile-first.** Students live on their phones. The coordinator approving contributions at 11pm is on a phone. The member logging their workshop at midnight is on a phone. Everything must work beautifully on a 375px screen.

**One source of truth.** Contributions, attendance, members, events — one place. Not WhatsApp + spreadsheet + Google Form + email.

**Minimal friction.** Logging a contribution should take under 60 seconds. Approving a batch should take under 30 seconds. Sending an invite link should be one tap.

**Beautiful UI.** This is software people will use weekly. It should feel as polished as the apps they use for everything else. Mediocre design causes abandonment.

**Reliable.** Clubs will depend on this for real decisions (certificate generation, promotion, recognition). Data must be accurate and durable.

**No unnecessary clicks.** Every extra step to complete a common task is friction that compounds into abandonment.

---

## MVP

Everything required before the **first real deployment** to a real club.

### Authentication
- [x] Google OAuth login
- [x] Invite-only registration (email or Google)
- [x] JWT auth, 7-day sessions
- [ ] Refresh tokens (extend sessions without re-login)
- [ ] Minimum-entropy JWT secret enforcement
- [ ] HttpOnly cookie token storage (replace localStorage)

### Security
- [ ] Rate limiting (auth endpoints: 10/15min, global: 100/min)
- [ ] Admin email list moved to environment variable (out of git)
- [ ] Attachment URL scheme validation (only http/https allowed)
- [ ] Input length limits on all text fields
- [ ] Server-side date validation (no future contributions)
- [ ] Page/limit parameter clamping

### Clubs
- [x] Create, list, delete clubs
- [ ] Edit club name
- [ ] Club description (optional, up to 500 chars)

### Members
- [x] Invite and register members via link
- [x] List, promote, assign, remove members
- [x] Role-scoped visibility (COORDINATOR sees own club only)
- [ ] Fix: COORDINATOR should be able to remove MEMBER via route (L-07 from bugs)
- [ ] Member profile page (own profile view)
- [ ] Coordinator-accessible member detail view

### Contributions
- [x] Submit, list, view, approve, reject, delete contributions
- [x] Approval queue for coordinators
- [x] Leaderboard (weekly/monthly/semester/all-time)
- [x] Club analytics
- [ ] Edit contribution (member edits their PENDING contribution)
- [ ] Fix: minimum hours validation (0.25 minimum)
- [ ] Coordinator notification when new contribution submitted (email or in-app)

### Frontend
- [x] GitHub-inspired dark design system
- [x] Responsive layout (desktop + mobile)
- [ ] Fix: undefined `bg-glass` CSS classes
- [ ] Consistent design language across all pages
- [ ] Global 401 interceptor → redirect to login with message
- [ ] Logout should redirect to /login
- [ ] Proper confirm modals (no browser alert/confirm)
- [ ] Error boundaries
- [ ] Loading states for all async operations (already mostly done)
- [ ] Favicon

### Backend
- [ ] Fix: N+1 API calls — enriched clubs endpoint
- [ ] Fix: admin email list disk read — cache at module load
- [ ] Debounced search (already client-side, needs limit reduction)
- [ ] Database indexes on Contribution and User queried fields
- [ ] Input validation middleware (Zod or Joi)
- [ ] CORS support for multiple origins (React Native prep)

### Infrastructure
- [ ] Production deployment documented (Render, Railway, or VPS)
- [ ] Environment variable documentation (`.env.example` for both apps)
- [ ] Docker Compose with env-file for credentials
- [ ] Health check endpoint (exists, needs response format standardization)
- [ ] Database backup strategy documented

---

## Production v1

Everything required before releasing to **an entire college** (all clubs, all students).

### Platform Stability
- [ ] End-to-end test suite (at least happy-path coverage for auth, contributions, invite flow)
- [ ] Error monitoring (Sentry or similar)
- [ ] Structured logging with correlation IDs
- [ ] API response time monitoring
- [ ] Database connection pool tuning
- [ ] Prisma query logging disabled in production
- [ ] Graceful shutdown handling

### Events
- [ ] Create events (title, description, date, location, club)
- [ ] RSVP/attendance tracking (member marks attendance, coordinator confirms)
- [ ] QR code attendance check-in (coordinator generates QR, member scans)
- [ ] Event announcement visible to club members
- [ ] Past events with attendance record

### Announcements
- [ ] Club-level announcements (coordinator posts, all club members see)
- [ ] System-wide announcements (admin posts, all users see)
- [ ] Read/unread tracking

### Notifications
- [ ] In-app notification center (real-time or polling)
- [ ] Notification types: contribution approved/rejected, new announcement, event created, invite accepted
- [ ] Email notifications (SendGrid or Resend) for high-priority events
- [ ] Notification preferences (opt-out per type)

### Admin Tooling
- [ ] Admin dashboard with system-level KPIs (total users, total hours, clubs, pending items)
- [ ] Club management (create, rename, delete, merge)
- [ ] Bulk member import via CSV
- [ ] Force-logout user (invalidate tokens — requires token blacklist or short JWT + refresh tokens)
- [ ] Audit log: who approved what, who removed whom, when

### Coordinator Tooling
- [ ] Batch approve multiple contributions at once
- [ ] Contribution approval history view
- [ ] Export club contributions to CSV / PDF
- [ ] Club member roster with contribution summary
- [ ] Set club-level contribution targets (e.g., 10 hours/semester expected)

### Member Tooling
- [ ] Full contribution history page with filters and pagination
- [ ] Edit PENDING contribution (before approval)
- [ ] Delete own PENDING contribution
- [ ] Contribution timeline view (chronological personal record)
- [ ] View own rank on leaderboard highlighted
- [ ] Download personal contribution record (PDF)

### Search
- [ ] Full-text search for contributions (title, description)
- [ ] Member search across all clubs (admin)
- [ ] Global search from navbar (currently disabled placeholder)

### UX Polish
- [ ] Onboarding flow for new members (first-login tour)
- [ ] Empty state illustrations (not just text)
- [ ] Toast notification system (success/error feedback without blocking UI)
- [ ] Keyboard shortcuts for common actions
- [ ] Dark/light mode toggle (default: dark)
- [ ] Contribution heatmap for all members (currently admin-only on home)

### Data Integrity
- [ ] Soft delete for contributions (mark as deleted, not DB delete)
- [ ] Audit trail for approvals (already partially tracked with approvedBy/approvedAt)
- [ ] Club analytics cached (not recomputed on every request)

---

## Mobile App (React Native)

Requirements for a production-quality React Native app using the same backend.

### Authentication
- [ ] Google OAuth via expo-auth-session (native OAuth flow, no browser redirect)
- [ ] Secure token storage using expo-secure-store (not AsyncStorage)
- [ ] Biometric re-authentication for sensitive actions
- [ ] Deep link handling for invite links (`clubmgmt://register/[token]`)

### Core Features (Feature Parity with Web)
- [ ] Member home (personal dashboard, contribution heatmap, rank)
- [ ] Contribution submission (with offline queue)
- [ ] My contributions list with filter
- [ ] Leaderboard
- [ ] Club members list
- [ ] Coordinator: approval queue with swipe-to-approve gesture
- [ ] Coordinator: invite link generation
- [ ] Admin: club management

### Native Interactions
- [ ] Pull-to-refresh on all list screens
- [ ] Swipe actions on contribution rows (approve/reject)
- [ ] Native bottom sheet for filters and actions
- [ ] Haptic feedback on key interactions (approve, submit)
- [ ] Share invite link via native share sheet

### Offline Support
- [ ] Cache last-loaded contributions, leaderboard, and member list locally
- [ ] Queue contribution submissions when offline, sync when reconnected
- [ ] Show last-synced timestamp when offline
- [ ] Offline-aware error states

### Push Notifications
- [ ] Native push via Expo Notifications
- [ ] Notification for contribution approved/rejected
- [ ] Notification for new event announced
- [ ] Notification for pending approval (coordinator)
- [ ] Badge count for unread notifications

### Events
- [ ] Native calendar integration (add event to device calendar)
- [ ] QR code attendance scan via camera
- [ ] Event detail screen with RSVP

---

## Future Vision

Ideas for beyond v1 that define the long-term product direction.

### Analytics & Insights

**Contribution analytics dashboard** — visualization of contribution patterns over time. Heatmaps, trend lines, category distribution, velocity by member.

**Club health score** — composite metric: member activity rate, pending contributions age, event frequency, coordinator responsiveness. Dashboard widget for admin.

**Comparative analytics** — compare clubs side by side on contribution hours, member engagement, event frequency.

**Member engagement heatmap** — GitHub-contribution-graph style heat map per user, visible on their profile.

**Cohort analysis** — track engagement of members who joined in the same semester over time. Identify dropout patterns early.

---

### Achievement System

**Badges and milestones** — automatic awards for: first contribution, 10 hours logged, 50 hours logged, 3 events attended, etc.

**Certificate generation** — exportable PDF certificate of contributions for a member, signed with club name, coordinator, date range, and hours. Useful for resumes and academic records.

**Leaderboard seasons** — semester-based seasons with final rankings, announced at semester end.

**Streaks** — consecutive weeks with at least one contribution logged. Shown on member profile.

---

### Event Management

**Full event lifecycle**: planned → confirmed → in-progress → completed → archived.

**RSVP and waitlist** — members RSVP, coordinator sees who's coming. Waitlist if capacity is set.

**QR attendance** — coordinator generates a time-limited QR code at event start. Members scan to mark attendance. Prevents retroactive marking.

**Event contribution auto-linking** — contributions with datePerformed matching an event date get a visual link to that event.

**Recurring events** — weekly meetings can be templated and auto-created.

---

### Communication

**Announcements** — club-scoped or system-wide with rich text (Markdown support).

**Mention system** — @member mentions in announcements or contribution descriptions, with notification.

**Discussion threads** — simple threaded comments on announcements or events.

**Email digests** — weekly summary email: contributions approved, upcoming events, leaderboard position.

---

### Recruitment & Onboarding

**Recruitment periods** — admin opens a recruitment window. Public-facing club page becomes visible.

**Application form** — prospective members fill a form (questions configurable by club). Coordinator reviews and selects.

**Onboarding checklist** — new members see a checklist: "Complete your profile → Log your first contribution → RSVP to an event." Progress tracked.

**Welcome message per club** — coordinator sets a welcome message shown to new members.

---

### Project Management

**Project tracking** — clubs can create projects with tasks. Members claim tasks. Task completion linked to contributions.

**Kanban board** — simple task board (Backlog, In Progress, Done) scoped per club.

**Budget tracking** — clubs can log expenses, coordinators approve. Admin sees all club budgets.

---

### Integrations

**Google Calendar** — two-way sync for events: create event in ClubMgmt, appears in Google Calendar. RSVP syncs.

**Google Workspace** — single sign-on for college Google accounts. Drive integration for attaching files.

**GitHub integration** — link GitHub commits/PRs as contribution evidence. Contribution auto-created from merged PR.

**WhatsApp / Telegram bot** — receive notification of approved contributions or new events via messaging bot. Reduce need to open the app.

---

### Intelligence (AI Assistance)

**Contribution title suggestions** — when a member starts typing, suggest completion based on common titles in the club.

**Duplicate contribution detection** — flag if a member submits a contribution very similar to one already approved.

**Smart approval** — coordinator-facing: highlight contributions that are statistically similar to previously approved ones for faster review.

**Club insights summary** — weekly auto-generated natural language summary: "This week your club logged 24 hours across 8 contributions. Top categories: Development (12h), Events (8h). 3 contributions are pending review."

**Anomaly detection** — flag unusually high hour submissions (> 2σ from member's average) for coordinator attention.

---

## UX Philosophy

The application should feel like tools students actually want to open, not tools they're forced to use.

**Inspiration (do not clone):**

- **GitHub:** Clean information density, role-aware views, excellent empty states, contribution heatmap, consistent interaction patterns.
- **Linear:** Speed-first design, keyboard shortcuts, instant feedback, no unnecessary modals, thoughtful animations.
- **Discord:** Community warmth, presence awareness, notification design, mobile-native feel.
- **Notion:** Flexibility of content types, smooth text editing, block-based composition.
- **Slack:** Status, announcements, thread-style conversations.

**What this means in practice:**

- **Typography:** One font (Inter), limited weights (400/500/600/700), consistent size scale.
- **Color:** Single dark background. Role colors consistent everywhere (purple=admin, blue=coordinator, green=member). Status colors consistent everywhere (green=approved, yellow=pending, red=rejected).
- **Spacing:** 4px base unit. Consistent padding. No cramped layouts.
- **Interactions:** Hover states on every interactive element. Focus states for accessibility. Micro-animations on state change.
- **Feedback:** Every user action gets immediate feedback. Submit a form → spinner → success/error. Never dead buttons.
- **Empty states:** When there's no data, explain why and what to do next. Never just blank space.
- **Error states:** Tell the user what went wrong and how to recover. Never raw error codes.
- **Mobile:** Touch targets minimum 44×44px. No hover-only interactions on mobile. Bottom-sheet over modal on mobile.
- **Loading:** Skeleton loaders match the shape of the content. Never generic spinners on full page.

---

## Product Success Criteria

These are the outcomes that define whether the product is working, not just shipped.

1. **Club leads stop using WhatsApp for contribution tracking.** Measured by: coordinator interviews after 1 semester of use.

2. **Members actively log contributions.** Threshold: >70% of members log at least one contribution per month. Measured by analytics.

3. **Coordinator approval latency < 48 hours.** Average time from contribution submission to approval/rejection. Measured by backend analytics.

4. **Attendance tracking becomes effortless.** Event attendance logged for >90% of club events. Measured by event completion rate.

5. **New members onboard without assistance.** A student with only an invite link can sign up and log their first contribution without asking anyone for help. Measured by zero-support registration rate.

6. **Coordinators manage clubs from mobile.** >50% of coordinator actions (approvals, invites) taken on mobile. Measured by user-agent analytics.

7. **React Native app reaches feature parity with web.** All core workflows (submit, approve, invite, view leaderboard) work natively on iOS and Android.

8. **Zero data loss incidents.** All contribution records preserved. Audit trail intact. Regular database backups verified.

9. **Sub-200ms average API response time** for the 95th percentile of requests. Measured by server monitoring.

10. **The system is still being used 6 months after deployment.** Not abandoned like every other college app.

---

## Completion Estimates

### Backend Completion: ~55%
Core CRUD and auth are solid. Missing: events, announcements, notifications, rate limiting, security hardening, token refresh, advanced admin tooling.

### Frontend Completion: ~45%
Core views built and functional. Missing: events, notifications, mobile polish, member profiles, edit flows, consistent design system, search, onboarding.

### Overall Product Completion: ~30%
The foundation (auth, clubs, members, contributions, basic analytics) is working. But everything that makes it a product people choose over WhatsApp is missing: events, announcements, notifications, mobile app, export, search, achievement system.

### Deployment Readiness: ~20%
Cannot be deployed to production in current state. Security blockers (no rate limiting, localStorage JWT, weak secret validation, git-committed admin list) must be resolved first. No production infrastructure documented.

### Production Readiness: ~15%
Well below production standard. Needs security hardening, performance fixes (N+1 queries, no DB indexes), error monitoring, test coverage, mobile app, and core feature parity with "what WhatsApp currently provides."
