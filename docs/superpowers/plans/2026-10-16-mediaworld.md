# TwingFace Media World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Media World as an authenticated TwingFace module where Bangladesh media professionals can apply, be approved by a Super Admin, discover work and services by location, publish listings, and contact listing owners without a separate login.

**Architecture:** Replace the incomplete Marketplace-backed Media World scaffold with dedicated Prisma models and server-only API routes. Public directory/search endpoints project only approved profiles and public listings; owner, inquiry, and Super Admin actions use `getCurrentUser()` plus explicit ownership or a configured Super Admin ID. Reuse the existing Cloudinary policy and Direct Conversation system for media and inquiries rather than creating a parallel upload or chat service.

**Tech Stack:** Next.js 15 route handlers and React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, Cloudinary Node SDK, existing DirectConversation/DirectMessage APIs, and the dashboard CSS design system.

**Spec:** `docs/superpowers/specs/2026-10-16-mediaworld-design.md`

## Global Constraints

- Media World lives inside the existing authenticated TwingFace session; it must not introduce a second login, account, or session system.
- Authorize every mutation from `getCurrentUser()` only; never trust a browser-supplied owner, approval status, profile ID, conversation ID, or Cloudinary public ID.
- `MEDIAWORLD_SUPER_ADMIN_USER_ID` is a server-only runtime setting. If it is missing or the current user does not match it, privileged Media World endpoints fail closed with `403`.
- Keep Media World persistence separate from `MarketplaceListing`; never repurpose Marketplace rows or APIs.
- Public search responses include only approved profiles and public, available listings. They must omit internal image IDs, emails, phones, session data, credentials, rejection notes, and moderation state.
- Reuse `DIVISIONS`, `ALL_DISTRICTS`, and `DISTRICTS_BY_DIVISION` from `src/lib/constants.ts`; a district must belong to the selected division.
- Professional applications begin `PENDING`; they become publicly searchable only after a Super Admin changes them to `APPROVED`.
- Support casting, hiring, shooting-location, and equipment-rental listings. Only equipment rental and shooting-location listings may attach one to ten JPEG, PNG, WebP, or GIF images of at most 5 MiB each.
- Reuse the existing secure Cloudinary adapter and image policy; do not add unsigned uploads, browser credentials, or `NEXT_PUBLIC_` provider secrets.
- Media World inquiries may create/reuse an existing Direct Conversation even when buyer and seller are not friends, but that non-friend exception is limited to the referenced approved Media World listing.
- Preserve existing marketplace, regular friendship messaging, post media, notification, and dashboard behavior.
- The workspace has no `.git` directory; do not add commit steps or assume worktree isolation.

## Review Focus

