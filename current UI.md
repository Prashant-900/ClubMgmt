# Current UI Architecture

This document outlines the complete user interface of the ClubMgmt application, detailing page navigation, role-based visibility, components, and frontend-backend interactions.

## Global Layout & Navigation

The application uses a persistent bottom navigation bar (Footer) that stays visible across the application for authenticated users.

### Footer Components
*   **Profile Avatar (Bottom Left):** Displays the user's initials with a role-based colored background. Clicking this opens a `ProfilePopup` which displays the user's name, email, role, and a **Logout** button.
*   **Navigation Links (Bottom Center):**
    *   **Home:** Links to `/`. Visible to all.
    *   **Contributions:** Links to `/contributions`. Visible to all.
    *   **Invite:** Links to `/invite`. Visible only to **ADMIN** and **COORDINATOR** roles.
*   **Sign-in Button:** If the user is unauthenticated, the avatar and nav links are replaced by a "Sign in with Google" button pointing to `/login`.

---

## 1. Login Page (`/login`)

*   **Description:** The entry point for unauthenticated users.
*   **Components:** A central card with a "Sign in with Google" button.
*   **Backend Connection:** Clicking the button redirects the browser directly to the backend OAuth route (`http://localhost:4000/api/auth/google`). After successful authentication, the backend redirects back to the frontend with a JWT.

---

## 2. Home Page / Dashboard (`/`)

The content of the home page is highly dynamic and depends entirely on the user's role and the current URL parameters.

### Role: ADMIN (Viewing All Clubs)
*   **Description:** The default view for an Admin.
*   **Components:** 
    *   `ClubGrid`: Displays a grid of all registered clubs in the system. Clicking a club updates the URL parameter `?clubId=[id]` to drill down into that club.
    *   `AdminMembersOverview`: Displays a high-level overview or list of members across the system or users without clubs.
*   **Backend Connection:** Fetches the list of all clubs (`/api/clubs`) and all members (`/api/members`).

### Role: ADMIN (Viewing a Specific Club via `?clubId=`)
*   **Description:** The drill-down view when an Admin selects a club.
*   **Components:**
    *   **"Back to Clubs" Button:** Returns the Admin to the main `ClubGrid` view.
    *   `MemberGrid`: Displays the members belonging to the selected club.
    *   **"Promote to club lead" Button:** Available on member cards to promote a `MEMBER` to `COORDINATOR`.
*   **Backend Connection:** Fetches members filtered by the selected club (`/api/members?clubId=...`). Promoting calls `POST /api/members/:id/promote`.

### Role: COORDINATOR
*   **Description:** The view for a club lead managing their specific club.
*   **Components:**
    *   **"Create Invite Link" Button:** A prominent quick-action button that routes to `/invite`.
    *   `MemberGrid`: Displays the members belonging to the Coordinator's assigned club. Coordinators can view members and potentially remove members below their hierarchy level.
*   **Backend Connection:** Fetches members for the assigned club. Member removal calls `DELETE /api/members/:id`.

### Role: MEMBER
*   **Description:** The standard view for a regular club member.
*   **Components:**
    *   `MemberGrid`: Displays a read-only list of members belonging to the same club.
*   **Backend Connection:** Fetches members restricted to the user's club.

---

## 3. Contributions Page (`/contributions`)

A comprehensive dashboard for managing and viewing work done by club members. It utilizes a tabbed interface. The visible tabs depend on the user's role.

*   **Global Components:** 
    *   **"Submit" Button:** Routes to `/contributions/submit` for a user to log new work.

### Tabs & Role Visibility

#### "My Contributions" (All Roles)
*   **Component:** `ContributionList (mineOnly=true)`
*   **Description:** Shows a list of contributions submitted by the currently logged-in user.
*   **Backend Connection:** Fetches contributions filtered by the user's own ID.

#### "Pending Approvals" (ADMIN, COORDINATOR)
*   **Component:** `ApprovalQueue`
*   **Description:** A queue of submitted contributions awaiting review. Coordinators see pending items for their club; Admins see pending items globally. Contains "Approve" and "Reject" action buttons.
*   **Backend Connection:** Fetches pending contributions. Actions call the respective backend approval endpoints.

#### "Club Contributions" (ADMIN, COORDINATOR)
*   **Component:** `ContributionList (showUser=true)`
*   **Description:** A historical list of all contributions (approved, pending, rejected) within the club.
*   **Backend Connection:** Fetches all contributions for the specific club.

#### "Club Analytics" (ADMIN, COORDINATOR)
*   **Component:** `ClubDashboard`
*   **Description:** Displays charts and aggregated statistics (e.g., total hours, contributions by category) for the specific club.
*   **Backend Connection:** Likely fetches aggregated data or processes fetched club contributions.

#### "Global Analytics" (ADMIN Only)
*   **Component:** `GlobalDashboard`
*   **Description:** Displays cross-club statistics and comparisons for high-level administration.

#### "Leaderboard" (All Roles)
*   **Component:** `Leaderboard`
*   **Description:** A ranked list of members based on contribution hours or points.
*   **Backend Connection:** Fetches aggregated leaderboard data.

---

## 4. Submit Contribution Page (`/contributions/submit`)

*   **Description:** Form for logging a new contribution.
*   **Components:** Input fields for title, category, hours, date, and description. A submit button.
*   **Backend Connection:** Posts form data to the contributions creation API.

---

## 5. Invite Page (`/invite`)

*   **Visibility:** ADMIN and COORDINATOR only.
*   **Description:** Page to generate shareable registration links.
*   **Components:**
    *   **Back Button:** Returns to the Home page.
    *   `InviteLinkForm`: A form to generate a new invite link. Allows selecting the role (e.g., MEMBER), usage limit, and expiration. For Admins, it may allow selecting the target club.
    *   **Active Links List:** Displays currently active generated links with options to copy to clipboard or revoke.
*   **Backend Connection:** Generates links via `POST /api/invite-links`. Fetches active links via `GET /api/invite-links`. Revokes via `DELETE /api/invite-links/:id`.
