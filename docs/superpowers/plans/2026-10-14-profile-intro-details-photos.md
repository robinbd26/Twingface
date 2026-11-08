# Profile Intro, Details, and Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated profile's Intro and Photos sections use validated, persisted user data and existing image posts.

**Architecture:** Add four nullable display fields to `User` and expose them only through the existing safe profile projection. Two focused authenticated routes update bio and profile details from the server session; two public photo routes read only safe image-post metadata. The profile page loads its initial nine images server-side, while small client-side dialogs submit each update and refresh the route.

**Tech Stack:** Next.js 15 App Router and route handlers, React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, existing Cloudinary delivery URLs, existing dashboard CSS system.

**Spec:** `docs/superpowers/specs/2026-10-14-profile-intro-details-photos-design.md`

## Global Constraints

- Implement only Phase A: profile Intro/details/photos; do not add friendships, reactions, sharing, or stories.
- Add only nullable `profession`, `education`, `currentCity`, and `hometown` `User` columns with the specified maximum lengths.
- Use `prisma migrate deploy`; do not reset the database or use `prisma migrate dev` against the drifted local migration history.
- Every mutation derives the target user solely from `getCurrentUser()` and uses an explicit allow-listed Prisma `data` object.
- Reject unknown/profile-protected mutation properties with a `400` validation response; never silently pass them to Prisma.
- Safe profile/photo responses must omit password hashes, sessions, token data, email, phone, `imagePublicId`, and other private media/provider fields.
- Reuse existing `Post.imageUrl` Cloudinary URLs; this phase adds no storage/upload implementation.
- Preserve current `/api/profile`, `/api/profile/media`, existing profile media UI, post APIs, and current public profile behavior.

## Review Focus

- A bio or detail value containing only whitespace must persist as `null`, not an empty string (Task 1).
- An authenticated request with an `id`, `passwordHash`, or `profileImage` property must return `400` and perform no write (Task 2).
- A caller cannot update a different user's details by placing an identity in a JSON body (Task 2).
- The recent-photo response must contain at most nine ordered image posts and never expose `imagePublicId` or author/private fields (Task 3).
- An invalid cursor/oversized `limit` must remain bounded and a nonexistent photo owner must return `404` (Task 3).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Declare four optional Profile Intro display fields on `User`. |
| `prisma/migrations/20261014020000_add_profile_intro_details/migration.sql` | Add only the four nullable user columns. |
| `src/lib/validations.ts` | Export strict, normalizing `UpdateBioSchema` and `UpdateProfileDetailsSchema`. |
| `src/lib/validations.test.ts` | Test normalization, limits, and strict unknown-key rejection. |
| `src/lib/profile.ts` | Extend the safe profile select/type with display-only fields. |
| `src/lib/profile-photos.ts` | Define photo-safe select, ordered query helper, and bounded pagination parser. |
| `src/lib/profile-photos.test.ts` | Test limit parsing and public photo projection contract. |
| `src/app/api/user/bio/route.ts` | Session-authorized, safe bio update endpoint. |
| `src/app/api/user/bio/route.test.ts` | Test auth, validation, ownership, explicit write shape, and safe response. |
| `src/app/api/user/details/route.ts` | Session-authorized, safe profile-details update endpoint. |
| `src/app/api/user/details/route.test.ts` | Test auth, strict body, normalization, ownership, and response safety. |
| `src/app/api/user/[username]/photos/recent/route.ts` | Return up to nine safe recent image-post records. |
| `src/app/api/user/[username]/photos/route.ts` | Return a bounded cursor-paginated safe image gallery. |
| `src/app/api/user/[username]/photos/route.test.ts` | Test both public photo endpoints, 404 behavior, ordering, caps, cursors, and safe output. |
| `src/components/profile/profile-intro.tsx` | Render actual Intro values and accessible edit-bio/details dialogs. |
| `src/components/profile/profile-photos.tsx` | Render the responsive 3×3 recent photo grid and empty state. |
| `src/app/(main)/profile/page.tsx` | Load safe profile plus initial recent images, replacing placeholders. |
| `src/app/(main)/[username]/photos/page.tsx` | Public all-photo gallery that obtains batches from the safe photo API. |
| `src/app/(main)/profile/page.test.ts` | Add profile page and component source/behavior contracts. |
| `src/components/dashboard/dashboard-ui.test.ts` | Add source-level visual hooks for the intro/photo controls under the existing Node-only test setup. |
| `src/app/dashboard.css` | Scoped dialog, intro-detail, photo-grid, empty-state, and gallery styles in light/dark modes. |