- A division/district pair such as `Rajshahi` and `Dhaka` must be rejected with `400`, rather than silently producing a location that cannot be filtered correctly (Task 1).
- A request to any Super Admin approval or moderation route with no configured admin ID, an unauthenticated user, or a non-admin user must return `403` and make no write (Task 5).
- A pending, rejected, withdrawn, unavailable, or rented resource must not leak through public profile/listing search, including by direct ID lookup (Tasks 2 and 3).
- A non-owner must not update, delete, change availability, or delete provider images from another owner's Media World listing (Task 3).
- A buyer who is not friends with the seller may start exactly a scoped inquiry on an approved available listing; self-inquiries and inquiries to unavailable/non-public listings must be rejected without opening a conversation (Task 4).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `.env.example` | Documents the placeholder-only `MEDIAWORLD_SUPER_ADMIN_USER_ID` setting. |
| `prisma/schema.prisma` | Adds Media World enums, profile/listing/image/inquiry models, and the scoped DirectConversation capability. |
| `prisma/migrations/<timestamp>_add_mediaworld/migration.sql` | Adds only the dedicated Media World schema and conversation capability fields. |
| `src/lib/mediaworld.ts` | Owns safe public/internal projections, admin/owner checks, and Media World query helpers. |
| `src/lib/mediaworld-validations.ts` | Owns Zod parsing for application, listing, filter, approval, availability, and inquiry payloads. |
| `src/lib/mediaworld.test.ts` | Unit-tests location, listing, and safe-projection validation contracts. |
| `src/lib/mediaworld-admin.ts` | Resolves the configured Super Admin and fails closed when configuration is absent. |
| `src/lib/mediaworld-admin.test.ts` | Tests Super Admin configuration/authorization behavior. |
| `src/lib/cloudinary.ts` | Adds Media World folder upload mapping while retaining existing post/profile behavior. |
| `src/lib/message.ts` | Extends direct-conversation authorization to the scoped Media World inquiry capability. |
| `src/app/api/mediaworld/profiles/route.ts` | Creates the current user's professional application and lists approved profiles. |
| `src/app/api/mediaworld/listings/route.ts` | Lists public listings and creates owner listings. |
| `src/app/api/mediaworld/listings/[id]/route.ts` | Safely retrieves, updates, deletes, and changes an owner's listing availability. |
| `src/app/api/mediaworld/listings/[id]/inquiries/route.ts` | Starts/reuses an approved-listing inquiry conversation and sends its first message. |
| `src/app/api/mediaworld/mine/route.ts` | Returns the current user's applications and listings, including non-public status. |
| `src/app/api/mediaworld/admin/pending/route.ts` | Returns pending approval queues to the Super Admin only. |
| `src/app/api/mediaworld/admin/profiles/[id]/route.ts` | Approves or rejects a professional application. |
| `src/app/api/mediaworld/admin/listings/[id]/route.ts` | Moderates a Media World listing and its public availability. |
| `src/app/api/mediaworld/**/*.test.ts` | Tests API authentication, validation, ownership, safe responses, approval, images, and inquiries. |
| `src/app/(main)/mediaworld/page.tsx` | Renders the approved Media World directory and listing browser. |
| `src/app/(main)/mediaworld/apply/page.tsx` | Renders the professional application form. |
| `src/app/(main)/mediaworld/create/page.tsx` | Renders the authenticated listing composer. |
| `src/app/(main)/mediaworld/listings/[id]/page.tsx` | Renders a public listing detail and inquiry entry point. |
| `src/app/(main)/mediaworld/mine/page.tsx` | Renders the current user's applications/listings and status controls. |
| `src/app/(main)/mediaworld/admin/page.tsx` | Renders the Super Admin approval queues. |
| `src/components/mediaworld/*.tsx` | Focused profile, listing, filter, form, gallery, inquiry, owner-status, and moderation components. |
| `src/components/messages/*` | Displays the optional Media World listing reference in an existing conversation without exposing internal data. |
| `src/app/dashboard.css` | Adds scoped responsive Media World styles consistent with existing light/dark tokens. |
| `src/components/dashboard/dashboard-ui.test.ts` | Source-level visual contracts for routes, controls, accessible labels, and Media World CSS hooks. |

### Task 1: Replace the scaffold with dedicated Media World persistence and validation

**Files:**
- Create: `src/lib/mediaworld-admin.ts`
- Create: `src/lib/mediaworld-admin.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_mediaworld/migration.sql`
- Modify: `.env.example`
- Modify: `src/lib/mediaworld.ts`
- Modify: `src/lib/mediaworld-validations.ts`
- Modify: `src/lib/mediaworld.test.ts`
- Modify: `src/lib/cloudinary.ts`
- Remove/replace: `src/app/api/mediaworld/route.ts` and its old Marketplace-backed test

**Interfaces:**
- Consumes: `DIVISIONS`, `ALL_DISTRICTS`, and `DISTRICTS_BY_DIVISION` from `src/lib/constants.ts`; existing `isValidPostImage()` and Cloudinary destroy behavior.
- Produces: `parseMediaWorldProfileInput`, `parseMediaWorldListingInput`, `parseMediaWorldListingFilters`, `parseMediaWorldApprovalInput`, `isMediaWorldSuperAdmin(userId: string): boolean`, `safeMediaWorldProfileSelect`, `safeMediaWorldListingSelect`, and `uploadMediaWorldImage(input)` for later routes.

- [ ] **Step 1: Write failing persistence and validation tests**

