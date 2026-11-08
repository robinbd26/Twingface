# Twingface Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure Facebook-style Marketplace where users publish, browse, manage, and inquire about product listings through the existing Messages system.

**Architecture:** Marketplace uses dedicated listing and image models, while Cloudinary remains server-only. Listing APIs own validation, upload compensation, ownership, and safe public projections. A marketplace inquiry enables the existing one-to-one `DirectConversation` for a non-friend pair; no separate chat, unread, sound, or notification mechanism is introduced.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/PostgreSQL, Zod, Cloudinary Node SDK, Vitest, existing dashboard CSS.

**Spec:** `docs/superpowers/specs/2026-10-15-marketplace-design.md`

## Global Constraints

- A listing requires title (3–120), description (10–2,000), non-negative BDT price stored as integer paisa, category, New/Used condition, location (2–120), and 1–10 images.
- Images are JPEG, PNG, WebP, or GIF, each at most 5 MiB; credentials stay server-only and uploads use `twingface/marketplace/<sellerId>`.
- Only the authenticated seller may edit, delete, or change their listing status between `AVAILABLE` and `SOLD_OUT`.
- Browse responses contain only available listings; seller management includes both statuses.
- Buyers can contact another seller on an available listing without friendship; the first editable UI value is `Is this available?`.
- Marketplace inquiry sets internal conversation marketplace permission and stores a safe listing reference on its first message.
- Messages must not create bell notifications; existing Messages inbox owns badge, preview, sound, and read state.
- Safe browser projections omit image public IDs, passwords, email, phone, sessions, Cloudinary credentials, and internal authorization fields.

## Review Focus

- A malformed request with 0 or 11 images must fail before Cloudinary runs (Task 1 and Task 3).
- Cloudinary success followed by database failure must destroy every uploaded asset once and return no provider detail (Task 3).
- A non-owner must not set another seller listing to Sold out, edit it, or delete it (Task 4).
- A Sold out listing must remain viewable but reject a new marketplace inquiry (Task 5).
- Marketplace permission must not make unrelated strangers able to message; only the buyer/seller pair whose conversation has the internal flag may continue (Task 5).

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Listing/image enums and models; message/conversation marketplace relations. |
| `prisma/migrations/<timestamp>_add_marketplace/migration.sql` | Add Marketplace storage and nullable message/conversation fields. |
| `src/lib/marketplace.ts` | Zod validation, constants, safe listing/message projections, query parsers, authorization helper. |
| `src/lib/marketplace.test.ts` | Pure validation and projection unit tests. |
| `src/lib/cloudinary.ts` | Marketplace image upload helper using the existing configured SDK. |
| `src/lib/cloudinary.test.ts` | Marketplace upload folder/response mapping tests. |
| `src/app/api/marketplace/route.ts` | Browse available listings and multipart listing creation. |
| `src/app/api/marketplace/route.test.ts` | Collection auth, filtering, uploads, validation, cleanup, and safe response tests. |
| `src/app/api/marketplace/[id]/route.ts` | Read, owner edit/status/update, and owner deletion. |
| `src/app/api/marketplace/[id]/route.test.ts` | Detail, owner authorization, update and asset cleanup tests. |
| `src/app/api/marketplace/mine/route.ts` | Current seller listing collection. |
| `src/app/api/marketplace/mine/route.test.ts` | Seller-only response and status coverage tests. |
| `src/app/api/marketplace/[id]/message/route.ts` | Create a non-friend marketplace inquiry using the existing conversation. |
| `src/app/api/marketplace/[id]/message/route.test.ts` | Inquiry authorization, listing reference, realtime publish, and no bell notification tests. |
| `src/app/api/messages/send/route.ts`, `src/app/api/conversations/[id]/messages/route.ts`, `src/app/api/messages/[friendId]/route.ts` | Allow subsequent messages only for accepted friends or an explicitly marketplace-enabled conversation. |
| `src/lib/message.ts` | Safely expose compact marketplace reference in messages and internal marketplace permission only to server authorization helpers. |
| `src/app/(main)/marketplace/*` | Marketplace browse, create, detail, edit, and seller management pages. |
| `src/components/marketplace/*` | Focused browse, card, form, gallery, owner controls, and buyer inquiry UI components. |
| `src/components/dashboard/dashboard-navbar.tsx`, `src/components/dashboard/dashboard-sidebar.tsx` | Real `/marketplace` links. |
| `src/app/dashboard.css` | Scoped responsive marketplace styles. |
| `src/components/dashboard/dashboard-ui.test.ts` | Source-level UI contracts under existing Node-only Vitest setup. |