## Task 1: Persist the four profile-detail fields and define strict shared input contracts

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261014020000_add_profile_intro_details/migration.sql`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`
- Modify: `src/lib/profile.ts`

**Interfaces:**
- Produces `UpdateBioSchema` accepting exactly `{ bio }` and returning `{ bio: string | null }`.
- Produces `UpdateProfileDetailsSchema` accepting exactly `{ profession, education, currentCity, hometown }` and returning each value as `string | null`.
- Produces `Profile` with the four safe display fields in addition to the existing safe profile properties.

- [ ] **Step 1: Add failing schema and safe-projection tests**

In `src/lib/validations.test.ts`, add cases proving whitespace normalizes to `null`, trimmed values retain content, values over 500/100/160/120/120 characters fail on their respective field, and extra protected keys (`id`, `passwordHash`, `profileImage`) fail strict parsing. Add a focused profile projection test asserting the four display fields are selected while `email`, `phone`, `passwordHash`, and sessions are absent.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm.cmd test -- src/lib/validations.test.ts src/lib/profile.test.ts`

Expected: FAIL because the strict update schemas, projection fields, and/or profile test file do not exist.

- [ ] **Step 3: Add schema fields and the reviewed migration**

In `prisma/schema.prisma`, add the following nullable fields to `User` without relations or indexes:

```prisma
profession  String? @db.VarChar(100)
education   String? @db.VarChar(160)
currentCity String? @db.VarChar(120)
hometown    String? @db.VarChar(120)
```

Create `prisma/migrations/20261014020000_add_profile_intro_details/migration.sql` containing only four nullable `ALTER TABLE "users" ADD COLUMN` statements matching those Prisma names/types. Inspect it before applying; do not reset or recreate any database.

- [ ] **Step 4: Implement the strict validation and safe profile projection**

In `src/lib/validations.ts`, introduce a reusable optional trimmed-string transformer that converts `''` to `null`, then define `.strict()` Zod object schemas `UpdateBioSchema` and `UpdateProfileDetailsSchema` with the specified limits. Export their inferred types. In `src/lib/profile.ts`, add `profession`, `education`, `currentCity`, and `hometown` to `safeProfileSelect` only.

- [ ] **Step 5: Regenerate Prisma and prove the focused tests pass**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test -- src/lib/validations.test.ts src/lib/profile.test.ts
```

Expected: validation/client generation exit `0`; focused tests pass.

## Task 2: Provide authenticated, server-owned bio and details mutations

**Files:**
- Create: `src/app/api/user/bio/route.ts`
- Create: `src/app/api/user/bio/route.test.ts`
- Create: `src/app/api/user/details/route.ts`
- Create: `src/app/api/user/details/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser()`, `UpdateBioSchema`, `UpdateProfileDetailsSchema`, `safeProfileSelect`, and `prisma.user.update`.
- Produces `PUT /api/user/bio` and `PUT /api/user/details`, each returning `{ profile: Profile }` on `200`.

- [ ] **Step 1: Write failing bio-route tests**

Mock `getCurrentUser` and `prisma.user.update` in `src/app/api/user/bio/route.test.ts`. Cover: no session returns `401` without a Prisma call; valid trimmed bio updates `where: { id: sessionUser.id }` with exactly `{ bio }`; whitespace becomes `null`; protected/unknown body fields return `400` with no update; a successful serialized response contains neither email, phone, password hash, session data, nor provider identifiers; an update exception becomes a generic `500` response.

