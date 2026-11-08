# Profile and Cover Photo Upload Design

## Goal

Allow an authenticated Twingface user to select and upload a profile photo or
cover photo directly from their profile page and edit-profile form. The
feature reuses the existing server-side Cloudinary account and the existing
`User.profileImage` and `User.coverImage` URL fields.

## Scope

- Support one profile image and one cover image per user.
- Accept JPEG, PNG, WebP, and GIF images at most 5 MiB.
- Let only the authenticated user update their own two media fields.
- Retain the existing HTTPS URL inputs as a manual fallback.
- Preserve existing profile editing, authentication, post-image uploads, and
  public profile rendering.

Out of scope: multiple profile albums, cropping/editing, client-direct
Cloudinary uploads, video uploads, and a separate media-library model.

## Architecture

The browser sends `multipart/form-data` to a new `POST /api/profile/media`
route with an image and a `kind` value of either `profile` or `cover`.

The route retrieves the active user with `getCurrentUser()` before reading or
uploading the file. It validates the kind, MIME type, byte size, and detected
image signature. A server-only Cloudinary adapter uploads the bytes using a
deterministic asset identity:

- `twingface/profiles/<user-id>/avatar`
- `twingface/profiles/<user-id>/cover`

Cloudinary receives `overwrite: true` and `invalidate: true`; therefore a new
upload replaces the previous asset for that same user and kind without a
database migration or an orphaned asset lookup. The adapter returns only the
HTTPS delivery URL. The route updates only the corresponding field on the
current user's `User` row through an explicit Prisma `data` object and returns
the existing safe profile projection.

## Data Model

No Prisma schema or database migration is needed. The existing nullable fields
remain the only persisted profile media metadata:

- `User.profileImage String?`
- `User.coverImage String?`

No Cloudinary secret, token, API response object, or public-ID field is stored
in the database or returned to the browser.

## API Contract

### `POST /api/profile/media`

Request: `multipart/form-data`

- `kind`: exactly `profile` or `cover`.
- `image`: exactly one allowed image file.

Successful response (`200`):

```json
{
  "profile": {
    "id": "…",
    "name": "…",
    "username": "…",
    "bio": null,
    "profileImage": "https://…",
    "coverImage": null,
    "createdAt": "…"
  }
}
```

Failure responses expose safe application messages only:

- `401`: no valid session.
- `400`: invalid kind, missing image, invalid image MIME/signature, or file
  larger than 5 MiB.
- `502`: image-provider upload failure, without provider details.
- `500`: profile persistence failure, without database details.

The endpoint never accepts a user ID, arbitrary image URL, public ID,
password hash, or session identifier from the client.

## UI Flow

`ProfileMediaUploader` is a client component used by the authenticated
`/profile` page for both the avatar camera button and the cover-photo button.
It owns hidden labelled file inputs, immediate local validation feedback,
pending state, and an upload action. On success it calls `router.refresh()` so
the server-rendered profile uses the safe updated data.

The existing edit-profile form also gets separate profile/cover upload actions
and updates its local URL field from the successful safe response. The existing
HTTPS URL fields stay available for people who prefer a hosted image URL.

## Security

- `getCurrentUser()` is the sole source of authorization; no client user ID is
  used.
- Cloudinary credentials remain server-only runtime environment variables.
- Files are validated before Cloudinary receives their bytes: allowed type,
  5 MiB ceiling, and image magic-byte signature.
- Explicit Prisma updates limit writes to one of `profileImage` or
  `coverImage`; mass assignment cannot update names, passwords, sessions, or
  another user's profile.
- API replies use `safeProfileSelect`; hashes, emails, phone numbers, sessions,
  credentials, and Cloudinary internals remain private.
- Deterministic Cloudinary IDs are scoped to the authenticated user and are
  never client-controlled.

## Testing and Verification

Tests will cover:

- profile and cover uploads for an authenticated user;
- authentication failure before parsing/uploading;
- invalid kind, no file, invalid MIME type, oversized file, and mismatched
  file signature rejection;
- server-derived ownership and prevention of client mass assignment;
- provider failure and database failure safe errors;
- response shape excluding private fields and Cloudinary internals;
- uploader UI source/interaction contract and existing profile API regression.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For a live smoke test, use an existing authenticated local session and a
non-sensitive image smaller than 5 MiB. Confirm profile and cover uploads
render after refresh, then verify logged-out upload requests return `401`.
