# Facebook-Style Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure Facebook-style public and private groups with creator-selected posting permissions, member approval, group feeds, and responsive group pages.

**Architecture:** Prisma models will separate groups, memberships, and group posts from ordinary profile posts. Server routes own authentication, role checks, privacy gates, and explicit safe projections; client pages consume only those safe APIs. Existing Cloudinary/media, YouTube, feeling/activity, post-card, and dashboard design primitives are reused where their contracts fit.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6/PostgreSQL, Zod, Vitest, existing Cloudinary media adapter and dashboard CSS.

**Spec:** `docs/superpowers/specs/2026-10-15-facebook-style-groups-design.md`

## Global Constraints

- A group creator selects `PUBLIC` or `PRIVATE` visibility and `MEMBERS` or `ADMINS_ONLY` posting policy.
- Creation atomically creates the group and the creator's approved `ADMIN` membership.
- Public join is immediately approved; private join is pending admin approval.
- Group feed and member directory access for a private group require approved membership.
- All authorization derives from `getCurrentUser()` and fresh database membership state.
- Browser-controlled creator IDs, roles, membership statuses, and post author IDs are ignored/rejected.
- Public responses use explicit safe selects and never expose private account/session data or private group content.
- Group post media retains existing one-image/YouTube/feeling rules and server-side media validation.
- Existing standard posts, pages, profiles, friendships, messaging, and auth behavior must remain unchanged.

## Review Focus

- A removed or rejected private member must immediately lose read and post access, even with a previously known group handle (Task 4).
- A user requesting membership twice must not create duplicate memberships or alter an approved/admin role (Task 3).
- A public-group nonmember may read public posts but must never post until membership exists (Task 5).
- A member must not bypass `ADMINS_ONLY` by directly calling the group post endpoint (Task 5).
- An outsider must not infer private posts or member identities from discovery, group detail, member, or cursor responses (Tasks 2–5).

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Add group enums/models and User relations. |
| `prisma/migrations/<timestamp>_add_groups/migration.sql` | Add only group tables/enums/indexes. |
| `src/lib/group.ts` | Safe Prisma selections, visibility/role helpers, group pagination parsing. |
| `src/lib/group.test.ts` | Unit-test group helper and safe projection contracts. |
| `src/lib/validations.ts` | Add create/update group, membership action, and group post validation schemas. |
| `src/lib/validations.test.ts` | Validate names, handles, privacy/policy, URLs, and action payloads. |
| `src/app/api/groups/route.ts` | Public discovery and authenticated atomic creation. |
| `src/app/api/groups/[handle]/route.ts` | Safe group detail and admin settings update. |
| `src/app/api/groups/[handle]/membership/route.ts` | Join/request flow. |
| `src/app/api/groups/[handle]/members/route.ts` | Approved-member directory. |
| `src/app/api/groups/[handle]/members/[userId]/route.ts` | Admin member approval/rejection/removal. |
| `src/app/api/groups/[handle]/posts/route.ts` | Visibility-gated feed and authorized group post creation. |
| `src/app/api/groups/**/*.test.ts` | API security, role, privacy, media, and cursor tests. |
| `src/components/groups/group-form.tsx` | Accessible create/edit form. |
| `src/components/groups/group-actions.tsx` | Join/request/admin action UI. |
| `src/components/groups/group-post-form.tsx` | Group-scoped post composer using existing media controls. |
| `src/components/groups/group-post-card.tsx` | Safe group-feed media renderer without ordinary post actions/comments. |
| `src/components/groups/group-card.tsx` | Safe discovery group preview. |
| `src/app/(main)/groups/page.tsx` | Group landing/discovery page. |
| `src/app/(main)/groups/create/page.tsx` | Protected create-group page. |
| `src/app/(main)/groups/[handle]/page.tsx` | Protected/safe public group wall. |
| `src/app/dashboard.css` | Scoped Facebook-style groups responsive styles. |
| `src/components/dashboard/dashboard-sidebar.tsx` | Route Groups navigation to `/groups`. |
| `src/components/dashboard/dashboard-navbar.tsx` | Route Groups tab to `/groups`. |

---

