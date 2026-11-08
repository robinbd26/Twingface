# Phase 5 Social Feed Design

## Goal

Add a text-only social feed to Twingface without changing the existing authentication or profile features.

## Data model

`Post` has a cuid primary key, text `content` limited to 500 characters, an `authorId`, and creation/update timestamps. Each post belongs to one `User`; deleting that user cascades to their posts. `User` exposes `posts Post[]`.

Indexes support author lookups, feed ordering, and author timelines: `authorId`, `createdAt`, and `[authorId, createdAt]`.

## Validation and authorization

`CreatePostSchema` and `UpdatePostSchema` accept only `{ content }`. Content is trimmed, required after trimming, and at most 500 characters. The server derives authorship solely from `getCurrentUser()`; it ignores client-supplied author or protected fields. Update and delete operations verify `post.authorId === currentUser.id` before a mutation.

## API contract

- `GET /api/posts?cursor=&limit=` returns newest-first cursor-paginated posts. It defaults to 20 posts and caps input at 50. Each post carries only its content, timestamps, ID, and public author fields (`id`, `name`, `username`, `profileImage`).
- `POST /api/posts` requires a session and creates a post for the current user.
- `GET /api/posts/[id]` returns one safe post payload or `404`.
- `PATCH /api/posts/[id]` and `DELETE /api/posts/[id]` require a session and ownership. They return generic safe errors; missing posts return `404`, non-owners return `403`.

## UI

The authenticated dashboard becomes the main feed view with a dark, responsive three-column layout: navigation, central feed, and a non-sensitive contacts/activity widget. The central feed uses a client-side create form and post list. Post cards include cosmetic action placeholders only; likes, comments, shares, media uploads, and other future social features are out of scope.

`/post/[id]` is a public post-detail page. It reuses the safe server-side post projection and renders `notFound()` for absent posts.

## Security and compatibility

- Authentication and authorization remain server-enforced.
- API and server-page Prisma reads use explicit safe `select` projections and never include password hashes, session tokens, or email addresses.
- No client stores authentication tokens; existing HTTP-only sessions remain unchanged.
- No new storage provider or media upload capability is introduced.
- Existing `/profile`, `/profile/edit`, `/api/profile`, registration, login, logout, and dashboard access controls remain functional.

## Verification

Tests cover validation, unauthenticated mutation denial, client author-ID rejection, ownership enforcement, pagination bounds, safe response projections, CRUD behavior, not-found handling, and authentication regression. Run Prisma migration/validation/generation plus the full test suite, lint, and production build.
