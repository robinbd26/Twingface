# Cloudinary Post Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable authenticated users to create, view, and delete single-image posts through a secure server-side Cloudinary integration.

**Architecture:** The existing post collection endpoint will accept `multipart/form-data` for the browser composer while retaining JSON text-post compatibility for existing callers. A server-only Cloudinary adapter owns provider configuration, upload, and best-effort deletion; the route owns authentication, validation, persistence, and compensation cleanup. Prisma stores only the delivery URL and provider public ID, while public projections expose only the delivery URL.

**Tech Stack:** Next.js 15 route handlers and React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, Cloudinary Node SDK, existing CSS dashboard system.

**Spec:** `docs/superpowers/specs/2026-10-12-cloudinary-post-images-design.md`

## Global Constraints

- Support exactly one optional image per post: JPEG, PNG, WebP, or GIF, at most 5 MiB.
- A post must contain trimmed text (maximum 500 characters), one valid image, or both.
- Derive the author only from `getCurrentUser()`; never trust client `authorId`, `imageUrl`, or `imagePublicId`.
- Keep `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` server-only; do not use `NEXT_PUBLIC_` variables, unsigned upload presets, or client-side signatures.
- Continue to use explicit Prisma `select` blocks that omit sensitive User, Session, and internal Cloudinary fields.
- Preserve the existing text post, dashboard, pagination, auth, and author-ownership flows.
- Do not add video, multiple images, image editing, or a new media model.

## Review Focus