Add tests proving valid Rajshahi/Bogura profile/listing data parses, a mismatched division/district returns a validation error, equipment rental requires a non-negative daily price and condition, casting/hiring does not accept equipment-only fields, and missing/incorrect Super Admin configuration is denied.

- [ ] **Step 2: Run the foundation tests to verify they fail**

Run: `npm.cmd test -- src/lib/mediaworld.test.ts src/lib/mediaworld-admin.test.ts`

Expected: FAIL because the dedicated enums, parsers, and Super Admin helper do not exist.

- [ ] **Step 3: Define dedicated schema and server contracts**

Add the spec's `MediaWorldProfile`, `MediaWorldListing`, `MediaWorldImage`, and `MediaWorldInquiry` models plus their enums. Add a `mediaWorldMessagingEnabled Boolean @default(false)` capability to `DirectConversation`, create its migration SQL, and replace the scaffold's Marketplace types with safe Media World projections and Zod schemas. Keep Cloudinary public IDs internal and upload Media World images under `twingface/mediaworld/<ownerId>`.

- [ ] **Step 4: Generate Prisma safely and apply the schema without reset**

Run: `npx.cmd prisma validate; npx.cmd prisma generate`

If migration history is clean, run: `npx.cmd prisma migrate dev --name add_mediaworld`.

If existing migration drift prevents it, do not reset the database; record the drift, apply the additive schema with `npx.cmd prisma db push`, then reconcile only the new migration using the repository's established migration procedure.

Expected: Prisma schema validates and the generated client exposes the new models.

- [ ] **Step 5: Run the foundation tests**

Run: `npm.cmd test -- src/lib/mediaworld.test.ts src/lib/mediaworld-admin.test.ts`

Expected: PASS.

### Task 2: Implement professional applications and approved-profile directory APIs

**Files:**
- Create: `src/app/api/mediaworld/profiles/route.ts`
- Create: `src/app/api/mediaworld/profiles/route.test.ts`
- Modify: `src/lib/mediaworld.ts`
- Modify: `src/lib/mediaworld-validations.ts`

**Interfaces:**
- Consumes: Task 1 parsers, `isMediaWorldSuperAdmin`, `safeMediaWorldProfileSelect`, Prisma `MediaWorldProfile`, and `getCurrentUser()`.
- Produces: `GET /api/mediaworld/profiles?query=&role=&division=&district=` and `POST /api/mediaworld/profiles`; the POST returns the caller's safe profile with `PENDING` status while GET exposes approved profiles only.

- [ ] **Step 1: Write failing profile-route tests**

Mock authentication and Prisma to assert that anonymous application creation returns `401`; a valid caller creates/updates only their own pending application; duplicate submissions do not create a second profile; invalid location returns `400`; and a public GET omits all non-approved profiles and private fields.

- [ ] **Step 2: Run the profile-route tests to verify they fail**

Run: `npm.cmd test -- src/app/api/mediaworld/profiles/route.test.ts`

Expected: FAIL because the profile API route does not exist.

- [ ] **Step 3: Implement `GET` and `POST` profile handlers**

Use explicit Prisma `select` blocks. Parse URL filters before querying; apply case-insensitive name/profession matching and location/role constraints. POST must derive the user ID from the session, upsert that user's application only, force `PENDING` after a material resubmission, and return no rejection note to the public directory.

- [ ] **Step 4: Run the profile API tests**

Run: `npm.cmd test -- src/app/api/mediaworld/profiles/route.test.ts`

Expected: PASS.

### Task 3: Implement listing, image, ownership, and availability APIs

**Files:**
- Create: `src/app/api/mediaworld/listings/route.ts`
- Create: `src/app/api/mediaworld/listings/[id]/route.ts`
- Create: `src/app/api/mediaworld/listings/route.test.ts`
- Create: `src/app/api/mediaworld/listings/[id]/route.test.ts`
- Modify: `src/lib/mediaworld.ts`
- Modify: `src/lib/cloudinary.ts`

**Interfaces:**
- Consumes: Task 1 listing parsers, image policy, safe projections, and `uploadMediaWorldImage` / provider destroy operation.
- Produces: public `GET /api/mediaworld/listings`, owner `POST /api/mediaworld/listings`, public safe `GET /api/mediaworld/listings/:id`, and owner-only `PATCH`/`DELETE` at the same ID.

