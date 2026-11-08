# Dashboard Dark Theme Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished, responsive Facebook-inspired TwingFace dashboard without changing secure feed behavior.

**Architecture:** A reusable client navbar owns only local search/dropdown interaction. The server-protected dashboard obtains the current user and safe posts as it does now, then composes Tailwind-styled presentation components. Existing post API and session boundaries remain unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-dark-theme-refactor-design.md`

## Global Constraints

- Preserve existing authentication, profile, logout, post CRUD, and safe server-side projections.
- Do not add database models, migrations, package dependencies, upload flows, messaging, notification, friend-request, or search backend behavior.
- Use the requested dark palette: `bg-[#18191a]`, `bg-[#242526]`, `border-gray-800`, and `text-gray-200`.
- Remove conflicting legacy feed style declarations; avoid corrupted icon strings.
- Run the full tests, `npm.cmd run lint`, and `npm.cmd run build`.

## Review Focus

- A server component never passes a function/event handler to a client component — Task 3 regression test.
- The navbar and dashboard retain readable layout at desktop, tablet, and mobile widths — Task 4 build plus local smoke check.
- Post cards keep safe author fields only and preserve public post links — Task 3 regression test.
- Static friend/request/contact controls do not imply backend behavior — Task 2 visual/UI review.
- The existing logout and profile links remain accessible from the left sidebar — Task 3 regression test.

---

### Task 1: Reusable dark navbar

**Files:**
- Create: `src/components/layout/navbar.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/components/layout/navbar.test.ts`

**Interfaces:**
- Produces `Navbar({ user: { name: string; username: string } })` and `MobileNav`, client UI components with no server callback props.

- [ ] **Step 1: Write a failing navbar test** that asserts the five accessible navigation labels, search input, and profile menu trigger are rendered.
- [ ] **Step 2: Run `npm.cmd test -- navbar`** and confirm it fails because the component is missing.
- [ ] **Step 3: Implement `Navbar` and `MobileNav`** with logo, local search state, active Home tab, notification badge, messages control, profile dropdown trigger, and mobile fixed navigation using the specified Facebook dark palette.
- [ ] **Step 4: Run `npm.cmd test -- navbar`** and confirm it passes.

### Task 2: Feed presentation components

**Files:**
- Modify: `src/components/posts/story-rail.tsx`
- Modify: `src/components/posts/create-post-form.tsx`
- Modify: `src/components/posts/post-card.tsx`
- Modify: `src/components/posts/post-list.tsx`

**Interfaces:**
- Consumes the existing `SafePost` DTO and `POST /api/posts` endpoint.
- Produces Tailwind-styled story cards, composer, post cards, and feed list without new data models.

- [ ] **Step 1: Write failing focused tests** for distinct story labels and preserved post-card author/content links.
- [ ] **Step 2: Run focused component tests** and confirm the legacy presentation does not meet the new expectations.
- [ ] **Step 3: Refactor the components** into scoped Tailwind dark cards; keep text posting and client refresh behavior unchanged; make secondary composer/action controls non-submitting buttons.
- [ ] **Step 4: Run focused component tests and `npm.cmd test`** and confirm all pass.

### Task 3: Server dashboard composition and authorization regression

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/app/(main)/dashboard/page.test.ts`
- Modify: `src/app/(main)/dashboard/logout-button.tsx` only if styling needs a className-compatible interface.

**Interfaces:**
- Consumes `getCurrentUser()`, `safePostSelect`, `Navbar`, story/feed components, and the existing `LogoutButton`.
- Produces a server-protected dashboard with no function props passed across the server/client boundary.

- [ ] **Step 1: Extend the failing dashboard regression test** to assert unauthenticated redirect, no server-to-client function props, and presence of profile/logout navigation elements for an authenticated user.
- [ ] **Step 2: Run `npm.cmd test -- dashboard`** and confirm the current composition fails the new layout contract.
- [ ] **Step 3: Implement the 25/50/25 responsive composition** with the requested left navigation/shortcuts/footer, static sponsored/friend-request/birthday/contact widgets, semantic links, and mobile navigation while retaining current safe post fetching and session redirect.
- [ ] **Step 4: Run `npm.cmd test -- dashboard` and `npm.cmd test`** and confirm all pass.

### Task 4: Styling consolidation and verification

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes the Tailwind class-based dashboard markup from Tasks 1–3.
- Produces only minimal global reset/responsive support, with obsolete feed CSS removed.

- [ ] **Step 1: Remove the conflicting legacy feed CSS blocks** after the component markup uses Tailwind utilities.
- [ ] **Step 2: Add only minimal global rules** for scrollbar, mobile safety, and motion reduction where Tailwind utilities are insufficient.
- [ ] **Step 3: Run `npm.cmd run lint` and `npm.cmd run build`** and correct implementation failures.
- [ ] **Step 4: Perform a local authenticated dashboard smoke check** at desktop and mobile browser widths; confirm no overlaps or malformed text, then restart the production server.