- A `multipart/form-data` request with neither meaningful text nor an image must return `400`, not create an empty post (Task 3).
- A file labelled `image/jpeg` but larger than 5 MiB must be rejected before the Cloudinary adapter runs (Task 1 and Task 3).
- Cloudinary success followed by Prisma failure must invoke provider cleanup exactly once and return no provider error detail (Task 3).
- Public GET responses must expose `imageUrl` but never `imagePublicId`, password hashes, email, phone, tokens, or provider credentials (Task 2 and Task 3).
- A non-author or unauthenticated requester must not delete a post image or database record (Task 4).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json` | Add the server-side `cloudinary` dependency. |
| `.env.example` | Document placeholder-only Cloudinary runtime variables. |
| `src/lib/post-media.ts` | Define image MIME/size policy and parse a safe post-create payload. |
| `src/lib/post-media.test.ts` | Unit-test server-independent image and text validation. |
| `src/lib/cloudinary.ts` | Server-only SDK adapter with upload and destroy operations. |
| `src/lib/cloudinary.test.ts` | Mock provider behavior and verify adapter response mapping. |
| `prisma/schema.prisma` | Add nullable post image fields. |
| `prisma/migrations/<timestamp>_add_post_image/migration.sql` | Add nullable Post image columns only. |
| `src/lib/post.ts` | Add only `imageUrl` to the safe public post projection. |
| `src/app/api/posts/route.ts` | Parse JSON/form data, authenticate, validate, upload, create, and compensate on failure. |
| `src/app/api/posts/route.test.ts` | Route tests for upload creation, validation, auth, cleanup, and response safety. |
| `src/app/api/posts/[id]/route.ts` | Retrieve `imagePublicId` only for authorized deletion and make a best-effort provider cleanup. |
| `src/app/api/posts/[id]/route.test.ts` | Verify delete authorization and provider cleanup behavior. |
| `src/components/posts/create-post-form.tsx` | File picker, preview/remove UI, `FormData` submit, and accessible pending/errors. |
| `src/components/posts/post-card.tsx` | Render public Cloudinary image delivery URL in post media. |
| `src/components/dashboard/dashboard-ui.test.ts` | Source-level visual-contract checks for composer preview and post media hooks under the current Node-only Vitest setup. |
| `src/app/dashboard.css` | Scoped composer preview and responsive post-media styles in the existing design system. |

## Task 1: Server-side media validation and Cloudinary adapter

**Files:**
- Create: `src/lib/post-media.ts`
- Create: `src/lib/post-media.test.ts`
- Create: `src/lib/cloudinary.ts`
- Create: `src/lib/cloudinary.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`

**Interfaces:**
- Produces `MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024`, `isValidPostImage(file: File): boolean`, and `parseCreatePostInput(content: FormDataEntryValue | null, image: FormDataEntryValue | null): SafeParseReturnType` from `src/lib/post-media.ts`.
- Produces `uploadPostImage(input: { bytes: Buffer; mimeType: string; userId: string }): Promise<{ imageUrl: string; imagePublicId: string }>` and `destroyPostImage(imagePublicId: string): Promise<void>` from `src/lib/cloudinary.ts`.
- Updates `CreatePostSchema` to normalize an optional content string up to 500 characters without allowing the route to create an empty text-only post. `UpdatePostSchema` remains non-empty text-only.

- [ ] **Step 1: Add failing validation tests**

Add `src/lib/post-media.test.ts` cases for JPEG/PNG/WebP/GIF files at or below 5 MiB, invalid MIME types, a file above 5 MiB, image-only input, text-only input, text-and-image input, and no-content/no-image input. Update `src/lib/validations.test.ts` so `CreatePostSchema` trims valid optional content but rejects >500 characters.

- [ ] **Step 2: Run the validation tests to confirm the new module is missing**

Run: `npm.cmd test -- src/lib/post-media.test.ts src/lib/validations.test.ts`

Expected: FAIL because `post-media` and the revised create schema contract do not yet exist.

- [ ] **Step 3: Implement the media validation contract**

Create `post-media.ts` with the four exact MIME types and the 5 MiB byte ceiling. Use `CreatePostSchema` to normalize text and a Zod refinement in `parseCreatePostInput` to require at least one normalized content or valid image; return field errors keyed as `content` and/or `image` without reading an image's bytes.

- [ ] **Step 4: Run validation tests to confirm they pass**

Run: `npm.cmd test -- src/lib/post-media.test.ts src/lib/validations.test.ts`

Expected: PASS.

- [ ] **Step 5: Add failing Cloudinary-adapter tests**

Mock the Cloudinary SDK in `src/lib/cloudinary.test.ts`. Assert upload config is sourced from the three server environment variables, `uploadPostImage` sends a server-generated public ID in `posts/<userId>`, restricts `allowed_formats` to `jpg`, `jpeg`, `png`, `webp`, `gif`, and returns only `secure_url` and `public_id`. Assert `destroyPostImage` requests image destruction by public ID.

- [ ] **Step 6: Install and configure the adapter dependency**

Run: `npm.cmd install cloudinary`

Document placeholder-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` entries in `.env.example`. Implement `src/lib/cloudinary.ts` as a server-only Node SDK adapter that validates its three required runtime variables before making a provider call. Use `upload_stream` with a random UUID public ID, folder `twingface/posts/<userId>`, `resource_type: 'image'`, the allowed formats, and an upload transformation that limits delivered images to width 1600 with automatic quality/format. Reject an SDK response missing a HTTPS `secure_url` or public ID. Do not log configuration or provider errors.

- [ ] **Step 7: Run adapter and validation tests**

Run: `npm.cmd test -- src/lib/cloudinary.test.ts src/lib/post-media.test.ts src/lib/validations.test.ts`

Expected: PASS.