### Task 1: Persist group, membership, and group-post foundations

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_groups/migration.sql`
- Create: `src/lib/group.ts`
- Create: `src/lib/group.test.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`

**Interfaces:**
- Produces Prisma enums `GroupPrivacy`, `GroupPostingPolicy`, `GroupRole`, `GroupMembershipStatus`.
- Produces `safeGroupSelect`, `safeGroupMemberSelect`, `safeGroupPostSelect`, `parseGroupLimit(value)`, `canViewGroup(group, membership)`, and `canPostInGroup(group, membership)` from `src/lib/group.ts`.
- Produces `CreateGroupSchema`, `UpdateGroupSchema`, and `GroupMemberActionSchema` from `src/lib/validations.ts`.

- [x] **Step 1: Add failing validation/helper tests**

Create `src/lib/group.test.ts` for public/private visibility, approved vs pending membership, role-based posting policy, safe selections excluding private user fields, and cursor limits. Add `validations.test.ts` cases for normalized group handles, 3–80-character names, optional HTTPS cover URL, both enum fields, and only `approve`/`reject`/`remove` member actions.

- [x] **Step 2: Run focused tests to verify RED**

Run: `npm.cmd test -- src/lib/group.test.ts src/lib/validations.test.ts`

Expected: FAIL because group helpers and schemas do not exist.

- [x] **Step 3: Implement models, schemas, and helpers**

Add the models and relations below, then write an additive reviewed migration rather than editing old migrations:

```text
Group(id, name, handle, description?, privacy, postingPolicy, coverImage?, creatorId, timestamps)
GroupMembership(groupId, userId, role, status, timestamps; unique groupId+userId)
GroupPost(groupId, authorId, content, image fields, feelingActivity?, youtubeUrl?, timestamps)
```

Use safe selects that expose only safe group metadata, approved-member identity fields, group post delivery URL, and safe author fields. Implement deterministic, bounded pagination constants matching existing app patterns.

- [x] **Step 4: Create and inspect migration, then regenerate Prisma**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma migrate dev --name add_groups
npx.cmd prisma generate
```

Expected: schema validation and generation succeed; inspect SQL to confirm it only adds group enums/tables/relations/indexes.

If the repository's pre-existing migration history makes `prisma migrate dev` request a reset, do not reset or delete user data. Instead, create and inspect an equivalent additive migration that is compatible with the current deployment history, apply it with `npx.cmd prisma migrate deploy`, then regenerate the client.

- [x] **Step 5: Run focused tests to verify GREEN**

Run: `npm.cmd test -- src/lib/group.test.ts src/lib/validations.test.ts`

Expected: PASS.

### Task 2: Create and discover safe groups

**Files:**
- Create: `src/app/api/groups/route.ts`
- Create: `src/app/api/groups/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser`, `CreateGroupSchema`, `safeGroupSelect`, `safeGroupMemberSelect`, `parseGroupLimit`.
- Produces `GET /api/groups?scope=discover|mine` cursor-paginated discovery/membership lists and `POST /api/groups` with `{ group }`.

- [x] **Step 1: Add failing collection route tests**

Test anonymous discovery returns public groups only; `scope=mine` requires authentication and returns only the viewer's approved memberships; cursor/limit are bounded and deterministic; unauthenticated creation returns 401; valid creation normalizes handle and creates creator membership `{ role: 'ADMIN', status: 'APPROVED' }` in the same transaction; duplicate handle returns safe 409; invalid payload returns field-level 400; serialized results omit emails, hashes, and session fields.

- [x] **Step 2: Run the collection tests to verify RED**

Run: `npm.cmd test -- src/app/api/groups/route.test.ts`

Expected: FAIL because no group collection route exists.

- [x] **Step 3: Implement group collection route**

Authenticate before `POST` parsing. Use `prisma.$transaction` to create Group and the creator's membership. `scope=discover` must filter to `privacy: 'PUBLIC'`; `scope=mine` must filter only the authenticated viewer's approved memberships. Both use `createdAt/id` deterministic ordering, `take: limit + 1`, and a safe `nextCursor`.