- [ ] **Step 1: Write failing listing-route tests**

Cover authenticated creation for each permitted listing type; 1 and 10 valid image attachments; rejection of an 11th image or a >5 MiB JPEG before Cloudinary is called; public search exclusion of unavailable/rented listings; direct-ID access to non-public listings returning `404`; owner update/delete; non-owner `403`; and provider cleanup after a successful database delete without provider error details.

- [ ] **Step 2: Run the listing API tests to verify they fail**

Run: `npm.cmd test -- src/app/api/mediaworld/listings/route.test.ts src/app/api/mediaworld/listings/[id]/route.test.ts`

Expected: FAIL because dedicated listing routes do not exist.

- [ ] **Step 3: Implement public queries and owner mutations**

Accept JSON for no-image listings and `multipart/form-data` for permitted image listings. Enforce type-specific fields, validate every file before uploading, create images/persistence atomically where possible, and compensate uploads if Prisma creation fails. The owner route must select internal `imagePublicId` only after ownership passes, delete database records first, then make best-effort provider cleanup. Availability changes accept only `AVAILABLE`, `UNAVAILABLE`, or `RENTED` and are owner-only unless Task 5's Super Admin route acts separately.

- [ ] **Step 4: Run the listing API tests**

Run: `npm.cmd test -- src/app/api/mediaworld/listings/route.test.ts src/app/api/mediaworld/listings/[id]/route.test.ts`

Expected: PASS.

### Task 4: Extend Direct Conversations for scoped Media World inquiries

**Files:**
- Create: `src/app/api/mediaworld/listings/[id]/inquiries/route.ts`
- Create: `src/app/api/mediaworld/listings/[id]/inquiries/route.test.ts`
- Modify: `src/lib/message.ts`
- Modify: `src/lib/message.test.ts`
- Modify: `src/app/api/messages/send/route.ts`
- Modify: `src/app/api/messages/[friendId]/route.ts`
- Modify: `src/app/api/conversations/route.ts`
- Modify: their existing route tests

**Interfaces:**
- Consumes: Task 3 approved/public listing lookup and the existing DirectConversation/DirectMessage send/read/list flow.
- Produces: `POST /api/mediaworld/listings/:id/inquiries` with `{ content: string }`, a reused or new Media World-enabled conversation, one initial message, and a safe optional listing reference for the existing inbox.

- [ ] **Step 1: Write failing inquiry and direct-message authorization tests**

Assert that a non-friend buyer can start an inquiry with `Is this available?` on another user's approved available listing; the same buyer/listing reuses the conversation; the seller receives the message in their existing inbox; self-inquiry, invalid content, a non-public/unavailable listing, and arbitrary non-friend direct messaging all fail without creating a conversation or message.

- [ ] **Step 2: Run the inquiry and message tests to verify they fail**

Run: `npm.cmd test -- src/app/api/mediaworld/listings/[id]/inquiries/route.test.ts src/app/api/messages/send/route.test.ts src/app/api/messages/[friendId]/route.test.ts src/app/api/conversations/route.test.ts`

Expected: FAIL because Media World is not an allowed non-friend direct-conversation capability.

- [ ] **Step 3: Implement scoped inquiry authorization**

Create or reuse a direct conversation for the buyer/seller pair with `mediaWorldMessagingEnabled: true`, persist a `MediaWorldInquiry` containing the listing, conversation, sender, owner, and first message, then send through the existing message helper/realtime path. Extend every conversation access check to allow either friendship, Marketplace capability, or Media World capability; do not relax ordinary non-friend chat. Include only safe listing title/image/status context in conversation projections.

- [ ] **Step 4: Run the inquiry and message tests**

Run: `npm.cmd test -- src/app/api/mediaworld/listings/[id]/inquiries/route.test.ts src/app/api/messages/send/route.test.ts src/app/api/messages/[friendId]/route.test.ts src/app/api/conversations/route.test.ts`

Expected: PASS.

### Task 5: Implement Super Admin queues and approval moderation APIs

