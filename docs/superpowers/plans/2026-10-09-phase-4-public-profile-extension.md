# Phase 4 Public Profile Compatibility Extension Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task with tests first.

**Goal:** Add a public username route and compatible authenticated profile-update route without altering existing Phase 4 paths.

**Architecture:** Reuse `safeProfileSelect`, `profileUpdateSchema`, `getCurrentUser()`, and the existing edit form. The public page queries by the database-enforced unique username; the new API authorizes from the server session and explicitly persists only allowed fields.

**Spec:** `docs/superpowers/specs/2026-10-09-phase-4-public-profile-extension-design.md`

## Constraints

- Preserve `/profile`, `/profile/edit`, and `/api/profile` unmodified.
- No Prisma migration, file uploads, storage provider, or social features.
- Never expose password/session fields; never authorize from client-supplied identity.

### Task 1: Compatibility validator export

**Files:**
- Modify: `src/lib/validations.ts`, `src/lib/validations.test.ts`

- [ ] Add a failing test proving `ProfileSchema` has the same behavior as `profileUpdateSchema`.
- [ ] Export `ProfileSchema` as the exact alias.
- [ ] Run `npm test -- validations`.

### Task 2: Public username profile page

**Files:**
- Create: `src/app/(main)/[username]/page.tsx`, `src/app/(main)/[username]/page.test.ts`

- [ ] Write failing tests: existing username renders safe profile fields; missing username calls `notFound()`; no sensitive field is selected/rendered.
- [ ] Query `prisma.user.findUnique({ where: { username }, select: safeProfileSelect })`; call `notFound()` when absent; display optional image fallbacks and joined date.
- [ ] Run `npm test -- username`.

### Task 3: Compatible authenticated profile update API

**Files:**
- Create: `src/app/api/user/profile/route.ts`, `src/app/api/user/profile/route.test.ts`

- [ ] Write failing tests for unauthenticated `401`, authorized narrow update, invalid input `400`, and safe response data.
- [ ] Implement `PATCH` using `getCurrentUser()`, `ProfileSchema`, explicit `data: { name, bio, profileImage, coverImage }`, and `safeProfileSelect`.
- [ ] Run `npm test -- api/user/profile`.

### Task 4: Settings route reuse and regression verification

**Files:**
- Create: `src/app/(main)/settings/profile/page.tsx`
- Modify: no existing application routes.

- [ ] Implement protected settings page that loads the current profile and renders the existing `ProfileForm`.
- [ ] Run the complete tests: `npm test -- --run`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

## Self-review

The tasks directly satisfy all approved requirements. Existing profile routes are not modified, the schema is reused, and no migration is introduced.
