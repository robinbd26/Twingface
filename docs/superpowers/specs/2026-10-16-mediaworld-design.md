# TwingFace Media World — Design Specification

**Parent platform:** TwingFace Social Network  
**Module route:** `/mediaworld`  
**Target region:** Bangladesh, with division and district search  
**Status:** Proposed design

## Goal

Build Media World as an authenticated TwingFace module for Bangladesh's film, television, advertising, music, and production community. It must use the existing TwingFace login session, navigation, profile photos, Cloudinary integration, and Messages inbox; it must not become a separate social network or a Marketplace alias.

Users can apply for professional profiles, find approved professionals, publish approved casting/hiring/rental/location listings, and contact listing owners through Messages. A configured Super Admin approves or rejects all public Media World submissions.

## Scope and boundaries

### Included

- Authenticated entry from the existing Sidebar and `/mediaworld` route.
- Professional-profile application and approval.
- Public approved professional directory with query, profession, division, and district filters.
- Casting calls, hiring opportunities, shooting-location directory entries, and equipment-rental listings.
- One-to-one inquiry conversations using the existing DirectConversation/DirectMessage system.
- Super Admin approval queue and approve/reject actions.
- Ownership enforcement for editing, withdrawing, marking unavailable, and deleting a user's own submissions.

### Excluded

- A second login/session system.
- Payments, escrow, booking calendars, contracts, ratings, or reviews.
- Public contact details such as phone/email in directory responses.
- Reusing `MarketplaceListing` for Media World data.
- Automatic approval, bulk import, or a general multi-role admin UI.

## Authorization model

The sole Super Admin is identified by `MEDIAWORLD_SUPER_ADMIN_USER_ID` in local runtime environment configuration. The server reads this value only; clients never receive it.

| Actor | Permissions |
| --- | --- |
| Authenticated user | Create and manage own pending submissions; browse approved public records; send inquiry messages. |
| Submission owner | Edit or withdraw own pending/rejected records; change own approved rental availability. |
| Super Admin | View all pending records; approve/reject profile and listing submissions. |
| Unauthenticated visitor | Redirect to login for all Media World pages/API routes. |

The Super Admin rule is enforced in every approval API route on the server. Missing or invalid configuration fails closed with `403`, never promotes an ordinary user.

## Data model

New dedicated Prisma models are used, all related to the existing `User` model.

### Enums

- `MediaWorldApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`
- `MediaWorldProfileRole`: `ACTOR`, `DIRECTOR`, `PRODUCER`, `WRITER`, `DOP`, `CAMERA_OPERATOR`, `MAKEUP_ARTIST`, `EDITOR`, `SOUND_ENGINEER`, `PHOTOGRAPHER`, `OTHER`
- `MediaWorldListingType`: `CASTING`, `HIRING`, `SHOOTING_LOCATION`, `EQUIPMENT_RENTAL`
- `MediaWorldEquipmentCondition`: `NEW`, `USED`
- `MediaWorldAvailability`: `AVAILABLE`, `UNAVAILABLE`, `RENTED`

### `MediaWorldProfile`

One application per user. Fields: user ID, role, profession display text, bio, experience years, division, district, profile image URL, approval status, rejection note (private), timestamps.

The public projection exposes only profile image, account-safe name/username, role, profession text, bio, experience, division, and district; it never exposes email, phone, sessions, admin notes, or internal IDs beyond the opaque profile ID.

### `MediaWorldListing`

Fields: owner ID, optional owner professional-profile ID, type, title, description, division, district, location label, approval status, availability, equipment condition when applicable, optional daily price in paisa, and timestamps.

Rules:

- Casting/hiring require title, description, location, and an approved owner profile.
- Shooting locations require title, description, location, and an approved owner profile.
- Equipment rentals require title, description, location, condition, positive daily price, and one to ten images.
- Only `APPROVED` records appear in public browse/search results.
- `RENTED` and `UNAVAILABLE` rental records stay visible only to their owner and admin; public directory shows only `AVAILABLE` rentals.

### `MediaWorldImage`

One-to-ten Cloudinary-backed images for a Media World equipment or location listing. It stores delivery URL, internal provider public ID, order, and listing relation. Provider public IDs remain server-only and receive best-effort cleanup after deletion.