**Files:**
- Create: `src/app/api/mediaworld/mine/route.ts`
- Create: `src/app/api/mediaworld/admin/pending/route.ts`
- Create: `src/app/api/mediaworld/admin/profiles/[id]/route.ts`
- Create: `src/app/api/mediaworld/admin/listings/[id]/route.ts`
- Create: matching `route.test.ts` files
- Modify: `src/lib/mediaworld.ts`
- Modify: `src/lib/mediaworld-validations.ts`

**Interfaces:**
- Consumes: Task 1 fail-closed Super Admin helper; Tasks 2 and 3 model projections and approval/availability parsers.
- Produces: a current-user `GET /api/mediaworld/mine`, Super Admin pending queue, and profile/listing approval or moderation `PATCH` endpoints.

- [ ] **Step 1: Write failing owner/admin route tests**

Test that `/mine` returns only the caller's records and their private status; all admin endpoints return `403` if the environment value is missing, the caller is anonymous, or the caller ID differs; an admin can approve/reject profiles; an approved profile appears in Task 2's public query; and an admin can mark a listing unavailable/rented without revealing private values.

- [ ] **Step 2: Run the owner/admin tests to verify they fail**

Run: `npm.cmd test -- src/app/api/mediaworld/mine/route.test.ts src/app/api/mediaworld/admin/pending/route.test.ts src/app/api/mediaworld/admin/profiles/[id]/route.test.ts src/app/api/mediaworld/admin/listings/[id]/route.test.ts`

Expected: FAIL because the owner/admin endpoints do not exist.

- [ ] **Step 3: Implement explicit fail-closed owner and admin routes**

Use the helper at the beginning of every admin handler before a Prisma call. Accept only the validation schema's status transitions; record optional rejection text internally, return it only to the applicant through `/mine`, and use public safe selects for all other responses.

- [ ] **Step 4: Run the owner/admin tests**

Run: `npm.cmd test -- src/app/api/mediaworld/mine/route.test.ts src/app/api/mediaworld/admin/pending/route.test.ts src/app/api/mediaworld/admin/profiles/[id]/route.test.ts src/app/api/mediaworld/admin/listings/[id]/route.test.ts`

Expected: PASS.

### Task 6: Build user-facing Media World pages, forms, search, and inquiry UI

**Files:**
- Modify: `src/app/(main)/mediaworld/page.tsx`
- Create: `src/app/(main)/mediaworld/apply/page.tsx`
- Create: `src/app/(main)/mediaworld/create/page.tsx`
- Create: `src/app/(main)/mediaworld/listings/[id]/page.tsx`
- Create: `src/app/(main)/mediaworld/mine/page.tsx`
- Create: `src/components/mediaworld/mediaworld-profile-form.tsx`
- Create: `src/components/mediaworld/mediaworld-listing-form.tsx`
- Create: `src/components/mediaworld/mediaworld-profile-card.tsx`
- Modify/replace: `src/components/mediaworld/mediaworld-browser.tsx`
- Modify/replace: `src/components/mediaworld/mediaworld-filters.tsx`
- Modify/replace: `src/components/mediaworld/mediaworld-listing-card.tsx`
- Create: `src/components/mediaworld/mediaworld-inquiry.tsx`
- Create: `src/components/mediaworld/mediaworld-owner-controls.tsx`
- Modify: `src/app/dashboard.css`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5 API payloads and `SafeMediaWorldProfile` / `SafeMediaWorldListing` projections.
- Produces: accessible authenticated Media World pages with working application, listing creation/editing, Bangladesh filters, image preview/removal, availability controls, and listing inquiry actions.

- [ ] **Step 1: Write failing source-level UI contract tests**

Extend dashboard UI tests to assert the existing sidebar Media World link targets `/mediaworld`; the directory has labelled search, division/district and type filters; professional form labels role/profession/bio/experience/location; listings accept title/description/location and conditional rental fields; image input permits the four policy MIME types and ten previews; owner controls name Available/Unavailable/Rented; and the detail card has a `Message seller` action with the editable `Is this available?` draft.

