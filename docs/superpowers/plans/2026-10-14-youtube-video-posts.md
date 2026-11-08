# YouTube Video Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users create posts with one validated YouTube link and play the video safely within the Twingface feed.

**Architecture:** A shared server/client-safe helper normalizes supported YouTube URLs to a canonical watch URL and extracts a strict video ID. Prisma persists that public canonical URL. The post API consumes the helper for JSON and multipart requests, while the card consumes it to construct a fixed privacy-enhanced embed URL rather than trusting a stored string as an iframe source.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, existing post composer and dashboard CSS.

**Spec:** `docs/superpowers/specs/2026-10-14-youtube-video-posts-design.md`

## Global Constraints

- Add only nullable `Post.youtubeUrl String? @db.VarChar(255)` and its migration.
- Support HTTPS `youtube.com` watch/embed and `youtu.be` URLs with exactly one 11-character video ID.
- Store only the canonical `https://www.youtube.com/watch?v=<id>` URL.
- Do not accept iframe HTML, client-provided author IDs, video IDs, or arbitrary provider URLs.
- Keep text, image, feeling/activity, JSON creation, multipart creation, pagination, authorization, and safe responses working.
- Construct embeds with `youtube-nocookie.com`; never assign the stored URL directly to iframe `src`.
- Exclude `imagePublicId`, passwords, sessions, tokens, emails, phone values, credentials, and provider internals from public responses.
- Do not add autoplay, playlists, uploads, new providers, or post-edit video changes.

## Review Focus

- An `http:` YouTube URL, unsupported hostname, playlist-only URL, or URL with an invalid ID must return `400`; Task 1 and Task 3 test them.
- An authenticated user must not attach another user ID or protected fields through JSON or form-data; Task 3 retains explicit-data tests.
- A video-only post must work, but feeling-only and no-media/no-text posts must remain rejected; Task 3 tests both boundaries.
- A malformed legacy database URL must render no iframe rather than becoming an arbitrary iframe source; Task 4 tests helper-gated rendering.
- Image and video combinations must not affect existing Cloudinary cleanup/safe selections; Task 2 and Task 3 regression tests cover the public projection and post creation path.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/youtube.ts` | Shared URL parsing, canonicalization, and safe embed source construction. |
| `src/lib/youtube.test.ts` | Unit tests supported URL shapes and rejection boundaries. |
| `prisma/schema.prisma` | Adds nullable `Post.youtubeUrl`. |
| `prisma/migrations/<timestamp>_add_youtube_url_to_post/migration.sql` | Adds only the nullable posts column. |
| `src/lib/post.ts` | Adds public `youtubeUrl` to `safePostSelect`. |
| `src/lib/post.test.ts` | Ensures the public projection includes URL but not internal image identifiers. |
| `src/lib/post-media.ts` | Extends create-payload parsing with `youtubeUrl` and its at-least-one-content rule. |
| `src/lib/post-media.test.ts` | Tests media parsing with video-only and combined post payloads. |
| `src/app/api/posts/route.ts` | Parses/persists canonical video URL for JSON and multipart creation. |
| `src/app/api/posts/route.test.ts` | Exercises validation, authorization, persistence, and response safety. |
| `src/components/posts/create-post-form.tsx` | Adds labelled YouTube URL input and sends it through current FormData. |
| `src/components/posts/post-card.tsx` | Renders validated privacy-enhanced YouTube iframe. |
| `src/components/dashboard/dashboard-ui.test.ts` | Source-level composer/player rendering contract checks. |
| `src/app/dashboard.css` | Responsive 16:9 player and composer-input styling. |

## Task 1: Create the shared YouTube URL boundary

**Files:**
- Create: `src/lib/youtube.ts`
- Create: `src/lib/youtube.test.ts`

**Interfaces:**
- Produces `parseYouTubeUrl(value: unknown): { videoId: string; canonicalUrl: string } | null`.
- Produces `getYouTubeEmbedUrl(value: string | null | undefined): string | null`.

- [ ] **Step 1: Write failing URL helper tests**

Add unit cases that normalize a `www.youtube.com/watch?v=dQw4w9WgXcQ` URL, a `youtu.be/dQw4w9WgXcQ` URL, and a `/embed/dQw4w9WgXcQ` URL to the same canonical URL. Assert malformed values, HTTP URLs, non-YouTube domains, playlist-only URLs, extra path segments, and IDs not matching `[A-Za-z0-9_-]{11}` return `null`. Assert `getYouTubeEmbedUrl` returns only the expected `youtube-nocookie.com/embed/<id>` URL.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/lib/youtube.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement `src/lib/youtube.ts`**

Use `new URL()` after trimming; require HTTPS and exact allowed hostnames. Extract a single ID only from the three documented paths and require the strict ID regex. Return canonical data and construct the privacy-enhanced embed URL only from a successfully parsed ID.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test -- src/lib/youtube.test.ts`

Expected: PASS.

## Task 2: Persist and publicly select the canonical URL

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_youtube_url_to_post/migration.sql`
- Modify: `src/lib/post.ts`
- Modify: `src/lib/post.test.ts`

**Interfaces:**
- Consumes canonical URLs from Task 1.
- Produces `SafePost.youtubeUrl: string | null` while preserving omission of `imagePublicId`.

- [ ] **Step 1: Add a failing safe-selection test**

Extend `src/lib/post.test.ts` to require `safePostSelect.youtubeUrl === true`, `imagePublicId` absent, and serialization free of internal image fields.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/lib/post.test.ts`

Expected: FAIL because the new public projection field is absent.

- [ ] **Step 3: Update schema and create migration**

