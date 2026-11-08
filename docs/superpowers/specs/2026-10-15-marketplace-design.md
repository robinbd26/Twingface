# Twingface Marketplace Design

## Goal

Add a Facebook-style Marketplace where an authenticated user can publish a
product listing, upload one to ten photos, browse active listings, contact a
seller without an existing friendship, and manage the listing through its
Available or Sold out lifecycle.

The Marketplace must use the existing Twingface Messages inbox, unread badge,
sound preference, and chat/call UI. It must not create a second chat system.

## User decisions

- A listing accepts **1–10 images**.
- Required listing information: title, price in BDT, category, condition
  (`New` or `Used`), location, description, and images.
- A seller can edit, delete, and set their own listing to `Available` or
  `Sold out`.
- A buyer may contact a seller without being friends.
- The first inquiry is prefilled as `Is this available?`; the buyer may edit
  it before sending.
- The message retains a structured reference to the listing.

## Non-goals

- Payments, checkout, delivery, escrow, commissions, ratings, saved listings,
  shipping calculation, moderation dashboards, promoted listings, and product
  variants are out of scope.
- No direct browser-to-Cloudinary uploads or unsigned upload presets.
- No separate marketplace-specific conversation or notification subsystem.

## Data model

### `MarketplaceListing`

| Field | Type / rule |
| --- | --- |
| `id` | CUID primary key |
| `sellerId` | required FK to `User`, cascade delete |
| `title` | required, trimmed, 3–120 chars |
| `description` | required, trimmed, 10–2,000 chars |
| `price` | required non-negative integer in paisa; API/UI show formatted BDT |
| `category` | enum: `ELECTRONICS`, `VEHICLES`, `PROPERTY`, `FURNITURE`, `FASHION`, `HOBBIES`, `OTHER` |
| `condition` | enum: `NEW`, `USED` |
| `location` | required, trimmed, 2–120 chars |
| `status` | enum: `AVAILABLE`, `SOLD_OUT`, default `AVAILABLE` |
| `createdAt`, `updatedAt` | timestamps |

Indexes support seller management and newest available listings:
`[sellerId, updatedAt]`, `[status, createdAt]`, and `[category, status,
createdAt]`.

### `MarketplaceImage`

| Field | Type / rule |
| --- | --- |
| `id` | CUID primary key |
| `listingId` | required FK to `MarketplaceListing`, cascade delete |
| `url` | Cloudinary HTTPS delivery URL, maximum 500 chars |
| `publicId` | server-only Cloudinary asset identifier, maximum 255 chars |
| `position` | integer from 0 through 9, unique per listing |

Only `url` is exposed to browser clients. `publicId` remains server-only for
cleanup after a failed persistence operation or listing deletion.

### Marketplace message reference

`DirectMessage` gains nullable `marketplaceListingId`. It references
`MarketplaceListing` with `SetNull` on listing deletion, so an existing chat
remains readable after a seller deletes the listing. Its safe browser
projection contains a compact listing reference (`id`, `title`, first image,
status) when present; it does not expose internal Cloudinary public IDs.

An existing `DirectConversation` remains one conversation per user pair. A
new internal boolean `marketplaceMessagingEnabled` defaults to `false` and is
set to `true` atomically with the first valid marketplace inquiry. It
authorizes those two participants to continue that one conversation even when
they are not friends, including after the referenced listing is deleted.
Normal direct messages remain friend-only unless the conversation has this
marketplace permission.

## Upload and media policy

The feature reuses the server-only Cloudinary adapter and image policy already
used for post images: JPEG, PNG, WebP, GIF; at most 5 MiB each. The listing
create/edit endpoints parse `multipart/form-data`, validate every file before
any upload, and upload with server-generated IDs under
`twingface/marketplace/<sellerId>`.

If upload succeeds but database creation fails, the endpoint best-effort
destroys each uploaded asset. Listing deletion first confirms seller ownership,
then deletes database records and best-effort destroys the associated assets.
Provider failures return safe generic errors and never reveal credentials.

## API contract

### Browse and manage listings

- `GET /api/marketplace?cursor=&limit=&category=&q=`
  - Public to authenticated users.
  - Returns newest `AVAILABLE` listings only, paginated with a safe seller
    projection and image URLs.
  - `q` matches title and location; category is an enum filter.

