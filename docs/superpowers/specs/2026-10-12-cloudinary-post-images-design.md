# Cloudinary Post Images Design

## Goal

Allow an authenticated Twingface user to publish one optional image with a
post. The image is uploaded through the application server to Cloudinary and
is displayed safely in the existing feed. Text-only, image-only, and
text-with-image posts remain supported.

## Scope

- Add one image per post in this iteration.
- Accept JPEG, PNG, WebP, and GIF images up to 5 MiB.
- Keep Cloudinary credentials exclusively in server environment variables.
- Keep existing text post, authentication, ownership, pagination, and safe
  response behavior working.

Out of scope: video uploads, multiple-image albums, client-direct unsigned
uploads, image editing, and a new standalone media-library model.

## Architecture

The browser submits `multipart/form-data` to the existing `POST /api/posts`
route. Its fields are `content` and an optional `image` file. The route gets
the current user with `getCurrentUser()` before it processes an upload.

The server validates the content and, if provided, validates the file MIME
type and file size. It uses the Cloudinary Node SDK from a server-only helper
to upload the bytes to a user-scoped folder. Cloudinary receives a
server-generated public ID. The post then persists Cloudinary's HTTPS delivery
URL and public ID; it never stores image bytes in PostgreSQL.

If persistence fails after an upload, the route attempts to destroy that
Cloudinary asset before returning a generic error. Delete-post handling will
remove the database post only after current author ownership is confirmed, and
will make a best-effort Cloudinary asset deletion for posts that have one.

## Configuration

The Cloudinary Node SDK is configured only from these runtime environment
variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

They are documented with placeholders in `.env.example` and placed locally in
an ignored `.env.local` file or in the deployment provider's secret manager.
No value is prefixed with `NEXT_PUBLIC_`. The API secret is never serialized,
logged, returned, or placed in source control.

## Data Model

`Post` gains two nullable fields:

- `imageUrl String? @db.VarChar(500)`: Cloudinary's HTTPS `secure_url`.
- `imagePublicId String? @db.VarChar(255)`: identifier used only by server
  cleanup and deletion.

An accompanying Prisma migration adds these nullable database columns. No
unrelated models or user/session changes are introduced.

## API Contract

### `POST /api/posts`

Request content type is `multipart/form-data`.

- `content`: optional string, trimmed to at most 500 characters.
- `image`: optional one image file.

At least one of `content` or `image` is required. `authorId`, `imageUrl`, and
`imagePublicId` are ignored/rejected as client-controlled inputs.

Successful response (`201`) remains `{ post }`, using the safe public post
projection with `id`, `content`, `imageUrl`, timestamps, and a safe author
projection (`id`, `name`, `username`, `profileImage`). It does not contain a
password hash, email, phone, session data, Cloudinary API credentials, or the
internal image public ID.

Failures use safe messages:

- `401`: authentication required.
- `400`: invalid content, missing content-and-image, invalid file type, or
  file exceeding 5 MiB, with field-level errors where appropriate.
- `502`: generic image-upload failure; provider details are not exposed.
- `500`: generic post persistence failure.

Existing feed and single-post responses add only `imageUrl` to their public
projection. `imagePublicId` is not part of `safePostSelect`.

## UI Flow

The existing create-post composer obtains an accessible hidden file input from
the existing Photo/video action. After selection, it shows a local preview,
file name or alt fallback, and a remove control. It keeps client-side file
feedback responsive, but server validation remains authoritative.

On submit, the component sends a `FormData` payload. While it is uploading or
publishing, controls are disabled and the button communicates pending state.
After a successful response the composer clears its text and selected image,
closes as it does today, and refreshes the feed. The post card renders an
image only when `post.imageUrl` is present and uses responsive, non-overlapping
card media styling compatible with the existing dashboard design.

## Security

- Authentication derives ownership from `getCurrentUser()` only.
- The client cannot select a post author or database image identifiers.
- Server-side MIME and byte-size validation runs before upload.
- Only a server-generated Cloudinary public ID is used; browser uploads do
  not use an unsigned preset or a secret-bearing signed payload.
- Prisma uses explicit safe select projections to prevent accidental exposure
  of sensitive User and Session fields.
- Cloudinary errors are mapped to safe application errors; credentials and
  provider response details stay server-side.

## Tests and Verification

Tests will cover:

- text-only, image-only, and text-plus-image post creation;
- unauthenticated upload rejection;
- invalid MIME type, file over 5 MiB, and missing text-and-image rejection;
- Cloudinary upload failure and database-failure orphan cleanup;
- safe response shape with no passwords, sessions, credentials, or internal
  Cloudinary public ID;
- current author-only delete behavior and image cleanup request;
- composer selection/removal and pending/error behavior where the existing
  Vitest configuration can exercise it;
- existing text-post API tests as a regression suite.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev --name add_post_image
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Before the live smoke test, the user places non-secret Cloudinary values and
the API secret in `.env.local`. The smoke test uses a non-sensitive sample
image, creates an authenticated image post, confirms the feed renders it, and
confirms invalid or unauthenticated requests are rejected without printing
secrets.
