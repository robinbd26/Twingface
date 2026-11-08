# Media World / T-MEDIA HUB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Twingface a Media World with three distinct account types (Media Professional, Business/Organization, For Rent), a normalized Film/Natok/TVC/Music taxonomy, and a dedicated "For Rent" marketplace with search, filters, listing pages and member inquiries — without disturbing the existing social product.

**Architecture:** One normalized PostgreSQL schema owns the taxonomy and the rental domain; shared browse rule modules (`rental-browse.ts`, `talent-browse.ts`) are the single source of truth for both the server pages and the cursor APIs, so a page and its endpoint cannot drift. Server components render the first page of results from Prisma and hand raw rows plus parsed filters to client components, which own every bilingual label. Filtering is a native `<form method="get">`, so results are shareable and work without JavaScript; only "Load more" fetches. Existing argon2id cookie sessions and the legacy `MediaProfile` feature are reused untouched.

**Tech Stack:** Next.js 15.3.2 App Router, React 19, TypeScript strict, Prisma 6.19/PostgreSQL, zod v3, Tailwind v4 + scoped CSS, Cloudinary, Vitest.

## Global Constraints

- Preserve the supplied Film, Natok and TVC (and Music) categories and designations exactly as given.
- Never store the category system as one unstructured text field — every node is a real row with code, English name, Bangla name, sort order and active flag.
- A For Rent account must never be shown Film/Natok/TVC professional designation fields.
- Never display a booking as confirmed. Inquiries are the only rental request record in this phase; booking is deferred.
- Do not rebuild unrelated parts; the existing social feed, groups, marketplace, messages, OTT and games keep working.
- Never expose passwords or sensitive account data in any payload or page.
- Do not permanently delete related data without reference checks and safeguards.
- State clearly which features are functional and which are demonstrative.

## Review Focus

- Account type is chosen in POST-registration onboarding, so the existing signup flow stays intact.
- Category-conditional fields on the listing form must follow the selected rental category, not a fixed field list.
- Multi-identity professionals can add and remove identities independently; removal must not strand data.
- Admin deletion refuses when member data references the node; hiding a listing is the supported alternative.
- Prices are stored in paisa and presented in Taka, so URL round-tripping must not double-convert.

---

## File Structure

### Data layer
- `prisma/schema.prisma` — `Industry`, `MainCategory`, `Designation`, `DesignationCategoryLink`, `OrganizationType`, `Organization`, `UserProfessionalIdentity`, `RentalProvider`, `RentalCategory`, `RentalSubcategory`, `RentalListing`, `RentalListingPhoto`, `Inquiry`, `RentalListingReport`, plus `User.accountType`.
- `prisma/migrations/*` — the schema migration; `src/lib/mediaworld/taxonomy-seed.ts` + `scripts/seed-mediaworld-taxonomy.ts` — the supplied Film/Natok/TVC/Music tree.

### Shared rule modules
- `src/lib/mediaworld/rental.ts` — listing create/update schemas, category-conditional refinement, `CUSTOM` rate path.
- `src/lib/mediaworld/rental-browse.ts` — the one filter grammar for the marketplace page and its cursor API.
- `src/lib/mediaworld/talent-browse.ts` — filter grammar and the selects that never read `email`/`phone`/`passwordHash`.
- `src/lib/mediaworld/validations.ts` — profile input contracts, including the `http(s)`-only website rule.
- `src/lib/mediaworld/admin.ts` — admin schemas, reference counting, guarded deletion, report transition table, account-change blockers.
- `src/lib/mediaworld/labels.ts` — availability and domain label pairs.

### APIs
- `src/app/api/mediaworld/{account-type,identities,identities/[id],organization,rental-provider}/route.ts` — onboarding writes.
- `src/app/api/for-rent/route.ts`, `…/for-rent/[id]/route.ts`, `…/for-rent/mine`, `…/for-rent/[id]/inquiry`, `…/for-rent/[id]/report`, `…/for-rent/inquiries*` — marketplace writes.
- `src/app/api/mediaworld/talent/route.ts` — talent browse cursor API.
- `src/app/api/mediaworld/admin/{taxonomy,taxonomy/[id],listings,listings/[id],reports,reports/[id],inquiries,accounts,accounts/[id]}/route.ts` — super-admin surface.

### Pages
- `src/app/(main)/mediaworld/register/page.tsx` — the Media World landing CTA target; runs the account-type and taxonomy flow.
- `src/app/(main)/mediaworld/onboarding/page.tsx` — account-type wizard with "+ Add Another Category", also reached from the dashboard sidebar and the For Rent gates.
- `src/app/(main)/mediaworld/talent-profile/page.tsx` — the legacy single-profession casting profile that still feeds the Super Admin approval queue.
- `src/app/(main)/for-rent/page.tsx` + `[id]`, `[id]/edit`, `new`, `manage` — the marketplace.
- `src/app/(main)/mediaworld/talent/page.tsx` + `[username]/page.tsx` — public professional/business/rental profiles.
- `src/app/(main)/super_admin/page.tsx` — extended with the T-MEDIA HUB operations panel.

### Components
- `src/components/for-rent/*` — browser, filters, card, detail, listing form, manage workspace.
- `src/components/mediaworld/talent/*` — browser, filters, card, profile.
- `src/components/admin/{mediaworld-admin,admin-ui,admin-taxonomy,admin-listings,admin-reports,admin-inquiries,admin-accounts}.tsx` — the five admin panels.

---

## Verification

- `npx tsc --noEmit`, `npx next lint --dir src`, `npx vitest run` (102 files, 606 tests), `npx next build`.
- Browser smoke of onboarding, marketplace browse/filter/detail/new/edit/manage, talent browse and profiles, and all five admin panels.
- Authorization matrix: unauthenticated 401, authenticated non-super-admin 403, `/super_admin` redirect for members.
- Safeguard matrix: referenced taxonomy node 409, unknown node 404, listing `DELETE` 405, illegal report transition 409, account-type conflict 400.

## Status and honest scope

**Functional and tested:** taxonomy seeding and admin CRUD with reference guards; account-type registration with multi-identity add/remove — reachable both from the Media World landing CTAs (`/mediaworld/register`) and the profile-setup route (`/mediaworld/onboarding`); business/organization profiles; rental listings with category-conditional fields, photo retention rules and `CUSTOM` rates; marketplace search/filter/pagination; listing detail, edit and provider manage pages; member inquiries and reports; admin reports queue, inquiry overview and account corrections; public talent/business/rental profile pages.

**Deferred, deliberately:** booking. No booking table, endpoint or UI is presented as working. An inquiry is the only rental request record, and every surface that could imply confirmation says so in the copy.

**Previously not exercised end-to-end:** live Cloudinary uploads. The first verification round used inline `data:image/svg+xml` photos, which reach the same validation path before any upload call; the provider call itself was not asserted. Live uploads were verified on 2026-10-25 — see the section below.

## Fixes found during verification

- `pricePaisa` was required, which made the intended `CUSTOM` rate path unusable; now defaults to `0` only where the refinement allows it, and partial updates still cannot inject it.
- The marketplace heading claimed "Available equipment" for temporarily-unavailable results; it now follows the active availability filter.
- `/for-rent/manage` was gated behind a provider check, making the "Sent" tab unreachable for renters; the panel is now provider-aware.
- `optionalUrl` accepted `javascript:` and `data:` URLs because zod's `.url()` only checks that `new URL()` parses, and the value renders as an anchor `href`; restricted to `http(s)`.
- The legacy super-admin dashboard called `Date.now()` while server-rendering relative times, so hydration replaced the whole tree; the reference time now comes from the server.
- Two admin labels were generated by trimming a trailing "s" ("Add industrie", "0 sent inquiry/inquiries"); both now come from explicit singular forms.

## Live preview verification (2026-10-25)

Ran `next dev` on port 3001 (3000 was already held by another process) and drove the register wizard in a real browser with a throwaway account created through `/register`.

| Step | Evidence |
| --- | --- |
| Signup through the app's own form | landed on `/dashboard` with a live session |
| `/mediaworld/register` | heading "মিডিয়া ওয়ার্ল্ড প্রোফাইল সেটআপ", three account types, legacy casting link |
| Choose Media Professional | `POST /api/mediaworld/account-type` 201, badge shown, chooser removed |
| Steps 1–3 | industries চলচ্চিত্র / নাটক / বিজ্ঞাপনচিত্র / সঙ্গীত; nine Film main categories; designations stay gated until a category is chosen |
| Add identity | `POST /api/mediaworld/identities` 201, "পেশা যোগ হয়েছে", list shows `চলচ্চিত্র · পরিচালনা ও লেখালেখি · পরিচালক` |
| Reload | the same identity is rendered from the database, so persistence is server-side rather than client state |
| Remove identity | `DELETE /api/mediaworld/identities/<id>` 200, list back to zero |

No console errors. The Business and For Rent branches were not re-clicked in this run because the account type is one-shot per account; both were exercised in the earlier session.

The scratch account was deleted afterwards with zero orphan identities, organizations, providers, sessions or inquiries, and the super admin rows were untouched.

`Booking` was modelled in `prisma/schema.prisma` but `public.bookings` was absent from the connected database at that point, which matched booking being deferred. Booking was implemented and migrated on 2026-10-25 — see "Booking system (Step 2)" below.

## Live Cloudinary upload verification (2026-10-25)

Drove the real provider from a Node harness against `next dev` on port 3001: register → account type → multipart upload → Prisma read-back → asset fetch → SSR read, for every image pipeline in the app.

| Step | Evidence |
| --- | --- |
| Business/organization logo | `PUT /api/mediaworld/organization` 200, URL + public ID persisted on `organizations` |
| Rental provider logo | `PUT /api/mediaworld/rental-provider` 200, URL + public ID persisted on `rental_providers` |
| Profile photo | `POST /api/profile/media` (`kind=profile`) 200, deterministic public ID `twingface/profiles/<userId>/avatar` |
| Rental listing photos (Vehicles) | `POST /api/for-rent` 201 with two photos, rows persisted in `rental_listing_photos` with positions 0/1 |
| MIME and magic-byte guards | `text/plain` rejected 400; PNG-header spoof rejected 400 |
| Account gate | Business account saving a provider profile → 403 |
| Delivery | every stored URL fetched 200 with `image/*`; `Accept: image/webp` negotiated `image/webp`; `w_160` rendition smaller than `w_512` |
| UI | browser paint on `/for-rent/<id>`, `/mediaworld/talent/<business>` and `/mediaworld/talent/<provider>`: logos 512×512, avatar 512×512, listing photo 1000×700, all `complete` |

**Defect found and fixed:** `transformation` passed to `upload_stream` only derives an asset; `secure_url` keeps pointing at the original, so stored URLs were served unconverted and `Accept: image/webp` still returned PNG. `src/lib/cloudinary.ts` now embeds the delivery transformation in the stored URL (`w_1600,c_limit,q_auto,f_auto` for post/marketplace/rental/complaint images, `w_512,h_512,c_fill` for logos, `w_512,h_512,c_fill,g_face` for avatars, `w_1600,h_640,c_limit` for covers) and no longer passes the ineffective upload option. Videos keep their upload-time derivation because `f_auto` is an image-only feature.

Scratch accounts and the throwaway browser viewer were deleted after the run; 28 uploaded assets were destroyed and the transform URLs for two of them now return 404, so no fixtures remain in the shared account.

## Booking system (Step 2, 2026-10-25)

