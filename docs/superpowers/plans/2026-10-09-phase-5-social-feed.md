# Phase 5 Social Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure, text-only social feed with author-controlled post CRUD, pagination, and responsive TwingFace dark UI.

**Architecture:** Prisma owns post persistence and relations. Route handlers use the existing server-side session utility and explicit safe projections; client components invoke only those routes. The server dashboard and public post page load safe post data directly with the same projection shape.

**Tech Stack:** Next.js App Router, TypeScript, React, Prisma/PostgreSQL, Zod, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-09-phase-5-social-feed-design.md`

## Global Constraints

- Keep existing authentication, dashboard, profile, and API routes functional.
- Accept no client-provided author or other protected post ownership field.
- Store text-only posts; do not add media uploads, likes, comments, sharing behavior, messaging, groups, marketplace, reels, WebRTC, or live streaming.
- Use explicit safe Prisma selections that omit password hashes, sessions, tokens, and email.
- Run `npx.cmd prisma migrate dev --name add_post_model`, Prisma validation/generation, automated tests, `npm.cmd run lint`, and `npm.cmd run build`.

## Review Focus

- Whitespace-only content is rejected after trimming — Task 1 validation tests.
- `authorId` and protected fields in a request cannot change ownership — Task 2 API tests.
- A valid non-owner session receives `403` rather than mutation success — Task 2 API tests.
- Cursor and limit edge values cannot bypass the maximum page size — Task 2 API tests.
- Every post response omits password/session/email data — Task 2 API tests.

---

### Task 1: Post schema and shared validation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_post_model/migration.sql`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`

**Interfaces:**
- Produces `Post`, `User.posts`, `CreatePostSchema`, `UpdatePostSchema`, `CreatePostInput`, and `UpdatePostInput` for routes and UI.

- [ ] **Step 1: Write failing validator tests** for trimmed valid content, blank content rejection, and a 501-character rejection.
- [ ] **Step 2: Run `npm.cmd test -- validations`** and confirm the new assertions fail because post Zod schemas are absent.
- [ ] **Step 3: Add Zod create/update schemas** that expose only trimmed `content` with a 1–500-character post-trim limit.
- [ ] **Step 4: Run `npm.cmd test -- validations`** and confirm the validation suite passes.
- [ ] **Step 5: Add the Prisma `Post` model and `User.posts` relation** with cascade deletion and the three approved indexes.
- [ ] **Step 6: Run `npx.cmd prisma migrate dev --name add_post_model`, `npx.cmd prisma generate`, and `npx.cmd prisma validate`**; record the generated migration and successful validation.

### Task 2: Secure posts API

**Files:**
- Create: `src/lib/post.ts`
- Create: `src/app/api/posts/route.ts`
- Create: `src/app/api/posts/[id]/route.ts`
- Create: `src/app/api/posts/route.test.ts`
- Create: `src/app/api/posts/[id]/route.test.ts`

**Interfaces:**
- Consumes `CreatePostSchema`, `UpdatePostSchema`, `getCurrentUser`, and Prisma `Post`.
- Produces safe post DTOs, `GET/POST /api/posts`, and `GET/PATCH/DELETE /api/posts/[id]`.

- [ ] **Step 1: Write failing mocked route tests** for feed pagination, unauthenticated creation, server-derived author identity, missing post, non-owner patch/delete, safe 404/403 behavior, invalid content, and safe payload omission.
- [ ] **Step 2: Run the post route tests** and confirm they fail because routes are absent.
- [ ] **Step 3: Add `src/lib/post.ts`** with the shared explicit safe author/post Prisma `select` objects, public DTO type, `MAX_POSTS_PER_PAGE`, and a safe page-limit parser.
- [ ] **Step 4: Implement collection handlers**: newest-first cursor page GET and authenticated POST. Return structured `{ posts, nextCursor }` and safe responses only.
- [ ] **Step 5: Implement item handlers**: safe public GET, authenticated PATCH/DELETE, ownership lookup before mutation, and generic failures.
- [ ] **Step 6: Run post route tests and the complete `npm.cmd test` suite**; confirm all pass.

### Task 3: Feed client components

**Files:**
- Create: `src/components/posts/create-post-form.tsx`
- Create: `src/components/posts/post-card.tsx`
- Create: `src/components/posts/post-list.tsx`

**Interfaces:**
- Consumes safe post DTOs from `src/lib/post.ts` and the collection API.
- Produces a typed `CreatePostForm`, `PostCard`, and `PostList` reusable from dashboard and post detail.

- [ ] **Step 1: Write failing component tests or focused render tests** for disabled submit on blank content, successful safe create callback, empty feed state, and loading state.
- [ ] **Step 2: Run those tests** and confirm they fail because components are absent.
- [ ] **Step 3: Implement `CreatePostForm`** with the approved dark composer, client validation feedback, pending state, and POST request without any author field.
- [ ] **Step 4: Implement `PostCard` and `PostList`** with safe author display, relative timestamp, avatar fallback, loading skeletons, empty state, cursor “load more,” and non-functional action placeholders.
- [ ] **Step 5: Run the component tests and full suite** and confirm all pass.

### Task 4: Server pages and dashboard integration

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/app/globals.css`
- Create: `src/app/(main)/post/[id]/page.tsx`
- Create: `src/app/(main)/post/[id]/page.test.ts`

**Interfaces:**
- Consumes safe post selections from `src/lib/post.ts`, existing `getCurrentUser`, and feed components.
- Produces the authenticated dashboard feed and public single-post page.

- [ ] **Step 1: Write failing page tests** for post page not-found behavior and safe author/post rendering.
- [ ] **Step 2: Run page tests** and confirm they fail because the page is absent.
- [ ] **Step 3: Integrate the dashboard**: retain its server-side auth redirect, pass current-user display data to a responsive dark left/center/right feed layout, and preserve profile/logout navigation.
- [ ] **Step 4: Implement the public post detail page** with an explicit safe Prisma selection and `notFound()` for an absent ID.
- [ ] **Step 5: Add scoped responsive dark UI styles** in `globals.css`, then run page/component tests and full suite.

### Task 5: End-to-end verification and regression review

**Files:**
- Modify only if a verification-discovered implementation defect requires a focused fix.

**Interfaces:**
- Consumes all Phase 5 features and existing authentication/profile tests.
- Produces recorded migration, test, lint, build, and local HTTP smoke results.

- [ ] **Step 1: Run `npx.cmd prisma validate` and `npx.cmd prisma generate`** and confirm schema/client generation success.
- [ ] **Step 2: Run `npm.cmd test`** and confirm post plus existing authentication/profile regressions pass.
- [ ] **Step 3: Run `npm.cmd run lint` and `npm.cmd run build`** and fix only implementation-related failures before rerunning affected checks.
- [ ] **Step 4: Execute a local HTTP smoke test** using a non-secret temporary account: register/sign in, create/read/edit/delete a post, check unauthenticated write denial and non-owner denial, verify profile/auth/logout still work, then remove only the temporary test artifacts if created.
