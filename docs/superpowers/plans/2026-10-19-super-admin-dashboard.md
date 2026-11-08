# Super Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected, responsive `/super_admin` operations dashboard that uses TwingFace's current data without inventing unavailable module metrics.

**Architecture:** A server route authorizes the current session and gathers a serializable admin dashboard view model through focused Prisma queries. Pure helpers shape timeline/activity/module data; one client component owns responsive navigation, local filtering, and MediaWorld approval interactions. Scoped CSS creates the dark reference-inspired console without affecting member pages.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, existing CSS design system.

**Spec:** `docs/superpowers/specs/2026-10-19-super-admin-dashboard-design.md`

## Global Constraints

- The dashboard route is exactly `/super_admin` and only accepts `SUPER_ADMIN` users.
- Read current data from existing models only; never display fabricated totals or revenue.
- Preserve normal user pages and current database schema behaviour.
- Render unavailable product areas as accessible `Coming soon` / `Not connected` states.
- Add styles only under `.super-admin-*` selectors in `src/app/dashboard.css`.
- Do not add a charting dependency; use CSS/SVG output.

## Review Focus

- A normal authenticated user must always redirect to `/dashboard`, while a missing session redirects to `/login`.
- Zero users, posts, presence records and media approvals must show real zero/empty states without chart errors.
- A `UserPresence.lastActiveAt` exactly at the 30-day boundary must be included consistently.
- Search text must filter only dashboard-displayed records and never create a server-side private-data search.
- Approval failures must leave the pending application visible and expose an inline error state.

---

## File Structure

- `src/lib/super-admin-dashboard.ts` — view-model types and pure time-series, activity, status and module availability helpers.
- `src/lib/super-admin-dashboard.test.ts` — date-window, empty-data, activity ordering and availability tests.
- `src/app/(main)/super_admin/page.tsx` — authenticated, Super Admin-only server route and read-only Prisma aggregation.
- `src/app/(main)/super_admin/page.test.ts` — authorization redirects, serializable composition and aggregate-query test boundary.
- `src/components/super-admin/super-admin-dashboard.tsx` — client dashboard layout, sidebar/menu, on-page search and approval controls.
- `src/components/super-admin/super-admin-dashboard.test.tsx` — UI contract, filter and approval success/failure coverage.
- `src/app/dashboard.css` — scoped desktop/mobile admin console styles.
- `src/components/mediaworld/mediaworld-admin-dashboard.tsx` — remove the obsolete unmounted legacy panel.

### Task 1: Dashboard view-model helpers

**Files:**
- Create: `src/lib/super-admin-dashboard.ts`
- Create: `src/lib/super-admin-dashboard.test.ts`

**Interfaces:**
- Produces: `DashboardDay`, `AdminActivity`, `ModuleAvailability`, `buildDailySeries`, `buildRecentActivities`, `buildModuleAvailability`, `formatAdminMetric`.
- Consumes: serialized dates and current database aggregate values from Task 2.

- [ ] **Step 1: Write failing helper tests**

Test `buildDailySeries` for a fixed 30-day window, including an event exactly on the lower date boundary and omitted/zero days; test `buildRecentActivities` orders mixed serializable events descending; test an unavailable module returns `Not connected`.

- [ ] **Step 2: Run helper test to verify it fails**

Run: `npm.cmd test -- src/lib/super-admin-dashboard.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the pure helper interfaces in `src/lib/super-admin-dashboard.ts`**

Use UTC day keys for a deterministic inclusive 30-day series. Keep functions free of Prisma imports and return only serializable primitive/object values.

- [ ] **Step 4: Run helper test to verify it passes**

Run: `npm.cmd test -- src/lib/super-admin-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

If the workspace is a Git repository, commit the helper/test pair with `feat: add super admin dashboard helpers`.

### Task 2: Protected server route and real aggregate data

**Files:**
- Create: `src/app/(main)/super_admin/page.tsx`
- Create: `src/app/(main)/super_admin/page.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser`, Prisma models and Task 1 helper outputs.
- Produces: `<SuperAdminDashboard admin={...} data={...} />` with JSON-serializable `SuperAdminDashboardData` props.

- [ ] **Step 1: Write failing route tests**

Mock `getCurrentUser`, `redirect`, Prisma model calls and the client dashboard. Assert: no session redirects to `/login`; a `USER` redirects to `/dashboard`; `SUPER_ADMIN` receives a serializable model that includes users, presence, posts, listings, games, profiles and empty-safe daily data.

- [ ] **Step 2: Run route tests to verify they fail**

Run: `npm.cmd test -- "src/app/(main)/super_admin/page.test.ts"`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement `SuperAdminPage()` in `src/app/(main)/super_admin/page.tsx`**

