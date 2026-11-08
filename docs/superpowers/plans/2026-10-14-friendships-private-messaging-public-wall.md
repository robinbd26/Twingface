# Friendships, Private Messaging, and Public Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver safe friend requests, accepted-friends-only direct messaging, and a Facebook-style public profile wall.

**Architecture:** Prisma stores canonical relationship and conversation pairs using server-generated pair keys. Route handlers authenticate with `getCurrentUser()`, validate input with Zod, and return explicit safe Prisma projections. Server-rendered profile/message pages load safe data while small client components perform state-changing actions and refresh the route.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, current dashboard CSS design system.

**Spec:** `docs/superpowers/specs/2026-10-14-friendships-private-messaging-public-wall-design.md`

## Global Constraints

- Private messages are available only while the participant pair has an accepted friendship.
- Derive every acting user from `getCurrentUser()`; never accept requester, recipient, sender, participant, friendship status, or pair key from the browser.
- Canonical pair keys are generated on the server by sorting two user IDs and joining them with a private delimiter.
- Retain explicit safe Prisma selects; do not serialize email, phone, password hashes, sessions, image public IDs, or Cloudinary credentials.
- Do not add group chats, attachments, read receipts, notifications, real-time delivery, blocking, or suggestions.
- The public profile must never render owner-only edit/upload/composer controls.
- The workspace has no `.git` directory; do not include commit steps.

## Review Focus

- Cross-direction duplicate requests must return a safe conflict and create no second relationship row (Task 2).
- A requester must not accept/reject their own request; unrelated users must not cancel/remove it (Task 2).
- After unfriend, prior conversation IDs must not reveal or accept messages (Task 3).
- A public profile must not leak private user/contact/session fields or render owner controls (Task 4).
- Cursor values and oversized page limits must remain bounded for friend/inbox/message lists (Tasks 2 and 3).

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Friendship/conversation/message models, enum, User relations and indexes. |
| `prisma/migrations/<timestamp>_add_friendships_and_messages/migration.sql` | Creates only the new enum/tables/indexes/foreign keys. |
| `src/lib/relationship.ts` | Canonical pair key, relationship state types, and safe relationship/user projections. |
| `src/lib/friendship.ts` | Request validation, cursor parsing, and safe friend-list query helpers. |
| `src/lib/message.ts` | Message validation, cursor parsing, and safe conversation/message projections. |
| `src/app/api/friends/requests/route.ts` | Create/list pending friend requests. |
| `src/app/api/friends/requests/[id]/route.ts` | Accept/reject/cancel/remove authorized relationship rows. |
| `src/app/api/users/[username]/friends/route.ts` | Public cursor-paginated safe friends endpoint. |
| `src/app/api/conversations/route.ts` | Authenticated safe inbox listing. |
| `src/app/api/conversations/[username]/route.ts` | Find/create direct conversation for accepted friends. |
| `src/app/api/conversations/[id]/messages/route.ts` | Participant/accepted-friend-only message listing and posting. |
| `src/app/(main)/[username]/page.tsx` | Protected public wall and safe relationship-aware server query. |
| `src/components/profile/public-profile-actions.tsx` | Client relationship action buttons and message launch. |
| `src/components/profile/public-profile-content.tsx` | Read-only public intro, photos, friends and post sections. |
| `src/app/(main)/messages/page.tsx` | Protected inbox page. |
| `src/app/(main)/messages/[conversationId]/page.tsx` | Protected direct-message thread page. |
| `src/components/messages/inbox-list.tsx` | Safe inbox UI and empty state. |
| `src/components/messages/message-thread.tsx` | Message history/load-more/send form client UI. |
| `src/components/dashboard/dashboard-navbar.tsx` | Messages icon links to `/messages`. |
| `src/app/dashboard.css` | Scoped public-wall, relationship-action and messaging styles. |

