# Persistent Post Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-only dashboard comments with validated, persistent comments tied to authenticated users and posts.

**Architecture:** Prisma owns `Comment` persistence and cascade relations. A dedicated nested post-comments route validates requests, gets the author from the current session, and returns explicit safe projections. Feed cards load comments only after their section opens, then append a server-confirmed comment without fabricating client state.

**Tech Stack:** Next.js route handlers and React, TypeScript, Prisma/PostgreSQL, Zod, Vitest, existing dashboard CSS.

**Spec:** `docs/superpowers/specs/2026-10-14-persistent-post-comments-design.md`

## Global Constraints

- Comment content is trimmed and must be 1–500 characters.
- Server-side `getCurrentUser()` exclusively determines comment ownership.
- Explicit Prisma `select`/`data` blocks must omit passwords, contact details, sessions, tokens, and client-controlled author/post identifiers.
- GET comments is public; POST comments requires authentication.
- Do not add replies, reactions, editing/deletion, uploads, notifications, or realtime behavior.
- The existing `prisma migrate dev` history drift must not cause a destructive reset; apply the reviewed migration with `prisma migrate deploy`.

## Review Focus

- A whitespace-only comment must return `400` and must not create a database record (Task 1 and Task 3).
- A client-supplied `authorId`, `postId`, or timestamp must not influence persisted data (Task 3).
- A missing post must return `404` for comment GET/POST without exposing internal details (Task 3).
- Public comments and post counts must exclude password/session/contact/internal fields (Tasks 2 and 3).
- Opening a feed card must not create comments or double-submit while a request is pending (Task 4).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Declare `Comment` model and User/Post relations. |
| `prisma/migrations/<timestamp>_add_comments/migration.sql` | Create the comments table and indexes only. |
| `src/lib/validations.ts` | Export `CreateCommentSchema` and its inferred input type. |
| `src/lib/validations.test.ts` | Exercise comment normalization and bounds. |
| `src/lib/comment.ts` | Define safe comment projection and pagination helpers. |
| `src/lib/comment.test.ts` | Test comment limits and safe projection contract. |
| `src/lib/post.ts` | Add a safe server-backed comment count to `SafePost`. |
| `src/lib/post.test.ts` | Preserve safe post projection behavior. |
| `src/app/api/posts/[id]/comments/route.ts` | Implement public listing and authenticated creation. |
| `src/app/api/posts/[id]/comments/route.test.ts` | Test route status, validation, authorization, pagination, and safety. |
| `src/components/posts/post-card.tsx` | Fetch, display, and submit persisted comments. |
| `src/components/dashboard/dashboard-ui.test.ts` | Assert source-level comment UI/API contract. |
| `src/app/dashboard.css` | Style comment list/loading/error states with existing tokens. |

## Task 1: Model and validation contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_comments/migration.sql`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`

**Interfaces:**
- Produces `CreateCommentSchema` accepting `{ content: string }` and returning normalized content.
- Produces Prisma `Comment` with `postId`, `authorId`, timestamps, and cascade relations.

- [ ] **Step 1: Write failing comment validation tests**

Add `CreateCommentSchema` tests for trimming valid text, rejecting whitespace-only input, and rejecting 501 characters.

- [ ] **Step 2: Run validation tests to verify RED**

Run: `npm.cmd test -- src/lib/validations.test.ts`

Expected: FAIL because `CreateCommentSchema` does not exist.

- [ ] **Step 3: Implement the minimal Zod schema**

Export `CreateCommentSchema = z.object({ content: z.string().trim().min(1).max(500) })` with the project’s safe validation messages, plus `CreateCommentInput`.

- [ ] **Step 4: Add the schema and reviewed migration**

Add `comments Comment[]` to `User` and `Post`; create `Comment` with cascade relations and exact `[postId, createdAt]` and `[authorId]` indexes. Generate a migration SQL file that creates only this table, foreign keys, and indexes.

- [ ] **Step 5: Apply and verify the schema safely**

Run: `npx.cmd prisma validate; npx.cmd prisma migrate deploy; npx.cmd prisma generate; npm.cmd test -- src/lib/validations.test.ts`

Expected: all pass, with no reset command.

## Task 2: Safe server projections and post counts

**Files:**
- Create: `src/lib/comment.ts`
- Create: `src/lib/comment.test.ts`
- Modify: `src/lib/post.ts`
- Modify: `src/lib/post.test.ts`

**Interfaces:**
- Produces `safeCommentSelect`, `SafeComment`, `parseCommentLimit`, and comment-page defaults (20, max 50).
- Extends `SafePost` with `_count.comments` only.

- [ ] **Step 1: Write failing projection and limit tests**

