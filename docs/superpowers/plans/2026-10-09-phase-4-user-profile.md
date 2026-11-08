# Phase 4 User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, authenticated self-profile viewing and editing without changing the existing authentication or adding media uploads.

**Architecture:** Server pages derive the active identity from `getCurrentUser()` and redirect when absent. The profile API independently derives the same ID from the server session, validates a safe edit payload with Zod, then updates a narrow Prisma field set and returns only a safe profile projection.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-phase-4-user-profile-design.md`

## Global Constraints

- Reuse existing `User` profile fields; do not add a Prisma migration.
- Never accept a client-supplied user ID to authorize an update.
- Do not return `passwordHash`, session records, token hashes, or raw tokens.
- Image inputs are optional HTTPS URLs only; no uploads, storage service, or paid integration.
- Preserve registration, login, logout, sessions, dashboard, and the established UI design.
- Do not implement Phase 5 functionality.

## Security Risks and Controls

- **IDOR/unauthorized updates:** derive update target exclusively from `getCurrentUser().id` in `PATCH /api/profile`.
- **Sensitive-field mass assignment:** parse a schema containing only `name`, `username`, `bio`, `profileImage`, and `coverImage`; pass an explicit Prisma `data` object.
- **Unsafe image schemes:** accept only empty values or `https:` URLs, never data/javascript/http URLs.
- **Username races:** retain the database unique constraint and translate Prisma `P2002` to a safe 409 field error.
- **Data leakage:** query/return an explicit profile selection that omits password/session fields.
- **Unauthenticated rendering:** server pages and API route independently enforce session checks.

## Review Focus

- Empty image input must clear the optional image rather than persist an invalid empty URL; covered by Task 1 validation tests.
- A payload containing `id`, `passwordHash`, `email`, or session-shaped properties must not affect those database fields; covered by Task 3 API tests.
- A user who changes their username must still have valid server-side dashboard/profile access on the same session; covered by Task 5 regression verification.
- A profile URL using `http:`, `data:`, or malformed syntax must be rejected server-side; covered by Task 1 tests.
- A deleted/expired session must be rejected by both page rendering and update API; covered by Task 3 authorization tests.

---

### Task 1: Profile validation and safe profile projection

**Files:**
- Modify: `src/lib/validations.ts`, `src/lib/validations.test.ts`, `src/lib/auth.ts`
- Create: `src/lib/profile.ts`, `src/lib/profile.test.ts`

**Dependencies:** None.

**Produces:** `profileUpdateSchema`, `ProfileUpdateInput`, `safeProfileSelect`, and `Profile` type used by the API and pages.

- [ ] Write failing tests for valid profile input, invalid names/usernames, >500-character bio, empty image clearing, valid HTTPS image URLs, and invalid/non-HTTPS image URLs.
- [ ] Run `npm test -- profile` and confirm the tests fail because the schema/projection do not exist.
- [ ] Implement the shared Zod schema and safe projection. Normalize optional empty strings to `null`; do not include protected fields in any type or selection.
- [ ] Re-run `npm test -- profile` and then `npm test -- --run`.

### Task 2: Protected profile view and profile editor UI

**Files:**
- Create: `src/app/(main)/profile/page.tsx`, `src/app/(main)/profile/edit/page.tsx`, `src/app/(main)/profile/edit/profile-form.tsx`
- Modify: `src/app/(main)/dashboard/page.tsx`, `src/app/globals.css`
- Test: `src/app/(main)/profile/page.test.tsx`

**Dependencies:** Task 1 safe `Profile` projection and existing `getCurrentUser()`.

**Produces:** Server-protected `/profile` and `/profile/edit`, responsive display/edit UI, and Dashboard → Profile navigation.

- [ ] Write failing page tests that mock `getCurrentUser`: absent session redirects to `/login`; authenticated view renders safe name/username/bio and does not render auth-sensitive fields.
- [ ] Run `npm test -- profile/page` and confirm failure.
- [ ] Implement pages that fetch the authenticated user by `getCurrentUser().id` using `safeProfileSelect`; use image/fallback markup, account creation formatting, accessible labels, and existing styling classes.
- [ ] Implement a client form with controlled fields, submit loading state, field/form errors, success state, and a `PATCH /api/profile` request. It must not contain or submit a user ID.
- [ ] Re-run page tests and full suite.

### Task 3: Authorized profile-update API

**Files:**
- Create: `src/app/api/profile/route.ts`, `src/app/api/profile/route.test.ts`

**Dependencies:** Task 1 validation/projection and existing `getCurrentUser()`; Task 2 consumes its response contract.

**Request shape:** `PATCH /api/profile` accepts only `{ name, username, bio?, profileImage?, coverImage? }`.

**Success response:** `200 { profile: { id, name, username, bio, profileImage, coverImage, createdAt } }`.

**Error responses:** `401 { error: 'Authentication required.' }`; `400 { error, fields }`; `409 { error, fields: { username: [...] } }`; `500` generic safe error.

- [ ] Write failing route tests with mocked session/Prisma boundaries: unauthenticated `401`; valid update uses the session user ID; invalid payload `400`; duplicate username `409`; a payload with sensitive/foreign identity fields cannot change anything outside the five allowed fields; returned profile excludes password/session data.
- [ ] Run `npm test -- api/profile` and confirm failure.
- [ ] Implement `PATCH` with safe JSON parsing, server session authorization, Zod validation, explicit Prisma `where: { id: currentUser.id }`, narrow `data`, safe select, and `P2002` handling.
- [ ] Re-run API tests and full suite.

### Task 4: End-to-end local verification without production data

**Files:**
- Modify: no application files.

**Dependencies:** Tasks 1–3.

- [ ] Use the local development database only; create uniquely named verification accounts through the registration API and remove them after checks where safe.
- [ ] Verify valid profile update, duplicate username rejection, invalid image URL rejection, and generic unauthorized update response through HTTP requests without printing passwords, cookie values, or tokens.
- [ ] Verify logged-out `/profile` and `/profile/edit` redirect to login; verify an authenticated profile displays the database-backed safe identity; verify logout invalidates follow-up profile access.

### Task 5: Regression and final verification

**Files:**
- Modify: no application files unless a verified implementation issue is found.

**Dependencies:** Tasks 1–4.

- [ ] Run `npx prisma validate`.
- [ ] Run `npx prisma generate` (stop only project-owned Node/Next processes if the Windows engine DLL is locked; restart the server afterward).
- [ ] Run `npx prisma migrate status`; no migration should be pending or created for Phase 4.
- [ ] Run `npm test -- --run` for profile plus authentication regressions.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] If any check fails due to implementation, write/execute the relevant failing regression test, fix the root cause, and rerun the affected checks plus the complete suite.

## Implementation Order and Interfaces

1. Task 1 defines the validation and safe field boundary used by every later task.
2. Task 2 builds protected pages and the editor against that safe boundary; it has no mutation capability by itself.
3. Task 3 implements the mutation contract Task 2 calls and independently enforces authorization.
4. Task 4 validates real server behavior with the local development database.
5. Task 5 verifies the entire Phase 4 and Phase 3 regression surface.

## Plan Self-review

- **Specification coverage:** Profile display, editing, Zod rules, server authorization, safe responses, duplicate handling, URL-only images, UI states, tests, and final checks map to Tasks 1–5.
- **No migration:** The plan explicitly reuses the existing profile fields and has no schema task.
- **Type consistency:** Task 1 exports the exact types/selections used by Tasks 2–3; Task 3 exposes the contract consumed by Task 2.
- **Scope:** No post, feed, messaging, group, marketplace, reel, streaming, file upload, or storage work is included.
