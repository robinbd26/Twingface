# Feeling and Activity Posts Design

## Goal

Add a Facebook-style Feeling/Activity picker to Twingface's existing post
composer. An authenticated user can select one controlled feeling or activity,
publish it with an optional text and optional image, and see the selection
rendered consistently in the feed and individual post view.

## Scope

- Add one optional, predefined feeling/activity value to each post.
- Provide a searchable, keyboard-accessible picker in the existing composer.
- Support selection, replacement, removal, and persistence with text-only,
  image-only, and text-plus-image posts.
- Validate the selection on the server from an allowlist; never trust a label,
  emoji, or author supplied by the browser.
- Render the public, server-validated selection in public post cards.
- Preserve existing authentication, author ownership, image upload, post
  pagination, and safe response projections.

Out of scope: custom free-text activities, user-created feeling definitions,
multiple feelings, tagging people/pages, reactions, video/live features, and
post editing UI.

## Product Behavior

The picker is launched from both existing **Feeling/activity** controls: the
compact composer action row and the expanded composer modal.

It presents two searchable sections:

- Feelings: Happy, Sad, Excited, Loved, Thankful, Angry, Blessed, Tired.
- Activities: Watching, Listening to, Playing, Traveling to, Eating, Reading,
  Celebrating, Working.

Each option has a stable machine key and a display label/emoji. Examples:

- `feeling:happy` -> `feeling happy 😊`
- `activity:watching` -> `watching 🎬`

The selected option appears as a removable chip in the composer. Selection is
not required; users may continue posting text-only, image-only, or text plus
image content. A post with only a feeling/activity remains invalid because the
existing post-content rule requires text or an image.

On a successful publish, the composer clears the selected value with its text
and image preview. The post card displays the human-readable phrase below the
author name and above the timestamp without changing the stored post text.

## Data Model

`Post` receives one nullable column:

```prisma
feelingActivity String? @db.VarChar(64)
```

It stores only a controlled key such as `feeling:happy`; display labels and
emoji are application-owned constants, not database values from the browser.
The migration adds this nullable column to `posts` only. It adds no models,
indexes, user fields, session fields, or storage integration.

## Validation and API Contract

`src/lib/feeling-activity.ts` owns a readonly catalog, lookup helpers, and a
Zod schema for the optional `feelingActivity` key. The parser accepts either a
catalog key or an omitted/empty value; it rejects unknown values.

### `POST /api/posts`

The existing endpoint continues supporting JSON text posts and multipart image
posts.

- JSON accepts `content` and optional `feelingActivity`.
- Multipart accepts `content`, optional `image`, and optional
  `feelingActivity`.
- The route continues to derive `authorId` only from `getCurrentUser()`.
- It persists only `{ content, authorId, imageUrl, imagePublicId,
  feelingActivity }` after server validation.
- Client-provided `authorId`, image metadata, display labels, and emojis are
  ignored and never persisted.

Invalid or unknown values return the existing safe `400` validation response.
Unauthenticated requests return `401`. Provider and database errors remain
generic and expose no secrets.

`safePostSelect` adds `feelingActivity` because the controlled key is public
post metadata. It continues to omit `passwordHash`, email, phone, sessions,
Cloudinary credentials, and `imagePublicId`.

Existing `PATCH /api/posts/[id]` remains content-only in this scope because
there is no post edit UI. Its author authorization is unchanged.

## UI and Accessibility

The picker is a client-only overlay nested in the existing compose modal. It
uses a dialog with an accessible title, a text search input, visible focus
states, arrow/escape-safe close behavior, and buttons with descriptive
accessible names. The active selection uses `aria-pressed`; a separate remove
button clears it.

The compact action first opens the composer and then opens the picker, so it
does not bypass the normal composer workflow. The modal action opens the
picker directly. On small screens the dialog fits within the viewport and
scrolls its option list rather than overflowing.

The styling stays within the current dashboard token system:

- light and dark surfaces match `.surface` and composer controls;
- rounded option rows and subtle hover/selected states match the Facebook-like
  dashboard;
- the selection chip and post metadata are responsive and do not overlap
  image media or author information.

## Security

- The only persisted feeling/activity value is a server-validated catalog key.
- The browser cannot provide a custom label, emoji, post author, or internal
  image identifier.
- Authorization and post ownership stay server-side and unchanged.
- Safe Prisma selections are extended narrowly with public metadata only.
- No secrets, session tokens, password hashes, or Cloudinary internal IDs are
  added to responses or UI state.

## Testing and Verification

Tests will cover:

- catalog keys and Zod validation for valid, omitted, empty, and unknown
  values;
- JSON and multipart post creation with valid metadata;
- rejection of unknown/mass-assigned metadata without invoking image upload;
- safe response and feed projection includes `feelingActivity` but excludes
  sensitive/private data;
- regression coverage for text-only, image-only, text-plus-image, auth,
  ownership, deletion, and pagination;
- source/component contract checks for both composer buttons, picker dialog,
  selection/removal behavior, FormData payload, and post-card rendering.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev --name add_post_feeling_activity
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

After automated checks, an authenticated local smoke test will create a post
with a feeling, a post with an activity and image, clear a selection before
posting, and confirm an invalid request is rejected server-side.