Migration `prisma/migrations/20261025120000_booking_system/` adds `BookingStatus` (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`) and three tables:

| Table | Purpose | Notes |
| --- | --- | --- |
| `bookings` | one row per rental request | `listingId` → `rental_listings`, `renterId` → `users`, both cascade; stores `startAt`/`endAt`, snapshot `priceUnit`/`unitPricePaisa`/`priceCustom`, `totalPaisa`, `note`, `decisionNote`, `decidedAt`, `completedAt`; indexed on `(listingId, status, startAt, endAt)`, `(renterId, createdAt)`, `(status, endAt)` |
| `booking_status_history` | append-only audit trail | `fromStatus`/`toStatus`, nullable `actorId` (`SetNull` so deleting an account keeps history), `note`, cascades with the booking |
| `rental_availability_blocks` | provider-held dates | `listingId` + `providerId`, both cascade; optional `reason` |

### Rules encoded in `src/lib/bookings/`

- Ranges are half-open `[startAt, endAt)`; `rangesOverlap` therefore allows back-to-back bookings (Nov 1–4 followed by Nov 4–6).
- Windows resolve in Asia/Dhaka (UTC+6, no DST): a date-only range maps to midnight→midnight local instants, so Nov 1–4 is `2026-10-31T18:00Z → 2026-11-03T18:00Z`. `PER_HOUR` requires times; the other units reject them.
- Only `CONFIRMED` bookings and provider blocks occupy a slot. `PENDING` requests are advisory: overlapping requests are accepted and the API returns `competingRequests` so the UI can say how many are waiting.
- Pricing: `PER_HOUR` × hours, `PER_DAY` × days, `PER_WEEK` × ceil(days/7), `PER_MONTH` × ceil(days/30), `CUSTOM` uses the listing's `priceCustom`; totals are integer paisa rendered as `৳` with `formatBdt`.
- `BOOKING_ACTION_RULES` is the single source of truth for transitions: provider `approve` (PENDING→CONFIRMED), provider/renter `cancel` (PENDING|CONFIRMED→CANCELLED), provider `reject` (PENDING→REJECTED), provider `complete` (CONFIRMED→COMPLETED). There is no renter-side path to `CONFIRMED`.

### API surface

| Route | Behaviour |
| --- | --- |
| `POST /api/for-rent/[id]/bookings` | creates a `PENDING` request; 400 on bad dates/window, 409 when a confirmed booking or block overlaps (returns the conflict), 400 on own listing; response repeats that the request is not confirmed yet |
| `GET /api/bookings?box=renter\|provider&status=…` | role-scoped list (renter rows vs. listings owned by the viewer), newest first, capped at 100 |
| `PATCH /api/bookings/[id]` | the only lifecycle entry point; 401/403 by role, 409 when the action is not allowed from the current status |
| `GET /api/for-rent/[id]/availability` | blocked ranges (confirmed bookings + provider blocks) plus advisory pending count |
| `POST /api/for-rent/[id]/availability` | debounced pre-submit check: `{ available, competingRequests }` or `{ available: false, reason }` |
| `GET/POST /api/for-rent/[id]/blocks` | owner-only availability blocks; POST refuses windows that collide with confirmed bookings |
| `DELETE /api/for-rent/[id]/blocks/[blockId]` | owner-only; 404 for a block that belongs to another listing, 403 for another provider |

### Guardrail

`approve` is the only way a booking can become `CONFIRMED`, and it re-validates inside a transaction:

1. `SELECT "id" FROM "rental_listings" WHERE "id" = … FOR UPDATE` serialises approvals for the same listing.
2. The booking is re-read: a status other than `PENDING` fails with 409 (the UI reloads), a paused/inactive listing fails with 409.
3. `findListingConflict` re-runs against confirmed bookings and blocks, excluding the booking being approved.
4. Only then is `CONFIRMED` written together with a `PENDING → CONFIRMED` history row and `decidedAt`.
5. On a conflict the request stays `PENDING` and the API answers 409 with the conflicting range; the provider sees "Another booking is already confirmed." and the overlapping request is not silently dropped.

### UI

- Listing detail: `ForRentBooking` (date pickers, live quote, debounced availability check, submit) — the success card states the request is pending, not confirmed.
- `/for-rent/bookings`: customer/provider dashboard with Incoming requests / My requests / Availability tabs, Pending/Active/Past buckets, status pills, per-booking history, decision note, and approve/reject/complete/cancel actions; auto-refreshes on an interval and on tab focus.
- Availability manager: block dates (optional times only for hourly listings) with a reason, list and remove them, with copy explaining that confirmed dates cannot be blocked.
- Entry points added to `/for-rent`, `/for-rent/manage` and the detail page; styles in `src/app/dashboard.css` under "Media World: bookings".

### Tests

60 new tests in 8 files: `pricing` (12), `lifecycle` (6), `availability` (6), booking creation API (9), booking action API (11), availability API (6), blocks API (6), booking list API (4). Full suite: 110 files / 666 tests passing; `npm run lint`, `npx tsc --noEmit` and `npm run build` clean.

### Live verification (2026-10-25, `next dev` on port 3001)

Two throwaway accounts (renter + provider with one PER_DAY camera listing) and three requests: A Nov 1–4, B Nov 10–12, C Nov 11–13 (B and C overlap deliberately).

| Step | Evidence |
| --- | --- |
| Renter books A | `POST …/bookings` 201; DB row `PENDING`, `startAt` `2026-10-31T18:00Z`, `totalPaisa 1500000`, history `null → PENDING` |
| Renter books B and C | both 201 and `PENDING`; UI shows "আরও 1টি অনুরোধ অপেক্ষায় আছে।" (advisory pending), quote ৳10,000 |
| Renter dashboard | 3 pending cards, pill "প্রোভাইডারের অনুমোদনের অপেক্ষায়", "এটি এখনো নিশ্চিত হয়নি…" |
| Provider approves B | `PATCH` 200 "Booking confirmed after the availability check."; card moves Pending → Active with pill "নিশ্চিত হয়েছে"; history `PENDING → CONFIRMED`, actor ZZ Booking Owner |
| Provider approves C (overlaps B) | `PATCH` **409** "Another booking is already confirmed."; DB still `PENDING`, no second CONFIRMED row — the guardrail held in the live flow |
| Renter sees B | Active tab shows CONFIRMED with the provider-verification copy; DB read-back matches |
| Block Dec 1–3 | `POST /blocks` 201, alert "তারিখগুলো বন্ধ করা হয়েছে।", listed with reason |
| Renter checks Dec 1–4 | live availability returns blocked: "প্রোভাইডার এই তারিখগুলো বন্ধ রেখেছেন।"; submit disabled |
| Remove block | `DELETE /blocks/<id>` 204, list empty, `rental_availability_blocks` count 0 |
| Complete B | provider completes → "Booking marked complete."; Active 0 / Past 1, history `PENDING → CONFIRMED → COMPLETED`; renter Past tab shows "সম্পন্ন" |

Not exercised live: hourly/weekly/monthly quoting (covered only by unit tests), a true concurrent double-approval race (serialised by the `FOR UPDATE` lock and covered by route tests, not reproduced in the browser), and notification delivery — booking actions do not yet emit notifications.

All scratch users, the provider, listing, bookings, history and blocks were deleted afterwards (cascade verified: 0 bookings, 0 listings, 0 blocks, 0 history), the temporary setup script was removed, and the verification dev server on port 3001 was stopped. Nothing was pushed to the remote.

## Taxonomy updates (2026-10-25)

The professional-identity tree in `src/lib/mediaworld/taxonomy-data.ts` was revised for Film, Natok, TVC and Music, and applied to the shared database with `npm run db:seed:mediaworld-taxonomy`.

| Industry | Change |
| --- | --- |
| Film | Camera reduced to Cinematographer / Assistant Cameraman / Drone Operator (DoP, Cameraman, Camera Operator removed); Voice Artist removed from Acting; Casting Director added under Production; Colorist confirmed in Editing (already present, no duplicate); `VFX Artist` renamed to `VFX` |
| Natok | Camera reduced to Cinematographer / Assistant Cameraman / Drone Operator (Cameraman, Camera Operator, Videographer removed); Wardrobe Assistant removed; OTT Platform added to Drama Business; Villain and Comedic Actor confirmed (already present) |
| TVC | DoP and Cameraman removed from Camera; Media Planner and Media Buyer removed from Advertising & Marketing; Sound Studio removed from Production Companies & Studios |
| Music | Main categories now Composition & Lyrics, Vocals & Performance, Sound Production & Mixing and Instrumentalist & Musician; Instrumentalist & Musician moved into its own category; Sound Recordist, Sound Designer and Dubbing Artist added to reach the requested roster |

Because the identity form reads the database snapshot rather than these arrays, the seed script now reconciles as well as upserts: it deletes designation–category links that the canonical data no longer lists (14 this run) and deactivates designations left without any category (7: `DIRECTOR_OF_PHOTOGRAPHY`, `CAMERAMAN`, `VIDEOGRAPHER`, `WARDROBE_ASSISTANT`, `MEDIA_PLANNER`, `MEDIA_BUYER`, `SOUND_STUDIO`). Rows are deactivated rather than deleted so existing identities keep resolving their names — `VOICE_ARTIST` and `CAMERA_OPERATOR` stay active because Natok and TVC still offer them. Reconciliation only touches links inside the canonical categories, so admin-created categories are untouched.

`src/lib/mediaworld/taxonomy-data.test.ts` (6 tests) pins the removals, the VFX rename, the Natok/TVC additions, the four Music categories and the shared-code naming invariant. Suite 672 tests passing; ESLint and `tsc --noEmit` clean.

UI check with a throwaway professional account on `next dev`: Film camera shows exactly the three retained roles, Film editing shows Colorist and "VFX", Natok Drama Business shows OTT Platform, and Music shows the four categories with Dubbing Artist under Vocals and the three sound roles under Sound Production. The account was deleted afterwards; no scratch rows remain.

### Cross-industry sound split (same day)

The same four-way split was then applied to the Film, Natok and TVC sound departments, replacing each industry's single "Sound & Music" category:

| Industry | Categories (all four) | Industry-specific roles kept |
| --- | --- | --- |
| Film | `FILM_COMPOSITION_LYRICS`, `FILM_VOCALS_PERFORMANCE`, `FILM_SOUND_PRODUCTION`, `FILM_INSTRUMENTALIST_MUSICIAN` | none beyond the shared set |
| Natok | `NATOK_*` equivalents | none beyond the shared set |
| TVC | `TVC_*` equivalents | Jingle Writer and Jingle Composer (Composition & Lyrics), Voice-over Director and Voice-over Artist (Vocals & Performance), Dubbing Engineer (Sound Production & Mixing) |

The shared roles now live in four arrays in `taxonomy-data.ts` (composition, vocals, production/mixing, instrumentalist) and every industry maps them onto its own category codes, so the four departments cannot drift apart. The replaced `FILM_SOUND_MUSIC`, `NATOK_SOUND_MUSIC` and `TVC_SOUND_MUSIC` rows are deactivated by the seed (listed in `RETIRED_CATEGORY_CODES`), never deleted, so identities recorded against them still resolve. Only those three codes are retired — admin-created categories are still untouched. The seed also reactivates canonical industries, categories and designations when they return to the data.

Seed run: 40 categories, 125 designations, 220 links, 0 stale links, 3 retired categories, 0 orphaned designations. Database dump confirms the four categories per industry are active, each old `*_SOUND_MUSIC` row is inactive, and `taxonomy-data.test.ts` grows to 8 tests. Suite 674 tests passing, ESLint and `tsc --noEmit` clean, `next build` exit 0.

## Registration wizard + login credentials (2026-10-25)

`/mediaworld/register` is now a three-step setup wizard that doubles as public signup, and the personal details it collects (phone, addresses) are real login/profile data.

**Data model.** `User` gained nullable `presentAddress` and `permanentAddress` (`VARCHAR(255)`) via migration `20261025130000_user_addresses`; `division`, `district`, `phone` and `passwordHash` already existed, so existing accounts keep working and no column was rewritten.

| Step | Contents | Persistence |
| --- | --- | --- |
| 1. Personal details | Name, mobile, email, password + confirm (new accounts only), division and district (district list derived from the chosen division), present and permanent address | `POST /api/mediaworld/signup` (new) creates the account with `accountType: PROFESSIONAL`, argon2id hash, generated User ID and session cookie. Signed-in professionals instead save edits through `PATCH /api/mediaworld/profile/personal` (new); the session fields are editable, passwords are not part of this screen. |
| 2. Professions | Existing `ProfessionalStep` picker: industry → main category → designation, multi-add | `POST /api/mediaworld/identities` (unchanged) as each identity is added |
| 3. Review & save | Read-only summary of both steps | `POST /api/mediaworld/setup/complete` (new) verifies the account is `PROFESSIONAL` and has at least one identity, then the client opens `/mediaworld` |

**Routing.** Visitors without a session see the wizard at step 1; signed-in `PROFESSIONAL` accounts start at step 2 with their saved details and identities (step 1 is reachable through the progress bar); `BUSINESS`, `RENTAL` and not-yet-chosen accounts still get the original `OnboardingWizard`, so organization and rental setup keep their entry point. The `redirect('/login')` was removed from the page.

**Validation.** `mediaWorldSignupSchema` and `mediaWorldPersonalSchema` in `src/lib/validations.ts`: trimmed/lower-cased email, Bangladeshi mobile normalised to `+8801XXXXXXXXX` (accepts `01…`, `880…`, `+880…`, spaces, dashes, parentheses), required name, division, district and both address lines (≥5 chars), password rules shared with the existing register schema, and `.strict()` so a `password` key cannot be smuggled into the profile PATCH. District-in-division membership is a `superRefine`; because Zod 3 skips object-level refinements once a field has already failed, a request with two different errors reports the field error first and the division/district mismatch on the next attempt — the browser validates both at once, so users see them together.

**Duplicate handling.** Signup retries the generated User ID up to five times (both on pre-check collision and on a `P2002` race) and maps `P2002` on email/phone/username to a 409 with a field message, never leaking which internal constraint fired. The profile PATCH maps email/phone conflicts the same way. Neither route returns password hashes; the profile PATCH selects only the address/contact columns.

**Tests.** 707 tests in 114 files green (33 new): signup route (create/P2002 email/username retry race/invalid input/500), setup-complete (401/403/400/404/200), profile PATCH (401/update shape/cross-field district/rejected `password` key/409/500), schema normalisation and rejection cases, and the register page source test now asserts `SetupWizard` plus the three endpoints while keeping the legacy casting-profile assertions. ESLint and `tsc --noEmit` clean; `next build` exit 0.

**Live verification (throwaway account, `next dev` on 3001).**

| Check | Result |
| --- | --- |
| Open `/mediaworld/register` signed out | Step 1 renders with 8 divisions; district select disabled until a division is chosen, then lists that division's 13 districts |
| Complete step 1 | `POST /api/mediaworld/signup` 201, session cookie set, page re-renders as the signed-in professional at step 2 without a manual reload |
| Add Film → Directing & Writing → Director | `POST /api/mediaworld/identities` 201, listed under "Your professions (1)" |
| Review | Summary shows `+8801911223344`, email, `Dhaka / Gazipur`, both addresses and the profession |
| Save & finish | `POST /api/mediaworld/setup/complete` 200 → `/mediaworld` |
| Log out, sign in with email | `/api/auth/login` 200 → dashboard as the scratch user |
| Log out, sign in with `01911-223344` | 200 → dashboard as the scratch user (dashed local format normalised) |
| Revisit `/mediaworld/register` signed in | Starts at step 2 with the saved identity; step 1 shows saved values, no password fields, button "Save & continue" |
| Edit present address, save | `PATCH /api/mediaworld/profile/personal` 200, advances to step 2 |

Cleanup: the scratch user, its session and its one identity were deleted (0 `zz-*` accounts remain) and the dev server was stopped. Nothing was pushed; these changes are uncommitted at the user's direction.

## Four-step registration with photo + live preview (2026-10-25, later the same day)

The same `/mediaworld/register` wizard was upgraded to four steps with a sticky live-preview card. Schema was untouched: `User.profileImage` (`VARCHAR(500)`) and the Cloudinary profile-media pipeline already existed, so no migration was needed.

| Step | Contents | Persistence |
| --- | --- | --- |
| 1. Account & personal | Name, mobile, email, password + confirm (new accounts only), division/district, present/permanent address | Unchanged: `POST /api/mediaworld/signup` for visitors, `PATCH /api/mediaworld/profile/personal` for signed-in professionals. The step now also captures the generated `username` from the response. |
| 2. Profile photo | 512×512 canvas cropper: drag to reposition, zoom 1–3, reset/cancel, live preview debounced from `canvas.toDataURL` | `POST /api/profile/media` (existing, session-protected) with the cropped JPEG as `kind=profile`; Cloudinary stores `twingface/profiles/{userId}/avatar` with `w_512,h_512,c_fill,g_face` delivery. Photo is optional ("Skip for now"). |
| 3. Professions | Existing taxonomy picker (industry → category → designation, multi-add) | `POST /api/mediaworld/identities`, unchanged |
| 4. Review & save | Personal + address + photo thumbnail + public link + grouped professions; preview panel hidden so the summary spans the card | `POST /api/mediaworld/setup/complete` now also returns `{ username, identities }`; the client opens `/mediaworld/talent/{username}` |

**Layout.** Steps 1–3 render `mw-setup-layout` as a 1.6fr / 0.9fr grid inside a 1120px card (measured at a 1200px viewport: 676px + 380px); the preview is `position: sticky; top: 18px`. Step 4 switches to `mw-setup-layout review` (single column) and unmounts the preview. Below 1024px the grid collapses to one column with the preview after the form; below 640px the card padding, progress chips and photo circle shrink.

**Public profile redirect.** The finish handler prefers the `username` returned by setup-complete, falling back to the one captured at signup, and calls `window.location.assign('/mediaworld/talent/' + encodeURIComponent(handle))`. `/mediaworld/talent/[username]` already renders the photo, handle, location and identity chips for `PROFESSIONAL` accounts, so this is the real newly created profile (the legacy `/mediaworld/profile/[userId]` remains a separate MediaProfile feature).

**Session continuity.** Signup creates the session mid-wizard, which can re-render the page. The step is mirrored to `sessionStorage` (`twingface.mediaworld.setup-step`) and restored once on mount, so the photo step is not skipped after step 1; the key is removed on finish.

**Tests.** 708 tests in 114 files green (one new register source test asserting `initialPhoto`/`initialUsername`, `/api/profile/media`, `/mediaworld/talent/` and the preview class; setup-complete assertions updated for `{ username, identities }`). ESLint and `tsc --noEmit` clean; `next build` exit 0.

**Live verification (`next dev` on 3001, real `public/rima.jpg`).**

| Check | Result |
| --- | --- |
| Typing in step 1 | Preview name, initial, division · district, address, phone and email update immediately; handle appears as `@nadia.rahman-wqr6se` after signup |
| Step 1 submit | `POST /api/mediaworld/signup` 201 → step 2 (not skipped), preview shows the generated handle |
| Upload `rima.jpg` | Crop canvas 512×512 rendered at 340px; preview avatar becomes the cropped JPEG data URL; zoom 1 → 2 changes the preview image hash |
| Save photo | `POST /api/profile/media` 200 → `https://res.cloudinary.com/…/twingface/profiles/cmvnmz0tq0000wmu0f0nfsjj3/avatar.jpg`; preview and step 3 show the Cloudinary image |
| Add Film → Acting → Actress, then Natok → Acting → Actor | Two identities added, preview shows both chips |
| Review step | `mw-setup-layout review`, preview unmounted, summary shows the photo, all address rows, `/mediaworld/talent/nadia.rahman-wqr6se` and both professions |
| Save & finish | `POST /api/mediaworld/setup/complete` 200 → `/mediaworld/talent/nadia.rahman-wqr6se` with photo, name, handle, `📍 Dhaka · Dhaka`, Film/Natok groups and both designations |
| Desktop layout (1200px frame) | Card 1120px, columns 676/380, preview `position: sticky; top: 18px` |

Cleanup: scratch user, its sessions and identities deleted (0 `zz-*` accounts remain), Cloudinary asset `twingface/profiles/cmvnmz0tq0000wmu0f0nfsjj3/avatar` destroyed (`result: ok`), dev server stopped.

**Honest deviations.** Persistence stays progressive (account at step 1, identities per add, photo on save, verification on finish) rather than a single save at the end; the photo is optional so an account can be completed without one; drag-to-reposition was exercised through the zoom path in the browser rather than a synthetic pointer drag (the in-app browser supplies no real viewport). Nothing was committed or pushed.

## Talent profile upgrade: showcase, privacy, rates, links, editor, messaging (2026-10-26)

The Media World talent profile (`/mediaworld/talent/[username]`) and its backend were extended in place. No other module's routes, schemas or components were changed; the only shared files touched are `src/app/dashboard.css` (new `.mw-*` block appended), `src/lib/message.ts` + its test (conversation-level messaging exception) and `prisma/schema.prisma` (additive models/columns).

**Schema (migration `20261026120000_talent_showcase_and_settings`).** `TalentShowcaseItem` (`userId`, `kind` `PHOTO|VIDEO`, `url`, nullable Cloudinary `publicId`, optional `title`, `position`) cascades from `User` and is indexed by `userId, kind, position`. `TalentProfileSettings` is a one-to-one row per user with WhatsApp, five social URLs, per-day/week/month rates, and five booleans (`showPhone`, `showEmail`, `showAddress`, `showWhatsapp`, `showRates`; only rates default public). `DirectConversation.mediaWorldMessagingEnabled` mirrors the existing marketplace flag so a professional's profile can open a conversation without friendship.

**APIs (all `runtime = 'nodejs'`).** `POST/GET /api/mediaworld/showcase` lists the owner's items and accepts either a multipart photo (validated MIME + magic bytes, 5 MB, max 10, Cloudinary folder `twingface/mediaworld/showcase/{userId}`, stored transformed URL + public id) or a JSON video `{ url, title }` (http/https, max 5). `PATCH/DELETE /api/mediaworld/showcase/[id]` is ownership-scoped (404 for other users), only edits title (photos) or title/URL (videos), refuses clearing a video URL, deletes the row then best-effort destroys the photo; a failed row delete keeps the asset. `PATCH /api/mediaworld/profile/details` saves bio/division/district/addresses with district-in-division validation. `PATCH /api/mediaworld/profile/talent` upserts the rate/links/privacy row and normalises URLs; BD mobiles accept `01…`, `880…` or `+880…` and store `+880…`. `POST /api/mediaworld/talent/[username]/message` upserts the sorted-pair conversation with `mediaWorldMessagingEnabled: true` and returns its id; `canUseDirectConversation` now returns `Boolean(marketplace || mediaWorld)` for the exact pair only.

**Server-side privacy, not just hidden JSX.** Client components serialise their props into the RSC payload, so `prepareTalentProfile` (`src/lib/mediaworld/talent-profile-view.ts`) redacts on the server: a non-owner receives `null` for private phone, email, WhatsApp and both addresses, plus rates when they are private, together with a `hidden` map. Verified against the raw visitor HTML: none of the private strings appear anywhere in the payload, while the public phone, formatted rates (`৳5,000/25,000/90,000`), socials, gallery and video caption do. The profile renders `🔒 Private` rows and a "some details are private — message directly" note for withheld fields, and a lock note instead of the rate card when rates are private.

**Editor (`/mediaworld/talent/[username]/edit`).** Owner-only (anyone else gets 404). Reuses `ProfileMediaUploader` for profile/cover with live header state, the address/bio form, the existing `ProfessionalStep` identity picker, the new `ShowcaseManager` (photo grid + upload tile, video list, add form, edit and delete modals with `role="dialog"`, Escape-to-close, per-item error/limit messaging) and a links/rates/privacy card. Save actions are deliberately separate ("details", "links & privacy", each portfolio action) so a failed section never discards another.

**Public page.** Cover header with avatar, socials as icon badges, portfolio grid with lightbox and video modal/embed (YouTube/Vimeo; other hosts fall back to an external link), rate card, contact rows with owner Public/Private tags, and a Send Message button for non-owners that posts the conversation and routes to `/messages/{id}`.

**Verification (production build on :3000, one scratch professional + one scratch viewer).** Uploaded a cover and avatar through the real uploader, two portfolio photos (one later deleted through the confirm modal), a YouTube link added then edited through its modal, saved bio + Chattogram/Chattogram, all five socials, a local-format WhatsApp, three rates and privacy (phone public; email/WhatsApp/addresses private; rates public), then flipped rates private via the settings API and back. As the viewer: profile 200, phone and rates visible, email/WhatsApp/addresses absent from the HTML, `Private` rows present, portfolio/video/socials present, `Send message` created the conversation (`mediaWorldMessagingEnabled: true`) and landed on `/messages/{id}` with a composer. Email and phone logins each returned 200 with a session cookie.

**Bug found and fixed during verification.** The owner's Public/Private badge used the owner-overridden `visible` flag, so every own row read "Public" even when visitors saw `Private`. `ContactRow` now takes a separate `shared` value derived from the saved setting; live check returned `Phone Public`, `Email/WhatsApp/addresses Private` with the real values still visible to the owner.

**Tests and gates.** 754 tests in 120 files green (46 new: showcase routes CRUD/limits/rollback, showcase schema/helpers, talent settings + details schemas, `prepareTalentProfile` serialisation guards, Media World message route, message access exception, editor wiring/redaction source checks). ESLint clean, `tsc --noEmit` clean, `next build` exit 0 (`/mediaworld/talent/[username]` 9.5 kB, `.../edit` 11.4 kB).

Cleanup: both scratch users, 4 sessions, 1 identity, 1 settings row, 2 showcase rows, 1 conversation and their cascade rows deleted after asserting the accounts were test-only (no posts/pages/groups/listings/complaints/bookings); 3 Cloudinary assets destroyed (showcase photo, avatar, cover) with no failures; 0 `zz.*` accounts remain; bridge and production server stopped. Nothing was committed or pushed.

**Honest deviations.** Videos are stored links (YouTube/Vimeo/Cloudinary page URLs), not uploaded video files; showcase photos are capped at 10 and videos at 5 as specified. "Visitors" must be signed in, matching the existing module-wide login gate (`/for-rent`, `/mediaworld/talent`, etc. all redirect to `/login`). The profile editor intentionally does not reorder showcase items; ordering follows upload time (`position` is reserved for a later drag sort).

## Optional About Me / Bio across signup, preview, profile and editor (2026-10-26)

**Schema.** No migration: `User.bio String? @db.VarChar(500)` already existed and was already selected by `talentProfileSelect`. This batch is wiring, not storage.

**Validation and APIs.** `mediaWorldSignupSchema` and `mediaWorldPersonalSchema` now accept `bio` as optional, trim it, cap it at 500 and normalise a blank string to `null` via the existing `optionalTrimmedText` helper. Signup persists it in `prisma.user.create` and returns `bio: true`; `PATCH /api/mediaworld/profile/personal` already spreads validated data and now also selects bio. The editor's `PATCH /api/mediaworld/profile/details` path already saved bio.

**Wizard + live preview.** `SetupPersonal`/`EMPTY_PERSONAL` gained `bio`; the register page selects and maps it. Step 1 has a wide `#mw-setup-bio` textarea (rows 3, `maxLength=500`, hint, live counter, optional). The preview card renders `.mw-preview-bio` under the division/district line, with muted `is-empty` styling until text is typed. After save the server-normalised bio is mapped back into state, so whitespace-only input clears.

**Public profile.** A prominent About Me card sits directly under the header (`.mw-talent-about-card`), rendering the bio in `.mw-talent-profile-desc`; the duplicate bio in the header was removed. An owner with a bio gets “Edit bio” linking `${editHref}#about`; an owner without one gets dashed empty-state copy plus an “Add Bio” button; visitors see a muted “not added yet” line and no action. The editor's About section now has `id='about'`, so the anchor lands on the bio textarea.

**Verification (`next dev` :3001, two throwaway accounts).**

| Check | Result |
| --- | --- |
| Type a 75-char bio in step 1 | `.mw-preview-bio` matched instantly, counter `75/৫০০`, empty class removed |
| Submit step 1 | 201, step 2, generated handle; profile showed the same bio in the About Me card and an `Edit bio` link to `#about`; header bio absent |
| Edit bio in the owner editor | Saved alert `প্রোফাইলের তথ্য সংরক্ষিত হয়েছে।`; profile reload showed the new text |
| Clear bio | Owner profile showed the empty state and the “Add Bio” button |
| Second signed-in account views it | Visitor line “not added yet”, no Add Bio, Send Message action present (non-owner) |
| Cleanup | Guarded delete of exactly the two `zz.bio.*` users (cascade removed their sessions); 0 remain; temp script removed; server stopped |

**Tests and gates.** 762 tests in 120 files green (8 new: optional/blank/over-limit bio in both schemas, signup persistence and null-on-blank, personal PATCH update/clear, register source wiring, About card + editor anchor). ESLint clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**UI finish-gate refinements.** The bio textarea in step 1 and the editor now expose `aria-invalid` and `aria-describedby` (hint, counter, error) with stable ids; the hint/counter sit in a wrapping `.mw-bio-meta` row instead of inline alignment; the owner “Add Bio” pill has a `:focus-visible` ring. The first rebuild after the UI verifications failed with `PageNotFoundError: /_document` because the dev server had rewritten `.next`; stopping the stale `next start`, clearing `.next`, and rebuilding produced a clean 84-route build, after which the port-3000 preview server was restarted and returns 200.

## Web Interface Guidelines audit of the bio surfaces (2026-10-26)

All findings from a Vercel Web Interface Guidelines review, scoped to the About Me/bio UI, were applied.

- **Wizard step 1:** every control now has a `name`; the bio textarea sets `autoComplete='off'`; address placeholders end with `…`; the submit button swaps to `t.saving` and sets `aria-busy`; `validatePersonal` and server field errors move focus to the first invalid field; the crop canvas is keyboard operable (`role='img'`, `tabIndex=0`, arrow keys pan, `+`/`-` zoom) with the hint line naming the keys; the saved/review/preview images carry `width`/`height` and the preview avatar is `fetchPriority='high'`.
- **Public profile:** cover, avatar and logos carry `width`/`height` (avatar high priority, logos lazy), the @handle is `translate='no'`, and the owner link reads “Edit Bio”.
- **Editor:** bio, selects and address fields have `name` (bio also `autoComplete='off'`), `saveDetails` focuses the first rejected field, media images are sized, and `#about` shares the 16px scroll margin with `#rates`.
- **CSS:** card-head links gained hover and `:focus-visible`, the bio paragraph uses `overflow-wrap:anywhere`, the shared CTA gained `:focus-visible` and `:disabled` styling, and the crop canvas has a focus ring.

**Verification (production build on :3000).** Browser DOM on `/mediaworld/register` confirmed the names, `autoComplete` values, `…` placeholders, and that an empty submit focuses `mw-setup-name` with its error visible. A throwaway `zz.webguide.*` account (guarded delete afterwards) confirmed via server-rendered HTML: About card and bio copy, `translate="no"`, "Edit Bio", sized images on profile and editor, editor field names, and the new CSS rules. The shared dashboard-navbar avatar is still unsized — outside the reviewed surfaces. 765 tests in 120 files green (3 new source checks), ESLint and `tsc --noEmit` clean, `next build` exit 0 (84 routes), 0 scratch users remain, temp script removed. Uncommitted; nothing pushed.

## Vercel React best-practices pass (2026-10-26)

A review against the `vercel-react-best-practices` skill (70 rules) on the Media World bio surfaces produced one applied change and four deliberate rejections.

- **Applied — eliminating waterfalls (`async-parallel`).** The session lookup now starts before the route params resolve and runs concurrently with the data it does not depend on: profile in `/mediaworld/talent/[username]` and `/edit`, browse + taxonomy in `/mediaworld/talent`, taxonomy in `/mediaworld/register`. Authorization still runs before any render, and every promise is awaited inside the same `Promise.all`/`try` so a redirect cannot leave a dangling rejection.
- **Rejected — `bundle-dynamic-imports` for `OnboardingWizard`.** A `next/dynamic` import was built and the production HTML inspected: from a Server Component Next still emits the deferred chunk as an eager `<script src>`, so no bytes were saved. The change was reverted rather than kept as indirection.
- **Rejected — `React.cache` on `getCurrentUser`.** Every page and route handler calls it once or twice at the top of its own request; there is no repeated call to deduplicate, and the helper is shared by 180 files and many route tests.
- **Rejected — cross-request caching for `getTaxonomySnapshot`.** Admin taxonomy edits must be visible on the next load, so LRU/`unstable_cache` would trade correctness for a query count.
- **No issue found — hot paths.** `ProfessionalStep` already uses memoized key `Set`s and grouped `Map`s, `loadOnboardingState` already batches its four queries, showcase/gallery keydown listeners attach only while a lightbox is open, regexes are module-level, and both showcase splits are over arrays capped at 15 items.

**Verification.** ESLint and `tsc --noEmit` clean, 120 test files / 765 tests green, `next build` exit 0, `/mediaworld/register` 200 on the restarted :3000 preview. A throwaway `zz.perf.verify.*` account signed up through the API and both `/mediaworld/talent/{username}` and `/edit` returned 200 with their server-rendered markup; the guarded purge removed the account (0 rows left) and the temp script was deleted. Uncommitted; nothing pushed.

## Talent profile redesign to the Media Professional reference (2026-10-26)

The public profile at `/mediaworld/talent/[username]` was rebuilt to the supplied reference: a full-width cover hero with an overlapping avatar, verified-account badge, name, `@handle`, location and account-type chip; a four-cell stats strip; and a two-column body (About, Professional Identities, Portfolio Showcase, Experience & Skills, Reviews on the left; Contact, Rate Card, Booking / Availability, Social Links and a visitor CTA on the right). The global Twingface `DashboardNavbar` is untouched and the old profile sub-bar (`.mw-talent-profile-bar`) was deleted.

- **Honest data only.** Stats show real counts (portfolio items, services) and `—` where no model exists; Experience & Skills and Reviews render explicit empty states rather than invented history. Visitor contact rows keep server-side redaction and show Private/Public pills or a muted note.
- **Follow is real.** New additive `TalentFollow` model/migration (`prisma/migrations/20261026190000_talent_follows`), `POST`/`DELETE /api/mediaworld/talent/[username]/follow` (404 for missing/non-talent, 400 for self, 401 unauthenticated) and a `FollowButton` with `aria-pressed`. The page loads viewer follow state in the same `Promise.all` as the listings.
- **Booking requests use existing messaging.** `BookingRequestCard` opens the thread via `POST /api/mediaworld/talent/[username]/message`, then sends `Booking request\nDate: …\nProject type: …` through `POST /api/conversations/[id]/messages` and routes to the thread. No new endpoint.
- **Showcase gallery.** All/Photos/Videos tabs with counts, unified cards, Photo/Video badges, and a YouTube poster thumbnail (`showcaseVideoThumbnail`) with a fallback tile plus play badge for other hosts. Existing lightbox and video modal kept.
- **CSS.** New `mw-tp-*` hero/stats/columns/card system, shared `mw-btn` variants, contact rows, showcase tabs/cards and booking form in `dashboard.css`; card headings render in title case, rates sit three-across on desktop, and `#about/#rates/#booking/#social` share a 16px scroll margin.

**Verification (production build, :3000 preview).**

| Check | Result |
| --- | --- |
| Owner profile | Name, `@handle`, "Media professional" account chip + verified aria-label, location; stats `Portfolio Items 2 / Experience — / Services 3 / Reviews —`; all nine card headings; tabs `All 2 / Photos 1 / Videos 1`; five edit links; no sub-bar |
| Visitor profile | Hero actions `Follow / Message / Book / Request Service`; phone, WhatsApp and both addresses `Private`, email visible; booking form present; CTA names the talent |
| Follow | Toggle to `aria-pressed=true`, label `Following`, no error; state persisted after reload; toggled back off cleanly |
| Booking | Submitted 2026-11-15 / TVC / Commercial → routed to the message thread containing the booking request |
| Cleanup | Showcase items deleted through `DELETE /api/mediaworld/showcase/[id]` (Cloudinary asset removed), then guarded Prisma deletion of exactly the two `zz.profile.qa-*` / `zzvisit*` users (0 remain); temp verify dir removed; preview stopped |

**Tests and gates.** 122 files / 781 tests green (19 new: follow API, showcase thumbnail, profile layout and booking flow source checks), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Live re-check on a real profile (2026-10-27).** Viewing `/mediaworld/talent/robin-t7gad9` as a fresh throwaway account exposed two visitor-only gaps the earlier owner test had hidden: a profile with no rates rendered no Rate Card at all, and a profile with no socials rendered no Social Links card. Both now always render, with the reference's “No rate card has been added yet.” plus “+ Add / Contact for Rates”, and a visitor-specific “This profile has not added social links yet.” line (owners keep their editor links). Re-verified after rebuild; the throwaway viewer was cascade-deleted (0 `zzcheck*` rows) and the temp dir removed.

**Join as Professional navigation fix (2026-10-27).** The `/mediaworld` hero CTA kept its `next/link` href but now calls `window.location.assign('/mediaworld/register')` on click, forcing a full document load. Reproduced the failure mode first: with JS chunks blocked (a tab left open across a rebuild), client-side navigation landed on “Something went wrong — Loading chunk failed”; after the change the same test renders the register wizard HTML. Normal mouse click still lands on `/mediaworld/register` (200). Gates: 122 files / 781 tests green, lint + `tsc` clean, build exit 0.

## Join as Professional popup + ChannelHub placeholder (2026-10-27)

> **Superseded on 2026-10-29** — the popup was deleted at his request; see "Revert: the Join as Professional popup is gone" at the end of this ledger. The `/channelhub` placeholder page **stayed**.

The `/mediaworld` hero CTA no longer navigates; it opens a **centered popup window** with exactly three destinations — Media World → `/mediaworld/register`, For Rent → `/for-rent`, ChannelHub → `/channelhub` — each rendered as an option card with a custom inline-SVG icon (film strip / camera / TV), label and one-line description, plus a trailing arrow. The trigger carries its own sparkle icon and `aria-haspopup='dialog'`.

**Popup implementation.** `src/components/mediaworld/join-modal.tsx` is a client island modelled on the existing complaint modal: `role='dialog'`, `aria-modal='true'`, `aria-labelledby`/`aria-describedby`, close button, backdrop, Escape handler, backdrop dismissed only when the press target is the backdrop itself, body scroll lock with overflow restore, focus moved to the first option on open and returned to the trigger on close, and `Link` navigation that closes the popup. Styling lives in `dashboard.css`: blurred navy scrim, radial-gradient card, gradient icon tiles per tone (blue/amber/violet), hover lift, `mw-join-pop` entrance animation with a `prefers-reduced-motion` opt-out, and full-width mobile rules. The earlier `<details>/<summary>` disclosure was removed, including its `.mw-join-wrap`/`.mw-join-menu` CSS and tests.

`/channelhub` did not exist, so at the user's choice a themed placeholder route was added at `src/app/(main)/channelhub/page.tsx`: session-gated, keeps the global `DashboardNavbar`, and renders a coming-soon card with links back to Media World and For Rent.

**Verification (production build on :3000, headless Chromium).** With a throwaway session: the dialog is absent and body overflow untouched before any click; a real mouse click opens it with `role=dialog`, 3 option cards (1 icon each, tones blue/amber/violet), working close button, body overflow `hidden`, and a 560×430 panel fully inside a 1280×900 viewport. Escape and a backdrop press both close it, overflow is restored, and focus returns to the trigger; the close button does the same. All three options navigate to their destinations (`/mediaworld/register`, `/for-rent`, `/channelhub`) and no scroll lock leaks afterwards. On 390×844 the panel is 366px wide (12→378) with no horizontal overflow and the For Rent option navigates. No runtime exceptions (`errors: []`). Scratch `zzpopupverify` account deleted via prefix guard (sessions first, then user; 0 `zz*` remain), temp verify dir removed. Gates: 124 files / 790 tests green (new `join-modal.test.ts` plus updated platform checks), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

## /mediaworld mobile layout (2026-10-27)

**Root cause.** `.mediaworld-platform-layout` was a two-column grid (`238px minmax(0,1fr)`) with no breakpoint, so at 390px the sidebar left ~100px for the main pane and the hero, search and action buttons were clipped off-screen. The inner sections already had 1100/860/700/520 rules; only the shell was never reflowed.

**Fix.** At `≤860px` the layout becomes one column and the sidebar turns into a horizontal, scrollable chip rail (quick links + section nav); the long category/division lists, menu labels, divider, title and premium promo are hidden there because the hero already exposes search/category/division filters and the global navbar covers navigation. Page padding tightens at 860 (18/16) and 520 (14/10). At `≤520px` the stacked hero actions get `flex:0 0 auto` — the inherited `flex:1 1 150px` was stretching each button to ~160px tall in the column layout.

**Verification (production build on :3000, headless Chromium).**

| Viewport | Result |
| --- | --- |
| 390×844 | `scrollWidth == innerWidth == 390`; hero 10→380; chip rail 60px tall and horizontally scrollable; hero buttons 344×45; Join popup 366px wide with 3 options and no overflow; For Rent option navigates |
| 360×780 | Same layout: no overflow, rail row, hero actions inside viewport |
| 768×1024 | Single column, hero 16→752, chip rail 61px |
| 1280×900 | Unchanged desktop: 238px column sidebar, filter menus visible |

No runtime exceptions; scratch `zzmobileverify` deleted (0 `zz*`), temp dirs removed. Gates at the time: 123 files / 786 tests green (new mobile-layout source checks), ESLint + `tsc` clean, `next build` exit 0. The suite is 124 files / 790 tests after the popup conversion above. Uncommitted; nothing pushed.

## Talent profile layout restructure — Tailwind 2:1 grid (2026-10-27)

The public profile was restructured to the supplied section order using Tailwind only. Only three files changed: `src/components/mediaworld/talent/talent-profile.tsx`, its page container, and `talent-profile-layout.test.ts`; `dashboard.css`, the booking card, the gallery and the editor were not touched.

- **Container.** Root `mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8`. The page's `<main>` now carries `mw-talent-page max-w-none! px-0! py-0!` because `.mw-talent-page` caps at 1180px and unlayered `dashboard.css` wins over layered utilities; the class is kept for the `.app-shell:has()` background, and the important utilities restore the 7xl width. Verified root measures 1280 max-width with 32px side padding at 1280.
- **Grid.** `grid grid-cols-1 gap-6 lg:grid-cols-3`; left `lg:col-span-2`, right `lg:col-span-1`. Measured desktop columns 384.33 / 384.33 / 384.34 with 24px gap.
- **Left order.** About Me → (conditional business/rental info cards) → Portfolio Showcase (All/Photos/Videos tabs, grid, Manage portfolio) → Experience & Skills (real skills derived from professional identities, honest “No experience added yet” empty state) → Reviews & Ratings. Professional Identities moved out of the left column and the visitor “Interested in working with …” CTA was removed.
- **Right order (strict).** Booking / Availability → Contact Information → Professional Identities → Rate Card → Social Links. Booking keeps its `#booking` anchor, the exact copy “Visitors can send a booking request with their preferred date and project type.”, a green “Booking requests open” status strip and the `Open messages` button; visitors still get the existing `BookingRequestCard`. Contact rows are Tailwind with `bg-slate-800 text-slate-400` Private pills (owner sees Public/Private, visitor sees Private for withheld fields). Rate values use `whitespace-nowrap text-sm!` — the unlayered `.mw-rate-item strong` 18px rule otherwise wrapped `৳200,000` in the three-column sidebar.
- **Card skin.** `rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md space-y-4`. The old structural `mw-tp-card` / `mw-talent-profile-card` / `mw-tp-columns` / `mw-tp-main` / `mw-tp-side` classes were removed from the restructured sections so their unlayered padding/background/grid declarations cannot override the Tailwind layout; child widgets keep their own classes.
- **Test.** `talent-profile-layout.test.ts` now asserts the Tailwind grid, spans, container, card skin and both strict section orders instead of the retired CSS classes.

**Verification (production build on :3000, headless Chromium).** Desktop 1280: left headings exactly `About Me, Portfolio Showcase, Experience & Skills, Reviews & Ratings`; sidebar exactly `Booking / Availability, Contact Information, Professional Identities, Rate Card, Social Links`; 5 Private pills; card background `oklab(… / 0.8)`, 1px slate border, 12px radius, 20px padding, soft shadow; three rate values single-line at 14px. Mobile 390: one 358px column, `scrollWidth 390` (no overflow), same order. Tablet 768: one 705px column, no overflow. Console errors `[]`. Scratch `zzprofilecheck` deleted under the `zz` prefix guard (sessions/identities/settings/showcase/media profile first, then user; 0 `zz*` remain) and the temp verification dir removed.

**Gates.** 124 files / 792 tests green, ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Full-width follow-up (2026-10-27).** At 1920 the page hugged the left edge (0→1280) with a 640px empty strip on the right: `dashboard.css` begins with an unlayered `*{margin:0}`, which beats Tailwind's layered `mx-auto`, so the 7xl container never centered. The root now uses `mx-auto! w-full max-w-[1600px] px-4 py-6 sm:px-6`, matching `.topbar-inner` (1600 max, 24px padding). Measured after rebuild at 1920: root 160→1760 exactly aligned with the navbar, content 184→1736, columns 501.3/501.3/501.3. At 1440: full-bleed 0→1440 with 24px padding. At 768/390: unchanged single column, `scrollWidth` equal to the viewport (no overflow). The same cascade bug made `space-y-4` on the cards inert (computed child margins 0), so the card class now uses `flex flex-col gap-4` to get the intended 16px rhythm (page height grew 1743→1871 at 1920). `talent-profile-layout.test.ts` asserts `max-w-[1600px] px-4 py-6 sm:px-6`, `mx-auto!` and the flex card skin. Gates: 124 files / 792 tests green, lint + `tsc` clean, `next build` exit 0; scratch `zzfullcheck` guarded-deleted (0 `zz*` remain) and the temp verify dir removed. Uncommitted; nothing pushed.

**Booking calendar (2026-10-28).** New `src/components/mediaworld/talent/booking-calendar.tsx`: a client-only month popover opened by a calendar-icon trigger, with `aria-haspopup='dialog'`/`aria-expanded`, a labelled `role='dialog'`, prev/next month labels, Sunday-first grid, today ring, past days disabled, `aria-pressed` selection, a Clear action, Escape/outside-click close, and focus returned to the trigger. Dates are local-ISO so no timezone shift, and labels use `Intl` (`bn-BD`/`en-GB`). The owner Booking / Availability card now has an icon-only trigger in its header and shows the picked date (“নির্বাচিত তারিখ …”) without pretending availability data exists. Visitors get the same calendar in place of the native date input inside `BookingRequestCard`; the chosen date feeds the existing submit flow unchanged.

**Verification (production build, headless Chromium, 1440×900).** Owner: icon label “বুকিং ক্যালেন্ডার খুলুন”, opens dialog “বুকিং ক্যালেন্ডার” for অক্টোবর ২০২৬ with 31 day buttons and 27 past days disabled (today 2026-10-28), Escape closes and returns focus to the trigger, selecting ৩১ shows “নির্বাচিত তারিখ ৩১ অক্টো, ২০২৬”. Visitor: the date field is a button labelled “তারিখ বাছুন”, opens the same calendar, selecting ৩১ updates the trigger to “৩১ অক্টো, ২০২৬”, closes the dialog, and submitting the form routes to `/messages/cmvr0…` (the real thread). Gates: 124 files / **793 tests** green (new calendar source checks; the old `type='date'` assertion replaced), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Scratch `zzcalowner`/`zzcalviewer` guarded-deleted (0 `zz*` remain) and the temp verify dir removed. Uncommitted; nothing pushed.

**Permanent address removed (2026-10-28).** The field is gone from every UI surface and payload; existing stored values are preserved.

- **Public profile.** `talent-profile.tsx` no longer renders the Permanent Address row and the Contact Information card ignores it in `hasContactRows`/`anyContactHidden`. `talentProfileSelect` no longer selects the column, and `prepareTalentProfile` no longer carries a `permanentAddress` hidden flag or returns the value to the client (one less owner-supplied field in the RSC payload).
- **Editor.** `talent-profile-editor.tsx` drops the input, its state key, label, field id and error slot. `saveDetails` sends only bio/division/district/presentAddress, so a normal save can never null an old stored value.
- **Onboarding.** `setup-wizard.tsx` drops the input, state, validation, review row and labels; the signed-out step 1 now collects only Present address.
- **Schemas/APIs.** `mediaWorldSignupSchema`, `mediaWorldPersonalSchema` and `TalentProfileDetailsSchema` no longer accept the key (`.strict()` now rejects it, verified by a negative test); signup no longer writes it, the personal/details routes no longer select or write it.
- **Data.** `User.permanentAddress` and migration `20261025130000_user_addresses` stay untouched; no rows were updated or deleted, so historical values remain in the database if the field ever returns.

**Verification (production build on :3000, headless Chromium).** Signed-out `/mediaworld/register` step 1: fields are exactly `name, phone, email, password, confirmPassword, division, district, presentAddress, bio`; “Permanent address” absent, “Present address” present. Signed-in profile (`sujon.rana-dy3pgg`): Contact Information shows Present Address and no Permanent Address text. Editor: no `permanentAddress` field, Present address still present. Temporary verification session deleted by token hash (1 removed) and the temp dir removed; no scratch accounts created.

**Gates.** 124 files / **793 tests** green (updated fixtures in validations/signup/personal/showcase/profile-view/editor/register tests), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Preview restarted on :3000. Uncommitted; nothing pushed.

**Login after Media World registration verified (2026-10-28).** No code change was needed. Account `runa-kst3c7` (PROFESSIONAL) has email, phone and a password hash stored; `/api/auth/login` classifies the identifier and both signup and login normalize phones to `+880…` and emails to lowercase, so the registration credentials work at `/login`. End-to-end check with a disposable account through the real endpoints: `POST /api/mediaworld/signup` 201 → logout → email + password login 200 → logout → phone + password login 200 → owner profile 200 and the editor both render the registered email and phone. Public visitors still see phone/email/address as private until the owner enables “Show … publicly” (privacy defaults are off); the owner always sees them. Scratch `zz.login.check.*` account deleted (sessions first; 0 `zz*` remain), temp dir removed. Gates unchanged: 124 files / 793 tests. Uncommitted; nothing pushed.

**Profile width matched to the /mediaworld shell (2026-10-28).** The user found the talent profile too wide at 1600px. Its root is now `mx-auto! w-full max-w-[1440px] px-4 py-6 sm:px-6`, the same cap as `.mediaworld-platform-layout` (`width:min(1440px,100%)`). Measured in headless Chromium at 1920×1080: `/mediaworld` layout 233→1673 (1440px) and the profile 233→1673 (1440px) — identical left/right edges, 1392px of content after 24px padding, columns 448/448/448. At 1440 the profile is full-bleed (1425px with scrollbar) and at 390 it stays one 343px column with no overflow. Layout test now asserts `max-w-[1440px]`. Gates: 124 files / 793 tests green, lint + `tsc` clean, `next build` exit 0; temp verification session deleted and temp dir removed. Uncommitted; nothing pushed.

**Completed accounts no longer resume their own setup (2026-10-28).** Clicking “create account” while signed in as an already-finished professional (`robin-t7gad9`) landed on that account's own step-3 wizard, because `SetupWizard` starts at step 3 for any authenticated session and `/mediaworld/register` prefilled the signed-in profile. The page now computes `setupComplete = isProfessional && account.username && identities.length > 0`; when true it renders the new `src/components/mediaworld/onboarding/account-ready-panel.tsx` instead of the wizard. The panel is bilingual (en/bn), names the signed-in account (`@username`), links to the public profile and editor, and offers “Sign out & create a new account”, which `POST`s `/api/auth/logout` and then full-navigates to `/mediaworld/register`, so the wizard opens signed out at step 1. Incomplete professional setups (account type set, zero identities) still resume at step 3, and non-professional accounts still get `OnboardingWizard`. Styles are `.mw-account-ready*` in `dashboard.css` (720px panel, wrapping actions, full-width stacked actions below 640px).

**Verification (production build on :3000, headless Chromium, disposable completed PROFESSIONAL account created through the real signup/identity/complete endpoints).** `/mediaworld/register` rendered the “already registered” panel with the account name and handle, no wizard fields (`wizardVisible: false`), profile links to `/mediaworld/talent/<handle>` and `/mediaworld/talent/<handle>/edit`, no horizontal overflow at 1440 or 390 (`buttonFullWidth: true` on mobile). Clicking the sign-out action produced `POST /api/auth/logout` 200 → `/mediaworld/register` with nine step-1 fields and no panel. Scratch account deleted via guarded SQL (`zz.ready.%@example.test`, sessions and identities first); the credentials now return 401 and the temp dir is removed. Gates: 124 files / **795 tests** green (two new register source tests), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Already-registered gate replaced by a profile redirect (2026-10-28, supersedes the previous entry).** The user rejected the “You are already registered” panel: “if already registered, keep them logged in; otherwise register; remove that already-registered interface”, and “only Join as Professional creates an account; Login signs people in”. The panel component and its CSS were deleted. `/mediaworld/register` now, for a signed-in professional whose setup is complete (account type + username + ≥1 identity), calls `redirect('/mediaworld/talent/<username>')` — so clicking Join → Media World as a finished account lands on that account's profile, logged in, instead of any wizard or panel. Unfinished professional setups still resume at the wizard, and signed-out visitors still get the registration wizard. The hero Login modal (`ai-login-modal.tsx`) is now titled “Media World Login” (bn: “মিডিয়া ওয়ার্ল্ড লগ ইন”) instead of “AI Login”, and its account-creation link points at `/mediaworld/register` rather than the generic `/register`, so account creation stays inside the Media World flow.

**Verification (production build on :3000, headless Chromium).** Signed-out `/mediaworld/register`: nine step-1 fields, no “already registered” copy. Completed disposable account: `/mediaworld/register` → `/mediaworld/talent/<handle>` with the profile hero and no wizard; landing → Join as Professional → Media World option → same profile redirect. Login modal shows the new title and signup href, signs in with the registered email/password, returns to `/mediaworld`, and `/mediaworld/register` then lands on that account's profile. Unfinished account (signup only, zero identities) still resumes step 3 with the identity picker. Scratch `zz.flow.*` accounts deleted via guarded SQL (login now 401 for both), temp dir removed. Gates: 124 files / **796 tests** green (register test now asserts the redirect and the modal's Media World sign-up link), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Logout added to the Media World profile hero (2026-10-28).** The user could not find a sign-out option on `/mediaworld/talent/[username]`. The owner actions now render `MediaWorldLogoutButton` (new `src/components/mediaworld/talent/mediaworld-logout-button.tsx`, `mw-btn mw-btn-secondary`, `data-testid='mediaworld-logout'`) immediately before “Edit profile”. It is bilingual (en “Log out”/bn “লগ আউট”), POSTs `/api/auth/logout`, full-navigates to `/login`, shows “Signing out…” while busy, and renders an inline `role='alert'` error if the request fails. It is rendered for the profile owner only; visitors keep Follow / Message / Book, and the navbar avatar menu keeps its existing logout item. No other page was changed.