- [x] **Step 4: Run the collection tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/groups/route.test.ts`

Expected: PASS.

### Task 3: Implement membership requests and administrator actions

**Files:**
- Create: `src/app/api/groups/[handle]/membership/route.ts`
- Create: `src/app/api/groups/[handle]/members/route.ts`
- Create: `src/app/api/groups/[handle]/members/[userId]/route.ts`
- Create: `src/app/api/groups/[handle]/membership/route.test.ts`
- Create: `src/app/api/groups/[handle]/members/route.test.ts`
- Create: `src/app/api/groups/[handle]/members/[userId]/route.test.ts`

**Interfaces:**
- Consumes Task 1 `canViewGroup`, safe member select, actions schema, and current-user authentication.
- Produces idempotent membership state transitions and approved-member pagination.

- [x] **Step 1: Add failing membership tests**

Cover public join immediately becoming approved member; private join becoming pending; repeated join not duplicating/overwriting role; unauthenticated join rejection; private member listing denied to outsider/pending requester; admin-only approval/rejection/removal; non-admin denial; self-target admin guard; and removed/rejected users disappearing from approved lists.

- [x] **Step 2: Run membership tests to verify RED**

Run: `npm.cmd test -- src/app/api/groups/[handle]/membership/route.test.ts src/app/api/groups/[handle]/members/route.test.ts src/app/api/groups/[handle]/members/[userId]/route.test.ts`

Expected: FAIL because group membership routes do not exist.

- [x] **Step 3: Implement membership routes**

Look up the group by normalized handle; obtain actor membership immediately before a transition. Use `upsert` only for a new/requested membership without replacing an approved admin/moderator role. Limit directory output to approved memberships, and require approved membership for private groups. Member actions re-read approved admin authority and target state in a transaction.

- [x] **Step 4: Run membership tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/groups/[handle]/membership/route.test.ts src/app/api/groups/[handle]/members/route.test.ts src/app/api/groups/[handle]/members/[userId]/route.test.ts`

Expected: PASS.

### Task 4: Add group detail privacy and administrator settings

**Files:**
- Create: `src/app/api/groups/[handle]/route.ts`
- Create: `src/app/api/groups/[handle]/route.test.ts`

**Interfaces:**
- Consumes safe group selects, visibility helper, `UpdateGroupSchema`, and approved admin membership from Tasks 1–3.
- Produces `GET /api/groups/:handle` safe profile state and admin-only `PATCH` updates.

- [ ] **Step 1: Add failing detail/settings tests**

Test public metadata is visible without a session but private feed/member data is absent to outsiders; approved private members receive safe detail; pending/removed users are denied private content; only approved admins update name/description/privacy/policy/cover; role values in update payload are ignored/rejected; and safe output never contains private user data.

- [ ] **Step 2: Run detail tests to verify RED**

Run: `npm.cmd test -- src/app/api/groups/[handle]/route.test.ts`

Expected: FAIL because group detail route does not exist.

- [ ] **Step 3: Implement detail/settings route**

The `GET` response returns limited header metadata for private outsiders plus an explicit viewer membership state, but omits private posts and member identities. `PATCH` authenticates and verifies approved `ADMIN` membership before applying the strict update schema.

- [ ] **Step 4: Run detail tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/groups/[handle]/route.test.ts`

Expected: PASS.

### Task 5: Create visibility-gated group feeds and posts

**Files:**
- Create: `src/app/api/groups/[handle]/posts/route.ts`
- Create: `src/app/api/groups/[handle]/posts/route.test.ts`
- Modify: `src/lib/post-media.ts`
- Modify: `src/lib/post-media.test.ts`

**Interfaces:**
- Consumes Task 1 group post schema/selects, Task 3 membership state, existing post-image and YouTube validation, and Cloudinary adapter.
- Produces safe cursor-paginated group posts and secure multipart `POST` group post creation.

- [ ] **Step 1: Add failing group post tests**

Test public-feed reads for anonymous visitors; private feed denial to nonmembers/pending/removed users; approved private read success; public nonmember post denial; approved member post success under `MEMBERS`; member denial and admin/moderator success under `ADMINS_ONLY`; image-only/text/image/YouTube/feeling payloads; invalid media cleanup behavior; cursor safety; and no internal Cloudinary public ID in output.

- [ ] **Step 2: Run group post tests to verify RED**

Run: `npm.cmd test -- src/app/api/groups/[handle]/posts/route.test.ts src/lib/post-media.test.ts`

Expected: FAIL because group posts and payload context support do not exist.

- [ ] **Step 3: Implement group feed and composer API**

Reuse the existing multipart parser and server-side Cloudinary adapter, but persist to `GroupPost` with `authorId` strictly from the session and `groupId` from lookup. Use a shared media payload helper only if it preserves existing `/api/posts` behavior and tests. Check group visibility for GET and fresh approved membership/role for POST before uploads.

- [ ] **Step 4: Run group post tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/groups/[handle]/posts/route.test.ts src/lib/post-media.test.ts`

Expected: PASS.

### Task 6: Build Facebook-style group landing and creation flow

**Files:**
- Create: `src/app/(main)/groups/page.tsx`
- Create: `src/app/(main)/groups/create/page.tsx`
- Create: `src/components/groups/group-card.tsx`
- Create: `src/components/groups/group-form.tsx`
- Create: `src/app/(main)/groups/groups-ui.test.ts`
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `src/components/dashboard/dashboard-navbar.tsx`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes safe `GET /api/groups?scope=discover|mine` and `POST /api/groups` contracts.
- Produces discoverable Groups navigation, responsive `/groups` landing, and protected `/groups/create` form.