Assert the comment projection contains author `id`, `name`, `username`, and `profileImage`, but not private fields. Assert invalid limits default to 20 and oversized limits cap at 50. Assert safe posts include `_count.comments` without any sensitive relation selection.

- [ ] **Step 2: Run projection tests to verify RED**

Run: `npm.cmd test -- src/lib/comment.test.ts src/lib/post.test.ts`

Expected: FAIL because comment helpers/count selection are absent.

- [ ] **Step 3: Implement safe helper modules**

Create `safeCommentSelect` with an explicit nested author selection and cursor limit helper. Add `_count: { select: { comments: true } }` to `safePostSelect`; do not add entire comment records to feed queries.

- [ ] **Step 4: Run projection tests to verify GREEN**

Run: `npm.cmd test -- src/lib/comment.test.ts src/lib/post.test.ts`

Expected: PASS.

## Task 3: Nested comments API

**Files:**
- Create: `src/app/api/posts/[id]/comments/route.ts`
- Create: `src/app/api/posts/[id]/comments/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser`, `CreateCommentSchema`, `safeCommentSelect`, and comment pagination helpers.
- Produces `GET /api/posts/[id]/comments` `{ comments: SafeComment[], nextCursor: string | null }` and authenticated `POST` `{ comment: SafeComment }`.

- [ ] **Step 1: Write failing route tests**

Mock Prisma/auth to cover public ordered pagination, missing-post `404`, anonymous create `401`, valid create `201`, validation `400`, ignored mass-assigned author/post fields, and absence of password/session/contact data in serialized output.

- [ ] **Step 2: Run the route test to verify RED**

Run: `npm.cmd test -- src/app/api/posts/[id]/comments/route.test.ts`

Expected: FAIL because the nested route does not exist.

- [ ] **Step 3: Implement `GET` and `POST` with explicit Prisma data**

`GET` first confirms the post then fetches comments oldest first using `take: limit + 1`, cursor/skip pagination, and `safeCommentSelect`. `POST` authenticates before parsing, confirms the post, validates JSON, and calls `prisma.comment.create({ data: { content, postId: id, authorId: user.id }, select: safeCommentSelect })`.

- [ ] **Step 4: Run the route tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/posts/[id]/comments/route.test.ts`

Expected: PASS.

## Task 4: Persisted comment card UI

**Files:**
- Modify: `src/components/posts/post-card.tsx`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes `SafePost._count.comments` and the nested comments API from Task 3.
- Produces a lazy-loaded comment list, pending-safe form submission, and server-confirmed comment count.

- [ ] **Step 1: Write failing UI contract tests**

Assert card source loads `/api/posts/${post.id}/comments` only after the section opens, posts JSON `{ content }`, disables send while pending, uses server result to append comments, renders `_count.comments`, and contains loading/error/list CSS hooks.

- [ ] **Step 2: Run UI contract test to verify RED**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the card currently changes only local count state.

- [ ] **Step 3: Replace local-only comment behavior**

Load comments on first open. Maintain local `SafeComment[]`, an initialized server count, loading/error/pending state, and a successful result append. Do not optimistically increment before `201`; preserve the existing Like/Share placeholder behavior.

- [ ] **Step 4: Add scoped dashboard styles**

Add responsive comment list, comment author, timestamp, error, and loading styles using the current light/dark CSS tokens without altering the surrounding dashboard grid.

- [ ] **Step 5: Run UI contract and lint checks**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts; npm.cmd run lint`

Expected: PASS with zero ESLint warnings.

## Task 5: Full verification and local smoke test

**Files:**
- Modify only if a verification failure requires a focused correction from Tasks 1–4.

- [ ] **Step 1: Run all automated verification**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits 0.

- [ ] **Step 2: Perform safe browser/API smoke verification**

Sign in through the normal UI, open a post’s comment area, submit a non-sensitive test comment, refresh to confirm persistence, and verify the count/list update. In a logged-out session, confirm comment POST returns `401`. Do not print cookies, tokens, credentials, or private response data.

- [ ] **Step 3: Record actual outcomes**

Report each command/test result and any blocked live check honestly.

## Plan Self-Review

- **Spec coverage:** Tasks 1–4 cover persistence, validation, safe projections, GET/POST behavior, UI, and security; Task 5 covers verification.
- **Type consistency:** `SafeComment` is introduced before the API and UI depend on it; `_count.comments` is added through `SafePost` before the card consumes it.
- **Review focus:** Each listed failure class is assigned to Task 1, 2, 3, or 4 tests.
- **Scope:** The plan excludes replies, reactions, deletion/editing, uploads, and realtime work.
- **Repository note:** There is no Git repository, so no commit steps are included and existing user files remain untouched.