- [ ] **Step 2: Run the UI contract test to verify it fails**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the current partial scaffold lacks the required routes and forms.

- [ ] **Step 3: Implement directory, composer, ownership, and inquiry components**

Use responsive cards with profile image, name, profession, bio, experience, division/district, listing type, price/condition/availability, and safe image delivery URLs. Fetch data through the new APIs, preserve URL filter state, enforce client-side image selection feedback only, and leave server validation authoritative. The inquiry modal initializes the draft to `Is this available?`, lets the buyer edit it, posts to Task 4's endpoint, then opens the existing conversation route. Do not route profile-wall composition to dashboard or duplicate the app header/sidebar.

- [ ] **Step 4: Run the UI contract test and lint**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts; npm.cmd run lint`

Expected: PASS with zero ESLint warnings.

### Task 7: Build the Super Admin approval screen and verify the full module

**Files:**
- Create: `src/app/(main)/mediaworld/admin/page.tsx`
- Create: `src/components/mediaworld/mediaworld-admin-queue.tsx`
- Modify: `src/app/dashboard.css`
- Modify only as required by verification failures from Tasks 1–6

**Interfaces:**
- Consumes: Task 5 approval queue and patch endpoints plus Task 6 CSS/layout conventions.
- Produces: an admin-only approval interface and verified end-to-end Media World behavior.

- [ ] **Step 1: Add failing admin-screen UI assertions**

Assert that the admin page renders separate pending professional/listing queues, explicit Approve and Reject controls, a rejection-reason field, and a server-side authorization redirect/forbidden state rather than displaying queue data to ordinary users.

- [ ] **Step 2: Run the admin UI test to verify it fails**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because the Super Admin page and queue controls do not exist.

- [ ] **Step 3: Implement the server-gated admin page and queue client**

Check the configured Super Admin identity in the page before rendering queue data. The client should call only Task 5 endpoints, show pending state and safe error copy, support approve/reject actions, and remove/reload a resolved item without exposing private profile data outside this page.

- [ ] **Step 4: Re-run UI checks after the admin screen**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts; npm.cmd run lint`

Expected: PASS with zero ESLint warnings.

- [ ] **Step 5: Run complete automated verification**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits `0`.

- [ ] **Step 6: Perform local authenticated smoke checks without exposing secrets**

With local runtime configuration present, sign in through the normal TwingFace UI; submit a professional application; verify it is pending and hidden from public search; approve it through the configured Super Admin account; filter it by a matching division/district; create an equipment or shooting-location listing with a permitted image; send an editable inquiry from a non-friend account; verify the direct conversation opens; then mark the listing rented and verify it disappears from public search. Also verify a non-admin receives `403` for an admin endpoint. Do not print cookies, Cloudinary responses, credentials, or environment values.

- [ ] **Step 7: Record actual verification and limitations**

Report each command and smoke-test result exactly as executed. If the local database, Cloudinary configuration, or Super Admin account is unavailable, state the limitation while still reporting all completed automated checks.

## Plan Self-Review

- **Spec coverage:** Tasks 1–2 implement dedicated profiles and approved directory filtering; Task 3 implements all four listing types, image lifecycle, rental details, and location filters; Task 4 reuses secure existing direct messaging for non-friend inquiries; Task 5 implements Super Admin approval/moderation and owner status; Tasks 6–7 build every specified Media World view and verify it.
- **Security coverage:** Global constraints plus Tasks 2–5 require session-derived identity, safe Prisma projections, ownership enforcement, approved-only public content, scoped non-friend messaging, and fail-closed Super Admin authorization.
- **Type consistency:** `SafeMediaWorldProfile` and `SafeMediaWorldListing` originate in Task 1 and are consumed by Tasks 2–7; `mediaWorldMessagingEnabled` is added in Task 1 before Task 4 extends message authorization.
- **Review-focus coverage:** Task 1 tests invalid location pairs; Task 5 tests missing/non-admin configuration; Tasks 2–3 test public visibility and ownership; Task 4 tests permitted and rejected inquiry paths.
- **Scope:** Payments, video hosting, a replacement chat system, a separate Media World login, and Marketplace model reuse are intentionally excluded.
