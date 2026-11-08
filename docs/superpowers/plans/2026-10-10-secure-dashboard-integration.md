# Secure Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the supplied dashboard’s visual design into the real, secure Twingface application.

**Architecture:** The protected server dashboard fetches safe user/post data. Focused client components own only non-sensitive view state such as theme and text filtering; all authentication, authorization, logout, and post persistence continue through existing server/API paths.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-secure-dashboard-integration-design.md`

## Global Constraints

- Preserve server-side `getCurrentUser()` protection, secure logout, existing profile routes, and existing post APIs.
- Never expose password hashes, session tokens, email, or any non-safe Prisma field.
- Keep unsupported social features presentational only; do not introduce models, migrations, dependencies, or fake persistence.
- Use localStorage only for visual theme preference, never authentication state.
- Run full tests, lint, production build, and authenticated local smoke verification.

## Review Focus

- An unauthenticated request redirects before any post query — Task 4 test.
- Client components receive serializable safe props only — Task 4 test.
- Search affects only safe already-loaded feed data and does not call a new API — Task 3 test.
- Theme storage never contains session/auth data — Task 1 test.
- Unsupported friend/message/notification UI makes no mutating request — Task 2 review and smoke check.

---

### Task 1: Dashboard navbar and visual preference

**Files:**
- Create: `src/components/dashboard/dashboard-navbar.tsx`
- Create: `src/components/dashboard/dashboard-navbar.test.ts`

**Interfaces:**
- Produces `DashboardNavbar({ user, onSearchChange })`; `user` is `{ name, username }`; visual callbacks are used only inside a client parent.

- [ ] Write failing tests for accessible navbar controls, profile menu, and a `tf-theme` localStorage preference.
- [ ] Run the focused navbar test and confirm expected failure.
- [ ] Implement the dark responsive navbar, controlled search field, profile menu, and visual-only theme toggle.
- [ ] Rerun focused tests and confirm pass.

### Task 2: Server-safe dashboard rails

**Files:**
- Create: `src/components/dashboard/dashboard-sidebar.tsx`
- Create: `src/components/dashboard/dashboard-right-rail.tsx`
- Modify: `src/app/(main)/dashboard/logout-button.tsx`

**Interfaces:**
- Consumes the existing `AuthUser` shape and existing `LogoutButton`.
- Produces server-renderable left/right rail markup and a className-compatible logout control.

- [ ] Write failing render tests for real profile/logout links and static-only widget labels.
- [ ] Run tests and confirm expected failure.
- [ ] Implement presentational rails with responsive Tailwind styling; retain actual logout behavior.
- [ ] Rerun focused tests and full suite.

### Task 3: Real feed workspace

**Files:**
- Create: `src/components/dashboard/dashboard-feed.tsx`
- Modify: `src/components/posts/create-post-form.tsx`
- Modify: `src/components/posts/post-list.tsx`
- Modify: `src/components/posts/post-card.tsx`
- Create: `src/components/dashboard/dashboard-feed.test.ts`

**Interfaces:**
- Consumes `SafePost[]`, cursor, current-user display name, and an internal text search value.
- Produces client-side filtering over safe posts, real create-post refresh, and safe visual post cards.

- [ ] Write failing tests for matching/non-matching safe post filtering and no API request while filtering.
- [ ] Run the focused tests and confirm expected failure.
- [ ] Implement the feed coordinator and adapt existing components to it without changing API contracts.
- [ ] Rerun focused tests and full suite.

### Task 4: Protected dashboard composition and responsive styles

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/app/(main)/dashboard/page.test.ts`
- Modify: `src/components/layout/mobile-nav.tsx`
- Modify: `src/app/globals.css` only for minimal shared theme/reset support

**Interfaces:**
- Consumes the components from Tasks 1–3, `getCurrentUser()`, and `safePostSelect`.
- Produces the protected three-column desktop/tablet/mobile dashboard.

- [ ] Extend failing dashboard tests for unauthenticated redirect, safe query composition, no function props crossing the server boundary, and required dashboard sections.
- [ ] Run the test and confirm expected failure.
- [ ] Compose server-safe dashboard page with navbar/feed/rails and responsive mobile navigation.
- [ ] Remove obsolete conflicting dashboard CSS and retain only minimal global theme support.
- [ ] Rerun dashboard tests and full suite.

### Task 5: End-to-end verification

**Files:**
- Modify only if a test or smoke check finds an implementation defect.

- [ ] Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
- [ ] Run a local authenticated smoke flow: login, dashboard rendering, search/filter, create post, profile menu, logout, and logged-out dashboard redirect.
- [ ] Fix implementation-related failures and rerun affected checks.