- [ ] **Step 1: Add failing UI contract tests**

Assert navbar and sidebar Group links use `/groups`; create form exposes name, handle, privacy, posting policy, description, cover URL, accessible server errors, and submits only safe fields; group cards show privacy/member count safely; CSS contains scoped responsive group selectors.

- [ ] **Step 2: Run UI tests to verify RED**

Run: `npm.cmd test -- src/app/(main)/groups/groups-ui.test.ts src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because group pages/components do not exist.

- [ ] **Step 3: Implement landing/create UI**

Use server page authentication for creation and a client `GroupForm` that calls `POST /api/groups`; on 201 navigate to returned group handle. Render separate safe *Your groups* (`scope=mine`) and public discovery (`scope=discover`) sections, show an empty state when each has no data, and match existing dark/light dashboard tokens without static fake group data.

- [ ] **Step 4: Run UI tests to verify GREEN**

Run: `npm.cmd test -- src/app/(main)/groups/groups-ui.test.ts src/components/dashboard/dashboard-ui.test.ts`

Expected: PASS.

### Task 7: Build group wall, join/request, member admin, and group composer UI

**Files:**
- Create: `src/app/(main)/groups/[handle]/page.tsx`
- Create: `src/components/groups/group-actions.tsx`
- Create: `src/components/groups/group-post-form.tsx`
- Create: `src/components/groups/group-post-card.tsx`
- Create: `src/components/groups/group-member-management.tsx`
- Modify: `src/app/(main)/groups/groups-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes detail/membership/member/group-post APIs from Tasks 3–5.
- Produces privacy-aware group wall interactions and no client-side authorization assumptions.

- [ ] **Step 1: Add failing group-wall UI tests**

Assert the page renders privacy badge and membership state; outsider/pending private views omit feed/member/composer; public group shows join; private group shows request; only permitted members see group composer; admin controls call member actions; group composer posts multipart data to `/api/groups/${handle}/posts`; and `GroupPostCard` renders only safe media data without calling normal-post comment/reaction endpoints.

- [ ] **Step 2: Run group-wall UI tests to verify RED**

Run: `npm.cmd test -- src/app/(main)/groups/groups-ui.test.ts`

Expected: FAIL because group wall and components do not exist.

- [ ] **Step 3: Implement group wall UI**

Load detail server-side using safe data and render only the state allowed by the API contract. `GroupActions` refreshes after request/action success. `GroupPostForm` reuses image/YouTube/feeling validation/picker behavior while sending its `FormData` to the group endpoint. `GroupPostCard` renders safe author/text/image/YouTube/feeling data without exposing normal-post comments or reactions. Keep ordinary profile/dashboard composer routing unchanged.

- [ ] **Step 4: Run group-wall UI tests to verify GREEN**

Run: `npm.cmd test -- src/app/(main)/groups/groups-ui.test.ts`

Expected: PASS.

### Task 8: Full verification and authenticated smoke test

**Files:**
- Modify only when a verification failure requires a scoped correction from Tasks 1–7.

**Interfaces:**
- Verifies schema, privacy, role, media, and responsive UI requirements end-to-end.

- [ ] **Step 1: Run complete automated verification**

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

- [ ] **Step 2: Perform local authenticated smoke tests**

Create a public group and a private group; verify creation makes creator admin, public immediate join, private pending request, admin approval, private-feed gating before/after approval, policy enforcement for an ordinary member, media post display, member removal revoking access, and responsive landing/profile layouts. Do not print cookies, passwords, tokens, or environment secrets.

- [ ] **Step 3: Record actual results**

Report each executed command and the exact smoke-test outcomes. State any unavailable external service limitation rather than claiming the unavailable check passed.

## Plan Self-Review

- **Spec coverage:** Tasks 1–5 cover models, safe data, both discovery and the viewer's approved group list, privacy, joining, admin actions, posting policy, and group media; Tasks 6–7 cover required pages and interactions; Task 8 verifies complete behavior.
- **Type consistency:** Group enums and helper names originate in Task 1 and are consumed by every route/UI task; GroupPost stays separate from Post while reusing only media validation.
- **Review focus coverage:** revoked access is Task 4; duplicate join state is Task 3; public read/nonmember post is Task 5; admin-only bypass is Task 5; private discovery/member leakage is Tasks 2–5.
- **Scope:** invite links, events, polling, chat, notifications, deletion, and ownership transfer remain excluded.
- **Repository note:** no `.git` directory is present, so execution must preserve the shared workspace and omit commit operations.