- [ ] **Step 2: Run the bio-route test to verify failure**

Run: `npm.cmd test -- src/app/api/user/bio/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement `PUT /api/user/bio`**

Authenticate before parsing. Parse JSON with `UpdateBioSchema.safeParse`; return `{ error, fields }` with `400` on any malformed/unknown input. Call `prisma.user.update` only with `where: { id: currentUser.id }`, `data: { bio: parsed.data.bio }`, and `select: safeProfileSelect`. Return generic errors only.

- [ ] **Step 4: Run the bio-route test to verify it passes**

Run: `npm.cmd test -- src/app/api/user/bio/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing details-route tests**

In `src/app/api/user/details/route.test.ts`, cover no session (`401`); a four-field trimmed update using the session user ID only; any individual blank field becoming `null`; a limit violation or unknown/mass-assigned key (`id`, `profileImage`, `passwordHash`) returning `400` before Prisma; safe response serialization; and generic `500` persistence failure.

- [ ] **Step 6: Run the details-route test to verify failure**

Run: `npm.cmd test -- src/app/api/user/details/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 7: Implement `PUT /api/user/details`**

Follow the bio route's authentication/error style. Update only `{ profession, education, currentCity, hometown }` from parsed data with `where: { id: currentUser.id }` and `safeProfileSelect`; do not accept client identity or unrelated profile/media fields.

- [ ] **Step 8: Run both mutation suites**

Run: `npm.cmd test -- src/app/api/user/bio/route.test.ts src/app/api/user/details/route.test.ts`

Expected: PASS.

## Task 3: Add safe public recent and paginated photo reads

**Files:**
- Create: `src/lib/profile-photos.ts`
- Create: `src/lib/profile-photos.test.ts`
- Create: `src/app/api/user/[username]/photos/recent/route.ts`
- Create: `src/app/api/user/[username]/photos/route.ts`
- Create: `src/app/api/user/[username]/photos/route.test.ts`

**Interfaces:**
- Produces `safeProfilePhotoSelect` selecting exactly `id`, `imageUrl`, and `createdAt`.
- Produces `parseProfilePhotoLimit(value: string | null): number`, default `24`, capped at `50`.
- Produces `findProfilePhotos({ username, cursor?, limit })` with `imageUrl: { not: null }`, deterministic `[{ createdAt: 'desc' }, { id: 'desc' }]` ordering, and `limit + 1` reads.
- Produces recent `GET /api/user/[username]/photos/recent` and collection `GET /api/user/[username]/photos` contracts from the spec.

- [ ] **Step 1: Write failing helper tests**

Create `src/lib/profile-photos.test.ts` with parsing assertions: missing, zero, negative, non-numeric values yield `24`; `25` is retained; `999` yields `50`. Assert the photo-safe projection's keys are exactly `id`, `imageUrl`, and `createdAt`.

- [ ] **Step 2: Run helper test to verify failure**

Run: `npm.cmd test -- src/lib/profile-photos.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the bounded photo-query helper**

Add `src/lib/profile-photos.ts`. Keep a small explicit projection and a reusable query builder/helper for the two routes. Verify the username in an explicit `prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })` before querying posts, so a nonexistent profile is distinguishable from a profile with no photos.

- [ ] **Step 4: Write failing route tests for both endpoints**

Mock `prisma.user.findUnique` and `prisma.post.findMany` in `src/app/api/user/[username]/photos/route.test.ts`. Assert:

1. Both endpoints return `404` and skip `findMany` for a missing username.
2. Recent uses `take: 9`, filters on the discovered `authorId` and non-null `imageUrl`, orders by `createdAt desc, id desc`, and returns only safe records.
3. The paginated endpoint defaults to `take: 25`, accepts cursor with `cursor: { id }` plus `skip: 1`, caps a `limit=999` request at `take: 51`, and returns `nextCursor` only if an extra row exists.
4. Serialized payloads omit `imagePublicId`, `content`, author data, and private user fields.