## Task 1: Schema, validation, and safe projections

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_marketplace/migration.sql`
- Create: `src/lib/marketplace.ts`
- Create: `src/lib/marketplace.test.ts`
- Modify: `src/lib/message.ts`
- Modify: `src/lib/message.test.ts`

**Interfaces:**
- Produces `MarketplaceCategory`, `MarketplaceCondition`, `MarketplaceStatus` Prisma enums and `MarketplaceListing`/`MarketplaceImage` models.
- Produces `MAX_MARKETPLACE_IMAGES = 10`, `parseMarketplaceCreateInput(formData: FormData): SafeParseReturnType`, `parseMarketplaceUpdateInput(formData: FormData): SafeParseReturnType`, `parseMarketplaceBrowseInput(searchParams: URLSearchParams)`, and `safeMarketplaceListingSelect`.
- Extends `safeDirectMessageSelect` with only a safe listing reference, and provides an internal conversation access select containing `marketplaceMessagingEnabled`.

- [ ] **Step 1: Write failing validation/projection tests**

Cover a valid 1-image listing; reject 0 images, 11 images, invalid category,
invalid condition, negative/non-integer price, short title/location/description,
and unsupported/oversize image. Assert safe listing data exposes `images.url`
but not `images.publicId`, private seller fields, or message authorization
fields.

- [ ] **Step 2: Run the focused tests to verify red**

Run: `npx.cmd vitest run src/lib/marketplace.test.ts src/lib/message.test.ts --reporter=dot`

Expected: FAIL because marketplace functions/models/projections do not exist.

- [ ] **Step 3: Implement Prisma schema and migration**

Add the exact listing/image models, enums, indexes, `DirectMessage.marketplaceListingId`, and `DirectConversation.marketplaceMessagingEnabled Boolean @default(false)`. Generate a migration named `add_marketplace`; inspect it to ensure only the required tables, enums, columns, relations, and indexes are created.

- [ ] **Step 4: Implement `src/lib/marketplace.ts` and message selects**

Use the existing file validation policy from `post-media.ts`; normalize BDT input to integer paisa without floating-point storage. The listing safe select must include ordered image URLs and `safeFriendUserSelect` seller data only.

- [ ] **Step 5: Generate client and verify green**

Run: `npx.cmd prisma generate; npx.cmd prisma validate; npx.cmd vitest run src/lib/marketplace.test.ts src/lib/message.test.ts --reporter=dot`

Expected: schema validates and focused tests pass.

## Task 2: Cloudinary marketplace media adapter

**Files:**
- Modify: `src/lib/cloudinary.ts`
- Modify: `src/lib/cloudinary.test.ts`

**Interfaces:**
- Produces `uploadMarketplaceImage(input: { bytes: Buffer; mimeType: string; sellerId: string }): Promise<{ imageUrl: string; imagePublicId: string }>`.
- Reuses `destroyPostImage(imagePublicId)` for individual asset cleanup.

- [ ] **Step 1: Write failing adapter tests**

Assert a marketplace upload uses server configuration, generated ID, folder
`twingface/marketplace/<sellerId>`, image-only resource type, allowed formats,
and an HTTPS URL/public ID response; assert no credentials leak from errors.

- [ ] **Step 2: Run the adapter test to verify red**

Run: `npx.cmd vitest run src/lib/cloudinary.test.ts --reporter=dot`

Expected: FAIL because `uploadMarketplaceImage` is missing.

- [ ] **Step 3: Implement `uploadMarketplaceImage`**

Mirror the existing server-only post image upload behavior, with a 1600px
limit and automatic quality/format transformation. Do not duplicate SDK
configuration or expose provider errors.

- [ ] **Step 4: Verify green**

Run: `npx.cmd vitest run src/lib/cloudinary.test.ts --reporter=dot`

Expected: PASS.

## Task 3: Listing browse and secure creation API

**Files:**
- Create: `src/app/api/marketplace/route.ts`
- Create: `src/app/api/marketplace/route.test.ts`

**Interfaces:**
- Consumes Task 1 parsers/selects and Task 2 `uploadMarketplaceImage`.
- Produces `GET /api/marketplace` and `POST /api/marketplace`.

- [ ] **Step 1: Write failing collection route tests**

Test unauthenticated `401`; browse only queries `AVAILABLE`, accepts bounded
cursor/category/q filters, and emits only safe listing data. Test a valid
multipart 1-image create; reject invalid field/files, 0/11 images before
upload; ensure session seller ID wins over client data; provider failure is
generic; database failure destroys each uploaded public ID once and returns
generic `500`.

- [ ] **Step 2: Run the route test to verify red**

Run: `npx.cmd vitest run src/app/api/marketplace/route.test.ts --reporter=dot`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement browse and multipart create**

Set `runtime = 'nodejs'`. Authenticate before reading file bytes; validate
every file before invoking Cloudinary; upload sequentially so cleanup order is
deterministic; create listing and ordered images in one Prisma transaction;
on persistence failure clean all previously uploaded IDs in nested suppressed
cleanup calls.

- [ ] **Step 4: Verify green**

Run: `npx.cmd vitest run src/app/api/marketplace/route.test.ts --reporter=dot`

Expected: PASS.

## Task 4: Owner listing detail, lifecycle, and seller collection APIs

**Files:**
- Create: `src/app/api/marketplace/[id]/route.ts`
- Create: `src/app/api/marketplace/[id]/route.test.ts`
- Create: `src/app/api/marketplace/mine/route.ts`
- Create: `src/app/api/marketplace/mine/route.test.ts`

**Interfaces:**
- Consumes Task 1 safe/internal projections and Task 2 upload/cleanup helper.
- Produces `GET/PATCH/DELETE /api/marketplace/[id]` and `GET /api/marketplace/mine`.

- [ ] **Step 1: Write failing owner/lifecycle tests**

Cover safe detail response, `404`, owner field edits, Available/Sold out
transitions, image retain/add/remove constraints (ending 1–10), non-owner
`403` on PATCH/DELETE, and delete with best-effort Cloudinary cleanup.
Cover `/mine` includes both seller statuses but no other seller’s rows.

- [ ] **Step 2: Run route tests to verify red**

Run: `npx.cmd vitest run src/app/api/marketplace/[id]/route.test.ts src/app/api/marketplace/mine/route.test.ts --reporter=dot`

Expected: FAIL because these routes do not exist.

- [ ] **Step 3: Implement authorized detail/update/delete and seller listing API**

Retrieve internal image public IDs only after session and ownership checks.
For updates, validate final retained-plus-new image count before uploads;
remove images and destroy their assets only after a successful data change.
For delete, delete DB listing then best-effort destroy every stored public ID.

- [ ] **Step 4: Verify green**

Run: `npx.cmd vitest run src/app/api/marketplace/[id]/route.test.ts src/app/api/marketplace/mine/route.test.ts --reporter=dot`

Expected: PASS.

## Task 5: Marketplace inquiry and constrained non-friend messaging

**Files:**
- Create: `src/app/api/marketplace/[id]/message/route.ts`
- Create: `src/app/api/marketplace/[id]/message/route.test.ts`
- Modify: `src/app/api/messages/send/route.ts`
- Modify: `src/app/api/messages/send/route.test.ts`
- Modify: `src/app/api/conversations/[id]/messages/route.ts`
- Modify: `src/app/api/conversations/[id]/messages/route.test.ts`
- Modify: `src/app/api/messages/[friendId]/route.ts`
- Modify: `src/app/api/messages/[friendId]/route.test.ts`
- Modify: `src/app/api/conversations/with/[username]/route.ts`
- Modify: `src/app/api/conversations/with/[username]/route.test.ts`

**Interfaces:**
- Consumes Task 1 internal marketplace message/conversation selects and safe listing data.
- Produces `POST /api/marketplace/[id]/message` and extends existing direct-message authorization.

- [ ] **Step 1: Write failing marketplace inquiry tests**

Cover authenticated buyer sending editable text to an Available other-user
listing; creation/upsert sets `marketplaceMessagingEnabled`, creates a message
with `marketplaceListingId`, calls `publishMessage`, and never calls
`createNotification`. Reject unauthenticated, self, missing, and Sold out
listing cases. Assert safe JSON omits private seller and internal IDs.

- [ ] **Step 2: Write failing regression tests for direct message boundaries**

Assert friend messages still work; a non-friend fails without marketplace
permission; an existing conversation with `marketplaceMessagingEnabled: true`
can send/read/reopen through all existing direct-message endpoints; an
unrelated stranger cannot reuse that permission.

- [ ] **Step 3: Run the messaging tests to verify red**

Run: `npx.cmd vitest run src/app/api/marketplace/[id]/message/route.test.ts src/app/api/messages/send/route.test.ts src/app/api/conversations/[id]/messages/route.test.ts src/app/api/messages/[friendId]/route.test.ts src/app/api/conversations/with/[username]/route.test.ts --reporter=dot`

Expected: FAIL because inquiry and marketplace conversation authorization are missing.

- [ ] **Step 4: Implement inquiry and one authorization helper**

Add `canUseDirectConversation({ viewerId, otherUserId, pairKey })` to the
message domain. It returns true only for an accepted friendship or a
conversation whose participants exactly match the pair and whose internal
marketplace flag is true. Reuse it in every affected route rather than adding
route-specific exceptions.

- [ ] **Step 5: Verify green**

Run the Step 3 command.

Expected: PASS; messages still bypass the bell notification system.

## Task 6: Marketplace pages, forms, navigation, and buyer flow

**Files:**
- Create: `src/app/(main)/marketplace/page.tsx`
- Create: `src/app/(main)/marketplace/create/page.tsx`
- Create: `src/app/(main)/marketplace/[id]/page.tsx`
- Create: `src/app/(main)/marketplace/[id]/edit/page.tsx`
- Create: `src/app/(main)/marketplace/mine/page.tsx`
- Create: `src/components/marketplace/marketplace-browser.tsx`
- Create: `src/components/marketplace/marketplace-card.tsx`
- Create: `src/components/marketplace/marketplace-form.tsx`
- Create: `src/components/marketplace/marketplace-gallery.tsx`
- Create: `src/components/marketplace/marketplace-owner-actions.tsx`
- Create: `src/components/marketplace/marketplace-inquiry.tsx`
- Modify: `src/components/dashboard/dashboard-navbar.tsx`
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `src/app/dashboard.css`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`