## Task 2: Persist image metadata without changing public safety boundaries

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_post_image/migration.sql`
- Modify: `src/lib/post.ts`
- Modify: `src/lib/dashboard.test.ts`

**Interfaces:**
- Consumes `imageUrl` and `imagePublicId` returned by Task 1.
- Produces a regenerated `Prisma.Post` containing nullable `imageUrl` and `imagePublicId`, and a `SafePost` containing `imageUrl` but not `imagePublicId`.

- [ ] **Step 1: Add failing safe-projection tests**

Extend `src/lib/dashboard.test.ts` or add `src/lib/post.test.ts` with a post that contains `imageUrl` and `imagePublicId`; assert downstream safe data includes the URL while serialized safe data excludes the internal public ID and existing sensitive author fields.

- [ ] **Step 2: Update the Prisma schema and create migration**

Add `imageUrl String? @db.VarChar(500)` and `imagePublicId String? @db.VarChar(255)` to `Post`; add no index or model. Run `npx.cmd prisma migrate dev --name add_post_image` and inspect the generated SQL to ensure it only adds nullable columns to `posts`.

- [ ] **Step 3: Regenerate Prisma client and extend safe selection**

Run: `npx.cmd prisma generate`

Add only `imageUrl: true` to `safePostSelect`; retain all prior safe fields and intentionally omit `imagePublicId`.

- [ ] **Step 4: Run schema and projection checks**

Run: `npx.cmd prisma validate; npm.cmd test -- src/lib/dashboard.test.ts`

Expected: Prisma validation succeeds and projection tests pass.

## Task 3: Create image posts through the authenticated collection API

**Files:**
- Modify: `src/app/api/posts/route.ts`
- Modify: `src/app/api/posts/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser(): Promise<AuthUser | null>`, `parseCreatePostInput`, `uploadPostImage`, `destroyPostImage`, `safePostSelect`, and the Task 2 Prisma fields.
- Produces `POST /api/posts` response `{ post: SafePost }` with public `imageUrl` only.

- [ ] **Step 1: Write failing route tests**

Replace/add request builders in `route.test.ts` for `FormData` and JSON. Cover: unauthenticated form-data request returns `401` before parsing/upload; image-only upload creates a post with session `authorId`; text-plus-image upload trims text; text-only JSON and form-data requests keep working; no text/no image, bad MIME, and >5 MiB return `400` before upload; user-supplied author/image identifiers cannot alter Prisma data; provider failure returns generic `502`; Prisma create failure destroys the uploaded public ID then returns generic `500`; and serialized responses never contain internal public ID, credentials, or private user fields.

- [ ] **Step 2: Run the collection API test to prove the tests fail**

Run: `npm.cmd test -- src/app/api/posts/route.test.ts`

Expected: FAIL because the route still reads JSON only and has no image flow.

- [ ] **Step 3: Implement form and JSON parsing with server-only upload**

Mark the route `runtime = 'nodejs'`. Implement a small request parser: for `multipart/form-data`, call `request.formData()` and read only `content` and `image`; for `application/json`, read only `content` and use no file; reject every other media type as invalid input. Authenticate first, validate using Task 1, convert a valid `File` to a buffer, upload only after validation, and call `prisma.post.create` with exactly `{ content, authorId: user.id, imageUrl, imagePublicId }` where null values are explicit for text-only posts. On a database exception after upload, await `destroyPostImage` in a nested `try/catch`, suppress cleanup errors, and return a generic persistence error. Map Cloudinary failure to generic `502`; never relay caught error messages.

- [ ] **Step 4: Run collection API tests**

Run: `npm.cmd test -- src/app/api/posts/route.test.ts`

Expected: PASS.

## Task 4: Preserve ownership during delete and clean up provider assets

**Files:**
- Modify: `src/app/api/posts/[id]/route.ts`
- Modify: `src/app/api/posts/[id]/route.test.ts`

**Interfaces:**
- Consumes `destroyPostImage(imagePublicId: string): Promise<void>` from Task 1.
- Produces an unchanged `204` delete response only after successful authorized database deletion; provider cleanup is best-effort and never exposes an error.

- [ ] **Step 1: Add failing image-delete tests**

Extend the single-post route mock with `destroyPostImage`. Assert unauthenticated and non-owner deletion never calls Prisma delete or Cloudinary cleanup; an authorized post with no image deletes without cleanup; an authorized image post selects `imagePublicId`, deletes the record, then requests provider destruction; and a provider cleanup rejection still returns `204` without provider details.

- [ ] **Step 2: Run the single-post route tests to confirm failure**

Run: `npm.cmd test -- src/app/api/posts/[id]/route.test.ts`

Expected: FAIL because the ownership query currently selects only `authorId` and deletion has no provider cleanup.

- [ ] **Step 3: Implement authorized best-effort cleanup**

Extend the internal owned-post selection to retrieve `authorId` and `imagePublicId`, retaining author comparison before any write. Delete the Prisma row first; if its internal image ID is non-null, invoke `destroyPostImage` in a suppressed `try/catch`. Keep GET and PATCH public response behavior unchanged.

- [ ] **Step 4: Run single-post API tests**

Run: `npm.cmd test -- src/app/api/posts/[id]/route.test.ts`

Expected: PASS.

## Task 5: Add accessible composer upload UI and feed media rendering

**Files:**
- Modify: `src/components/posts/create-post-form.tsx`
- Modify: `src/components/posts/post-card.tsx`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes the multipart API contract from Task 3 and `SafePost.imageUrl` from Task 2.
- Produces a composer that submits `FormData` and a post card that renders only the safe public delivery URL.

- [ ] **Step 1: Add failing source-level UI contract tests**

Extend `dashboard-ui.test.ts` to assert the composer contains a labelled `accept='image/jpeg,image/png,image/webp,image/gif'` file input, photo action wired to that input, preview/remove test hooks, and `FormData` submission. Assert `post-card.tsx` conditionally renders `post.imageUrl` through Next `Image` with meaningful alt text; assert the dashboard CSS contains scoped preview and post-media selectors.

- [ ] **Step 2: Run the UI contract test to confirm failure**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the composer has no file state/preview and the card has no media section.

- [ ] **Step 3: Implement picker, preview, and `FormData` publishing**

In `CreatePostForm`, add `selectedImage: File | null`, a hidden input ref, and a local object URL preview that is revoked on replacement, removal, modal close, unmount, and successful post. The Photo/video buttons trigger the input. Validate selected type/size client-side only for immediate feedback, let image-only submit be enabled, and submit `FormData` without manually setting `Content-Type`. Preserve keyboard close and current text-post behavior. Use `aria-live`/role alert feedback and prevent duplicate submissions while pending.

- [ ] **Step 4: Implement responsive safe media rendering**

Use `next/image` in `PostCard` only when `post.imageUrl` is present, inside a CSS aspect-ratio media wrapper. Configure `next.config.js` with an image remote pattern limited to `https://res.cloudinary.com/**`; use the card's author name for a concise image alt. Add dashboard CSS under explicit composer preview and post media selectors; it must preserve current light/dark design tokens, card dimensions, and mobile overflow behavior.