- [ ] **Step 5: Run route tests to verify failure**

Run: `npm.cmd test -- src/app/api/user/[username]/photos/route.test.ts`

Expected: FAIL because the endpoints do not exist.

- [ ] **Step 6: Implement the public photo routes**

Implement both GET handlers using the Task 3 helper. The recent route returns `{ photos }`; the collection route returns `{ photos, nextCursor }`. Do not authenticate public reads, and do not accept client-provided author IDs, filter objects, or unbounded values.

- [ ] **Step 7: Run all photo-helper and photo-route tests**

Run: `npm.cmd test -- src/lib/profile-photos.test.ts src/app/api/user/[username]/photos/route.test.ts`

Expected: PASS.

## Task 4: Replace the profile Intro and Photos placeholders with real editable data

**Files:**
- Modify: `src/app/(main)/profile/page.tsx`
- Modify: `src/components/profile/profile-intro.tsx`
- Create: `src/components/profile/profile-photos.tsx`
- Modify: `src/app/(main)/profile/page.test.ts`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes `Profile`, `safeProfilePhotoSelect` results, `/api/user/bio`, and `/api/user/details`.
- Produces an owner-only client editing experience that refreshes the current route after a successful server update.
- Produces a Photos card with `{ id, imageUrl, createdAt }[]`, an accessible empty state, and a `/[username]/photos` link.

- [ ] **Step 1: Add failing profile UI contracts**

Extend `src/app/(main)/profile/page.test.ts` and `src/components/dashboard/dashboard-ui.test.ts` to assert the profile page queries at most nine current-user image posts through the safe photo projection; does not contain the existing `photos` color placeholder array; passes real profile data into `ProfileIntro` and `ProfilePhotos`; and links the visible “See all photos” action to `/${profile.username}/photos`. Assert that the Intro source has labelled edit-bio/detail dialogs, calls the two new endpoints with `PUT`, reports pending/error state, and invokes `router.refresh()` only after success. Assert scoped CSS hook names for intro dialogs/detail rows/photo grid/empty state.

- [ ] **Step 2: Run the focused UI tests to verify failure**