## Task 1: Data model and safe relationship primitives

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_friendships_and_messages/migration.sql`
- Create: `src/lib/relationship.ts`
- Create: `src/lib/friendship.ts`
- Create: `src/lib/message.ts`
- Create: `src/lib/relationship.test.ts`
- Create: `src/lib/friendship.test.ts`
- Create: `src/lib/message.test.ts`

**Interfaces:**
- Produces `makePairKey(firstUserId: string, secondUserId: string): string` and `getRelationshipState(...)` helpers that never expose internal identifiers beyond a route's needs.
- Produces `safeFriendUserSelect`, `safeConversationSelect`, `safeDirectMessageSelect`, `parseFriendLimit`, `parseConversationLimit`, and `parseMessageLimit`.
- Adds `FriendshipStatus`, `Friendship`, `DirectConversation`, and `DirectMessage` models with canonical pair keys and required indexes.

- [ ] **Step 1: Write failing pure-helper and safe-projection tests**

Test pair keys are order independent, self pairs are rejected, limits default/cap safely, and serialised safe projections omit password, contact, sessions, and provider internals.

- [ ] **Step 2: Run helper tests to verify RED**

Run: `npm.cmd test -- src/lib/relationship.test.ts src/lib/friendship.test.ts src/lib/message.test.ts`

Expected: FAIL because the modules and models do not exist.

- [ ] **Step 3: Implement schema and server-only helpers**

Add named User relations for each new foreign key. Use `@unique` pair keys, indexes for relationship state and message/inbox ordering, then create a migration named `add_friendships_and_messages`. Implement only the types/selects/query parsing required by the tests.

- [ ] **Step 4: Regenerate Prisma and verify GREEN**

Run: `npx.cmd prisma validate; npx.cmd prisma generate; npx.cmd prisma migrate dev --name add_friendships_and_messages; npm.cmd test -- src/lib/relationship.test.ts src/lib/friendship.test.ts src/lib/message.test.ts`

Expected: schema/migration/client generation succeed and helper tests pass.

## Task 2: Secure friend-request and friend-list APIs

**Files:**
- Create: `src/app/api/friends/requests/route.ts`
- Create: `src/app/api/friends/requests/[id]/route.ts`
- Create: `src/app/api/users/[username]/friends/route.ts`
- Create: `src/app/api/friends/requests/route.test.ts`
- Create: `src/app/api/friends/requests/[id]/route.test.ts`
- Create: `src/app/api/users/[username]/friends/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser`, `makePairKey`, safe friendship projections, and bounded pagination helpers from Task 1.
- Produces safe relationship status for Task 4 and public safe friend pages.

- [ ] **Step 1: Write failing collection-route tests**

Cover unauthenticated requests, missing target, self-request, outgoing request success, duplicate/cross-direction request conflict, and incoming/outgoing pending list safety. Assert the create data uses only session identity and server-derived pair key.

- [ ] **Step 2: Run collection tests to verify RED**

Run: `npm.cmd test -- src/app/api/friends/requests/route.test.ts`

Expected: FAIL because no friend-request collection route exists.

- [ ] **Step 3: Implement collection route**

Use strict Zod `{ username }`, lookup target by normalized username, prohibit self, query by pair key before create, and return a safe relationship projection. `GET` returns only the current user's pending incoming/outgoing rows.

- [ ] **Step 4: Write failing item-route and public friend-list tests**

Cover recipient-only accept/reject, requester-only cancel, accepted-pair remove by either member, unrelated-user denial, and bounded public cursor pagination with no private fields.

- [ ] **Step 5: Implement item and public-list routes**

Authorize against the stored row before any update/delete. Use explicit status transitions and public user selection. Return safe generic messages; do not disclose relationship state to unauthenticated callers.

- [ ] **Step 6: Run Task 2 tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/friends/requests/route.test.ts src/app/api/friends/requests/[id]/route.test.ts src/app/api/users/[username]/friends/route.test.ts`

Expected: PASS.

## Task 3: Direct conversation and message APIs

**Files:**
- Create: `src/app/api/conversations/route.ts`
- Create: `src/app/api/conversations/[username]/route.ts`
- Create: `src/app/api/conversations/[id]/messages/route.ts`
- Create: corresponding `route.test.ts` files

**Interfaces:**
- Consumes Task 1 pair key/select/cursor helpers and Task 2 accepted friendship rows.
- Produces `{ conversation }`, cursor-paginated `{ conversations, nextCursor }`, and cursor-paginated `{ messages, nextCursor }` response contracts.

- [ ] **Step 1: Write failing conversation-access tests**