- [ ] **Step 5: Run the UI test and lint**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts; npm.cmd run lint`

Expected: PASS with zero ESLint warnings.

## Task 6: Full verification and local authenticated smoke test

**Files:**
- Modify only if a verification failure requires a scoped implementation correction from Tasks 1-5.

**Interfaces:**
- Verifies the complete storage, API, database, and rendered feed contract.

- [ ] **Step 1: Run all automated checks**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`. Re-run only the affected test suite immediately after every scoped fix, then repeat this complete set.

- [ ] **Step 2: Perform live authenticated smoke test without logging secrets**

With credentials set only in local `.env.local`, run the development server, sign in through the normal UI, select a small non-sensitive JPEG/PNG below 5 MiB, create a text-plus-image post, and confirm it appears after refresh. Repeat with image-only content; attempt a disallowed file and a >5 MiB file; verify safe visible errors. In a logged-out browser session, request `POST /api/posts` and verify `401`. Do not print environment values, Cloudinary responses, cookies, or tokens.

- [ ] **Step 3: Record actual results**

Report each command and smoke-test result exactly as executed. If credentials or an external Cloudinary account limitation prevent the live test, state that limitation explicitly while reporting all completed automated checks.

## Plan Self-Review

- **Spec coverage:** Tasks 1-5 cover credentials, server upload, validation, one-image persistence, public projection, cleanup, composer/card UI, and preserved ownership; Task 6 covers all specified verification.
- **Type consistency:** `imageUrl` is public across `SafePost` and UI; `imagePublicId` remains internal to Prisma route cleanup and Cloudinary adapter.
- **Review focus coverage:** Missing payload/type-size behavior is tested in Tasks 1/3; compensation cleanup in Task 3; response safety in Tasks 2/3; delete authorization in Task 4.
- **Scope:** No video, multi-image, external storage provider, or unrelated dashboard/auth change is included.
- **Repository note:** The workspace has no `.git` directory, so no commit steps are included and existing user files remain untouched.
