# Profile and Cover Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users securely upload and replace one profile photo and one cover photo through the existing Cloudinary integration.

**Architecture:** A focused media-validation module and server-only Cloudinary adapter validate and upload avatar/cover bytes to deterministic user-scoped Cloudinary paths. A new authenticated multipart route persists only the resulting HTTPS URL to the current user's existing safe profile fields. A reusable client uploader connects the profile-page buttons and edit form to the route.

**Tech Stack:** Next.js 15 route handlers and React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, Cloudinary Node SDK, existing dashboard CSS.

**Spec:** `docs/superpowers/specs/2026-10-12-profile-media-upload-design.md`

## Global Constraints

- Reuse `User.profileImage` and `User.coverImage`; create no Prisma migration or model.
- Support only JPEG, PNG, WebP, and GIF at most 5 MiB.
- Derive target ownership only from `getCurrentUser()`; never accept client user IDs or Cloudinary public IDs.
- Keep `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` server-only.
- Use deterministic asset paths `twingface/profiles/<user-id>/avatar` and `twingface/profiles/<user-id>/cover` with Cloudinary `overwrite: true` and `invalidate: true`.
- Validate MIME, byte size, and detected image signature before upload.
- Return only `safeProfileSelect`; never expose password hashes, email, phone, sessions, API credentials, provider internals, or public IDs.
- Preserve manual HTTPS URL editing, existing authentication, existing post-image behavior, and all current profile routes.

## Review Focus

- A user cannot send `kind=cover` with another user's ID or profile fields and alter any account other than their current session user; Task 2 adds an explicit mass-assignment/ownership test.
- A renamed non-image file claiming `image/jpeg` is rejected before Cloudinary; Task 1 and Task 2 add signature rejection tests.
- A valid avatar upload must not overwrite `coverImage`, and vice versa; Task 2 tests both exact Prisma data objects.
- Cloudinary/provider/database error details must never appear in a response; Task 2 tests `502`/`500` response safety.
- A selected invalid or oversized file receives immediate UI feedback, but server validation remains authoritative; Task 3 tests UI hooks and Task 2 tests route behavior.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/profile-media.ts` | Defines allowed profile-media types, 5 MiB policy, kind schema, file validation, and magic-byte verification. |
| `src/lib/profile-media.test.ts` | Unit tests validation and file-signature behavior. |
| `src/lib/cloudinary.ts` | Adds a server-only deterministic profile-media upload helper while preserving post-image helpers. |
| `src/lib/cloudinary.test.ts` | Tests Cloudinary adapter options and safe response mapping. |
| `src/app/api/profile/media/route.ts` | Authenticated multipart upload, explicit user update, and safe error handling. |
| `src/app/api/profile/media/route.test.ts` | Tests authorization, validation, persistence boundaries, provider failures, and safe responses. |
| `src/components/profile/profile-media-uploader.tsx` | Client file input/pending/error component reusable for avatar and cover actions. |
| `src/components/profile/profile-media-uploader.test.ts` | Source-level contract tests under the current Node-only Vitest setup. |
| `src/app/(main)/profile/page.tsx` | Replaces own-profile edit links for camera/cover with upload controls. |
| `src/app/(main)/profile/edit/profile-form.tsx` | Adds upload controls while retaining the existing URL fallback inputs. |
| `src/app/dashboard.css` | Adds scoped profile-media upload state styles. |

## Task 1: Define safe profile-media validation and Cloudinary upload contract

**Files:**
- Create: `src/lib/profile-media.ts`
- Create: `src/lib/profile-media.test.ts`
- Modify: `src/lib/cloudinary.ts`
- Modify: `src/lib/cloudinary.test.ts`

**Interfaces:**
- Produces `PROFILE_MEDIA_KINDS = ['profile', 'cover']`, `ProfileMediaKindSchema`, `MAX_PROFILE_MEDIA_BYTES`, `isValidProfileMediaFile(file)`, and `isValidProfileMediaBytes(mimeType, bytes)`.
- Produces `uploadProfileMedia(input: { bytes: Buffer; mimeType: string; userId: string; kind: 'profile' | 'cover' }): Promise<{ imageUrl: string }>`.

- [ ] **Step 1: Write failing validation and adapter tests**

Test accepted JPEG/PNG/WebP/GIF files at or below 5 MiB, rejection of unsupported MIME types/oversized files/invalid kind, and rejection of invalid byte signatures. Add Cloudinary mock tests asserting an avatar uses `twingface/profiles/user-a/avatar`, cover uses `.../cover`, and both set `overwrite: true`, `invalidate: true`, `resource_type: 'image'`, allowed formats, and a safe HTTPS result.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `npm.cmd test -- src/lib/profile-media.test.ts src/lib/cloudinary.test.ts`

Expected: FAIL because profile-media exports and the Cloudinary helper do not exist.

- [ ] **Step 3: Implement validation and adapter helpers**

Add a dedicated validation module rather than importing post-create parsing. Reuse the established signature checks where safe, but keep profile media independent of post content rules. Add `uploadProfileMedia` in the existing Cloudinary adapter with deterministic paths and a profile/cover-appropriate limiting transformation; never return a public ID or provider object.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd test -- src/lib/profile-media.test.ts src/lib/cloudinary.test.ts`

Expected: PASS.

## Task 2: Add authenticated profile-media route without mass assignment