- `POST /api/marketplace`
  - Authenticated seller only.
  - Multipart fields: `title`, `description`, `price`, `category`,
    `condition`, `location`, and `images` (1–10 files).
  - Derives `sellerId` from the authenticated session.
  - Returns `201 { listing }` with safe listing data.

- `GET /api/marketplace/[id]`
  - Returns a safe listing and seller projection for an authenticated viewer.

- `PATCH /api/marketplace/[id]`
  - Seller only.
  - Allows field edits and `status` transitions between `AVAILABLE` and
    `SOLD_OUT`. Editing images is limited to explicit retained image IDs plus
    newly uploaded images, always ending between 1 and 10 images.

- `DELETE /api/marketplace/[id]`
  - Seller only.
  - Returns `204`; removes Cloudinary assets best-effort after ownership and
    database deletion.

- `GET /api/marketplace/mine`
  - Returns current seller’s listings, including both statuses.

### Marketplace inquiry

- `POST /api/marketplace/[id]/message`
  - Authenticated buyer only.
  - JSON body `{ content }`, trimmed 1–1,000 chars; UI initializes it with
    `Is this available?`.
  - Rejects self-inquiries and `SOLD_OUT` listings with safe `400` errors.
  - Upserts the existing direct conversation for buyer/seller, creates a
    `DirectMessage` with `marketplaceListingId`, publishes it to the existing
    messages SSE stream, and returns `{ conversation, message }`.
  - Does not create a bell notification. The existing Messages inbox handles
    unread count, preview, and message sound.

## Authorization and safety

- Seller ownership comes only from `getCurrentUser()` and never from client
  input.
- A seller cannot message their own listing.
- An unauthenticated user receives `401` for all marketplace APIs.
- A non-owner cannot update/delete another seller’s listing.
- Non-friend messaging is allowed only when initiated through an available
  listing, or within the conversation created by that marketplace inquiry.
- The listing public response contains seller name, username, and profile
  image only; it omits email, phone, password, session values, image public
  IDs, and Cloudinary credentials.
- Server validation is authoritative for all text, enum, price, file count,
  MIME type, and size constraints.

## UI design

### Navigation

Both the dashboard top Marketplace tab and the left sidebar Marketplace item
link to `/marketplace`. They no longer act as inactive visual buttons.

### Marketplace home (`/marketplace`)

- Facebook-style three-column responsive layout: browse/filter rail,
  listing grid, and a seller-management shortcut.
- Search by title/location and category filter.
- Listing cards show cover image, title, formatted `৳` price, location,
  condition, seller name, and an explicit Available badge.
- A prominent `Sell something` action opens `/marketplace/create`.

### Create/edit (`/marketplace/create`, `/marketplace/[id]/edit`)

- Accessible multipart form with photo previews, per-image removal, file
  feedback, pending state, and error alerts.
- Submitted data goes only to the authenticated server upload endpoint.

### Listing detail (`/marketplace/[id]`)

- Responsive gallery with primary image and thumbnails.
- Required product information, safe seller card, and message action.
- Buyer flow opens a small editable inquiry composer prefilled with
  `Is this available?`; successful send routes to the existing message
  conversation.
- Owner flow replaces the buyer action with Edit, Delete, and status controls.
- `SOLD_OUT` is clearly labeled and disables new inquiries.

### Seller view (`/marketplace/mine`)

- Current user sees all own listings, status, image, price, date, and direct
  controls for edit/delete/Available/Sold out.

## Testing and verification

Tests cover:

- listing input validation, required fields, enum/price boundaries, 1–10 image
  limits, MIME/size rejection, and safe projection behavior;
- authenticated creation, image cleanup after a persistence failure, browse
  filtering/pagination, and owner-only edit/delete/status changes;
- safe listing detail responses and no private seller/Cloudinary fields;
- non-friend marketplace inquiry creation, self/sold listing rejection,
  listing reference persistence, SSE publication, and no bell notification;
- existing friend-only message behavior remains unchanged without a
  marketplace inquiry;
- UI source/component contracts for navigation, upload form, listing cards,
  status controls, and message-seller flow;
- `npx prisma validate`, `npx prisma generate`, full Vitest suite, lint, and
  production build.