**Verification (production build on :3000, headless Chromium, 1440×900).** Disposable completed PROFESSIONAL owner: own profile shows exactly two hero actions — “লগ আউট” and “প্রোফাইল সম্পাদনা”, no overflow. Clicking logout produced `POST /api/auth/logout`, landed on `/login`, and `/mediaworld/register` then rendered signed-out step 1 with no logout button (session cleared). Second disposable viewer: the same profile shows Follow / Message / Book and **no** logout button. Scratch `zz.logout.*` accounts guarded-deleted (login now 401 for both), temp dir removed. Gates: 124 files / **797 tests** green (new hero-logout assertion), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Logout now returns to the public /mediaworld (2026-10-28, supersedes the logout destination above).** The user wanted the profile's logout to land on `http://localhost:3000/mediaworld`, not `/login`. `src/app/(main)/mediaworld/page.tsx` therefore no longer redirects signed-out visitors: it keeps the `SUPER_ADMIN` redirect, renders `DashboardNavbar` only when a session exists, and always renders `MediaWorldPlatform` with the safe listing preview. `MediaWorldLogoutButton` now calls `window.location.assign('/mediaworld')`. Because the landing is public, `GET /api/mediaworld` — fired by the landing's search effect on mount and on every filter change — no longer requires a session; it still selects only `safeMediaWorldListingSelect` fields (no email, phone or address), and its test now asserts anonymous 200 with no contact fields instead of 401. `/mediaworld/talent/[username]` and `/edit` remain session-gated.

**Verification (production build on :3000, headless Chromium).** Signed-in `/mediaworld` still shows the navbar and Login/Join. Clicking the profile logout produced `POST /api/auth/logout` 200 and landed on `/mediaworld` with the session cleared: path `/mediaworld`, navbar absent, Login + Join as Professional + sidebar present, no horizontal overflow at 1440×900 or 390×844. Anonymous `/mediaworld` and anonymous `/api/mediaworld` (including `?q=camera`) both return 200. Scratch `zz.home.owner.*` deleted (login now 401), temp dir removed, debug ports closed. Gates: 124 files / **798 tests** green (new public-landing and public-directory assertions), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview restarted on :3000. Uncommitted; nothing pushed.

**Super-admin route typo fixed (2026-10-28).** Internal links and redirects pointed at `/super-admin` (hyphen) while the App Router page lives at `/super_admin` (underscore); live check showed `/super-admin` 404 and `/super_admin` 307 (login redirect). Fixed the sign-in redirects (`src/app/(auth)/auth-form.tsx`, `src/app/(auth)/login/login-form.tsx`), the Find Talent admin button (`src/app/(main)/mediaworld/find-talent/page.tsx`) and the console's brand + Dashboard nav (`src/components/super-admin/super-admin-dashboard.tsx`). Added `src/lib/super-admin-routes.test.ts`, which walks `src/**/*.{ts,tsx}` and fails if any file still contains a `/super-admin` URL literal, plus a positive assertion in `auth-form.test.ts` for both login forms. No alias route was added. Verification: zero stray literals; the production login chunk contains `? "/super_admin" : "/dashboard"`; `/super_admin` stays 307 auth-gated; `/super-admin` stays 404. The live admin sign-in itself was not repeated (admin credentials were not used). Gates: 125 files / **800 tests** green, ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview restarted on :3000. Uncommitted; nothing pushed.

**Auth rate limiting + login timing oracle closed (2026-10-28).** `POST /api/auth/login` no longer verifies Argon2 only when the account exists: it now always runs `verifyPassword` against the stored hash or `DUMMY_PASSWORD_HASH` (a fixed hash of a random throwaway password in `src/lib/auth.ts`), so response timing cannot reveal whether an identifier is registered. Both branches still return the same generic 401. Throttling is DB-backed in the new `RateLimitCounter` model (`rate_limit_counters`, keyed by varchar primary key, indexed `reset_at`), migrated by `20261027120000_add_rate_limit_counters` and `20261027120500_rate_limit_timestamptz`. `src/lib/rate-limit.ts` does a single-statement `INSERT … ON CONFLICT DO UPDATE` with window rollover so concurrent requests cannot overshoot, returns DB-computed `Retry-After`, prunes expired rows when a fresh window starts, and builds keys from the first `x-forwarded-for` hop (`x-real-ip` fallback, shared `unknown` bucket). Limits: login 30 attempts per IP per 15 min and 5 per identifier per 15 min (identifier bucket is consumed before the user lookup and cleared after a successful sign-in, so 429s do not enumerate accounts); `/api/auth/register` and `/api/mediaworld/signup` 5 attempts per IP per hour. Over-limit responses are `429 {"error":"Too many attempts. Please try again later."}` with `Retry-After`. The first `timestamptz` pass was needed because the `timestamp(3)` column was round-tripped as UTC by Prisma while the DB session runs Asia/Dhaka, which inflated `Retry-After` to ~22500s; live check now reports 900.

**Verification (production build on :3000).** Seven sequential bad logins for a probe identifier: five 401s, then 429 with `retry-after: 900` and the generic message; a sixth attempt from a different forwarded IP still got 429, confirming the per-identifier bucket. The atomic upsert was also probed directly (1→2→3 counts, timestamptz round-trip, retry 888s mid-window). All probe counters were deleted; `rate_limit_counters` is empty again. The live timing parity itself was not measured (no real credentials were used); the dummy-hash path is asserted by unit test. Gates: 126 files / **816 tests** green, ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview restarted on :3000. Uncommitted; nothing pushed.

**Media World login modal lands on the profile (2026-10-28).** After a successful sign-in the modal used to assign `/mediaworld`, so the member just saw the landing again (the reported “signing in but no profile”). `POST /api/auth/login` now also returns `accountType`, and the modal calls the new pure helper `src/lib/mediaworld/post-login.ts`: super admins → `/super_admin`, accounts with an `accountType` and username → `/mediaworld/talent/<username>`, plain accounts → `/dashboard` (they have no Media World profile page), missing payload → `/mediaworld`. `window.location.assign` keeps it a full navigation so the new session cookie is used.