**Files:**
- Create: `src/app/api/profile/media/route.ts`
- Create: `src/app/api/profile/media/route.test.ts`
- Modify: `src/lib/profile.ts` only if a narrow safe response type/helper is needed; keep its selected fields unchanged.

**Interfaces:**
- Consumes `getCurrentUser`, Task 1 validation/upload helpers, Prisma, and `safeProfileSelect`.
- Produces `POST /api/profile/media` returning `{ profile: Profile }`.

- [ ] **Step 1: Write failing route tests**

Add tests for: `401` before form parsing/upload; missing image/invalid kind/invalid MIME/size/signature return `400` before upload; profile upload calls Prisma with exactly `{ profileImage: uploadedUrl }` and cover upload with exactly `{ coverImage: uploadedUrl }`; only `where: { id: currentUser.id }` is used despite extra request fields; safe response excludes passwords, sessions, Cloudinary IDs, and credentials; provider failure maps to safe `502`; database failure maps to safe `500`.

- [ ] **Step 2: Run route tests to verify RED**

Run: `npm.cmd test -- src/app/api/profile/media/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement `POST` in `src/app/api/profile/media/route.ts`**

Set `runtime = 'nodejs'`. Authenticate first, parse only `kind` and `image` from multipart form data, validate before converting bytes/uploading, then update exactly one safe field for the session user's ID. Map caught upload/provider failures to `502` and persistence failures to `500` without logging or serializing provider/database details.

- [ ] **Step 4: Run route tests and profile API regression tests**

Run: `npm.cmd test -- src/app/api/profile/media/route.test.ts src/app/api/profile/route.test.ts`

Expected: PASS.

## Task 3: Add reusable upload controls to profile UI

**Files:**
- Create: `src/components/profile/profile-media-uploader.tsx`
- Create: `src/components/profile/profile-media-uploader.test.ts`
- Modify: `src/app/(main)/profile/page.tsx`
- Modify: `src/app/(main)/profile/edit/profile-form.tsx`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- `ProfileMediaUploader` accepts `{ kind: 'profile' | 'cover'; onUploaded?: (profile: Profile) => void; compact?: boolean }`.
- It sends `FormData` to `/api/profile/media`, never sets multipart `Content-Type` manually, and refreshes the router after a success when no callback is supplied.

- [ ] **Step 1: Write failing UI contract tests**

Add source-level tests confirming an accessible file input accepts the four image MIME types, both kinds are sent through `FormData`, controls communicate pending/error state, profile page includes profile and cover upload actions, edit form retains its HTTPS URL inputs, and styles stay scoped to profile-media classes.

- [ ] **Step 2: Run UI tests to verify RED**

Run: `npm.cmd test -- src/components/profile/profile-media-uploader.test.ts src/app/(main)/profile/page.test.ts`

Expected: FAIL because no reusable uploader exists.

- [ ] **Step 3: Implement `ProfileMediaUploader`**

Use a labelled hidden file input, local MIME/size feedback for responsiveness, a disabled pending control, `aria-live` error/status feedback, and `FormData` fields named `kind` and `image`. Server errors remain authoritative. On success refresh the profile page or call the edit form callback with the returned safe profile.

- [ ] **Step 4: Integrate controls into profile and edit forms**

Replace only the camera and cover edit interactions on the authenticated own-profile page. Add upload actions above the existing profile/cover HTTPS URL fields in the edit form, updating the matching field from the safe result. Do not alter public `/<username>` profile behavior.

- [ ] **Step 5: Add scoped styles and run focused checks**

Add responsive dashboard CSS for compact buttons, upload feedback, and pending state that works in current light/dark tokens.

Run: `npm.cmd test -- src/components/profile/profile-media-uploader.test.ts src/app/(main)/profile/page.test.ts; npm.cmd run lint`

Expected: PASS with zero ESLint warnings.

## Task 4: Full verification and local smoke test

**Files:**
- Modify only if verification finds a scoped implementation defect.

- [ ] **Step 1: Run complete automated checks**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`. Do not run `prisma migrate dev`; no schema migration is part of this feature.

- [ ] **Step 2: Perform local authenticated smoke checks**

Using an existing authenticated local session and non-sensitive images smaller than 5 MiB, upload an avatar and cover. Refresh `/profile` and confirm each renders. Try an unsupported file and confirm a safe error; request the upload endpoint without a session and confirm `401`. Do not print cookies, credentials, Cloudinary configuration, or provider responses.

- [ ] **Step 3: Record actual results**

Report all test/build commands actually run, current migration status, live checks completed, and any checks that could not be run.

## Plan Self-Review

- **Spec coverage:** Task 1 supplies validation and deterministic provider upload; Task 2 provides secure routing and update boundaries; Task 3 delivers profile/edit UI; Task 4 verifies the entire feature. No schema change is planned because current URL fields suffice.
- **Type consistency:** `ProfileMediaKindSchema` constrains the route and `ProfileMediaUploader.kind`; adapter input uses the same `'profile' | 'cover'` union; API returns the existing `Profile` safe projection.
- **Review Focus coverage:** Each listed upload/security failure class has an explicit test in Task 1, 2, or 3.
- **Scope:** The plan adds neither media models nor albums, cropping, video, client-direct uploads, or unrelated profile/dashboard changes.
- **Repository note:** This workspace has no `.git` directory, so no commit steps are included; all existing user files remain preserved.