**Interfaces:**
- Consumes Task 3–5 APIs; receives only safe listing data from server pages.
- Produces working `/marketplace`, `/marketplace/create`, `/marketplace/[id]`, `/marketplace/[id]/edit`, and `/marketplace/mine` UI.

- [ ] **Step 1: Write failing UI source-contract tests**

Assert both nav locations use `href='/marketplace'`; browser fetches the
marketplace API and exposes search/category controls; form uses multipart
`FormData`, accepts the four MIME types, limits 10 previews, and has required
listing controls; detail provides owner actions or an inquiry component;
inquiry initializes `Is this available?`; CSS contains scoped marketplace
selectors and responsive gallery/grid hooks.

- [ ] **Step 2: Run the UI contract test to verify red**

Run: `npx.cmd vitest run src/components/dashboard/dashboard-ui.test.ts --reporter=dot`

Expected: FAIL because no marketplace route/components/navigation exist.

- [ ] **Step 3: Implement navigation and browser/listing UI**

Use server pages for initial safe data and focused client components for
filters, file state, status mutation, inquiry submission, and pending/error
feedback. Use existing dark/light dashboard tokens and `next/image` remote
Cloudinary configuration already present in the project.

- [ ] **Step 4: Implement seller and buyer controls**

The buyer inquiry component must send editable prefilled text to Task 5 and
route to `/messages/<conversationId>` on success. Owner controls must require
confirmation before deletion and refresh status after a successful update.