**Verification (production build on :3000, browser-use in the user's live browser).** Disposable PROFESSIONAL account (`zz.login.flow-qc94yp`) created through the real signup endpoint; signed out landing → hero Login modal → ID + password → Sign in landed on `http://localhost:3000/mediaworld/talent/zz.login.flow-qc94yp` with `document.title` “Talent profile - TwingFace Media World”, the profile root and the account name as `h1` (not a 404). The test session was logged out, the browser returned to `/mediaworld` signed out, the account was guarded-deleted (email prefix + `zz.` username checks; sessions and follows removed; 0 `zz*` users remain) and all probe rate-limit counters were deleted (table empty). Gates: 127 files / **823 tests** green (new `post-login.test.ts` + modal source assertion), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0. Uncommitted; nothing pushed.

**Audit batch: fake claims, dead links, error leak and contact privacy (2026-10-28).** Six items from “project er remaining issues chack koro” → “baki shob fix kore rakho”.

- **Fabricated claims in the `/mediaworld` shell.** `ServiceCard` and `AvailableServiceCard` no longer render the hardcoded `★ 4.9`, `★ 4.9 (28)` or `● Verified` — the schema stores no ratings or moderation verdicts, so those were invented facts. The “চেষ্টা করুন” retry was a no-op `onClick={() => undefined}`; it is now a real reload (`reloadKey` state added to the browse effect's dependencies) that re-runs the same query. `setTimeout(..., 0)` for the “Search” button was a fake debounce and now applies the query immediately.
- **Dead controls made real.** Top-nav items and every rail “দেখুন সব” button previously reassigned state that nothing read (`setActiveNav(item)` with no filtering) — they now scroll to the matching section id (`mediaworld-hero`, `mediaworld-available-services`, `mw-rail-rentals|talent|spots|misc`) and the rails' See-all applies the real filter (`setActiveCategory('ALL')` + scroll). The footer was pure fiction: `#camera`/`#privacy`/`#terms`/`#sitemap` anchors, social placeholders, the invented phone `+880 1700 000 000` and mail-to-hello all removed. Categories and Divisions columns are now buttons calling `filterFromFooter(category)` / `filterDivisionFromFooter(division)`, the Report-a-problem button opens the real `ComplaintDialog`, and the only contact left is `support@twingface.com` plus the physical address. New `.mediaworld-footer-grid button` skin in `dashboard.css` (needed because the unlayered `*{margin:0}` reset kills utility spacing).
- **Dead links.** `/settings` and `/friends/requests` were linked from the profile editor and the friends search but had no page. Both are now redirect routes (`/settings` → `/settings/profile`; `/friends/requests` → `/friends`, which already opens on its requests tab), so old bookmarks and in-app links keep working without duplicating a settings surface.
- **`/api/health` error leak.** The response embedded `String(dbError)` (driver message, and often host/credentials detail) into a JSON body. It now reports only `db.connected` plus latency and logs the real error server-side under `[health] database check failed:`.
- **Fabricated product surfaces removed rather than stubbed with lies.** Deleted `mediaworld-landing.tsx`, `mediaworld-content.tsx`, `mediaworld-layout.tsx` (unused prototypes full of fake stats), `ai/twingface-ai-workspace.tsx`, `ott/ott-platform.tsx` and `posts/story-rail.tsx`. `/ai` and `/ott` are session-gated honest empty states (`data-testid='coming-soon-ai'` / `-ott`, “not available yet”, no catalogue/chat/player pretending to work), matching the `/live` convention. `/games` lost its fake section nav (Photos/Videos/Leaderboard/Rewards, three of the four going to `/dashboard`) and the invented “Summer Battle” tournament promo. Dashboard: story rail removed, sidebar “Profile” label and `user.name` fallback fixed, dead “Your shortcuts / Remote Job Bangladesh” and “Contact options” blocks deleted, navbar tabs point at real routes, and super-admin “Global Settings” is a disabled Coming-soon chip instead of `/settings`.
- **Seed password.** `scripts/seed-mediaworld-users.ts` hardcoded `MediaWorld@2026` for every demo account and reset existing passwords on re-run. It now requires `MEDIAWORLD_SEED_PASSWORD` (env or `.env`, read through the existing `readEnvFileValue` helper), fails fast when absent, never prints the value, and its `update` branch no longer writes `passwordHash` — an account that already exists keeps the password its owner chose. The `super_admin` demo row was dropped (the real account is seeded by `scripts/seed-super-admin.ts`) and the policy warnings reuse `describePasswordPolicy`. `.env` was not modified and no secret was echoed; the script now exits with the “must be set” error locally, so no demo account can be silently rehashed.
- **Provider and organization contact.** Rental detail payloads stopped joining the provider account's `phone`/`email`: `rentalListingDetailSelect`, `rentalListingDetailPageSelect` and the `/api/for-rent/[id]` GET select now take `rentalProviderPublicSelect` + `description` (+ `userId` for the page). `for-rent-detail.tsx` no longer falls back from `listing.contactPhone/contactEmail` to the provider's account contact, so a listing publishes only the contact its owner typed into that listing; when neither is set, visitors see a note pointing at the inquiry form instead of a stranger's phone number. Verified consumers stay correct: `rentalFormFromListing` never read provider contact, `/for-rent/[id]/edit` is owner-gated (`listing.provider.userId !== user.id → notFound()`), the admin route does not render provider contact, and the PATCH/DELETE response select is contact-free.
- **Talent profile contact.** `prepareTalentProfile` now returns a `TalentProfileView` projection in which the linked `organization` and `rentalProvider` `phone`/`email` follow the account's own `showPhone`/`showEmail` switches, so a private number cannot reach a visitor's browser through the business card; the previously unguarded provider phone row is conditional. The owner still receives the full payload (the editor needs it), and `/mediaworld/talent/[username]/edit` keeps the complete select because it is owner-only (`profile.id !== user.id → notFound()`).

**Verification.** `/mediaworld` on the rebuilt production server (headless Chromium): zero `4.9`, zero “Verified”, zero `href="#"` anchors, no `01700000000`; footer renders the eleven real controls (5 category filters, 5 division filters, Report a problem) and nav labels are Home / Featured Services / Top Rentals / Top Spots / Featured Talent. Clicking “Drone coverage” filtered the services section and scrolled to it (`scrollY` 1592). HTTP-level: `/settings` → 307 `/settings/profile`, `/friends/requests` → 307 `/friends`, `/ai` and `/ott` → 307 `/login` (their honest states live behind the session gate), `/api/health` → `{"status":"ok",…,"db":{"connected":true,"latencyMs":0}}` with no error text. **The signed-in surfaces (`/dashboard`, `/games`, a rental detail page, a talent profile) were not re-checked in the browser because the shared browser session is logged out and no credentials were used**; they are covered by the projection and source assertions below.

**Gates.** 130 files / **841 tests** green (rental privacy block in `rental.test.ts` asserts the three provider selects carry no `phone`/`email` key plus the route/detail source; four new cases in `talent-profile-view.test.ts` assert org/provider contacts are withheld from visitors, published when shared, kept for the owner and absent from the serialised payload; fallback-route, health, AI/OTT, games, dashboard and platform tests), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview restarted on :3000. Uncommitted; nothing pushed.

**Residual, deliberately not changed.** `/mediaworld/find-talent` and `/mediaworld/profile/[userId]` (the legacy casting directory) still show a `MediaProfile` phone/email to any signed-in visitor. That flow has no privacy switches by design — the number is collected so recruiters can call — and neither page is reachable from navigation (sidebar points at `/mediaworld/talent`). Flagged for a product decision rather than silently re-tuned.


**Sign-up entry hardened + a confirm-and-clear Back control in the wizard (2026-10-28).** Two asks: “Create an account a click korla registration page a na neya login kori dai — fix koro”, and “registration page a ekta back button add koro … all input data reset hobe, abar ask korbe ‘are you sure?’, yes hole back hobe ar input data deleted hobe, first step 1 number theke suru hobe”.

- **Login modal → registration.** The modal's sign-up control was a `next/link` `Link`, so a tab left open across a rebuild tried to route on stale client chunks and the visitor stayed inside the login form. It is now a `type='button'` control (`data-testid='mw-login-register'`, disabled while a sign-in is in flight) that calls `window.location.assign('/mediaworld/register')` — the same full-document pattern already used by the logout button and by the post-login redirect, and the reason ESLint's `no-html-link-for-pages` rules out a plain `<a>` here. A signed-out click therefore always gets a fresh server render of the wizard; a signed-in complete professional still gets the server-side redirect to their own profile, which is the behaviour requested on 2026-10-28. The dead `href='#'` “পাসওয়ার্ড ভুলে গেছেন?” anchor in this modal (and the same dead link plus its `forgot` labels in `src/app/(auth)/auth-form.tsx` and `src/app/(auth)/login/login-form.tsx`) was deleted rather than pointed at a page that does not exist.
- **Back control in `setup-wizard.tsx`.** The header right slot now shows “← Back” / “← পেছনে যান” whenever `step > 1` (disabled while a save or an upload is busy). Clicking it opens an inline `role='alertdialog'` card under the header — “Are you sure?” with “No, keep going” and “Yes, go back”. Yes clears this page's typed draft (`personal` back to `initialPersonal ?? EMPTY_PERSONAL`, both password fields, field errors, the flash message, the crop source/preview/zoom/offset and photo error) and returns to step 1, so the flow starts again from number 1 and the professions step can be re-chosen. No dismisses the card and leaves everything as it was. The step rail and the per-step buttons keep their old one-step behaviour; their English label moved from “Back” to “Previous” (Bengali already said “পূর্ববর্তী”) so the two controls cannot be confused.
- **What the reset deliberately does *not* touch.** Professions are written to the account the moment they are picked (`POST /api/mediaworld/identities`) and the photo and public handle are stored rows, so the reset leaves `identities`, `username` and `photoUrl` alone — dropping them locally would have desynced the wizard from the database and silently kept deleted-looking professions on the live profile. Only unsaved typed input is discarded, and the confirm copy says exactly that.
- **Restart after a fresh signup no longer dead-ends.** Submitting step 1 sets the session cookie, but the `authenticated` prop was frozen at `false`, so restarting at step 1 and pressing Continue would have called `POST /api/mediaworld/signup` again and returned “That email is already in use.”. A local `accountCreated` flag now feeds `const signedIn = authenticated || accountCreated`, and every branch that used to read `authenticated` (password validation, which endpoint is called, error copy, whether the password fields render, the “Save & continue” label, the stored-details lead) reads `signedIn`. After a signup the restart therefore re-saves through `PATCH /api/mediaworld/profile/personal` instead of trying to create a second account.

**Verification (production build on :3000, browser-use in the user's live browser, signed out).** `/mediaworld` → hero Login modal: the sign-up control renders as `BUTTON` “Create an account” and clicking it produced a full document load of `http://localhost:3000/mediaworld/register` (“Media World Registration”), step 1 active with the password fields present and no Back control (correct at the first step). To exercise the restart without creating an account, the wizard's own sessionStorage resume key was set to `2` and the page reloaded: the header showed “← Back”, clicking it opened the `alertdialog` with “Are you sure?” and the two buttons, “No, keep going” dismissed it and stayed on step 2, and re-opening it then choosing “Yes, go back” returned to step 1 (`Account & personal` active, progress bar 25 %, name field empty, password fields back, both the card and the Back control gone, stored step `1`). **The clear-after-real-signup branch was not exercised in the browser** — it would need a throwaway account written to the shared database — so it rests on the `signedIn` source assertions below; say the word and I will create one, verify and guarded-delete it. No credentials were typed and no data was written during this pass.

**Gates.** 130 files / **844 tests** green (three new cases in `register.test.ts`: the modal's full-document navigation with no `href='#'` and no `next/link` import; the restart control's confirm/clear-to-step-1 wiring; and the en/bn label parity for the five new strings, plus an assertion that the reset keeps `identities` and re-saves via the profile endpoint), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview restarted on :3000. Uncommitted; nothing pushed.

**Logout flow re-verified on the current build (2026-10-28).** The user pointed out the logout path had not been checked since these changes. A throwaway PROFESSIONAL account was created through the real `POST /api/mediaworld/signup` (`zz.logout.verify-bgnbms`), signed in through the rebuilt Media World Login modal in the browser — which landed on `/mediaworld/talent/zz.logout.verify-bgnbms` (`h1` “zz Logout Verify”), re-confirming the post-login profile redirect on this build — and the owner hero showed exactly two actions: “Log out” then “Edit profile”. Clicking Log out returned to `http://localhost:3000/mediaworld` signed out: navbar absent, hero Login + Join as Professional present, no horizontal overflow, and the server no longer accepts the session (`/api/presence/heartbeat` → 401, `GET /mediaworld/talent/zz.logout.verify-bgnbms` → 200 on `/login`). Cleanup: the account was guarded-deleted (username + email prefix + exact display name all matched; 1 session and 0 follows removed), login with its credentials now returns 401, `zz*` users left = 0, both probe `rate_limit_counters` rows deleted so the table is empty again, and the temp directory (including the generated password file) was removed. No real credentials were used and the user's own account was not touched.

**Password show/hide + strong-password suggestion on register step 1 (2026-10-28).** Ask: “`/mediaworld/register` ai page a password input hide and show add kori dow and suggest a strong password o add koro”.

- **New generator** `src/lib/client/strong-password.ts` — `generateStrongPassword()` builds a 16-character value from an ambiguous-character-free alphabet (no `l/I/1`, `O/0`) using `crypto.getRandomValues` with rejection sampling, so the first four characters guarantee lower + upper + digit + symbol and the rest are shuffled. It cannot produce a password that fails `src/lib/validations.ts` (min 8, one lower, one upper, one digit). Client-side only; nothing is sent anywhere until the form is submitted.
- **Wizard** (`setup-wizard.tsx`): both Password and Confirm password are wrapped in `.mw-pw-wrap` with an inline `PasswordToggle` button (`mw-setup-password-toggle` / `mw-setup-confirm-toggle`) — `type='button'`, `aria-pressed`, bilingual `aria-label` (Show/Hide password ↔ পাসওয়ার্ড দেখান/লুকান), inline eye / eye-off SVG. One shared `showPasswords` state, so either control reveals or masks both fields at once, matching the house pattern in `src/app/(auth)/auth-form.tsx` but with an SVG instead of the 👁/🙈 emoji. Below the two fields a “Suggest a strong password” / “একটি শক্তিশালী পাসওয়ার্ড দিন” control (`mw-setup-suggest-password`) fills both fields with the same generated value, clears their errors, reveals them and shows a one-line note to store it somewhere safe before continuing. `restartFromFirstStep()` now also resets `showPasswords` and `passwordSuggested`, so the confirmed Back reset returns the fields to masked and empty.
- **CSS** (`dashboard.css`): `.mw-pw-wrap` (relative, input gets `padding-right:46px`), `.mw-pw-toggle` (absolutely positioned inside the field, muted → light on hover, `:focus-visible` ring), `.mw-pw-tools` (wrapping row for the button + note).

**Verification (production build on :3000, browser-use in the user's live browser, signed out, nothing submitted).** Step 1 renders both inputs as `type='password'` with 2 toggles labelled “Show password” / `aria-pressed='false'`. Clicking the Password toggle flipped *both* fields to `type='text'` with both controls at `aria-pressed='true'` / “Hide password”; clicking again returned them to `password` / `false`. Clicking “Suggest a strong password” put the same 16-character value in both fields with lower + upper + digit + symbol all present, revealed the fields (`type='text'`, `aria-pressed='true'`), rendered the note (99 characters) and left no validation error. Geometry: toggle sits inside the field bounds, `padding-right:46px`, no horizontal overflow (`scrollWidth 971` vs `innerWidth 986`). The generated value and the fields were then cleared back to empty and masked, and the temp screenshot directory removed — no account was created and no credentials were typed. **Note for the user: the tab was reloaded to pick up the new build, which discarded the draft he had typed into step 1.**

**Gates.** 131 files / **849 tests** green (3 new in `strong-password.test.ts`: policy classes + length over 50 samples, ambiguous-free alphabet over 50 samples, 200 unique values; 2 new in `register.test.ts`: the reveal/hide wiring for both fields plus the suggest handler and its resets, and the en/bn label parity for the four new strings), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0; preview running on :3000. Uncommitted; nothing pushed.

**Back control no longer collides with the language toggle (2026-10-28).** Ask: “back button ar position thik nai fix koro”, with a screenshot of step 3 where the “rrrrr” badge and “← Back” sat on top of the বাংলা/EN pill.

- **Cause.** The card's language bar is the shared `.mediaworld-language-bar`, which carries `margin-bottom:-8px` so the hero on `/mediaworld` can tuck under it. Inside `.mw-onb-card` that negative margin pulled the wizard header up 8px, and because the header is `align-items:flex-start` with its actions right-aligned, the badge + Back row started *inside* the toggle's box.
- **Fix.** One scoped rule in `src/app/dashboard.css`: `.mw-onb-card .mediaworld-language-bar{margin-bottom:16px}`. The shared class is untouched, so the landing shell keeps its own overlap, and the platform test that asserts `.mediaworld-language-bar{` still passes. No markup or component change.

**Verification (production build on :3000, browser-use).** With the wizard resumed at step 2 so the Back control renders: computed `margin-bottom:16px`, toggle box bottom at `-4` and Back top at `12` → a clean 16px gap, `overlap:false` by rect intersection, actions row 84×40 right-aligned inside the card, no horizontal overflow. Screenshot confirms the pill above and “← Back” below it. The signed-in badge sits in the same actions row so it moves with it; it was not re-created because the live tab used for this check is signed out. The tab was then returned to step 1 (resume key cleared) and the temp screenshot directory removed — no account touched, no data written.

**Gates.** 131 files / **850 tests** green (one new case in `register.test.ts` asserting the scoped override and the actions-row rule), ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0, preview restarted on :3000. Uncommitted; nothing pushed.

**Cross-registration entry from the wizard + back-to-Media-World on the rental surfaces (2026-10-28).** Ask: “এই খানে add koro — jodi kau For Rent ba ChannelHub-er registration-e jete pare, abar chaile user sekhane theke ei page-eo (/mediaworld) back korte pare”, with screenshots of `/mediaworld/register` and `/mediaworld`.

- **What actually exists, checked first.** There is **no For Rent sign-up page and no ChannelHub sign-up at all**: a rental provider is an account that picks `RENTAL` in `/mediaworld/onboarding`, and ChannelHub is a session-gated coming-soon placeholder. Both `/for-rent` and `/mediaworld/onboarding` answer `307 → /login` for a signed-out visitor (verified with `curl`), so linking a visitor at those URLs is a login wall, not a registration. The links below are therefore conditional on `authenticated`, and nothing was invented.
- **Register wizard footer** (`setup-wizard.tsx`, bilingual via the existing `TEXT` maps): a `.mw-onb-alt` strip at the bottom of the card — “Not the right form for you?” with the For Rent route (`authenticated ? '/mediaworld/onboarding' : '/register'`, `data-testid='mw-setup-alt-rental'`) and, for a signed-in member, a ChannelHub route (`/channelhub`, `data-testid='mw-setup-alt-channelhub'`). A visitor gets the honest line “ChannelHub is coming soon — it has no separate sign-up yet.” instead of a dead link. `/register` is the public Twingface sign-up, so the visitor path really does continue into the For Rent choice later.
- **Back to Media World on every For Rent surface**: a `← Media World` / `← মিডিয়া ওয়ার্ল্ড` pill (`data-testid='for-rent-back-to-mediaworld'`) added to the header navs of `for-rent-browser`, `for-rent-manage` and `for-rent-bookings`, to the bars of `for-rent-detail` and `for-rent-listing-form` (the form also gained the missing `← Browse For Rent`), and a secondary-styled one in `for-rent-gate`. `channelhub/page.tsx` already linked to `/mediaworld`; its primary button now reads “← Back to Media World” so it reads as a return, not a forward CTA.
- **CSS**: `.mw-onb-alt*` (bordered strip, pill links with hover + `:focus-visible`, muted note) and `.mw-rent-gate a.mw-rent-gate-ghost` so the second gate button does not duplicate the primary blue.

**Verification.** Register page in the browser on the rebuilt production server, signed out: the strip renders with title “Not the right form for you?”, the rental control is an `<A href='/register'>`, and the ChannelHub entry is the note (no link). Switching to বাংলা re-labels all three lines correctly, then the language was switched back to EN (the tab's stored preference was EN and is EN again). Layout: 132px strip, no horizontal overflow. Route probes above were done with `curl`. **The For Rent and ChannelHub back pills were not clicked in a browser** — those pages require a session, and no account was created for this pass; they rest on the 12 new source assertions in `for-rent-navigation.test.ts` plus the build. Say the word and I will drive them with a throwaway account and purge it after.

**Gates.** 132 files / **864 tests** green, ESLint `--max-warnings=0` clean, `tsc --noEmit` clean, `next build` exit 0, preview restarted on :3000. Uncommitted; nothing pushed.

**Follow-up, authorised throwaway click-through (2026-10-28).** He replied “run the throwaway account test”, so the caveat above is now closed. A scratch account was created through the real `POST /api/auth/register` (username `zz.nav.1793172233340`, id `cmvrsg6h10000wme4wj5txe13`; two earlier attempts returned 400 because `username` is required by `registerSchema`, and the generated password was never printed). With that session in the browser:

- `/for-rent` — `← মিডিয়া ওয়ার্ল্ড` pill is the first nav link, `href='/mediaworld'`; clicking it landed on `http://localhost:3000/mediaworld` (`title` “MediaWorld - Twingface”).
- `/for-rent/new` — the provider gate renders with two buttons: the primary setup CTA and the new ghost `← মিডিয়া ওয়ার্ল্ডে ফিরুন`; computed styles confirm they are distinct (`rgba(0,0,0,0)` + 1px `#2b3a52` border vs `rgb(45,136,255)` fill), so the second one does not duplicate the primary.
- `/for-rent/manage` and `/for-rent/bookings` — pill present as the first nav link on both.
- `/channelhub` — “← Back to Media World” clicked and it landed on `/mediaworld`.
- `/mediaworld/register` for a brand-new signed-in account renders the **OnboardingWizard** account-type chooser (h1 “মিডিয়া ওয়ার্ল্ড প্রোফাইল সেটআপ”, lead greeting the scratch name) with the `🚐 ফর রেন্ট / ভাড়ার সার্ভিস` card present — which proves the visitor path the footer advertises (`/register` → account → pick For Rent) really does end at the For Rent choice. The `SetupWizard` alt block is therefore only shown to visitors and to existing professionals, as intended.
- Bengali labels were exercised by toggling `বাংলা`; the tab's stored language was `en` before and was restored to `en` after.

**Still source-only:** the `for-rent-detail` and `for-rent-listing-form` bars — the browse page currently lists zero rental listings, and the listing form is behind the provider gate, so neither surface rendered for the scratch account. No listing or provider row was created just to force them.

**Cleanup.** Guarded delete (exact username + expected display name + `zz.nav.verify.` email prefix all matched, 1 row): 1 session removed, user deleted, `zz*` users left = 0. The `signup:register:ip:*` counter created by these attempts was cleared (1 row). One row was deliberately **left in place**: `signup:mediaworld:ip:::1` count 4, whose window opened around 12:xx — that is his own Media World sign-up traffic, not a probe, so removing it would have reset a security counter that is not mine to touch. Temp directory (script + screenshots) deleted, and the scratch session is dead server-side (`/mediaworld` renders signed out: no navbar, Login + Join present). No real credentials were used and his own account was not touched.

**Follow-up, talent profiles in the landing services section (2026-10-28).** He reported "talent profile gula show korca na ... ay khani profile show korow. catagoy click korla oi profile korba" with a screenshot of `/mediaworld` showing **Showing: 0 posts** / "কোনো সার্ভিস পাওয়া যায়নি".

**Root cause, not a rendering bug.** That section (`src/components/mediaworld/mediaworld-platform.tsx`) was fed **only** by `MarketplaceListing` rows in `MEDIA_WORLD_SERVICE_CATEGORIES`. The shared DB holds 4 marketplace rows, none of them in a media category, so the query legitimately returns 0 and every chip hit `/api/mediaworld?category=…` → `listings: []`. The directory's real content lives elsewhere: `User` rows with `accountType` set plus `UserProfessionalIdentity` taxonomy links (9 such users, 6 with identities). Nothing was rendering them on the landing at all.

**Shipped.** `src/lib/mediaworld/talent-lanes.ts` is the join between the two disjoint vocabularies: every `MainCategory.code` in `taxonomy-data.ts` is filed into one of the service lanes (direction/writing → `DIRECTOR`, acting + music/vocals/instrumentalist → `ARTIST`, camera & cinematography + photography → `CAMERA_HOUSE`, art/makeup/costume/styling → `MAKEUP_MAN`, production, business, editing/post and sound → `PRODUCTION`), with `Designation.code` winning over the category so `DRONE_OPERATOR` lands in `DRONE`, `CAMERA_EQUIPMENT_RENTAL` in `CAMERA_HOUSE`, `MODELING_AGENCY`/`CASTING_AGENCY` in `ARTIST`, and the design/marketing roles inside the photography categories in `PRODUCTION`. `SPOT`, `LIGHT_HOUSE` and `SHOOTING_BUS_CAR` deliberately have **no** professions — they describe gear and locations, and the new test asserts no main category is filed there, so those chips stay honestly empty until a listing exists instead of inventing matches.

**Data path stays public-safe.** `talentDirectorySelect` + `browseDirectoryTalents()` in `src/lib/mediaworld/talent-browse.ts` reuse the browse card fields but drop `organization` and `rentalProvider`: both hold owner-written free text that may contain a phone number, and unlike `/mediaworld/talent` (which is session-gated and whose API returns 401 anonymously) the landing renders for signed-out visitors. A test slices that select and forbids `phone`, `email`, `presentAddress`, `organization`, `rentalProvider`, `talentSettings`, `coverImage`. `src/app/(main)/mediaworld/page.tsx` now fetches listings and profiles in `Promise.all` and passes `initialTalents` + `authenticated`. Filtering is **client-side over that payload** rather than a call to `/api/mediaworld/talent`, precisely so the existing auth gate is not widened; `TalentCard` gained an optional-org prop type so the same card serves browse and landing.

**Section behaviour.** The block `id='mw-talent-directory'` sits inside "List of available services and fares" above the fare grid, titled "Talent profiles — N" / "ট্যালেন্ড প্রোফাইল — Nজন", capped at 8 cards with the count line changed from the meaningless "Showing: 8 posts" to `Showing: shown of matched` (`দেখানো হচ্ছে: 8 / 9`), and "Search the full talent directory →" to `/mediaworld/talent` when more match than fit (no fake `?category=` param — the browse cannot read that key, so promising it would be a dead filter). The section-level "no service found" state now waits for `matchedCount === 0`, i.e. no listings **and** no profiles. Sidebar nav "Featured Talent" targets `mw-talent-directory` instead of `mw-rail-talent`, which only exists when listing rows in talent categories are present — previously that nav item could scroll nowhere. Signed-out visitors get "Sign in to open a profile and see contact details.", because `/mediaworld/talent/[username]` still redirects anonymous traffic to `/login`; that gate and its contact columns were deliberately left alone. No fare is printed on a profile card — only 1 of 9 talents has `ratePerDay`, so a "Daily charge" line would have been invented data.

**Verified in his browser (production build, :3000, signed out, language restored to `en`).** Server HTML: block present, 8 profile cards, 0 broken Cloudinary images, count line rendered. After hydration: chips → All 9 (8 cards), Artist 5, Camera 0, Shooting spot 0, Drone 0; sidebar → Director & Crew 2, Post Production 4, and Post Production + Rajshahi 2 / + Dhaka 2 / all divisions 4; search by an on-page handle → 1 card, nonsense → 0 with the note, cleared → 8; budget ৳500 leaves the profiles visible (it filters fares, not people); nav "Featured Talent" landed the block at `top: 0`; `document.scrollWidth == clientWidth` throughout; Bengali strings rendered for title, count, note and account-type badge.

**Not clicked:** the signed-in branch that hides the "Sign in…" note (needs a session; source + test only). `Gates: 133 files / 873 tests`, lint + `tsc` clean, `next build` exit 0. Uncommitted; no push.

**Follow-up, honest Join-as-Professional cards for visitors (2026-10-28).** He asked whether a For Rent page already exists ("For Rent ar jonno ki kono page agi thakay ready kora asi ? dako to"), then approved recommendation 1+2 ("হ্যাঁ, করো"): route the popup's For Rent card through sign-up for visitors and make the ChannelHub card stop claiming an open product. Recommendation 3 — making the For Rent browse public — was **declined by design**: the gate is deliberate and there are 0 rental listings in the shared DB.

**What was wrong.** `src/components/mediaworld/join-modal.tsx` linked all three cards at all times. A signed-out visitor who clicked For Rent landed on `/for-rent`, which `redirect('/login')` bounces to a generic login page with no hint that For Rent has no separate sign-up; the ChannelHub card promised "Publish your channel, grow your audience" while `/channelhub` itself renders "ChannelHub is coming soon". Both are fake-door defects.

**Shipped.** `JoinOption` gained `key`, `visitorHref`, `visitorCopy`, `visitorUnavailable`; `JoinModalProps` gained `authenticated: boolean` and `mediaworld-platform.tsx:757` passes it. The render resolves `href`/`copy` per session state, so a signed-in member keeps the old destinations (`/for-rent` marketplace, `/channelhub`) while a visitor's For Rent card points at `/mediaworld/register` with "Create an account first, then pick For Rent in setup to list gear, a vehicle or a location." — true, the onboarding wizard's account-type step does offer For Rent (`onboarding-wizard.tsx:38`). ChannelHub is honest for everyone ("Coming soon — creator channels and publishing tools are not open yet.") and for a visitor it is **not a link**: a `<div … is-unavailable aria-disabled='true'>` with a "soon" pill instead of the arrow, so nothing looks clickable that cannot be reached. The header line "you can explore the rest anytime" was dropped because ChannelHub cannot be explored; the subtitle is now just "Pick where you want to start." New CSS: `.mw-join-modal-option.is-unavailable` kills the hover lift/shadow and mutes the gradient tile (`opacity:.55;filter:saturate(.45)`, `cursor:default`), `.mw-join-modal-soon` styles the pill.

**Gates + live check.** `join-modal.test.ts` went 4 → 7 cases (visitor routing, ChannelHub non-link + no over-claim, the unavailable CSS); `mediaworld-platform.test.ts` updated for the new `<JoinModal … authenticated={authenticated} />` string. `tsc --noEmit` clean, `npm run lint` clean at `--max-warnings=0`, **133 files / 876 tests** green, `next build` exit 0 after stopping the :3000 `next start` (PID 9644) and restarting it. Clicked in his browser, signed out, on the production build: the popup opened with Media World + For Rent both `href="/mediaworld/register"`, ChannelHub a `DIV` with `aria-disabled="true"` and no `href`; computed style `cursor:default`, icon `opacity .55` / `saturate(0.45)`; clicking ChannelHub left `location.pathname === "/mediaworld"`; clicking For Rent navigated to `/mediaworld/register` ("Create your Media World profile", page mentions the For Rent path). The tab was returned to `/login` where it was found.

**Not clicked:** the signed-in branch (`authenticated === true` → `/for-rent` and `/channelhub`). Verifying it live means creating a throwaway account and taking over his only browser tab, which sat on `/login` — source + test coverage only, and the signed-in destinations are unchanged from before this edit. **Also noticed, not touched:** the hero "Login" and "Join as Professional" buttons render for signed-in users too (`mediaworld-platform.tsx:450-483` is not gated by `authenticated`), so a member sees a Login button — separate honesty item, awaiting his call. Uncommitted; no push.

**Follow-up, hero CTAs no longer address signed-in members (2026-10-28).** He approved the flagged honesty item with "ok do it jodi valo hoi".

> **Partly reverted on 2026-10-29** — the `mediaWorldJoined` gating and the `Find talent` replacement CTA were removed at his request (see the final section). **The Login-button and sidebar-quick-link `!authenticated` gating stays.**

**Defect.** `src/components/mediaworld/mediaworld-platform.tsx` rendered the Login button, the "Join as Professional" trigger and the sidebar `Login` quick link unconditionally, so a logged-in member saw "Login" on `/mediaworld`, and a member who already owns a Media World account was invited to join again.

**Shipped.** A third prop `mediaWorldJoined: boolean` is threaded from `src/app/(main)/mediaworld/page.tsx`, which now resolves membership with a third `Promise.all` entry — `user ? prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } }) : null` — reading **only** `accountType` (`MediaAccountType?`, so `null` means a plain social account; no contact column is touched). Rules: Login button + sidebar quick link render under `!authenticated`; the Join trigger renders when `!mediaWorldJoined` (a session holder who has not joined is exactly the right audience — `/mediaworld/register` shows them the account-type chooser); a joined member instead gets a real destination, `Find talent` / `ট্যালেন্ড খুঁজুন` → `/mediaworld/talent`, reusing `.mediaworld-hero-action` (the class already carries `text-decoration:none`, so the `<Link>` matches the buttons with no new CSS). Complaint and the talent directory are untouched.

**Tests.** `mediaworld-platform.test.ts` gained "does not offer Login or Join to a member who already joined" (slices the hero-actions block and checks `{!authenticated ? (` precedes `mediaworld-login-trigger` and `{mediaWorldJoined ? (` precedes `mediaworld-join-trigger`, plus the CTA `href`/`data-testid`/bilingual label and the sidebar gate). `mediaworld-landing.test.ts` gained "reads only accountType for the session", which slices the membership query and forbids `phone`, `email`, `presentAddress`, `passwordHash`; the previous single-line `<MediaWorldPlatform … />` assertion was split into per-prop assertions.

**All three states clicked in his browser on the production build.** A throwaway account `zz-hero-verify` (argon2 hash written straight to the DB, so the signup IP limiter was never touched) was created, signed in through the Media World Login modal and deleted again: **guest** → Login + Join + sidebar quick link + "Sign in to open a profile" note all present, 8 directory cards; **member, `accountType` null** → Login gone, sidebar quick link gone, Join trigger still there, note gone, and the popup now shows the *signed-in* branch this time: For Rent `href=/for-rent` with the member copy, ChannelHub a real `<a href=/channelhub>` with the honest "Coming soon — creator channels and publishing tools are not open yet." text, i.e. **the branch left unclicked in the previous batch is now clicked**; **joined member (`accountType=RENTAL` set only on that scratch row)** → `Find talent` CTA, `href=/mediaworld/talent`, computed `display:flex` `border-radius:12px`, no Login, no Join, and clicking it landed on the "Find Talent" directory with 10 cards, no horizontal overflow at his viewport. Cleanup: `POST /api/auth/logout` 200, guarded delete by username **and** name check with a pre-check on related rows (the first attempt aborted correctly on a wrong field name — `Post.authorId`, not `userId` — before anything was deleted), result `remainingUsers: 0`, `remainingSessions: 0`; the login identifier counter was already cleared by the app on success, and the shared `login:ip:::1` row was deliberately left alone. Tab returned to `/login`, temp scripts removed from `node_modules/.cache/zz-tmp`.

**Gates:** `tsc --noEmit` exit 0, `npm run lint` (`--max-warnings=0`) exit 0, **133 files / 878 tests** green, `next build` exit 0 (port 3000 stopped, rebuilt, restarted). **Left alone, reported:** the sidebar promo "এখন রেজিস্টার করুন", the empty-state "পোস্ট করুন" and the CTA banner "ফ্রি লিস্ট দিন" still point joined members at `/mediaworld/register` (which then redirects a complete professional to their own profile, so they are not dead ends — but the labels still read like a sign-up prompt). Uncommitted; no push.

**Follow-up, a dedicated For Rent registration page with a login affordance (2026-10-28).** He attached two screenshots (the Join popup's For Rent card boxed; the `/mediaworld` hero Login button boxed) and asked: "for rent ar jonno ekta new registion from ready koro. oi khani manus tar information diya account open korbi and ay login thaka manus login dibi." — build a For Rent sign-up form where a person opens an account with their own details, and give people who already have an account a way to log in there. Latest turn was "do it", so no additional scope was inferred.

**Why a new endpoint was required.** The previous batch's answer ("pick For Rent inside the setup wizard") was true but awkward: `/api/mediaworld/signup` hardcodes `accountType: 'PROFESSIONAL'`, the account-type API refuses to change a type once set, and `PUT /api/mediaworld/rental-provider` requires an account that is *already* `RENTAL`. A one-pass For Rent form therefore needs its own write path rather than three chained calls.

**Shipped.** `rentalSignupSchema` (`src/lib/validations.ts:216`) — written as a standalone `z.object({...}).strict().superRefine()` because `mediaWorldSignupSchema` is a `ZodEffects`, which has no `.omit()`/`.extend()`; it reuses the shared `name`/`normalizedEmail`/`bdMobile`/`requiredDivision`/`requiredDistrict`/`addressLine` pieces and adds `ownerName`, optional `businessName`, `location`, optional `fullAddress`, `description`, keeping the password-match and district-belongs-to-division refinements. `signupIpKey` gained a `'rental'` scope, so For Rent sign-ups are throttled in **their own** bucket (`signup:rental:ip:<ip>`) instead of consuming the shared `signup:mediaworld:ip` allowance. `POST /api/mediaworld/rental-signup` (new, public): rate limit → accept JSON *or* multipart → schema (400 with per-field errors) → email/phone uniqueness pre-check (409 per field) → logo MIME + 5 MB + magic-byte validation **before any write** → `hashPassword` → up to 5 attempts of `findUnique` on the suggested username plus a `$transaction` that creates `User(accountType: 'RENTAL')` and `RentalProvider` together → optional Cloudinary logo upload **after** user creation because `uploadMediaWorldLogo` needs a `userId`, and a logo failure cannot cost the account (201 with an honest `warning`) → session + cookie. `src/components/for-rent/rental-signup-form.tsx` (new client form, bilingual `TEXT` table, 14 labelled field ids, password reveal/hide + strong-password suggestion, `LogoPicker`, taxonomy chips as read-only context) with three render states: visitor form, existing `RENTAL` member, and any other account type. `src/app/(main)/for-rent/register/page.tsx` (new RSC) reads **only** `accountType`, `username` and `rentalProvider.id`, redirects a `SUPER_ADMIN` away, and passes the bilingual title. New CSS: `.mw-field-error`, `.mw-onb-alt-links button` (+ hover / focus-visible). Entry points rewired: Join popup For Rent card `visitorHref: '/for-rent/register'`, setup wizard's visitor rental link `authenticated ? '/mediaworld/onboarding' : '/for-rent/register'`, and `mediaWorldPostLoginPath` now returns `/for-rent` for a `RENTAL` account because a rental account has no talent-directory listing to land on.

**Login affordance, with no fake door.** The form's "Already have an account?" block opens the existing `AILoginModal` and also links the real `/login` page, plus `/mediaworld/register` for someone who actually wants a professional profile.

**Two defects found by driving it live, both fixed.** (1) `AILoginModal` had **no dialog semantics at all** (`role='presentation'` on the backdrop only), which made my new button's `aria-haspopup='dialog'` a false claim — the modal panel now carries `role='dialog' aria-modal='true' aria-labelledby='mw-login-modal-title'` with the `id` on its heading, so every surface that opens this popup gains a named dialog, and the claim is true. (2) The division/district `<select>`s omitted `aria-invalid` while every input had it; both now set it. Also caught by the live submit: a blank optional reached the provider row as `''` rather than `null` (the multipart reader cannot distinguish an omitted field from an empty one, and the form's own `?? null` only catches `undefined`), so `rentalSignupSchema` now normalises with `.transform((value) => value || undefined)`. **The identical latent pattern remains in the pre-existing `rental-provider` route** (`formData.get('businessName') ?? ''`), deliberately left untouched as out of scope — worth his call.

**Tests.** New `route.test.ts` (14 behavioural cases with `vi.hoisted` mocks for auth/db/rate-limit/user-id/cloudinary: create-and-sign-in shape, password never persisted, multipart field reading, blank-optional → `null`, weak password + short description rejected before any DB touch, own rate-limit bucket + `Retry-After`, taken email, taken phone, logo upload success, logo failure keeps the account, unreadable logo rejected pre-write, taken-username retry, `P2002` race retry, generic 500). New `rental-signup-form.test.ts` (11 source cases) and `for-rent/register/register.test.ts` (7). `validations.test.ts` gained a `rentalSignupSchema` block (normalisation, optional trimming, blank → absent, 8-case `it.each` rejection incl. `.strict()` rejecting a smuggled `bio`, per-field path reporting); `rate-limit.test.ts` pins `signupIpKey('rental', …)`; `post-login.test.ts` gained the `RENTAL → /for-rent` case; `join-modal.test.ts` and `mediaworld/register/register.test.ts` updated for the new `/for-rent/register` destinations. **136 files / 922 tests** green (from 133 / 878).

**Gates:** `npx tsc --noEmit` exit 0, `npm run lint` (`--max-warnings=0`) exit 0, `npx vitest run` exit 0, `next build` exit 0 three times (once per source change round), with the :3000 `next start` PID stopped (13908, then 13128) and the server restarted (now PID 14248); `/for-rent/register` and `/api/mediaworld/rental-signup` both confirmed in the build output.

**Verified in his browser (production build, :3000, signed out).** Visitor render in **both** languages (bn default, EN toggle flips h1/lead/section titles/submit/login block and persists `en`); 14 `mw-rent-*` field ids, 15 test ids, 7 taxonomy chips, 3 links (`/mediaworld`, `/login`, `/mediaworld/register`) and 7 buttons; empty submit → 10 inline errors, `aria-invalid` on the invalid controls, focus moved to `mw-rent-name`, no request sent; District disabled until a Division is chosen (14 Dhaka options); the Login button opened the modal with `role=dialog`, `aria-modal=true`, accessible name "Media World Login", a real sign-in form and the "Create an account" link. **Full throwaway sign-up end to end** (`zz.rental.verify.1028a@example.com`, collision-checked first — both email and phone free): the tab navigated to `/for-rent` via the intended full document load, and the DB showed `accountType: 'RENTAL'`, phone normalised to `+880197…`, username auto-suggested, `passwordStoredAsHash: true` (argon2id — value never printed), provider row with the real location/description, `logoUrl: null`, 1 session. Signed-in member view then rendered with **no form**: honest copy plus `/for-rent`, the talent-profile link and the back pill — and that talent-profile link was followed to confirm it is not dead: `/mediaworld/talent/zz.rental.verify-…` renders "Rental service" / "Rental provider" with `—` placeholders, no invented rating. Join popup re-checked: For Rent `href=/for-rent/register` with the new copy, ChannelHub still `aria-disabled="true"` with no `href`. Cleanup: guarded purge removed the user, provider, session and presence row (`stillPresent: false`), the page reverted to the visitor form, the scratch script was deleted, and his tab was returned to `/login`.

**Refused before deleting, twice.** The purge guard aborted (exit 1) on an unknown `UserPresence.id` field, then on counting the account's own scalar columns as "content", and a third time correctly flagging the presence row — **nothing was deleted until the relation names and the content allow-list were read from `schema.prisma`**, and any listing/booking/message/complaint row would still block the delete.

**Not verified live (source + tests only), reported honestly:** the Cloudinary logo upload branch (no file was submitted; mocked in `route.test.ts`), the 429 / 409 / 500 and `P2002` race paths, the `PROFESSIONAL`/`BUSINESS` "already registered" member state, the `SUPER_ADMIN` redirect on the page, and the new blank-optional normalisation (fixed and unit-tested after the live submit; re-verifying it would have meant creating a second throwaway account in the shared DB). The `signup:rental:ip:<his ip>` bucket now holds **1** hit from this test; `signup:mediaworld:ip` (at 4/5) and the shared `login:ip` row were not touched, and no login attempt was made with his credentials.

**Still his call, untouched from before:** the ungated register CTAs for joined members, whether Back "Yes" should delete saved professions, legacy `MediaProfile` contact exposure on `/mediaworld/find-talent` + `/mediaworld/profile/[userId]`, the fake "Remember me" checkbox in both auth forms, source-only back pills in `for-rent-detail`/`for-rent-listing-form`, and now the same blank-optional `''`-vs-`null` pattern in the pre-existing `rental-provider` route. Uncommitted; no push.

## Revert: the Join as Professional popup is gone (2026-10-29)

**Instruction.** "na na back koro only join as profanation oita back koro" — undo the Join work and nothing else. Because three separate batches had touched that CTA, I asked which parts and he answered **"1 and 2 and 3"**, i.e. all of them: (1) show the button to everyone again, joined members included; (2) the popup's For Rent visitor routing goes back; (3) the popup itself is dropped and the click navigates straight to `/mediaworld/register`.

**Shipped.** `src/components/mediaworld/mediaworld-platform.tsx`: the `JoinModal` import, the `joinOpen` state and the modal mount are deleted, and the `{mediaWorldJoined ? <Link href=/mediaworld/talent> : <button …>}` branch is now one unconditional button — `onClick={() => window.location.assign('/mediaworld/register')}`, keeping `.mw-join-trigger`, the sparkle SVG and `data-testid='mediaworld-join-trigger'`, dropping `aria-haspopup='dialog'` because there is no dialog to open any more. The full document load (not `Link`) is deliberate: it is the fix recorded on 2026-10-27 against "Loading chunk failed" in a stale tab. `mediaWorldJoined` is gone from both `MediaWorldPlatformContent` and `MediaWorldPlatform`, and `src/app/(main)/mediaworld/page.tsx` lost its third `Promise.all` entry — the `select: { accountType: true }` membership lookup — so the landing is back to two queries and sends only `initialListings`, `initialTalents`, `authenticated`.
`src/components/mediaworld/join-modal.tsx` and `join-modal.test.ts` were deleted; `git status` showed both as untracked (`??`), so nothing was ever committed and no history is lost. `src/app/dashboard.css` lost the 33 popup lines (backdrop, panel, close, head/kicker, options, icon + the blue/amber/violet gradients, copy, arrow, `.is-unavailable`, `.mw-join-modal-soon`, the `@media(max-width:520px)` block, `@keyframes mw-join-fade` / `mw-join-pop` and the `prefers-reduced-motion` rule); `.mw-join-trigger{gap:9px;…}` and `.mw-join-trigger-icon` stay because the hero button is still there.

**Kept, because he did not revert them:** the Login button + sidebar quick-link `!authenticated` gating (batch #69's other half), `/for-rent/register` with `POST /api/mediaworld/rental-signup`, the setup wizard's cross-registration footer, and the `/channelhub` placeholder page — it is still reachable, now only from that footer when signed in.

**Tests.** `mediaworld-platform.test.ts`: "opens the Join as Professional popup from the hero trigger" → "sends the Join as Professional hero trigger straight to the register page" (asserts the `window.location.assign` target and that `JoinModal`, `aria-haspopup`, `mw-join-modal` and `@keyframes mw-join-pop` are all *absent* from source and CSS); "does not offer Login or Join to a member who already joined" → "hides Login from a session holder but shows Join to everyone" (Login still inside `{!authenticated ? (…}`, `mediaWorldJoined` nowhere in the file, no `href='/mediaworld/talent'` in the hero block, sidebar gate unchanged). `mediaworld-landing.test.ts`: the `mediaWorldJoined={!!member?.accountType}` assertion became `not.toContain`, and the membership-query test became "reads no membership column so the landing needs one query less" (`not.toContain('prisma.user.findUnique')` / `accountType`, still forbids `phone`/`email`/`presentAddress`/`passwordHash`). `for-rent/register/register.test.ts` no longer reads the deleted `join-modal.tsx`; its entry-point test now pins only the wizard footer link. **135 files / 915 tests** green (was 136 / 922 — the popup's own test file is the 7-test delta).

**Gates:** `npx tsc --noEmit` exit 0, `npm run lint` (`--max-warnings=0`) exit 0, `npx vitest run --no-file-parallelism` exit 0, `next build` exit 0 (the :3000 `next start` PID 14248 was stopped first, server restarted after).

**Verified in his browser (production build, :3000, signed out, 767×785):** the hero renders exactly three `<button>`s — Complain, Login, Join as Professional — every `aria-haspopup` `null`; `.mw-join-modal` nodes 0 and `mediaworld-find-talent-cta` 0; trigger 221×45 at (497, 385); `scrollWidth 752 ≤ innerWidth 767`, no horizontal overflow. Clicking it produced a **full document load** to `/mediaworld/register` (title "Media World Registration - Twingface"): wizard shell present, headings "Create your Media World profile" / "Personal information & credentials", the 7 step-1 field ids, `[role=dialog]` count **0**, the `/for-rent/register` cross-link still in the footer, 0 field errors, no overflow. No account was created and no rate-limit bucket was consumed, so there was nothing to purge; his tab was returned to `/login`.

**Not verified live:** the joined-member state (a member now sees "Join as Professional" again — covered only by the source assertion, since checking it would mean another throwaway account in the shared DB) and the ≤520px hero stack (trigger CSS untouched, measured at 767px). Uncommitted; no push.

## Follow-up: a Back affordance in the Media World login popup (2026-10-29)

**Instruction.** "login page koi back koro", then — because two surfaces could be meant — the AskUserQuestion answer **"Media World login popup e back"**. So this is `src/components/mediaworld/ai-login-modal.tsx` (the popup behind the hero Login button and the For Rent form), **not** `/login`.

**What it already had, stated honestly.** The popup was not missing an exit: a ✕ close button (`aria-label` "Close"/"বন্ধ করুন") and backdrop-click-to-dismiss both existed before this batch, and the earlier 2026-10-28 work gave it real dialog semantics. My first question text claimed there was no close, which was wrong. The genuine gap was that a keyboard user had no way out and no labelled, visible "Back".

**Shipped.** Three additions, no behaviour removed: (1) `← Back` / `← পেছনে ফিরুন` — a `button.login-back` with `data-testid='mw-login-back'` at the end of the footer, and its `onClick` is only `onClose`; a test slices that button and forbids `window.location`, so Back dismisses and never navigates. (2) **Escape** closes it: a `keydown` listener mounted while `open`, removed on close. (3) **Focus handling**: `const emailRef = useRef<HTMLInputElement>(null)` is bound to the email input and the popup moves focus into the field on open, then restores focus to whatever element opened it (`returnFocusTo` captured before the move) and puts back `document.body.style.overflow` on dismiss — the scroll lock existed nowhere before, so a long directory scrolled behind the modal.

**The two effects are split on purpose.** The focus/scroll-lock effect is keyed `[open]` only; the Escape effect is keyed `[open, onClose]`. Both hosts (`mediaworld-platform.tsx:757`, `for-rent/rental-signup-form.tsx:734`) pass an **inline** `onClose`, so a single combined effect would re-run the focus work on every parent render and steal focus mid-typing. A comment records that, and a test pins it: the slice of the focus effect must not contain `onClose`, and both `}, [open]);` and `}, [open, onClose]);` must exist.

**CSS** (`src/app/dashboard.css`, after `button.login-link:disabled`): `.login-back` (transparent, `#64748b`, 700 12px `--sans`), `.login-back:hover{color:#e2e8f0}`, `.login-back:focus-visible{outline:2px solid #72aaff;outline-offset:2px}` — the focus ring matters because this button is reached by keyboard.

**New test file** `src/components/mediaworld/ai-login-modal.test.ts` — 4 source cases: dialog semantics (`role='dialog'`, `aria-modal`, `aria-labelledby` + heading `id`), the Back button + its `onClick` + bilingual label + the no-navigation slice, the three `.login-back` CSS rules, and Escape + capture/restore of focus and `body.style.overflow` + `ref={emailRef}`.

## Revert: the hero Login button renders for everyone again (2026-10-29)

**Instruction.** Screenshot of the `/mediaworld` hero with Complain and Join as Professional boxed in red, Login absent: "ai khani agi ja ja coli oi gula son kisu tamon kori same to same back koro onno kotao kisu koiro na only ay khankar gula back koro" — restore **that strip** exactly as it was, touch nothing else.

> This partially reverts the 2026-10-28 "hero CTAs no longer address signed-in members" batch a second time: the Login half of the `!authenticated` gating is now undone too.

**Shipped.** `src/components/mediaworld/mediaworld-platform.tsx` — the `{!authenticated ? (<button … Login …) : null}` wrapper around `data-testid='mediaworld-login-trigger'` is gone; the three hero buttons (Complain, Login, Join as Professional) render unconditionally, which is the pre-2026-10-28 state. Nothing else was changed: **the sidebar `.mediaworld-quick-links` Login link keeps its `{!authenticated ? (…) : null}` gate**, because it is a different surface and he said "only ay khankar gula". I told him that explicitly and offered to revert the sidebar too; he has not answered, so it stays gated.

**Tests.** `mediaworld-platform.test.ts`: the session-aware hero test became **"shows Complain, Login and Join to everyone in the hero strip"** — it slices the `mediaworld-hero-actions` block and asserts `not.toContain('!authenticated')` inside it, all three `data-testid`s present, no `href='/mediaworld/talent'`, `mediaWorldJoined` absent from the whole file, and separately that the sidebar quick-link still has `{!authenticated ? (`. The file-level `{!authenticated ? (` assertion elsewhere still passes via the sidebar and other gates.

## Batch gates (2026-10-29, both changes together)

`npx tsc --noEmit` exit **0**. `npm run lint` (`--max-warnings=0`) exit **0**. `npx vitest run --no-file-parallelism` exit **0** — **136 files / 919 tests** (135/915 before the new `ai-login-modal.test.ts`). `next build` exit **0** after stopping the :3000 `next start` (PID **18752**) and restarting the production server; `/mediaworld` returned 200.

## Live check in his browser (2026-10-29, production build, :3000)

**Signed out.** Hero = Complain, Login, Join as Professional. Clicking Login opened the popup as a named dialog (accessible name "Media World Login") with focus already inside the email field; `← Back` visible at 42×25. Both exits driven for real: the Back click and a real `Escape` keypress each closed the popup, `document.body.style.overflow` came back to `''`, and focus landed on `mediaworld-login-trigger`. (One earlier scripted run read `document.activeElement === BODY` after close — an artifact of `element.click()`, which never focuses the button; with `trigger.focus(); trigger.click()` the restore is correct.)
**Signed in.** To prove the revert I needed a session without touching his credentials, so a throwaway row was written straight to the DB (`zz.back.verify.1029`, argon2id hash, no signup call → the `signup:mediaworld:ip` bucket at 4/5 was not consumed) and signed in through the popup, well inside the 30/15min login-IP rule. Hero still showed all three buttons; `sidebarQuickLinks: 0` and the global navbar appeared — i.e. the session was real and the hero is genuinely ungated. Bengali strings then checked by switching the Media World language: "মিডিয়া ওয়ার্ল্ড লগ ইন", "← পেছনে ফিরুন", "নতুন অ্যাকাউন্ট খুলুন"; his language was restored to `en`. `POST /api/auth/logout` → **200**.
**Cleanup.** `purge-scratch.mjs` deleted the account under a guard: the user must exist, `name` must equal `Zz Back Verify`, every FK into `public.users` is discovered from `pg_constraint` + `pg_attribute`, composite FKs abort, and any non-derived content row aborts before a single write. It aborted **three** times — `information_schema.key_column_usage.referenced_table_name` doesn't exist in Postgres; then `column "userId" does not exist`, because the count loop selected `confrelid::regclass` (the *referenced* table, always `public.users`) instead of `conrelid`, so it asked `users` for `actorId` — and **nothing was deleted on any failure**, which is the guard doing its job. Final run: `{"deleted":"zz.back.verify.1029","derivedCleared":["user_presence.userId=1"],"remainingUsers":0,"remainingSessions":0,"zzAccountsLeft":0}` exit 0. Temp scripts in `node_modules/.cache/zz-tmp` deleted; the shared `login:ip` row left alone; his tab returned to **`/login`**.

**Not verified live:** the popup's other host (`/for-rent/register` opens the same component — source + tests only), and the joined-member hero case in Bengali. Uncommitted; no push.

## Restore: the Join as Professional popup is back (2026-10-29)

> This **undoes the "Revert: the Join as Professional popup is gone" section above**. Read that section as history.

**Instruction.** Screenshot of the `/mediaworld` hero with Join as Professional boxed in red: "Join as Professional a click korla pop up windro koi missing. oita fix koro". I first checked it was not a broken click — the trigger had `onclick` bound, `aria-haspopup: null`, `[role=dialog]` count 0, and the hero rendered Complain / Login / Join; the popup is simply absent because he had ordered it deleted the same day. So I asked before reversing a completed deletion ("1 and 2 and 3") and he chose **"Ha, age jeta chilo same to same fire an"**.

**How it was recovered — no rewriting from memory.** The files were deleted while untracked (`??`), so git had nothing. Every piece was replayed out of this chat's own transcript (`115ed7cd-…jsonl`): a script collected each `Write`/`Edit` tool call whose `file_path` ended in the target, applied them in order onto the original `Write` content, and refused to apply an edit whose `old_string` did not match exactly once. All 7 edits on `join-modal.tsx` and 2 on `join-modal.test.ts` applied cleanly (5,923 and 4,629 chars). One caveat caught by reading the result: the test file's last change was made through a `python - <<'PY'` heredoc, which a `file_path` filter cannot see, so the recovered test still pinned `visitorHref: '/mediaworld/register'` while the component had moved to `/for-rent/register` — that patch was re-applied by hand. Same for the 33 CSS lines: they were re-inserted from the removal edit's own `old_string`, at the exact anchor (before `.mediaworld-main-cinematic .mediaworld-search-row{width:100%;margin-top:38px`, line 903), with a guard that aborts if the anchor matches more than once or if `.mw-join-modal-backdrop` is already present.

**Shipped.** `src/components/mediaworld/join-modal.tsx` (3 cards + `authenticated`-resolved `href`/`copy`, ChannelHub a `<div aria-disabled='true'>` "soon" non-link for visitors, Escape / backdrop / ✕ close, scroll lock + focus into the first option + focus restore) and `join-modal.test.ts` (7 cases) are back verbatim; `src/app/dashboard.css` has its 33 popup lines back. `mediaworld-platform.tsx` re-wired in four places: `import JoinModal`, `const [joinOpen, setJoinOpen] = useState(false)`, the trigger's `aria-haspopup='dialog'` + `onClick={() => setJoinOpen(true)}` (was `window.location.assign('/mediaworld/register')`), and `<JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} authenticated={authenticated} />`.

**What deliberately did NOT come back:** `mediaWorldJoined` and the `Find talent` replacement CTA stay deleted, and the hero **Login** button stays unconditional per his later instruction — so a signed-in member now sees Login *and* Join, and the popup is the only thing that changed. `src/app/(main)/mediaworld/page.tsx` still runs two queries.

**Tests.** `mediaworld-platform.test.ts`: "sends the Join as Professional hero trigger straight to the register page" → **"opens the Join as Professional popup from the hero trigger"** (pins the import, the `joinOpen` state, `aria-haspopup='dialog'`, `setJoinOpen(true)`, the mount string *with* `authenticated={authenticated}`, and the modal CSS: backdrop, `width:min(560px,100%)`, the blue icon tile, `@media(prefers-reduced-motion:reduce)`, plus `not.toContain('.mw-join-menu{position:absolute')`). "shows Complain, Login and Join to everyone in the hero strip" is unchanged and still passes — the hero block has no `!authenticated` in it. `for-rent/register/register.test.ts` re-reads `join-modal.tsx` to pin `visitorHref: '/for-rent/register'`.

**Gates:** `npx tsc --noEmit` exit **0** · `npm run lint` (`--max-warnings=0`) exit **0** · `npx vitest run --no-file-parallelism` exit **0** → **137 files / 926 tests** (was 136 / 919; the popup's own file is the +7) · `next build` exit **0** (the :3000 `next start` PID **3368** stopped first, server restarted, `/mediaworld` 200).

**Verified in his browser (production build, :3000, signed out, 767px).** Hero still 3 buttons; `aria-haspopup` now `dialog`. Clicking it opened the dialog: `role=dialog`, `aria-modal=true`, `aria-labelledby=mw-join-modal-title`, title "Join as Professional", subtitle "Pick where you want to start.", panel 560×454 at (104,166), `body.style.overflow: hidden`, focus auto-moved into the first card. Cards as a visitor sees them: **Media World** `<a href=/mediaworld/register>`, **For Rent** `<a href=/for-rent/register>` with the one-form copy, **ChannelHub** a `DIV` with `aria-disabled=true`, `cursor:default`, "soon" pill and no `href`. Clicking the For Rent card navigated to `/for-rent/register` (h1 "Open a For Rent account") and closed the popup; `scrollWidth 752 ≤ innerW 767`. Escape closed the popup with overflow restored and focus back on `mediaworld-join-trigger` — note this needed a **real** click to open (a scripted `element.click()` does not focus the trigger, so the restore then reads `BODY`; that is a test artifact, not a defect). His tab was returned to `/login` and the scratch scripts used for recovery were deleted.

**Not verified live:** the signed-in branch of the cards (For Rent → `/for-rent`, ChannelHub → real `<a href=/channelhub>`) — source + tests only, same as when this popup first shipped; it needs another throwaway account in the shared DB. Uncommitted; no push.

## Hero is session-aware again, this time with Log out / Rent / Find talent (2026-10-29)

He boxed the **Login** button in the `/mediaworld` hero strip and asked: once a user signs in with a correct id, `Join as Professional` disappears, `Login` disappears, and in that spot appear a **logout option, Rent and Find talent**; logging out brings `Join as Professional & login` back.

The rule is `authenticated` only — the same flag the sidebar quick link already uses. I did **not** resurrect `mediaWorldJoined` and the landing page runs no extra DB query; the session check is what `getCurrentUser()` already returns to the server component, so signing up without a completed profile still flips the strip (that is what he described: "jodi id currect hoi"). A pinned test asserts `mediaWorldJoined` stays absent.

- `src/components/mediaworld/mediaworld-platform.tsx:451` `.mediaworld-hero-actions` now renders `Complain` unconditionally, then `{!authenticated ? (Login + Join trigger) : (Log out + Rent + Find talent)}`. The member branch is `MediaWorldLogoutButton`, then `<Link href='/for-rent'>` labelled `রেন্ট করুন / Rent` (`data-testid='mediaworld-rent-cta'`), then `<Link href='/mediaworld/talent'>` labelled `ট্যালেন্ড খুঁজুন / Find talent` (`data-testid='mediaworld-find-talent-cta'`). Order is literally as he spoke it: Log out first. `Rent` keeps the blue `mediaworld-hero-action-primary`; Log out and Find talent take the ghost style so the strip does not read as three primaries.
- `src/components/mediaworld/talent/mediaworld-logout-button.tsx` gained one optional `className` prop (default `mw-btn mw-btn-secondary`) so the hero reuses the **existing** single sign-out implementation instead of a second `fetch('/api/auth/logout')`. The hero passes `mediaworld-hero-action mediaworld-hero-action-ghost`. `mediaworld-platform.test.ts` pins `expect(source).not.toContain('/api/auth/logout')` in the platform file, so the duplication cannot creep back.
- `src/components/mediaworld/mediaworld-platform.test.ts`: the previous case ("shows Complain, Login and Join to everyone in the hero strip") is replaced by "swaps Login and Join for Log out, Rent and Find talent once a session exists" — it slices the hero `<div>`, asserts `Complain` sits **before** `{!authenticated ? (`, asserts the visitor branch still carries both triggers, asserts the member branch carries the logout component + both hrefs + both bilingual labels in that order, and asserts the member branch contains neither `mediaworld-login-trigger` nor `mw-join-trigger`. The sidebar `.mediaworld-quick-links` gate assertion is unchanged; that surface was never in scope.
- The Join popup mount stays `{ open, onClose, authenticated }`, so a signed-in member who reaches the cards would see the member hrefs — but a signed-in member can no longer open the popup from `/mediaworld` at all, because its trigger is hidden. `/for-rent/register` is still reachable from the setup-wizard cross-registration footer, and `for-rent/register.test.ts` still pins `visitorHref: '/for-rent/register'` in `join-modal.tsx`.

**Gates:** `npx tsc --noEmit` exit **0**; `npm run lint` exit **0**; `npx vitest run --no-file-parallelism` exit **0** — **137 files / 926 tests**; `next build` exit **0** (the `:3000` `next start` PID stopped first, then the server was restarted and `/mediaworld` returned 200).

**Verified live** with a throwaway account created straight in the shared DB (`zz.hero.eefa22`, id `cmvtcu6he0000wme0ogw5tynu`, name `Zz Hero Verify`, `accountType: null`, argon2id hash — the seed script's hardcoded password was not reused) — his own credentials were never read or typed. Signed out: hero = `Complain / Login / Join as Professional`. Signed in: hero = `Complain / Log out / Rent(/for-rent) / Find talent(/mediaworld/talent)` with `loginPresent:false`, `joinPresent:false`; `sidebarQuickLinks:0`; `scrollWidth 752 ≤ innerW 767`. `Rent` landed on `/for-rent` (h1 "ভাড়া নিন"), `Find talent` on `/mediaworld/talent` (h1 "প্রতিভা খুঁজুন", 9 cards). With MW language set to Bengali the labels read `লগ আউট / রেন্ট করুন / ট্যালেন্ড খুঁজুন`; his language was restored to `en` afterwards. Clicking `Log out` returned the strip to exactly `Complain / Login / Join as Professional` and the sidebar Login quick link came back with it — the round trip he asked for. The scratch row was then purged under the FK guard: `{"deleted":"zz.hero.eefa22","derivedCleared":["user_presence.userId=1"],"remainingUsers":0,"remainingSessions":0,"zzAccountsLeft":0}` exit **0**; the temp scripts were deleted and his tab was left on `/login`.

Uncommitted; no push.

---

## 2026-10-29 — For Rent dashboard (dedicated provider surface)

**Ask (verbatim intent):** "for-rent ar dashbord ar jonno ekta alada dashbord koro" — a separate dashboard for For Rent, laid out like the Media Professional (talent) profile, where a provider posts what they rent out (car, bike, light, gun, sound system, props, drone, shooting house, others) and those items show in the For Rent marketplace with their location.

**Design decisions he picked (all Recommended):** route `/for-rent/dashboard` and a RENTAL login lands there; fold `/for-rent/manage` into it and redirect the old URL; add BOTH Motorbike/Bicycle (VEHICLES) and Prop Weapons & Armoury (PRODUCTION) plus Sound System (SOUND); stats are real DB counts only — no invented views/rating.

**Shipped**
- `src/components/for-rent/for-rent-dashboard.tsx` (new client component) reuses the talent-profile vocabulary (`mw-tp-hero/cover/identity/avatar/stats/empty`) and the rental row classes (`mw-rent-rows/row/pill`), with a new `.frd-*` grid family in `src/app/dashboard.css`. Hero = Rental-service chip, provider logo/initial, `MediaWorldLogoutButton redirectTo='/login'`, provider-profile / become-a-provider CTA, and `＋ Add rent item` → `/for-rent/new`. Four real stat tiles: Rent items, Available now, Pending inquiries, Booking requests. Two-column body (items + booking requests + inquiries | provider facts + where-items-show + availability + renting) with category lanes that filter the item rows.
- `src/app/(main)/for-rent/dashboard/page.tsx` (new RSC): `getCurrentUser()` → `/login` wall, one `user.findUnique` for `accountType`/division/district/`rentalProvider`, then `Promise.all` of 6 queries (listings via `rentalListingCardSelect` + `_count.inquiries`, received/sent inquiries, provider/renter bookings via `bookingListSelect`, future blocks via `availabilityBlockSelect`). `toInquiry` hides the sender from the renter's own sent list.
- Actions call the existing authorized APIs only: PATCH `/api/for-rent/[id]` (hide/publish + confirm-gated delete), PATCH `/api/for-rent/inquiries/[id]` (status). Honest empty states for a renter with no provider account and for zero items; copy states there is no reply thread and that approve/reject stays on the bookings page — no fake affordances.
- `/for-rent/manage` → `redirect('/for-rent/dashboard')`; old `for-rent-manage.tsx` deleted; `/for-rent` links in browser/detail/bookings/signup repointed. `post-login.ts` sends RENTAL to `/for-rent/dashboard`. `MediaWorldLogoutButton` gained an optional `redirectTo` (default `/mediaworld`, so the talent profile is unchanged). Sidebar gained a "Rental dashboard" entry.
- Taxonomy (`taxonomy-data.ts`): `MOTORBIKE` under VEHICLES, `SOUND_SYSTEM` under SOUND, and `PROP_WEAPONS` labeled "Prop Weapons & Armoury (film props only)" / "শুধু শুটিং প্রপ" under PRODUCTION. Seed branch is upsert-only → `npm run db:seed:mediaworld-taxonomy` exit **0** (7 categories / 52 subcategories; Removed/Retired/Deactivated all 0 — purely additive).

**Gates (final tree):** `tsc --noEmit` exit **0**; `eslint src --max-warnings=0` exit **0**; `vitest run --no-file-parallelism` exit **0** — **138 files / 948 tests** (up from 137/926; +`for-rent-dashboard.test.ts`, taxonomy rental blocks; `post-login`/`for-rent-navigation`/`rental-signup-form`/`register`/`talent-profile-layout` pin tests updated to the new route + parameterized logout); `next build` exit **0**.

**Verified live** on a second production server I started on `:3007` from the fresh build — his `:3000` `next start` (PID 16916) and live browser were never touched, his credentials never read or typed. A throwaway RENTAL provider + a throwaway asker were inserted straight into the shared DB (session row created by `sha256(token)`, so the shared `login:ip` rate-limit and his `signup:mediaworld:ip` budget were left alone). `/for-rent/dashboard` returned 200 and SSR-rendered (Bengali default): `ভাড়া সার্ভিস`, `আমার ভাড়ার আইটেম`, `প্রোভাইডার প্রোফাইল`, the provider business name, both new-lane listings (Motorbike + Prop Armoury) with their locations (Dhanmondi/Uttara), and stats `3 / 2 / 1 / 0` — proving real counts (available-now excludes the 1 hidden listing) and no fake rating/views. `/for-rent` marketplace (auth-gated) showed all live listings with location and correctly omitted the hidden one. `/for-rent/manage` → 307 `/for-rent/dashboard`; `/for-rent/dashboard` without a cookie → 307 `/login`. The dashboard's exact mutations were exercised through HTTP: publish PATCH → 200 and DB `isActive:true`; inquiry-status PATCH → 200 and DB `REPLIED`; confirm-delete DELETE → 200 and row gone.

**Cleanup:** all scratch data purged under a username/ownership guard (`users 0 / providers 0 / listings 0 / inquiries 0 / sessions 0 / zz-rent-* 0`, exit **0**) via FK cascade; scratch script + manifest + temp HTML deleted; the `:3007` verification server killed. **Note:** `next build` rewrote the shared `.next` that his running `:3000` server reads — if his live preview looks inconsistent, restarting `next start -p 3000` picks up the fresh build.

Uncommitted; no push.

---

## 2026-10-29 — Rental dashboard rebuilt in the talent-profile's language + a real "post product / service" action

**Ask (verbatim, sent twice):** screenshot of `localhost:3000/mediaworld/talent/robinbd-csyb7x` and "aita rental dashbord amon asbi and ay profile thaka manus product post korta parbi tar service." — the For Rent dashboard must read like that Media World talent profile, and whoever owns such a profile must be able to post their product/service.

**Consolidation, not duplication.** The two surfaces had drifted into two parallel card systems. So the profile's primitives were **extracted** into `src/components/mediaworld/talent/profile-ui.tsx` — `Icon` (+ two new names, `box` and `message`), `CardHead` (icon tile + `mw-talent-profile-card-head mw-tp-card-head`), `Detail` and `EmptyState` — and `talent-profile.tsx` now imports them instead of holding local copies (its profile-specific `Stat` stayed). The dashboard adopted the profile's exact card skin (`flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md`) and its 2:1 body grid (`grid grid-cols-1 gap-6 lg:grid-cols-3` → `lg:col-span-2` left, `lg:col-span-1` right) plus the `mx-auto! w-full max-w-[1440px] px-4 py-6 sm:px-6` root and `max-w-none! px-0! py-0!` on `<main>`, which is the only way to beat the unlayered `*{margin:0}` reset in `dashboard.css`. Then the redundant CSS was **deleted**, not kept in reserve: `.frd-grid` (with its `grid-template-columns:minmax(0,2fr) minmax(0,1fr)`), `.frd-col`, `.frd-card`, `.frd-card .mw-tp-card-head`, `.frd-card-action` and the empty-state button override are gone from `src/app/dashboard.css`; `.frd-*` survives only for what is genuinely dashboard-specific (topbar, lanes, lines, facts, notes) plus one new shared `.mw-tp-head-links`.

**Dashboard (`src/components/for-rent/for-rent-dashboard.tsx`) — layout only; logic untouched.** Hero is now the profile hero: cover image (new `coverUrl` plumbed from `account.coverImage` in `src/app/(main)/for-rent/dashboard/page.tsx`, `<img width={1600} height={520} fetchPriority='high'>`), avatar with the `mw-tp-verified`-style chip, handle/place line with the `pin` icon (place de-duplicated across provider location + district + division) and the accent CTA `পণ্য / সার্ভিস পোস্ট করুন` → `/for-rent/new` (`data-testid='for-rent-dashboard-add'`). The four stat tiles keep their real DB counts and gained the profile's icon tiles (`box / check / message / calendar`) with hint lines. Left column: items (`CardHead icon='box'`), booking requests (`calendar`), inquiries (`message`). Right column: provider profile (`briefcase`, now `mw-talent-profile-org/-logo/-facts` + 5 `<Detail>` rows + `mw-talent-profile-desc`), where-items-show (`megaphone`), availability (`clock`), what-I-am-renting (`grid`). Every zero state uses the shared `EmptyState` with a real CTA — `/for-rent/new` when a provider profile exists, `/for-rent/register` when it does not. Every mutation is unchanged: PATCH `isActive` for hide/publish, confirm-gated DELETE, inquiry-status PATCH, lane filters, and the honest caveats (no reply thread, approvals live on `/for-rent/bookings`, account phone/email never published).

**Post product/service reachable from the profile too.** `talent-profile.tsx` derives `listingPostHref = provider ? '/for-rent/new' : '/for-rent/register'` — no dead button: a rental owner with a provider profile lands on the real `ForRentListingForm`, one without lands on the gate that says so. Owner hero gains an accent `পণ্য / সার্ভিস পোস্ট করুন` (`data-testid='rental-post-listing'`) when `accountType === 'RENTAL'`. The bottom listings block no longer disappears when empty: a RENTAL profile always renders the `ভাড়ার পণ্য ও সার্ভিস` card, with owner vs visitor empty states and a `+ Post` head link — so a visitor never sees "this provider has no active rental listings" as a bare sentence.

**Tests** (`for-rent-dashboard.test.ts` + `talent-profile-layout.test.ts`, source-assertion style): the old "speaks the talent-profile visual language" case was replaced by three that pin the *shared* implementation — the profile-ui import, the identical `cardClass` string in both files, `lg:col-span-2/1` + `max-w-[1440px]`, `CardHead`/`Detail`/`EmptyState` usage, and `css().not.toContain('.frd-card{')` / `'.frd-grid{'` / `'.frd-col{'` so the deleted CSS cannot silently come back; plus "hands the provider a post product/service action that reaches the real listing form" (which reads `src/app/(main)/for-rent/new/page.tsx` and pins `ForRentListingForm`) and the two profile-side cases for the hero/card/testids. Label assertions were re-pointed to the new strings (`Post product / service`, `My rental products & services`).

**Gates:** `npx tsc --noEmit` exit **0**; `npm run lint` (`eslint src --max-warnings=0`) exit **0**; `npx vitest run --no-file-parallelism` exit **0** → **138 files / 955 tests** (was 948; +7); `npm run build` exit **0**.

**Verified live** on a second production server at `:3011` started from the fresh build — his `:3000` `next start` (PID 16916) and his live browser were never touched and his credentials never read or typed. Throwaway sessions were created by inserting `Session` rows with `sha256(token)` (so the shared `login:ip` counter and his `signup:mediaworld:ip` budget were left alone; passwords were random, never the seed script's hardcoded one). Dashboard 200 with `lg:grid-cols-3`, `lg:col-span-2/1`, 6 profile-skin cards, 4 stat icons, `max-w-[1440px]` and the hero `for-rent-dashboard-add` reading `পণ্য / সার্ভিস পোস্ট করুন`. Owner profile rendered `rental-post-listing` + `rental-post-listing-card` + the `ভাড়ার পণ্য ও সার্ভিস` card; the visitor view rendered the not-live empty state instead — and hiding a listing through the dashboard's own PATCH removed it from `/for-rent` while the counts moved `3 / 1 / 1 / 1` → `3 / 0 / 1 / 1`, confirming real counts. Along the way one assumption was corrected by querying the DB rather than guessing: `rental_categories` holds only `CAMERA, LIGHTING, LOCATIONS, OTHER, PRODUCTION, SOUND, VEHICLES` — CAR / MOTORBIKE / SOUND_SYSTEM / PROP_WEAPONS are *subcategories*.

**Cleanup:** scratch accounts purged under an ownership guard → `{"users":3,"providers":0,"listings":0} LEFT {"users":0,…,"sessions":0,"anyZz":0}` exit **0**; the 4 scratch scripts (`scripts/zz-frd-verify-*`, `scripts/zz-codes.mjs`), the temp HTML/JSON artifacts and the `:3011` server are deleted/killed. His `:3000` server is still running the pre-change build, so **nothing from Request G or this batch is visible at `localhost:3000` until `next start -p 3000` is restarted** — that A/B/C choice (I restart it / he restarts it / revert the batch) is still unanswered.

Uncommitted; no push.

---

## 2026-11-05 — "all error fix koro": two landing files had been overwritten with an old copy

**Symptom and root cause.** `npx tsc --noEmit` failed with 2 errors and `eslint src --max-warnings=0` with 1, and `npx vitest run --no-file-parallelism` was **9 tests failing in 2 files** (down from 956 green). Only two files in the whole tree had a modification timestamp newer than the 2026-10-29 batch: `src/components/mediaworld/mediaworld-platform.tsx` (05:15) and `src/app/(main)/mediaworld/page.tsx` (04:05). Both had been **replaced by an older copy** of themselves and then hand-poked:

- `mediaworld-platform.tsx` was a ~2026-10-25-era file (git `d56dc71` content, **CRLF** line endings, while every file this project wrote is LF) plus two inserted lines — `useMediaWorldLanguage` added to the **`from 'react'`** import and `const { language } = useMediaWorldLanguage();` in the wrapper that is *outside* its own `MediaWorldLanguageProvider`. That is the TS2305, the `no-unused-vars` error, and (in a browser) a hard module error on `/mediaworld`.
- `page.tsx` had reverted to the old `talentAccount` / `talentUsername` shape and passed `talentUsername` to a component that takes `initialListings` / `initialTalents` / `authenticated` — the TS2322.
- Neither stale copy matches `git HEAD` (`16aed97`, 2026-11-02), and **no commit in any branch ever contained `talentUsername`**, so this was not a `git checkout`; it came from an old editor/tool snapshot. `git log --oneline -- <path>` stops at `d56dc71` for the component, i.e. none of the 2026-10-27→29 landing work was ever committed, which is exactly why a stale overwrite could replace it silently.
- Collateral regression: the stale component re-introduced UI he had already ordered deleted — `★ 4.9` / `● Verified`, the fake footer (`href='#facebook'`, `Privacy Policy` / `Terms` / `Sitemap`, the invented `+880 1700-00000`), the no-op retry, and it dropped the talent directory, the restored Join popup wiring and the session-aware hero.

**How it was restored (no rewriting from memory).** `C:\Users\DELL\.qoder\file-history\115ed7cd-…\` keeps per-session snapshots keyed by hash, so the last accepted bytes of each file were located by grepping the snapshot store for the component's own markers and ranking by mtime + feature count:
- `…/2e4c0f04-a39f-4354-b98b-0102069ce89d@v4` (2026-10-29 14:38:39) = `mediaworld-platform.tsx` exactly as of transcript op **#26985**, and **only two transcript edits** came after it (#27287, #27294 — the session-aware hero). A replay script (`scripts/zz-replay.ts`, since deleted) applied them onto that base, refusing any `old_string` that did not match exactly once: **applied=2 skipped=0**, 32152 → 33283 chars. The component never had a `Write` in this transcript (it predates it), which is why a snapshot base was needed instead of the usual last-`Write` replay.
- `…/bab4bd2a-d3a2-47f9-b1e6-559cca4f108d@v2` (2026-10-29 13:15:45) = `page.tsx` final state; its transcript ops end at that same timestamp, so no replay was needed.
- Both stale copies were preserved first: `F:/tmp/platform.stale-2026-11-05.bak`, `F:/tmp/mediaworld-page.stale-2026-11-05.bak` (rollback path if any of that old markup was wanted).
- The rebuilt file was checked against the pinning tests, not against my description: `mw-join-trigger`, `MediaWorldLogoutButton`, `mediaworld-rent-cta`, `mediaworld-find-talent-cta`, `mw-talent-directory`, `reloadKey` all present; `footer-socials`, `Privacy Policy`, `mediaWorldJoined` all absent.

**Gates after the restore:** `npx tsc --noEmit` exit **0** · `npm run lint` exit **0** · `npx vitest run --no-file-parallelism` exit **0** → **138 files / 956 tests** · `npm run build` exit **0** (`/mediaworld` 11.6 kB, `/for-rent/dashboard` 8.19 kB both compile).

**Live verification — and a correction to the standing caveat.** `next.config.js` sets `distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'`, so **`npm run build` no longer touches what a `next dev` server is serving** — the earlier "your :3000 preview may look off because the build rewrote `.next`" warning is obsolete. What is actually running on his machine now: PID **17308** = `next dev --turbo --hostname 127.0.0.1 --port 3000` (child 1340 holds `127.0.0.1:3000`), plus a `next start` (22592) whose `0.0.0.0:3000` socket is **CLOSED**, plus a second `next dev --turbo` (1984/22100) that never bound 3000. The old `next start -p 3000` (PID 16916) is gone. The live dev server still returned the **stale** `/mediaworld` HTML (24,043 bytes, fake footer included) after the restore and after a `touch` — its turbopack module graph did not pick the change up — so **the restored landing needs his dev server restarted** to be visible at `localhost:3000`.
Verified instead on a spare production server I started myself (`npx next start -p 3013`, then killed): `/mediaworld` 200 / 44,609 bytes with `data-testid='mediaworld-join-trigger'`, `aria-haspopup="dialog"`, login + complaint triggers, the talent directory (`mw-talent-directory` ×2, 58 card class hits) and **0** hits for `footer-socials` / `Privacy Policy` / `1700-00000` / `★ 4.9`; `/for-rent/dashboard` and `/for-rent/manage` stream a `NEXT_REDIRECT;replace;/login;307` with **no** dashboard data in the shell (`frd-stat` 0) and `/api/for-rent` is 401 anonymously — auth boundaries intact, the 200 is just streaming SSR flushing headers before the redirect.

**Housekeeping.** Replay script deleted, spare server killed (PID 7896), temp HTML/logs deleted; the two `.bak` stale copies are left in `F:/tmp/` for rollback. Also noted, not touched: `.worktrees/super-admin-dashboard/` contains `auth_a.py`…`auth_f.py` (2026-10-19, Python `open(..., 'w')` writers — the origin of this repo's CRLF files) and an `@openai/codex` runtime `host-daemon.mjs` node process is alive, i.e. other tooling has been writing into this checkout. **Recommendation on the record: commit the tree** — 4 local commits exist, none pushed, and every piece of the 2026-10-27→29 landing work is uncommitted, which is what let an old snapshot silently overwrite it.

Uncommitted; no push.

**Count note:** the 2026-10-29 entry above records **955** tests; today's identical `vitest run --no-file-parallelism` reports **956** with the same 138 files. Both runs are green and no test file changed between them (only the two source files), so the suite count moved with a dynamically generated case, not with new tests. Treat **956** as current.

**Correction to the restart caveat above — none is needed.** Re-checked his live server directly rather than assuming: `curl http://127.0.0.1:3000/mediaworld` → **200 / 60,278 bytes** with `mediaworld-join-trigger` ×1, `mw-talent-directory` ×5, and **0** hits for `footer-socials`, `Privacy Policy`, `1700-00000`, `★`, `Verified` and the literal string `4.9`. (The earlier `4.9` count of 2 was my own grep artifact — `.` is a wildcard, so it matched `479`; `grep -oF '4.9'` returns 0. Read the marker counts, not just the pattern.) The turbopack graph picked the restore up on its own after the `touch`, so the stale copy is gone from his `:3000` without touching his process.

Gates re-run on this final tree after the restore: `tsc --noEmit` exit **0** · `eslint src --max-warnings=0` exit **0** · `vitest run --no-file-parallelism` exit **0** → **138 files / 956 tests** · `next build` exit **0**. The build is safe to run again — `distDir` is `.next-dev` under `NODE_ENV=development`, so it does not disturb the dev server.

Uncommitted; no push.

---

## 2026-11-05 — Profile button in the `/mediaworld` hero strip (members only)

**Ask (verbatim):** two screenshots — the hero strip (`Complain | Log out | Rent | Find talent`, red-boxed) and his own talent profile `localhost:3000/mediaworld/talent/luna-cehk6q` — plus "profile button add koro and profile button a click korla ayta asbi … only login howar por ay button gula show korba". One new control in that strip, pointing at the signed-in member's own talent profile, login-gated like the rest of the member branch.

**Landing (`src/app/(main)/mediaworld/page.tsx`):** `profileHref` is computed, not assumed. The third `Promise.all` branch is `user ? prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } }) : Promise.resolve(null)` and `const profileHref = user && member?.accountType ? \`/mediaworld/talent/${user.username}\` : undefined`. That single field is the whole reason for the query: `/mediaworld/talent/[username]` calls `notFound()` when `accountType` is null, so an unconditional button would have been a dead link for every plain Twingface account that opens `/mediaworld`. `getCurrentUser()` does not return `accountType` (`safeUserSelect` in `src/lib/auth.ts:19`), and I did **not** widen that shared select for one button.

**Hero (`src/components/mediaworld/mediaworld-platform.tsx`):** optional `profileHref?: string` prop on both `MediaWorldPlatformContent` and the default export; inside the existing `: (` member branch, before `MediaWorldLogoutButton`, `{profileHref ? <Link href={profileHref} className='mediaworld-hero-action mediaworld-hero-action-ghost' data-testid='mediaworld-profile-cta'>{bn ? 'প্রোফাইল' : 'Profile'}</Link> : null}`. Ghost skin keeps the single blue accent on Rent; the strip's `flex-wrap` plus the existing ≤860px `flex:1 1 150px` and ≤520px column rules absorb the fifth button, so no CSS changed. Final member order: Complain · Profile · Log out · Rent · Find talent. The visitor branch (`Login` + `Join as Professional`) and the sidebar quick-link gate are untouched.

**Tests:** `mediaworld-platform.test.ts` → the swap case now also pins `href={profileHref}`, the testid, the Bengali/English label, the `{profileHref ? (` / `) : null}` guard and `profileHref?: string`, and extends the order assertion to `profile < logout < rent < find-talent`. `mediaworld-landing.test.ts` → the old "reads no membership column so the landing needs one query less" case (written when the hero was ungated, and now contradicted by the session-aware hero) was replaced by "reads only the account type for the member Profile button, nothing else", which pins `user ? prisma.user.findUnique`, `select: { accountType: true }`, `profileHref={profileHref}` and the `/mediaworld/talent/${user.username}` template while keeping the contact-column bans.

**Gates:** `npx tsc --noEmit` exit **0** · `npm run lint` exit **0** · `npx vitest run --no-file-parallelism` exit **0** → **138 files / 956 tests** · `npm run build` exit **0**.

**Verified live** on a spare `npx next start -p 3015` from the fresh build — his `:3000` `next dev` and his browser were never touched, his credentials never read or typed. Two throwaway accounts were inserted straight into the DB with `Session` rows keyed by `sha256(token)` (passwordHash set to the existing `DUMMY_PASSWORD_HASH`, so no new credential exists and the shared `login:ip` + `signup:mediaworld:ip` counters were left alone), and the tokens stayed on disk rather than in stdout. Rendered HTML, not status codes, was the evidence: member → `<a class="mediaworld-hero-action mediaworld-hero-action-ghost" data-testid="mediaworld-profile-cta" href="/mediaworld/talent/zz-prof.member.1105">প্রোফাইল</a>` with strip order `complaint → profile → rent → find-talent` (+ logout); plain account (`accountType: null`) → **0** profile anchors, same strip otherwise; anonymous → **0** profile anchors with `login` 1 / `join` 2. The member target returned the real profile (own name present, owner edit CTA present) so the button is not dead; the plain account's would-be URL rendered the 404 page ("Page not found" ×1, 10,220 bytes) behind a flushed 200 — streaming SSR again hides the real outcome in the status line, which is why the gate was checked by body. Then confirmed on his own server: `curl http://127.0.0.1:3000/mediaworld` → 200, `mediaworld-login-trigger` 1, `mw-join-trigger` 2, `mediaworld-profile-cta` 0 (correct while anonymous), no error page, and `profileHref` present in the flight payload, i.e. turbopack compiled the change without touching his process.

**Cleanup:** both scratch accounts deleted under a username+id guard → `{"deleted":[…2 users…],"left":{"users":0,"sessions":0,"targetUsers":0}}` exit **0**; the 3 scratch scripts + token file + server log deleted; `:3015` confirmed free; his `:3000` still listening.

Uncommitted; no push.

## 2026-11-05 (later) — "profile button pailam na": his tab was a media-less account, plus the `/profile` fallback

Robin still saw only `Complain | Log out | Rent | Find talent`. The cause was not a broken build — the gate I had just added hides the button for accounts with no Media World profile, and **that is the account he is logged in with**.

Evidence, read-only against his own tab (`http://localhost:3000/mediaworld`; nothing in his UI was clicked, no auth action taken, only GETs from inside the page with `credentials: 'include'`):
- accessibility snapshot → strip has Complain / Log out / Rent / Find talent, **no** Profile; navbar `Profile menu` present, so the session is live.
- in-tab `GET /mediaworld` → 200, 47,704 bytes, `mediaworld-login-trigger` **0** (member branch), `mediaworld-profile-cta` **0**.
- in-tab `GET /profile` → renders **"Profile One"**, i.e. username `profile-1`. Confirmed in the DB: `profile-1` is the freshest `UserPresence.isOnline` row (`lastActiveAt` 06:24Z) with `accountType: null`.

So for his session `profileHref` was `undefined` by design, because `/mediaworld/talent/profile-1` calls `notFound()` — showing a button there would have been the dead-link class of defect he already banned.

**Behaviour change (his ask was "show these buttons after login", not "show them after login unless the account has a media profile"):** the button now always renders for a signed-in member, pointed at a real page either way. In `src/app/(main)/mediaworld/page.tsx`:

```ts
let profileHref: string | undefined;
if (user) {
  profileHref = member?.accountType ? `/mediaworld/talent/${user.username}` : '/profile';
}
```

The hero component is unchanged (`{profileHref ? … : null}` still guards the visitor branch). `mediaworld-landing.test.ts` now also pins `: '/profile'` and `if (user) {` next to the existing account-type pins.

**Gates:** `npx tsc --noEmit` 0 · `npx next lint` on the edited surfaces 0 · `npx vitest run` **138 files / 956 tests** · `npm run build` 0.

**Verified live** with two throwaway sessions (scratch users `zz-probe-pro` PROFESSIONAL and `zz-probe-null` `accountType: null`, inserted straight into `users` + `sessions` with `sha256(token)`, deleted in the same script → `left: 0`; no credentials touched, no rate-limit counters used):
- `127.0.0.1:3000` (his dev server, `twingface_session`) → professional: `profile-cta` 1, `href="/mediaworld/talent/zz-probe-pro"`; **null account: `profile-cta` 1, `href="/profile"`** — the fix is live on the server he can use right now.
- `localhost:3000` / `[::1]:3000` (production-mode cookie `__Host-twingface_session`) → professional: 1; null account: **0**, because that process still holds the *previous* build's page module in memory.

**Correction to the "no restart is ever needed" note above:** it is true only of the `next dev` server, which recompiles from source. A production-mode process serving `:3000` does **not** pick up a new `npm run build`; it must be restarted. That is the remaining step on Robin's side, and I did not touch his process. Also re-measured: `netstat` reports the `127.0.0.1:3000` LISTENING socket as PID 0 and `Get-NetTCPConnection -State Listen` finds no owner, while established sockets on that port are owned by PID 32340 — the port is answered from outside this shell's visibility (proxy/other namespace), which is why `127.0.0.1` and `localhost` behave as two different servers (dev vs production cookie).

**What to tell him:** restart the `:3000` server (Ctrl+C, `npm run dev`) and hard reload, then log in again — the `__Host-twingface_session` cookie is production-only, so a dev-mode restart looks logged out at first. With `Profile One` the button opens `/profile`; with a Media World account (Luna / rony, both `PROFESSIONAL`) it opens `/mediaworld/talent/<username>` exactly as asked.

Uncommitted; no push.

## 2026-11-05 (evening) — Profile button target: media-less members go to the wizard

He restarted `npm run start` himself (PID 29560; `next dev --turbo --hostname 127.0.0.1` is PID 15236, its worker 32340) and the button appeared on **both** spellings of `:3000`. Two screenshots then: the red-boxed `Complain | Profile | Log out | Rent | Find talent` strip, and `localhost:3000/mediaworld/talent/luna-cehk6q` — "profile a click korla oi page a asbi". So the ask moved from *visibility* to *target*.

Measured at that moment: media member → `/mediaworld/talent/<username>` (already the page in his screenshot, nothing to change); his own tab `profile-1` (`accountType: null`) → `/profile`. He was offered three targets for the media-less case and picked **"Media World register e nao"**, so `src/app/(main)/mediaworld/page.tsx` now reads:

```ts
profileHref = member?.accountType ? `/mediaworld/talent/${user.username}` : '/mediaworld/register';
```

`/mediaworld/register` is a real destination for a signed-in media-less account, checked before wiring it: `MediaWorldRegisterPage` loads `getCurrentUser()` + `loadOnboardingState()`, renders `SetupWizard` with `authenticated={Boolean(user)}` (no login redirect, no 404), and when the setup is already complete it `redirect()`s to `/mediaworld/talent/<username>` itself — so the button self-heals into the talent page once the wizard is finished. The label still says `Profile` / `প্রোফাইল`; he was told he can ask for `Create profile` instead and did not.

**Gates:** `npx tsc --noEmit` 0 · `npx next lint` on the page 0 · `npx vitest run` **138 files / 956 tests** · `npm run build` "Compiled successfully". Pin updated in `mediaworld-landing.test.ts` (`: '/mediaworld/register'` replaces `: '/profile'`).

**Verified live** with two throwaway sessions (`zz-tgt-null`, `zz-tgt-pro`, deleted in-script → `left: 0`; no credentials or rate-limit counters touched): `127.0.0.1:3000` → null account `href="/mediaworld/register"` **and** that URL returns 200 rendering `mw-onb-shell` (wizard, not a redirect); professional `href="/mediaworld/talent/zz-tgt-pro"`. `localhost:3000` still showed `/profile` for the null account — that `next start` holds the build it booted with, so it needs one more restart to pick up this change (his call; I touched nothing).

**Correction, mine:** earlier I wrote ":3015 confirmed free" — it was not. `npx next start -p 3015` (PID 5804) and its child `next start -p 3015` (PID 12248) are still running; I asked to kill them and the action was blocked pending his approval, so they are still up.

Uncommitted; no push.

## 2026-11-05 (night) — two labels on the hero Profile button

He asked "button label 'প্রোফাইল তৈরি করুন' korla ki hobi?" — answered honestly first: blanket-replacing the label would make it lie for members who already have a profile (their click opens it, it does not create one), so the label must follow the destination. He approved the two-label approach.

**Shape:** the page already knows which case it is, so it now sends one object instead of a bare href — `type ProfileCta = { href: string; kind: 'open' | 'create' }` in `mediaworld-platform.tsx`, prop `profileCta?: ProfileCta` on both `MediaWorldPlatformContent` and the default export, replacing `profileHref`. `src/app/(main)/mediaworld/page.tsx`:

```ts
let profileCta: { href: string; kind: 'open' | 'create' } | undefined;
if (user) {
  profileCta = member?.accountType
    ? { href: `/mediaworld/talent/${user.username}`, kind: 'open' }
    : { href: '/mediaworld/register', kind: 'create' };
}
```

The **verb pairs stay in the component** (`{profileCta.kind === 'open' ? (bn ? 'প্রোফাইল' : 'Profile') : (bn ? 'প্রোফাইল তৈরি করুন' : 'Create profile')}`) because the Bengali/English toggle is client-side context the RSC page cannot read — passing a finished string would freeze it to the SSR language. No CSS change; the wider Bengali label fits the wrapping strip.

**Tests:** platform pin now asserts `href={profileCta.href}`, `profileCta.kind === 'open'`, both parenthesised label pairs, `{profileCta ? (`, the `type ProfileCta` line and `profileCta?: ProfileCta`; landing pin now asserts `profileCta={profileCta}` plus `kind: 'open'` / `kind: 'create'` next to the two hrefs. Two iterations were needed because prettier first collapsed the nested ternary across lines, which broke the literal `{bn ? …}` pin — the parenthesised form keeps it on one line.

**Gates:** tsc 0 · `npx next lint` on both files 0 · `npx vitest run` **138 files / 956 tests** · `npm run build` "Compiled successfully".

**Verified live** on his dev server (`127.0.0.1:3000`, `twingface_session`) with two throwaway sessions (`zz-lb2-null`, `zz-lb2-pro`, deleted in-script → `left: 0`), reading the rendered anchor rather than trusting the source: null account → `<a … href="/mediaworld/register">প্রোফাইল তৈরি করুন</a>`; professional → `<a … href="/mediaworld/talent/zz-lb2-pro">প্রোফাইল</a>`. His `next start` on `localhost:3000` still serves the build it booted with, so this needs one more `npm run start` restart on his side.

Uncommitted; no push.

## 2026-11-05 (night) — sidebar quick link became "TwingFace" → /dashboard

He boxed the visitor-only `↪ Login` quick link in the Media World sidebar: "ay button chenges koro name dow TwingFace ay khani click korla twingface ar newsfeed asbi `http://localhost:3000/dashboard`".

`src/components/mediaworld/mediaworld-platform.tsx` — the `{!authenticated ? ( … ) : null}` wrapper around `.mediaworld-quick-links` is gone and the single link is now `<Link href='/dashboard'><span aria-hidden='true'>↗</span> TwingFace</Link>`. **Why ungated instead of keeping the visitor-only rule:** the destination is the newsfeed, which only a member can see, so a visitor-only link would have been the one build where the button never does what it says; members previously had no cross-link back to Twingface from Media World at all. Dropping the visitor Login shortcut costs nothing — the hero strip still renders `Login` + `Join as Professional` for `!authenticated`. Brand name stays Latin in both languages, so no `bn` pair was added, and `.mediaworld-quick-links a` already styles it (no CSS change).

**Tests:** the shell case now pins `↗ TwingFace` and `not.toContain` the old `↪ Login` line; the hero case's "sidebar quick link keeps its visitor-only rule" assertion was inverted to `not.toContain('{!authenticated ? (')` with the reason in the comment. The historical `not.toContain("<Link href='/dashboard'><span aria-hidden='true'>⌂</span> Home</Link>")` pin still holds — this is not a Home entry.

**Gates:** tsc 0 · `npx next lint` on the component 0 · `npx vitest run` **138 files / 956 tests** · `npm run build` "Compiled successfully".

**Verified live** on `127.0.0.1:3000` with one throwaway `PROFESSIONAL` session (`zz-twf-pro`, deleted in-script → `left: 0`): anonymous `/mediaworld` → `↗ TwingFace` 1 with `href="/dashboard"`, old `↪ Login` **0**, hero `mediaworld-login-trigger` still 1; member `/mediaworld` → `TwingFace` 1 and `mediaworld-profile-cta` 1; `/dashboard` as a member → 200, 58,716 bytes, real feed markup. **Honest note for the visitor case:** `/dashboard` streams `NEXT_REDIRECT;replace;/login;307` (200 in the status line, as usual), so a signed-out click lands on the login page — the newsfeed needs a session.

His `next start` on `localhost:3000` needs another restart for this and the two-label change; `127.0.0.1:3000` already serves both.

Uncommitted; no push.

## 2026-11-05 (night 2) — the sidebar brand tile now shows the member's own photo

He boxed the `🎬` tile at the top of the Media World sidebar: "ami mark kori dici oi khani tumi profile pic add kori dow user join korla oita chenges hoiya jabi profile pic asbi dainamic vabi. add kori dow." — the tile must become the signed-in user's profile picture, per user, not a fixed logo.

`src/app/(main)/mediaworld/page.tsx` passes `memberAvatar={user ? { name: user.name, image: user.profileImage } : undefined}`. **No new query:** `getCurrentUser()` already selects `profileImage` (`safeUserSelect`), so the photo comes free from the session lookup the page already does — unlike the `accountType` lookup behind the hero button, which needed its own one-column read. Visitors get `undefined`.

`src/components/mediaworld/mediaworld-platform.tsx` — `type MemberAvatar = { name: string; image: string | null };` beside `ProfileCta`, forwarded through both the default export and `MediaWorldPlatformContent`. The tile is now:

```tsx
<span>
  {memberAvatar?.image ? (
    <img className='mediaworld-sidebar-avatar' src={memberAvatar.image} alt={memberAvatar.name} />
  ) : (
    '🎬'
  )}
</span>
```

The clapperboard stays as the fallback for visitors and for members who never uploaded a photo — an empty gradient tile or a stock silhouette would be the fake-avatar version of the fake ratings he already had me delete. Plain `<img>` follows the house pattern (`dashboard-navbar.tsx` `Avatar`, `super-admin-dashboard.tsx`), `alt={memberAvatar.name}` because the tile itself carries no visible name.

`src/app/dashboard.css` — one new rule, `.mediaworld-sidebar-avatar{display:block;width:100%;height:100%;object-fit:cover;border-radius:11px}`, matching the existing 34×34 `border-radius:11px` gradient tile so the photo inherits the tile's shape rather than replacing it. The mobile chip-rail rule already hides `.mediaworld-sidebar-title` under 860px, so nothing else changed.

**Tests:** new platform case "puts the member's own photo in the sidebar brand tile, keeping the clapperboard when there is none" pins `type MemberAvatar`, `memberAvatar?: MemberAvatar;`, `memberAvatar={memberAvatar}`, the exact `<img …>` line, `) : (` and asserts the `🎬` index falls *after* the avatar index inside the title slice (so the fallback cannot become the only branch) and before `<strong>TF Media World</strong>`, plus the CSS rule string. New landing case pins the exact prop line and `prisma.user.findUnique` appears **exactly once** — the avatar must not smuggle in a second query. The pre-existing contact-column bans still hold.

**Gates:** tsc 0 · `npm run lint` 0 · `npx vitest run --no-file-parallelism` **138 files / 958 tests** (+2) · `npm run build` exit 0.

**Verified live** on his dev server `127.0.0.1:3000` with two throwaway sessions (`zz-av-photo` with `profileImage='/rima.jpg'`, `zz-av-null` with none; both deleted in-script → `purged=2 left=0 orphanSessions=0 anyZz=0`, token files and the script removed):
- anonymous → `<span>🎬</span>`, avatar `<img>` count 0;
- `zz-av-photo` → `<span><img class="mediaworld-sidebar-avatar" src="/rima.jpg" alt="zz-av-photo"/></span>`;
- `zz-av-null` → `<span>🎬</span>`, avatar `<img>` count 0.
The photo asset itself returns 200 (5,972 bytes) and the served turbopack `src_app_globals_*.css` contains both the tile rule and `.mediaworld-sidebar-avatar{object-fit:cover;border-radius:11px;width:100%;height:100%;display:block}`. **Method note:** turbopack re-prints the CSS (selectors get a space before `{`, declarations are re-ordered), so `grep -oE '\.class\{[^}]*\}'` finds nothing — grep the class name and read the raw lines.

His `localhost:3000` `next start` still serves the build it booted with (13:52 process vs my later builds), so this and the two earlier changes need one `npm run build` + `npm run start` restart on his side; `127.0.0.1:3000` already has all three.

Uncommitted; no push.

## 2026-11-05 (night 3) — the whole talent card now opens that profile

Screenshot of `localhost:3000/mediaworld` with the "Talent profiles — 15" block and Luna's card boxed: "Talent profiles a click korla oi profile show korca na oita fix koro. profile a click korla show korba profile information. agi chilo tumi dako file gular modda. onno kono kisu chenges koiro na. only ayter modda kaj koro." Two constraints honored: fix only this, change nothing else.

**Diagnosis first, and the destination was never broken.** Read-only evidence from inside his own tab (no clicks, no auth action):
- `fetch('/mediaworld/talent/luna-cehk6q', {credentials:'include'})` → **200**, no `NEXT_REDIRECT;replace;/login`, body contains "Luna" and the `mw-tp-` profile shell (40,122 bytes). So the profile page renders for his session; the report was about the card, not the route.
- Every card has **exactly one** anchor and it is the name text: card `405×138` px, link `179×19.5` px. `document.elementFromPoint()` at the avatar, the handle, the location, the chips row and the bottom-right empty area returned `img.mw-talent-avatar`, `p.mw-talent-card-handle`, `p.mw-talent-card-place`, `span`, `article.mw-talent-card` — **`[NO LINK]` at all five points**. Clicking anywhere except the name did nothing, which is what he experienced. Anonymous `/mediaworld/talent/<username>` on the dev server does redirect to `/login`, but that is not what he hit.

**Fix is CSS-only — `talent-card.tsx` was not touched at all**, so no markup, data or copy changed anywhere else:

```css
.mw-talent-card{position:relative;…}                                    /* was not positioned */
.mw-talent-card-name::after{content:'';position:absolute;inset:0;border-radius:16px}
.mw-talent-card-listings{position:relative;z-index:1;…}
```

This is the stretched-link pattern: the single existing anchor's `::after` covers the card, so the whole card hit-tests to that link and lands on `/mediaworld/talent/<username>`. **Why not wrap `<article>` in a link instead:** the card already renders a nested `<Link>` (`mw-talent-card-listings`, the rental "view rental listings" line), and `<a>` inside `<a>` is invalid HTML that browsers un-nest — so the rental link got `position:relative;z-index:1` to stay above the overlay. Keyboard behaviour is unchanged (Tab still reaches the same one link, still labelled by the talent's name), and `.mw-talent-card-name:hover` now fires from anywhere on the card, which is the affordance he was missing. Because the rule targets `.mw-talent-card` in the global stylesheet, `/mediaworld/talent` (`talent-browser.tsx`, same `TalentCard`) is fixed by the same three lines.

**Trade-off stated, not hidden:** the overlay sits above the card's text, so bio/chips text inside a card is no longer selectable. That is inherent to card links; if he wants selection back, the alternative is limiting the overlay to the card head.

**Tests:** new platform case "makes the whole talent card open that profile, not only the name text" reads `talent-card.tsx` itself and pins `const href = \`/mediaworld/talent/${talent.username}\`;`, the name-link line, and that `mw-talent-card-name` appears **exactly once** in the card (so a second anchor cannot re-break the geometry), plus all three CSS rules including the `z-index` on the rental line.

**Gates:** tsc 0 · `npm run lint` 0 · `npx vitest run --no-file-parallelism` **138 files / 959 tests** (+1) · `npm run build` "Compiled successfully in 15.0s".

**Verified live:** same read-only probe in his tab, with the exact new rules injected as a temporary `<style>` and removed again afterwards (scroll position restored, `scrollRestored: true`, no navigation, no auth change): **before** → all five points `[NO LINK]`; **after** → all five points `a.mw-talent-card-name [LINK /mediaworld/talent/luna-cehk6q]`. On the dev server the served `src_app_globals_*.css` contains `.mw-talent-card{…position:relative}` and `.mw-talent-card-name:after{content:"";border-radius:16px;position:absolute;inset:0}`. **Grep note: turbopack rewrites `::after` to `:after` and `content:''` to `content:""`,** so searching for the double-colon form finds nothing — grep the selector stem instead (this is the same re-printing effect noted for the sidebar avatar).

His `localhost:3000` needs one more `npm run build` + `npm run start` restart to carry this; `127.0.0.1:3000` already has it.

Uncommitted; no push.

## 2026-11-05 (night 3, later) — my own build gate broke his live CSS; guard + restart

Screenshot of `http://localhost:3000/mediaworld` rendered with **zero CSS** (Times-font stack, one giant avatar, no cards): "fix koro".

**I caused this, and the cause is a process-level fact I had previously got wrong.** A running `next start` serves the `.next` directory it booted from. Every `npm run build` I ran as a "gate" overwrote that directory underneath his live server, so the HTML it emitted still asked for the previous stylesheet hash:
- `/_next/static/css/d1a103a0b2862a03.css` → **400** (file no longer exists);
- `.next/static/css/` on disk held only `96343f2775786127.css`, and that server answered **404** for it because its own build manifest no longer matched;
- JS chunks still returned 200, which is why the page was interactive but unstyled.

Worse, **two** `next start` processes were both holding `[::1]:3000` (PID 1984 booted 14:23:49, PID 3296 booted 15:52:49), so reloads alternated between two different stale builds. My earlier statement that "your `:3000` needs no restart" was only ever true for the dev server on `127.0.0.1:3000`; for `next start` it was wrong, and I said so plainly rather than defending it.

**Two actions he explicitly approved** (AskUserQuestion): *"Hya, apni restart kore din"* and *"Ha, guard add korun (recommended)"*.

1. Guard in `next.config.js` so verification builds can never touch the directory a live server is reading:
```js
distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
```
2. Restart: killed PID 1984, 3296 and my own orphan `next start -p 3015` pair (5804 → 15736 → 12248; the npm wrapper 35248 had already exited). The dev server (30488 → 15236 → 23780) was left untouched, and `git status` was checked first (130 changed paths, HEAD `16aed97`, nothing at risk). Then one fresh `npm run start`.

**Verified live on the restarted production server** (`localhost:3000`, read-only in-tab probes, no clicks, no auth action):
- `/mediaworld` → 200 (45,433 bytes) and now references `/_next/static/css/96343f2775786127.css`, which returns **200 / 263,205 bytes**;
- that CSS carries all three card rules (`.mw-talent-card{…position:relative}`, `.mw-talent-card-name:after{content:"";border-radius:16px;position:absolute;inset:0}`, `.mw-talent-card-listings{z-index:1;…position:relative}`) and `.mediaworld-sidebar-avatar{object-fit:cover;border-radius:11px;width:100%;height:100%;display:block}`;
- in-browser: both `<link rel=stylesheet>` report `sheet` loaded, `body` font is `"DM Sans", "Hind Siliguri", system-ui`, 8 `.mw-talent-card` articles rendered, `elementFromPoint` at card centre-bottom / right-middle / bottom-left all hit `opens-profile`, and the card's own href `/mediaworld/talent/luna-cehk6q` → **200** with the `mw-tp-` profile shell (40,122 bytes);
- signed-in markers on the prod page: `Log out` present, `Profile` CTA present, sidebar quick link `TwingFace` present, `mediaworld-sidebar-avatar` absent — correct, because his own `profile-1` has `profileImage: null`, so the honest `🎬` fallback is what he sees until he uploads a photo;
- screenshot re-taken: page is styled again.

**Guard proven, not assumed:** `NEXT_DIST_DIR=.next-verify npx next build` → exit 0, `.next/BUILD_ID` identical before and after (`o7Ij3rAcvxdp9SFpyEysu`), `.next-verify` created and then deleted. Live page and CSS re-checked after that build: both 200.

**Gates:** tsc 0 · `npm run lint` 0 · `npx vitest run --no-file-parallelism` 138 files / **959 tests** · guarded build exit 0. Scratch/temp files removed (`.next-verify`, `zz-node-procs.ps1`, `/f/tmp` probe artifacts).

**Standing consequence:** `localhost:3000` now serves the 16:23 build; any later source change reaches it only through a guarded rebuild + restart, while `127.0.0.1:3000` (dev) is always current. All future gate builds must use `NEXT_DIST_DIR`.

Uncommitted; no push.

## 2026-11-05 (night 3, later) — "Talent profile click korle /login ashe": not a bug, and he chose to keep it

Report right after the restart: clicking a Talent-profiles card lands on `http://localhost:3000/login`.

**Measured, in his own logged-in tab, on the restarted production server:** hard load of `/mediaworld/talent/luna-cehk6q` → 200 with `h1 = Luna` and no password field; and a real click on a *different* card from `/mediaworld` (`rony-2rw9f5`) → the profile opened (`h1 = rony`). `list_pages` showed exactly one tab, so there was no second stale preview involved. Against the same route with **no** cookie, `curl` streams `NEXT_REDIRECT;replace;/login;307`.

So the redirect is the designed guard, not a regression: [src/app/(main)/mediaworld/talent/[username]/page.tsx:22](src/app/(main)/mediaworld/talent/[username]/page.tsx) `if (!user) redirect('/login')`, and the landing already tells a visitor "Sign in to open a profile and see contact details." A browser or tab with no session on `localhost:3000` therefore lands on `/login` — note `127.0.0.1:3000` (dev) and `localhost:3000` (prod) hold **different** session cookies, so being logged in on one does not mean being logged in on the other.

**Asked whether to make profiles public** (visitors could read name/bio/portfolio/services while `prepareTalentProfile` already strips private phone/email/whatsapp/address/rates server-side, so contact would stay gated). He declined: *"now ok only mumber can view massages and others now jamon kaj korca."* **Decision recorded: talent profiles stay members-only — do not re-propose a public profile page.** No code changed in this step; the only outcome is this note plus the scope memory.

Uncommitted; no push.

## 2026-11-05 (night 4) — "all error fix koro. unnecessary file and folder removed koro"

**Gates first, because "error" had to be defined by measurement, not by guesswork:** tsc 0 · `npm run lint` 0 · `npx vitest run --no-file-parallelism` 138 files / 959 tests · guarded build exit 0. So there was no compile, lint or test error left. The real errors were runtime, and they were only visible while **signed out** — which is exactly the state his browser was in at that moment (the hero rendered `Complain / Login / Join as Professional`, `/dashboard` streamed `NEXT_REDIRECT;replace;/login;307`).

**Two red console errors on every public page** (`list_console_messages` on `localhost:3000/mediaworld`):

```
Failed to load resource: 401 (Unauthorized)  /api/presence/heartbeat
Failed to load resource: 401 (Unauthorized)  /api/calls/stream
```

**Cause:** `src/app/(main)/layout.tsx` is the shell for the whole `(main)` group, and that group contains the **public** pages (`/mediaworld`, `/mediaworld/register`, `/for-rent/register`, `/channelhub`). It mounted `<PresenceHeartbeat />` and wrapped everything in `<CallProvider>`, both of which start immediately: the heartbeat POSTs every 45 s forever (a repeating 401, not a single one) and `CallProvider` opens an `EventSource('/api/calls/stream')` that the API answers with 401 (`getCurrentUser()` is null). `src/app/api/presence/heartbeat/route.ts` and the three stream routes are correct — they require a session; the shell was asking them anyway.

**Fix — the shell now asks who is signed in and hands that answer down** (one indexed query, the same `getCurrentUser()` every page already calls):

```tsx
const authenticated = Boolean(await getCurrentUser());
<CallProvider enabled={authenticated}>
  <PresenceHeartbeat enabled={authenticated} />
```

`PresenceHeartbeat` returns before arming the interval or the `visibilitychange` / `pagehide` listeners when `enabled` is false, and `CallProvider` returns before `new EventSource(...)` with `enabled` added to that effect's deps. `MessengerDock` and `CallOverlay` render nothing without state, so they stayed mounted; `MessengerProvider` makes no request at all. Nothing else in the repo imports `CallProvider` or `PresenceHeartbeat`, so the layout is the only call site.

**Verified both ways.** Visitor (`127.0.0.1:3000` and `localhost:3000`, signed out): `performance.getEntriesByType('resource')` filtered to `responseStatus >= 400` → `[]`, and the heartbeat/stream entries are **gone** (not merely failing) — `backgroundCalls: []`, console empty, 8 talent cards still rendered, card hit-test still `opens-profile`, both stylesheets loaded. Member (throwaway `zz-pres` + one `Session` row, token kept in a `0600` temp file and never printed): `/api/presence/heartbeat` → **200**, `/api/calls/stream` → **200**, and `/mediaworld` renders the member hero (`লগ আউট` 1, `লাগ ইন` 0) — proof the layout's session read works and `enabled` is true for members, so presence and call signalling behave exactly as before. Purged: `purged=1 sessions=1 left=0 anyZz=0`, script and token file deleted.

**Unnecessary files and folders.** `.gitignore` already covers `*.log`, `*.tsbuildinfo` and `.worktrees/`, so the accumulated junk was invisible in `git status`:
- **Deleted (regenerable artifacts):** 19 root log files (`build.log`, `build2.log`, `build-log.txt`, `dev-fresh.log`, `dev-server.log`, `server.log`, `lint*.log`, `tsc*.log`, `vt*.log`, `.tmp-next-start.log`, `.tmp-preview.log`), `tsconfig.tsbuildinfo`, and the six `.superpowers/sdd/*.log` server captures. `.next-verify` (my scratch build dir) removed.
- **Moved out of the repo, not destroyed:** the root `auth_a.py` … `auth_f.py` — Python `open(..., 'w')` writers that regenerate `src/app/(auth)/auth-form.tsx`, i.e. the known origin of this repo's overwritten files. Identical copies remain in `.worktrees/super-admin-dashboard/`, and the ledger already documents them, so they went to `F:/tmp/removed-from-repo/2026-11-05/` instead of being deleted outright. **Leaving them at the repo root meant one stray `python auth_a.py` could wipe a source file.**
- **Deleted as dead code (all seven confirmed to have zero importers, zero test references, and all present in `HEAD`, so `git checkout -- <path>` restores them):** `src/components/mediaworld/mediaworld-categories-places.tsx`, `mediaworld-rental-and-divisions.tsx`, `mediaworld-sections.tsx`, `mediaworld-sidebar-filters.tsx` (orphans of the landing split that the file restore replaced with the inlined `mediaworld-platform.tsx`), plus the scaffold stubs `src/lib/storage.ts`, `src/lib/websocket.ts`, `src/types/index.ts`.
- **Deliberately kept, with the reason:** `.worktrees/super-admin-dashboard/` is a live `git worktree` on branch `feature/super-admin-dashboard` (52 MB — someone's in-progress branch, not junk); `.next` and `.next-dev` are the two running servers' active build directories; `prisma/schema.prisma.enum-variant.bak` is the preserved rollback copy from the 2026-10-24 schema conflict; `.agents`, `.claude`, `.kilo`, `.vscode`, `skills-lock.json` are tool configuration; `scripts/` holds the five real seed/verify scripts; `public/rima.jpg` and `public/sajid.jpg` are each referenced twice.

**Shipped:** `npm run build` into `.next` (BUILD_ID `vnajjgHX23H-yJk9UvV9H`, CSS `816482b3e170a0a1.css` → 200) and the production server restarted, so `localhost:3000` carries the fix rather than only the dev server.

**Gates after everything:** tsc 0 · lint 0 · **139 files / 962 tests** (+1 file, +3: `src/app/(main)/layout.test.ts` pins the single `getCurrentUser()` in the shell, both `enabled` props, the guard ordering `if (!enabled) return;` before `goOnline()` / `new EventSource(...)`, and the new deps array) · build exit 0.

Uncommitted; no push.

---

## 2026-11-05 (night 5) — "build and run and test and checking all option"

Full verification pass on a **separate** production instance so his `localhost:3000` was never touched: `NEXT_DIST_DIR=.next-verify npx next build` → exit 0, then `NEXT_DIST_DIR=.next-verify npx next start -p 3007 -H 127.0.0.1`. `/api/health` on 3007 → `{"status":"ok","db":{"connected":true,"latencyMs":1}}`. Afterwards `.next-verify` was deleted and the scratch server stopped; `find src prisma/schema.prisma next.config.js -newer .next/BUILD_ID` returned **none**, i.e. the build his live server runs is still current with source, so **no rebuild and no restart was needed and none was done**.

**Gates:** `tsc --noEmit` 0 · `npm run lint` (`eslint src --max-warnings=0`) 0 · `npx vitest run --no-file-parallelism` → **139 files / 962 tests passed** in 90.8 s · guarded build exit 0.
*Caveat recorded so it is not mistaken for a regression:* a bare `npx eslint .` reported ~49.5k problems. That sweep walks `.worktrees/super-admin-dashboard/`, a full second copy of the repo, plus the root configs. The project's own script scopes to `src` and is clean.

**Anonymous route sweep (30 pages):** member routes stream their guard as designed — `/dashboard`, `/messages`, `/profile`, `/friends`, `/marketplace`, `/games`, `/groups`, `/ott`, `/channelhub`, `/ai`, `/super_admin`, `/for-rent/dashboard`, `/mediaworld/talent`, `/mediaworld/talent/[username]` → `NEXT_REDIRECT;replace;/login`; `/settings` → `/settings/profile`; `/for-rent/manage` → `/for-rent/dashboard`. Public pages render real content: `/mediaworld` 42 KB, `/mediaworld/register` 69 KB, `/for-rent/register`, `/mediaworld/find-talent`, `/mediaworld/complaint`, `/`, `/login`, `/register`.

**API sweep (92 route handlers, anonymous GET):** no 500s anywhere. Everything is 401 / 405 / 400 except nine intentional 200s (`/health`, `/mediaworld`, `/mediaworld/taxonomy`, `/groups`, `/listings`, `/posts`, `/user/[username]/friends`, `/user/[username]/photos`, `/user/[username]/photos/recent`). `/posts` was opened and audited: author is reduced to `id, name, username, profileImage` — no email/phone. All three SSE endpoints (`/calls/stream`, `/messages/stream`, `/notifications/stream`) → 401 without a session. The 404-shaped rows (`/posts/1`, `/groups/zz-h*`) are honest "record does not exist", not routing bugs.

**Authenticated sweep with a throwaway `zz-check-r9x2` account (inserted directly through Prisma + one Session row, never through the signup API so no rate-limit budget was spent):** all 22 member pages → 200 with zero `Unhandled Runtime Error` / `Application error: a client` markers; `/super_admin` correctly bounced a non-admin to `/dashboard`. `heartbeat POST` 200, `notifications GET` 200, `calls/stream` 200 with the session, and the same calls still 401 anonymously. Purge: `{purged:1, sessions:1, left:0, anyZz:0}`; script and token files deleted.

**Browser pass (visitor, on 3007 — his tab was handed back to `localhost:3000/mediaworld` afterwards):** `/mediaworld` loaded with **0 failed resources, 0 background API calls, 0 console errors** — the night-4 visitor fix holds on this build. CSS `09eb5910c924fe3e.css`, body styled. Working as intended: category filter (Camera Rental → 0 talent + the honest `এই ক্যাটাগরি, এলাকা বা খোঁজায় এখনো কোনো প্রোফাইল নেই।` and the service card's `কোনো সার্ভিস পাওয়া যায়নি … প্রথম পোস্ট করুন`), reset → 8 cards, division filter, submit-based search, Login popup (focus trap, ✕, `← পেছনে ফিরুন`, Escape closes, `নতুন অ্যাকাউন্ট খুলুন` → `/mediaworld/register`), Join popup (Media World + For Rent are real links, ChannelHub is honest "Coming soon" text with no dead link), Complain modal opens/closes (never submitted), the stretched-link card hit-test (`opens-profile`, exactly one anchor per card). Register wizard step 1: 4-step rail, strong-password suggestion fills both fields with 16 chars and reveals them, `mw-pw-toggle` flips `text ⇄ password` with the aria label, and Next with empty fields raises all six Bangla field errors and focuses the first. **My first two "no validation / no reveal button" readings were my own bad selectors** — the wizard's errors are inline-styled `#mw-setup-error-*` spans, not `[class*=error]`, and the toggle is an icon button keyed on `aria-label`.

### Three findings — reported, not silently changed

1. **`/mediaworld/find-talent` is a legacy surface and has a latent phone leak.** It queries `mediaProfile` (`where: { status: 'APPROVED' }`), not the `accountType`-based talent system, and it is **not** login-gated. Each card renders `<a href={`tel:${p.phone}`}>Call</a>` for the profile owner's phone, and the query selects `phone` and `email`. Today `MediaProfile` holds 5 rows, **all PENDING, 0 APPROVED**, so nothing is exposed yet — the moment an admin approves a legacy profile, its phone number goes public to anonymous visitors. It also explains the visible disagreement between surfaces: this page says "No approved media professionals yet" while `/mediaworld` lists 16 `accountType != null` talents.
2. **The directory shows unapproved talent.** `browseDirectoryTalents` (`src/lib/mediaworld/talent-browse.ts:168`) filters only `accountType: { not: null }` — no `status` predicate — so PENDING/REJECTED media accounts appear in the public directory. Adding `status: 'APPROVED'` is the aligned fix, but it changes what he sees on his own landing page, so it is his call.
3. **Unknown usernames return HTTP 200, not 404.** `/zz-does-not-exist`, `/notifications` and `/search` match `(main)/[username]`, whose `notFound()` runs after the streaming shell flushes, so visitors get the correct "404 / Page not found" UI behind a 200 status. Same on his dev server and on `.next` — pre-existing App Router streaming behaviour, SEO-only.

Also measured, smaller: the বাংলা/EN toggle flips `active`, `aria-pressed` and `<html lang>`, but leaves ~26 Bengali strings on `/mediaworld` while in EN (hero tagline, অনুসন্ধান + search placeholder + খুঁজুন, ক্যাটাগরি/বিভাগ filter headings, the register CTA, the promo card). `mediaworld-language.test.ts` only pins the mechanism, so this gap is untested territory.

Uncommitted; no push. His `localhost:3000` production server and his dev server were left running and healthy (`/api/health` 200, CSS 200); his browser is still signed out there.