Run: `npm.cmd test -- src/app/(main)/profile/page.test.ts src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the page still has mock detail and color-photo data and no focused dialogs.

- [ ] **Step 3: Server-load real Profile Intro and nine image posts**

In `src/app/(main)/profile/page.tsx`, remove the local placeholder `photos` array. Add a query constrained to `authorId: currentUser.id` and `imageUrl: { not: null }`, ordered by `createdAt desc` then `id desc`, with `take: 9` and the Task 3 safe photo projection. Pass `profile` to `ProfileIntro` and the photo records plus `profile.username` to `ProfilePhotos`. Leave current profile media upload, existing post feed, and mock Friend section untouched for later phases.

- [ ] **Step 4: Implement accessible focused Intro edits**

Refactor `ProfileIntro` into a client component with separate modal/dialog state for bio and details. Render only non-null display rows: profession, education (`Studied at …`), current city (`Lives in …`), and hometown (`From …`). Each dialog must have labelled fields, Cancel/Save controls, `aria-live` status/error feedback, disabled pending controls, Escape/close handling, and `fetch` to only its matching endpoint. Serialize just the route's accepted fields. On success close the dialog and `router.refresh()`; preserve errors locally on failure.

- [ ] **Step 5: Implement the photos card and styles**

Create `ProfilePhotos` to render actual image URLs with `next/image`, meaningful author/creation-date alt text, a responsive 3×3 grid, a “No photos yet” empty state, and a `Link` to `/${username}/photos`. Add only `.fb-*`/profile-scoped CSS required for dialog layout, form focus/validation/pending states, photo crop/hover behavior, accessible empty state, and mobile layout. Maintain the existing dark-theme tokens and do not change global dashboard geometry.

- [ ] **Step 6: Run profile UI tests and lint**

Run:

```powershell
npm.cmd test -- src/app/(main)/profile/page.test.ts src/components/dashboard/dashboard-ui.test.ts
npm.cmd run lint
```

Expected: both commands exit `0` with no lint warnings.

## Task 5: Add the public all-photos gallery and complete verification

**Files:**
- Create: `src/app/(main)/[username]/photos/page.tsx`
- Create: `src/app/(main)/[username]/photos/page.test.ts`
- Modify: `src/app/dashboard.css`
- Modify only if an earlier test/verification failure requires a narrowly scoped correction.

**Interfaces:**
- Consumes the safe public profile/photo query contract from Task 3.
- Produces a public all-photos page that returns `notFound()` for an absent username and never reads unsafe User/Post fields.

- [ ] **Step 1: Write failing gallery-page tests**

In `src/app/(main)/[username]/photos/page.test.ts`, mock safe lookup/query dependencies and `notFound`. Assert an absent username calls `notFound`; a valid profile uses only safe name/username/photo values; the gallery renders each initial image through `next/image`; and an empty photo collection communicates a meaningful visible empty state. Include a source assertion that no private profile select is used.

- [ ] **Step 2: Run gallery-page tests to verify failure**

Run: `npm.cmd test -- src/app/(main)/[username]/photos/page.test.ts`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement `src/app/(main)/[username]/photos/page.tsx`**

Load the profile by lowercased username through `safeProfileSelect`; invoke `notFound()` when absent. Load the initial 24 photo records with the Task 3 photo helper/projection and deterministic order. Render a public gallery title, images, and empty state using the existing `app-shell`/surface style family. Do not require login and do not add a client upload path; later pagination may call the existing public collection endpoint.

- [ ] **Step 4: Run gallery tests and all automated checks**

Run:

```powershell
npm.cmd test -- src/app/(main)/[username]/photos/page.test.ts
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits `0`. If `migrate deploy` reports environment/database state that cannot be safely changed, stop before any destructive remediation and report the exact safe blocker.

- [ ] **Step 5: Perform the local authenticated browser smoke test**

Start the existing application without printing `.env.local` secrets. Sign in through the normal UI, update a bio, update at least two detail fields, confirm profile refresh renders them, and confirm a previously created image post appears in the 3×3 Photos grid and public all-photos page. Check a user with no image posts gets the empty state. Visit a missing username/photo URL and confirm the 404 response. Record only pass/fail observations—never cookies, passwords, database URLs, or Cloudinary credentials.

## Plan Self-Review

- **Spec coverage:** Task 1 adds exactly the specified four nullable columns plus normalization/safe projection; Task 2 covers both mutation APIs; Task 3 covers both public photo APIs and pagination; Task 4 replaces Intro/photo placeholders with editable real data; Task 5 supplies the “See all photos” page and full verification. Friends, reactions/sharing, and stories remain excluded.
- **Step scan:** Each task begins with a concrete failing test, runs it, makes a constrained implementation change, then verifies. Exact routes, field names, lengths, response shapes, and selectors are named where an implementer cannot infer them.
- **Type consistency:** `Profile` carries `profession`, `education`, `currentCity`, and `hometown`; `UpdateBioSchema`/`UpdateProfileDetailsSchema` align with their individual route payloads; `safeProfilePhotoSelect` drives server page, routes, and gallery records.
- **Review focus:** whitespace normalization is tested in Task 1; mass assignment/session ownership is tested in Task 2; recent cap/safe shape and bounded cursors/nonexistent users are tested in Task 3.
- **Proportion:** This plan deliberately retains existing profile media, post feed, and storage code; it adds only the first sequenced social feature. No Git commit steps are included because this workspace has no `.git` directory.