Use only read-only Prisma `count`, `findMany` and presence aggregation queries. Query recent users, posts, marketplace listings, games and media profiles within the minimum data fields needed by the view model. Use Task 1 to shape daily/account activity data. Do not query or fabricate revenue/orders/OTT/tickets.

- [ ] **Step 4: Run route tests to verify they pass**

Run: `npm.cmd test -- "src/app/(main)/super_admin/page.test.ts"`

Expected: PASS.

- [ ] **Step 5: Commit**

If Git is available, commit route and test with `feat: add protected super admin dashboard route`.

### Task 3: Super Admin dashboard interaction component

**Files:**
- Create: `src/components/super-admin/super-admin-dashboard.tsx`
- Create: `src/components/super-admin/super-admin-dashboard.test.tsx`

**Interfaces:**
- Consumes: `SuperAdminDashboardData` produced by Task 2.
- Produces: `SuperAdminDashboard({ admin, data }: SuperAdminDashboardProps)`.

- [ ] **Step 1: Write failing component tests**

Assert the rendered component has Dashboard navigation, all major grouped module labels, six real KPI labels, 30-day growth/usage/status panels, `Coming soon` module state, search filtering, and a pending profile that remains with an inline error after a failed approval request.

- [ ] **Step 2: Run component test to verify it fails**

Run: `npm.cmd test -- src/components/super-admin/super-admin-dashboard.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement `SuperAdminDashboard` in `src/components/super-admin/super-admin-dashboard.tsx`**

Build the dark header/sidebar/content layout from the approved spec. Use semantic links for available destinations, disabled buttons/badges for unavailable modules, CSS/SVG for charts, an accessible sidebar toggle and local text filtering. Reuse `/api/mediaworld/approval/[id]` only for pending profile approve/reject actions; remove the profile on success and show an inline failure message otherwise.

- [ ] **Step 4: Run component test to verify it passes**

Run: `npm.cmd test -- src/components/super-admin/super-admin-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

If Git is available, commit the component/test pair with `feat: add super admin operations console`.

### Task 4: Scoped console styling and legacy admin removal

**Files:**
- Modify: `src/app/dashboard.css`
- Delete: `src/components/mediaworld/mediaworld-admin-dashboard.tsx`
- Modify: `src/components/super-admin/super-admin-dashboard.test.tsx`

**Interfaces:**
- Consumes: Task 3 semantic classes, starting with `.super-admin-shell`.
- Produces: responsive desktop rail and mobile stacked layout without affecting other pages.

- [ ] **Step 1: Extend failing UI tests for responsive class contract and obsolete panel removal**

Assert the dashboard root uses the scoped admin shell class, supports a mobile sidebar state control, and no import refers to the removed legacy MediaWorld admin component.

- [ ] **Step 2: Run affected tests to verify failure**

Run: `npm.cmd test -- src/components/super-admin/super-admin-dashboard.test.tsx`

Expected: FAIL until scoped classes and legacy removal are complete.

- [ ] **Step 3: Add only `.super-admin-*` CSS to `src/app/dashboard.css` and remove the legacy component**

Implement grid/card/sidebar/chart states, focus styles, overflow handling and breakpoints at 1100px and 720px. Keep all selectors rooted under the Super Admin namespace.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd test -- src/components/super-admin/super-admin-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

If Git is available, commit CSS/cleanup with `style: add responsive super admin dashboard`.

### Task 5: End-to-end verification

**Files:**
- Verify: all files from Tasks 1-4

**Interfaces:**
- Consumes: completed dashboard route, component, helpers and styles.
- Produces: evidence that the change is type-safe, lint-clean, tested and rendered for the intended role.

- [ ] **Step 1: Run static and automated verification**

Run:
```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Browser-verify the protected page**

Open `/super_admin` as a Super Admin. Verify desktop layout, navigation labels, real/zero-safe KPIs, unavailable states, a pending MediaWorld approval action, and a narrow viewport sidebar/content layout. Also verify a non-admin session redirects to `/dashboard`.

- [ ] **Step 3: Commit verification-ready implementation**

If Git is available, commit any final verification fixes with `test: verify super admin dashboard`.

## Self-Review

- Spec coverage: Tasks 1-4 implement routing, authorization, real aggregates, all dashboard areas, unavailable states, approval interaction, responsiveness and obsolete-panel replacement. Task 5 covers validation and browser behaviour.
- Step clarity: Each test, implementation and verification action names the responsible file, interface and command.
- Type consistency: Task 1's serializable helper shapes feed Task 2's `SuperAdminDashboardData`, which is the only data contract passed to Task 3.
- Review focus mapping: authorization is Task 2; zero/empty and boundary data are Task 1; local search and failed approval handling are Task 3.
- Proportion: no implementation bodies are embedded; exact boundaries and test evidence are specified.
