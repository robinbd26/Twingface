# Profile Intro, Details, and Photos Design

## Goal

Make the authenticated user's Profile Intro and Photos sections real data
features. A user can safely update their short bio and four profile details,
and profile pages show their most recent image posts instead of decorative
placeholders.

This is Phase A of the approved social-feature sequence:

1. Profile Intro, details, and photos (this document)
2. Friends and friend requests
3. Reactions and sharing
4. Stories

## Scope

Included:

- Persist optional `profession`, `education`, `currentCity`, and `hometown`
  values on `User`.
- Update a bio independently from the profile-details update flow.
- Provide authenticated, server-authorized profile update APIs.
- Provide public, safe recent-photo and cursor-paginated all-photo APIs.
- Replace the Profile Intro mock values and 3x3 photo placeholders with real
  data.
- Add accessible edit dialogs, loading feedback, validation feedback, and
  empty states.

Excluded:

- Friendships, reactions, post sharing, and stories.
- New file-storage providers or a second upload path. Existing image posts and
  Cloudinary delivery URLs are reused.
- Video extraction, albums, photo deletion, profile-detail visibility levels,
  and any sensitive user-field exposure.

## Data Model

The existing PostgreSQL/Prisma `User` model gains only nullable columns:

- `profession String? @db.VarChar(100)`
- `education String? @db.VarChar(160)`
- `currentCity String? @db.VarChar(120)`
- `hometown String? @db.VarChar(120)`

No relationship, credential, session, or post-schema changes occur. A Prisma
migration adds these four nullable columns only. The existing migration-history
drift means the reviewed migration must be applied with `prisma migrate deploy`;
the implementation must not reset the database.

`Profile` and other public projections include these new display fields, but
continue to exclude `passwordHash`, session values, email, phone, and any
Cloudinary private identifiers.

## Validation

Shared Zod schemas own validation and normalization:

- `bio`: optional normalized text, maximum 500 characters.
- `profession`: optional normalized text, maximum 100 characters.
- `education`: optional normalized text, maximum 160 characters.
- `currentCity`: optional normalized text, maximum 120 characters.
- `hometown`: optional normalized text, maximum 120 characters.

Whitespace-only optional values normalize to `null`. Request bodies are strict:
protected fields such as `id`, `username`, `profileImage`, `coverImage`,
`passwordHash`, and session-related values are rejected or ignored rather than
passed through to Prisma.

## API Contract

### `PUT /api/user/bio`

Authentication is required. The route derives the target user ID exclusively
from `getCurrentUser()`.

Request:

```json
{ "bio": "Building useful things in Dhaka." }
```

Success (`200`):

```json
{ "profile": { "id": "...", "name": "...", "username": "...", "bio": "...", "profileImage": null, "coverImage": null, "profession": null, "education": null, "currentCity": null, "hometown": null, "createdAt": "..." } }
```

Failures: `401` authentication required, `400` validated field errors, or a
generic `500`. Errors never reveal private database details.

### `PUT /api/user/details`

Authentication and target identity follow the same server-side policy.

Request accepts only `profession`, `education`, `currentCity`, and `hometown`.
Success returns the same safe profile projection. Failure behavior mirrors the
bio route.

### `GET /api/user/[username]/photos/recent`

Public route. It finds the user by username and returns at most nine posts with
a non-null `imageUrl`, ordered `createdAt desc, id desc`. A nonexistent user
returns `404`. Each item exposes only `{ id, imageUrl, createdAt }`.

### `GET /api/user/[username]/photos`

Public cursor-paginated route for the complete photos view. Query parameters:
`cursor` optional and `limit` default 24, maximum 50. It returns:

```json
{ "photos": [{ "id": "...", "imageUrl": "https://...", "createdAt": "..." }], "nextCursor": null }
```

There is no user-provided database filter, hidden `imagePublicId`, author
private data, or credential-bearing URL in this response.

## UI and Data Flow

The server Profile page loads the safe profile projection and initial nine
photo records. A small client `ProfileIntro` form/dialog component manages
only bio updates, and a separate details dialog manages only the four details.
After a successful request it refreshes the route so the server remains the
source of truth.

The Intro card renders only populated detail rows: profession, education,
current city, and hometown. The Photos card renders a responsive 3x3 grid of
the recent images, a meaningful empty state when no image posts exist, and a
link to an all-photos route/page only once that route is included by the
implementation plan. Photo image URLs use the existing Cloudinary-safe public
delivery URLs; no upload occurs in this phase.

## Security

- Every mutation requires a valid Prisma-backed session via `getCurrentUser()`.
- Server-side identity, not a client ID, selects the update target.
- Prisma updates use explicit allow-listed `data` objects.
- Zod validates and normalizes all mutation data on the server.
- Safe Prisma `select` projections omit credentials, tokens, email/phone, and
  internal media identifiers.
- Public photo queries expose only image post metadata, never arbitrary post
  internals or private user fields.
- Limits cap returned photos to prevent unbounded reads.

## Tests and Verification

Automated tests will cover:

- profile schema normalization and length validation;
- unauthenticated bio/details mutation rejection;
- current-user-only update behavior and mass-assignment rejection;
- safe response shape without credentials, session data, email, phone, or
  provider internal IDs;
- recent photos: ordering, nine-item cap, safe shape, empty state, and 404;
- cursor parsing, max limit enforcement, and pagination for all photos;
- Profile Intro and Photos UI data/loading/error/empty state contracts;
- existing authentication, profile media, post, and comment regression tests.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The final verification will include a local authenticated browser check that
updates bio/details and confirms real image posts appear in the profile grid,
without logging secrets or tokens.

## Self-Review

- The change is confined to the first approved phase and does not implement
  friends, reactions, sharing, or stories.
- All planned writes derive the target user from the server session.
- The schema change is limited to the documented User display fields.
- Photo data reuses existing image posts and no new storage provider.