### `MediaWorldInquiry`

Stores listing ID, sender ID, recipient/owner ID, DirectConversation ID, message ID, and timestamp. This gives every inquiry an auditable Media World reference while reusing the existing inbox and unread/sound/call experience. The related conversation is flagged for Media World messaging, permitting this limited non-friend pair to communicate.

## API design

All endpoints derive the actor from `getCurrentUser()`, use explicit Prisma selects, and return generic failures without database/provider error details.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/mediaworld/profiles` | Search approved professional profiles by query, role, division, district, cursor. |
| `POST /api/mediaworld/profiles` | Create/update current user's pending profile application. |
| `GET /api/mediaworld/listings` | Search approved listings by type, query, division, district, availability, cursor. |
| `POST /api/mediaworld/listings` | Create current user's pending casting/hiring/location/rental submission; multipart only when images are sent. |
| `GET/PATCH/DELETE /api/mediaworld/listings/:id` | Safe public read; owner-only update/withdraw/delete. |
| `POST /api/mediaworld/listings/:id/inquiries` | Buyer/applicant message to owner; creates/reuses DirectConversation and stores inquiry reference. |
| `GET /api/mediaworld/mine` | Current user's profiles/listings including private approval status. |
| `GET /api/mediaworld/admin/pending` | Super Admin-only pending profiles/listings. |
| `PATCH /api/mediaworld/admin/profiles/:id` | Super Admin approve/reject profile. |
| `PATCH /api/mediaworld/admin/listings/:id` | Super Admin approve/reject listing. |

Location input is validated server-side against Bangladesh divisions and their districts. `Rajshahi` + `Bogura` is valid; `Dhaka` + `Bogura` returns a field-level `400`.

## UI and routes

- `/mediaworld`: directory dashboard with professional, casting/hiring, location, and rental sections; searchable, responsive filters and pagination.
- `/mediaworld/apply`: professional profile form with pending/approved/rejected state.
- `/mediaworld/create`: listing form that selects type and shows only relevant fields.
- `/mediaworld/listings/:id`: approved public listing detail and "Send inquiry" action.
- `/mediaworld/mine`: personal profile/listings and availability controls.
- `/mediaworld/admin`: Super Admin pending-approval queue. This route is not linked for ordinary users and denies direct access server-side.

The existing incomplete MediaWorld page/components that reinterpret Marketplace data will be replaced, not extended. Marketplace remains unchanged and its existing routes/data retain their current behavior.

## Messaging flow

1. A logged-in user opens an approved listing and chooses an inquiry type: casting application, hiring inquiry, location inquiry, or rental inquiry.
2. The UI pre-fills a context message that remains editable.
3. The server verifies listing approval/public availability, disallows self-inquiry, creates/reuses the direct conversation, creates the message with the Media World listing reference, and creates a `MediaWorldInquiry` record.
4. The recipient receives the existing Message inbox unread badge and configured message sound; no duplicate bell notification is created.

## Upload security

Media World uses the existing server-only Cloudinary adapter and image policy: JPEG/PNG/WebP/GIF, maximum 5 MiB each, maximum ten images. Request metadata is not trusted; bytes are validated before upload. Failed database writes compensate by deleting uploaded provider assets. Deleting images/listings performs best-effort provider cleanup after database deletion.

## Error handling

- Invalid input: `400` with safe field errors.
- Unauthenticated: `401` API response or login redirect for pages.
- Unauthorized: `403` without revealing protected resource details.
- Missing record: `404`.
- Upload failure: generic `502`.
- Persistence failure: generic `500` and provider cleanup.
- Approval/rejection notes remain owner/admin-only.

## Verification requirements

- Unit tests for Bangladesh division/district validation, role/listing validation, safe projections, and profile/listing state rules.
- Route tests for authentication, owner checks, Super Admin checks, safe serialization, approval gating, and inquiry conversation behavior.
- UI source/interaction tests for filters, submission forms, pending-state badges, and inquiry controls.
- Run `prisma validate`, generate, full tests, lint, and production build.
- A local authenticated smoke test must create a pending profile/listing, approve it with the configured Super Admin, confirm search visibility, send a listing inquiry, and verify non-admin denial.