Add `youtubeUrl String? @db.VarChar(255)` to `Post`. Run `npx.cmd prisma migrate dev --name add_youtube_url_to_post`, inspect generated SQL, and confirm it adds only the nullable `youtubeUrl` column to `posts`.

- [ ] **Step 4: Regenerate Prisma and extend safe selection**

Run `npx.cmd prisma generate`, then add only `youtubeUrl: true` to `safePostSelect`.

- [ ] **Step 5: Verify schema and public projection**

Run: `npx.cmd prisma validate; npm.cmd test -- src/lib/post.test.ts`

Expected: both pass.

## Task 3: Extend post creation without weakening current media rules

**Files:**
- Modify: `src/lib/post-media.ts`
- Modify: `src/lib/post-media.test.ts`
- Modify: `src/app/api/posts/route.ts`
- Modify: `src/app/api/posts/route.test.ts`

**Interfaces:**
- Consumes `parseYouTubeUrl` from Task 1 and `SafePost` fields from Task 2.
- `parseCreatePostInput(content, image, feelingActivity, youtubeUrl)` returns canonical `youtubeUrl: string | null` with content/image/URL required.

- [ ] **Step 1: Write failing parser and route tests**

Add parser tests for video-only input, text-plus-video, image-plus-video, and no content/image/video rejection. Add API tests that JSON and multipart accepted YouTube URLs persist the canonical URL; invalid URL forms return a safe `400` before upload/create; extra `authorId`, `youtubeUrl` mutations, or protected fields cannot alter the author; responses expose `youtubeUrl` but not private/internal fields.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/lib/post-media.test.ts src/app/api/posts/route.test.ts`

Expected: FAIL because parsing and route persistence do not yet include the video URL.

- [ ] **Step 3: Extend post-media parsing**

Accept only a string/null YouTube input, normalize it using Task 1, produce a `youtubeUrl` field error for invalid non-empty input, and alter the final refinement so only content/image/video satisfy post creation. Keep feeling/activity unable to create a post alone.

- [ ] **Step 4: Extend JSON and multipart route parsing**

Read only `youtubeUrl` with existing allowed fields, pass it to `parseCreatePostInput`, and explicitly write `youtubeUrl: input.data.youtubeUrl` in `prisma.post.create`. Keep author identity, Cloudinary validation/cleanup, status mappings, and safe `select` unchanged.

- [ ] **Step 5: Verify creation and regressions**

Run: `npm.cmd test -- src/lib/post-media.test.ts src/app/api/posts/route.test.ts src/app/api/posts/[id]/route.test.ts`

Expected: PASS.

## Task 4: Add composer input and safe inline playback

**Files:**
- Modify: `src/components/posts/create-post-form.tsx`
- Modify: `src/components/posts/post-card.tsx`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Composer sends the optional `youtubeUrl` field in its existing `FormData` request.
- Card consumes `SafePost.youtubeUrl` and `getYouTubeEmbedUrl`.

- [ ] **Step 1: Write failing UI contract tests**

Extend dashboard UI tests to require a labelled YouTube URL input, `FormData.set('youtubeUrl', ...)`, a post-video wrapper, helper-gated player source, 16:9 styling, `title`, `allowFullScreen`, strict referrer policy, and no direct stored URL iframe assignment.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the composer/player hooks and styles do not exist.

- [ ] **Step 3: Implement composer interaction**

Add controlled `youtubeUrl` state, a labelled input in the modal add-to-post area, and a local parse check for immediate feedback. Preserve server authority. Send only a non-empty URL in FormData; allow submit with text, image, or a non-empty URL and preserve current image/feeling interaction.

- [ ] **Step 4: Implement safe responsive embed**

Use `getYouTubeEmbedUrl(post.youtubeUrl)`. When it returns a source, render an iframe in a `.post-youtube-media` 16:9 wrapper with title, `allowFullScreen`, strict referrer policy, and minimal media permissions. Add responsive scoped CSS without changing post-image behavior.

- [ ] **Step 5: Verify UI and lint**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts; npm.cmd run lint`

Expected: PASS with zero lint warnings.

## Task 5: Full verification and authenticated smoke test

**Files:**
- Modify only if a scoped verification defect requires correction.

- [ ] **Step 1: Run complete checks**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all exit 0.

- [ ] **Step 2: Perform local smoke checks**

With an authenticated local session, create a text-plus-YouTube post using a non-sensitive public YouTube URL and confirm inline playback after refresh. Repeat with a short URL. Confirm an invalid/non-HTTPS URL gives a safe validation error and logged-out creation returns `401`. Do not print cookies, session tokens, database credentials, or Cloudinary credentials.

- [ ] **Step 3: Record actual outcomes**

Report migration SQL scope, commands actually executed and their results, live checks completed, and any environment-blocked checks.

## Plan Self-Review

- **Spec coverage:** Task 1 owns URL trust boundaries; Task 2 owns persistence/public types; Task 3 owns API validation and authorization; Task 4 owns UI/rendering; Task 5 owns full verification.
- **Type consistency:** Task 1 produces `parseYouTubeUrl` consumed by Task 3 and `getYouTubeEmbedUrl` consumed by Task 4. Task 2 adds `SafePost.youtubeUrl`, which reaches the card through current server queries.
- **Review focus:** Each listed input/error class maps to explicit tests in Tasks 1, 3, or 4.
- **Scope:** No player provider, upload workflow, public endpoint, or post edit behavior beyond the requested YouTube post creation feature is added.
- **Repository note:** The workspace has no `.git` directory; existing user changes must be preserved and no commit steps can be performed.
