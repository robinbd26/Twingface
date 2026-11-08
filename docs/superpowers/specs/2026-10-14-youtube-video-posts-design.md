# YouTube Video Posts Design

## Goal

Allow an authenticated Twingface user to attach one validated YouTube video
link to a post and play it responsively within the feed, without storing or
rendering arbitrary iframe markup.

## Scope

- Add one nullable `youtubeUrl` field to `Post`.
- Accept an optional YouTube URL in both current post-create request formats:
  JSON and `multipart/form-data`.
- Support standard YouTube watch URLs, `youtu.be` short URLs, and embed URLs.
- Permit text, image, feeling/activity, and YouTube video combinations; a
  post still requires at least one of text, image, or a valid YouTube video.
- Render a responsive inline player in the existing post card.

Out of scope: non-YouTube providers, arbitrary iframe HTML, playlists,
autoplay, video uploads, comments/likes persistence, and changing the
existing post edit API.

## Data Model

`Post` gains:

```prisma
youtubeUrl String? @db.VarChar(255)
```

The migration adds only this nullable column to `posts`; it introduces no new
models, relations, indexes, or user/session changes.

## URL Validation and Normalization

Validation happens on the server for every create request. The client provides
only a URL string; it never provides an iframe URL, embed HTML, or a video ID
field.

The validator will:

1. Trim the input and convert an empty value to `null`.
2. Parse it with `URL` and require `https:`.
3. Allow only `youtube.com`, `www.youtube.com`, `m.youtube.com`, and
   `youtu.be` hosts.
4. Extract one video ID from these supported shapes:
   - `https://www.youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`
   - `https://www.youtube.com/embed/VIDEO_ID`
5. Require the extracted ID to match YouTube's 11-character video-ID shape:
   `[A-Za-z0-9_-]{11}`.
6. Store the canonical public URL
   `https://www.youtube.com/watch?v=VIDEO_ID`.

Any malformed URL, unsupported host/path, non-HTTPS URL, playlist-only URL,
or unsupported query form returns the existing safe `400` validation response.

## API Contract

### `POST /api/posts`

Both existing request formats gain an optional `youtubeUrl` field.

```ts
type CreatePostRequest = {
  content?: string;
  feelingActivity?: string | null;
  youtubeUrl?: string | null;
  // multipart requests may additionally include image: File
};
```

The route authenticates before it parses or validates input. It derives the
author exclusively from `getCurrentUser()`. It writes a Prisma data object
with explicit fields only: `content`, `authorId`, `imageUrl`,
`imagePublicId`, `feelingActivity`, and `youtubeUrl`.

Success remains `201 { post }`. `post` includes public `youtubeUrl`, but
continues to exclude `imagePublicId`, password hashes, email, phone, sessions,
tokens, Cloudinary credentials, and any provider internals.

Validation failure remains `400` with the safe highlighted-fields shape.
Unauthenticated creation remains `401`.

## Feed Rendering

`safePostSelect` includes `youtubeUrl`, making it available to the feed,
single-post page, and profile feed through the existing `SafePost` type.

`PostCard` re-parses the stored value with the same shared URL helper. It
renders a player only when a valid video ID is returned. The iframe source is
constructed locally as `https://www.youtube-nocookie.com/embed/<video-id>`;
the stored URL is never inserted directly into iframe `src`.

The player uses a 16:9 wrapper, `title`, `allowFullScreen`,
`referrerPolicy="strict-origin-when-cross-origin"`, and only the necessary
media permissions. It has no autoplay permission.

## Composer UI

The existing modal gets a labelled YouTube URL input in the “Add to your
post” area. The client gives immediate feedback for a malformed value, but the
server is authoritative. The composer sends `youtubeUrl` in the existing
`FormData`; it does not manually set a multipart content type.

The submit button is enabled when one of trimmed text, selected image, or a
non-empty YouTube URL exists. Invalid URLs remain rejected by the server and
are displayed through the existing safe error state.

## Security

- No arbitrary HTML or iframe source is stored or rendered.
- URL validation uses host allowlisting, HTTPS enforcement, and strict video
  ID matching; regex alone is not trusted as a URL parser.
- Server-side session identity remains the only post-authority source.
- Prisma uses explicit safe selects and explicit mutation data.
- Player source is deterministically constructed using YouTube's privacy-
  enhanced `youtube-nocookie.com` domain.
- No tokens, credentials, user-private fields, or internal Cloudinary IDs are
  returned by this feature.

## Testing and Verification

Tests will cover valid watch/short/embed normalization, malformed/HTTP/
unsupported-host URLs, JSON and multipart creation, video-only creation,
text/image/video combinations, no-content rejection, safe response shape,
and iframe rendering only for a validated ID.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev --name add_youtube_url_to_post
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The migration SQL will be inspected to confirm that it adds only nullable
`youtubeUrl` to `posts`.