- [ ] **Step 5: Verify UI contracts and lint**

Run: `npx.cmd vitest run src/components/dashboard/dashboard-ui.test.ts --reporter=dot; npm.cmd run lint`

Expected: PASS with no ESLint warnings.

## Task 7: Complete verification and manual smoke test

**Files:**
- Modify only if a verification result identifies a scoped marketplace defect.

- [ ] **Step 1: Run complete automated verification**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd vitest run --reporter=dot
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits `0`.

- [ ] **Step 2: Manual authenticated smoke test**

With Cloudinary credentials only in `.env.local`: open Marketplace through
both navigation links; create a listing with 1 image and all required fields;
confirm it appears as Available; inspect as another non-friend user; edit the
prefilled inquiry then send it; confirm it appears in Messages rather than
Notifications; mark Sold out and confirm inquiry is disabled; restore
Available; finally edit and delete the listing. Do not log secrets, cookies,
or provider responses.

- [ ] **Step 3: Record actual results**

Report every command and smoke-test result. If a real Cloudinary account or
second authenticated account is unavailable, state that constraint and report
all automated results.

## Plan Self-Review

- **Spec coverage:** Task 1 maps the storage and public safety boundaries; Task 2 covers upload; Tasks 3–4 cover listing APIs and lifecycle; Task 5 covers the non-friend message extension; Task 6 covers every requested screen and navigation link; Task 7 verifies the complete flow.
- **Type consistency:** `MarketplaceListing`, `MarketplaceImage`, `marketplaceListingId`, and `marketplaceMessagingEnabled` are named consistently across schema, APIs, and UI.
- **Review focus coverage:** Task 3 covers upload count and cleanup; Task 4 covers owner lifecycle; Task 5 covers Sold out inquiry and non-friend message boundaries.
- **Scope:** Payments, ratings, saved listings, direct client uploads, and a duplicate marketplace chat subsystem are intentionally excluded.
- **Repository note:** This workspace has no `.git` directory, so no commit steps are included.