Assert unauthenticated access is `401`; a non-friend cannot create/open a thread; accepted friends get one canonical conversation across both call directions; safe conversation responses omit private participant fields.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- src/app/api/conversations/route.test.ts src/app/api/conversations/[username]/route.test.ts`

Expected: FAIL because conversation routes do not exist.

- [ ] **Step 3: Implement inbox and conversation creation**

Require an accepted friendship before finding/creating a pair-key conversation. Scope inbox queries to either participant and use safe other-participant projection with bounded cursors.

- [ ] **Step 4: Write failing message-route tests**

Cover participant-only reads, trimmed non-empty maximum-1000 content, nonparticipant denial, non-friend denial after unfriend, cursor bounds, and server-derived sender identity.

- [ ] **Step 5: Implement message route**

Authenticate, verify membership and current accepted friendship before `findMany` or `create`; update `lastMessageAt` only after successful message creation in a transaction.

- [ ] **Step 6: Run Task 3 tests to verify GREEN**

Run: `npm.cmd test -- src/app/api/conversations/route.test.ts src/app/api/conversations/[username]/route.test.ts src/app/api/conversations/[id]/messages/route.test.ts`

Expected: PASS.

## Task 4: Public wall and relationship actions

**Files:**
- Modify: `src/app/(main)/[username]/page.tsx`
- Create: `src/components/profile/public-profile-actions.tsx`
- Create: `src/components/profile/public-profile-content.tsx`
- Create: `src/app/(main)/[username]/page.test.tsx`
- Create: `src/components/profile/public-profile-actions.test.tsx`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes safe profile/post/photo/friend data and viewer relationship state from Tasks 1–2.
- Uses `POST/PATCH/DELETE /api/friends/requests` and `POST /api/conversations/[username]` only from the client action component.
- Produces a read-only, responsive owner-excluding public profile page.

- [ ] **Step 1: Write failing public-wall tests**

Cover missing profile `notFound`, own username redirect to `/profile`, safe user/post/photo selection, no owner media/composer controls, and each relationship action state. Add source or interaction contracts for accessible pending/error states.

- [ ] **Step 2: Run public-wall tests to verify RED**

Run: `npm.cmd test -- "src/app/(main)/[username]/page.test.tsx" "src/components/profile/public-profile-actions.test.tsx"`

Expected: FAIL because the current route is a minimal unauthenticated card.

- [ ] **Step 3: Implement server wall and client actions**

Make the server route obtain the viewer session, redirect owner traffic, load only public profile/post/photo/friend data, and pass a narrow relationship view model to the client actions. The client refreshes after relationship mutations and opens the returned conversation route only after server authorization.

- [ ] **Step 4: Add scoped visual styles and verify GREEN**

Use the existing `.fb-*` dark-theme profile system; add responsive public action, disabled-message, and status styles without changing owner profile behavior.

Run: `npm.cmd test -- "src/app/(main)/[username]/page.test.tsx" "src/components/profile/public-profile-actions.test.tsx"; npm.cmd run lint`

Expected: PASS with zero lint warnings.

## Task 5: Inbox and direct-message UI

**Files:**
- Create: `src/app/(main)/messages/page.tsx`
- Create: `src/app/(main)/messages/[conversationId]/page.tsx`
- Create: `src/components/messages/inbox-list.tsx`
- Create: `src/components/messages/message-thread.tsx`
- Create: `src/app/(main)/messages/page.test.tsx`
- Create: `src/components/messages/message-thread.test.tsx`
- Modify: `src/components/dashboard/dashboard-navbar.tsx`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes the safe API contracts from Task 3.
- Produces protected inbox/thread pages and a navbar link to `/messages`.

- [ ] **Step 1: Write failing UI/page tests**

Cover authentication redirect, safe inbox empty state, thread participant data only, an accessible message input/send button, pending/error behavior, and navbar Messages navigation.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- "src/app/(main)/messages/page.test.tsx" "src/components/messages/message-thread.test.tsx"`

Expected: FAIL because protected message pages/components do not exist.

- [ ] **Step 3: Implement inbox and thread components/pages**

Use server page guards and client fetch forms. Render text only (never HTML injection), disable send while pending, support a bounded “load older messages” cursor, and show generic safe errors.

- [ ] **Step 4: Update navbar and styles, then verify GREEN**

Route the existing Messages icon to `/messages` and add responsive scoped styles for inbox/thread panels.

Run: `npm.cmd test -- "src/app/(main)/messages/page.test.tsx" "src/components/messages/message-thread.test.tsx"; npm.cmd run lint`

Expected: PASS.

## Task 6: End-to-end regression verification

**Files:**
- Modify only if a scoped verification failure from Tasks 1–5 requires correction.

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

Expected: all commands exit 0.

- [ ] **Step 2: Run local authenticated smoke tests without exposing secrets**

Use two registered local test accounts: send a request, verify outgoing/incoming states, accept it, open/send a direct message in both directions, remove friendship, and verify the prior conversation no longer exposes/sends messages. Visit each public wall and confirm only relationship controls appear. Do not print cookies, credentials, or environment values.

- [ ] **Step 3: Record actual results**

Report each command's actual result, migration status, smoke-test coverage, and any externally blocked check.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 implement data/security/API requirements; Task 4 implements public-wall behavior; Task 5 implements inbox/thread UI; Task 6 verifies all requirements.
- **Type consistency:** Task 1 owns pair keys, safe projections, limits and types; Tasks 2–5 consume those contracts without client-provided identity.
- **Review focus coverage:** duplicate requests and transition ownership are in Task 2; revoked friendship message access and cursors are in Task 3; public data/owner-control boundaries are in Task 4.
- **Scope:** No group chat, attachment, real-time delivery, notification, block/report, or suggestion subsystem is introduced.
- **Repository note:** no Git worktree/commit steps are included because the workspace has no `.git` directory.
