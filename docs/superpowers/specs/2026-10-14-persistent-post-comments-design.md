# Persistent Post Comments Design

## Goal

Replace the dashboard's browser-only comment counter with secure, persistent comments that authenticated users can create and read on a post.

## Scope

- Store and display text comments for existing posts.
- Keep the existing inline post-card comment UI.
- Preserve current post, image, YouTube, feeling, authentication, and dashboard behavior.

Out of scope: replies, reactions, editing/deleting comments, mentions, attachments, notifications, and realtime sockets.

## Data Model

Add a `Comment` model with `id`, trimmed `content` (maximum 500 characters), `postId`, `authorId`, `createdAt`, and `updatedAt`.

`Comment.post` and `Comment.author` use cascade deletion. `Post` and `User` gain comment relations. Add `[postId, createdAt]` and `[authorId]` indexes. The migration adds only the comments table, relations, and indexes.

## Validation and Safe Shapes

`CreateCommentSchema` accepts `{ content }`, trims it, requires 1–500 characters, and rejects whitespace-only input.

The safe public comment shape exposes only `id`, `content`, timestamps, and author `id`, `name`, `username`, and `profileImage`. It never exposes password hashes, e-mail, phone, session data, tokens, or internal provider values.

The safe post selection adds `_count: { select: { comments: true } }`, so cards receive a server-backed total without loading every comment in the feed.

## API

`GET /api/posts/[id]/comments?cursor=&limit=` returns public comments ordered oldest first, default 20, maximum 50, with `{ comments, nextCursor }`. It returns `404` if the post is absent.

`POST /api/posts/[id]/comments` requires `getCurrentUser()`, confirms the post exists, validates JSON, and creates an explicit Prisma record with `postId` from route params and `authorId` from the server session. It returns `201 { comment }`. Safe failures are `401`, `404`, and `400` with validation field errors.

## UI Flow

Opening a post's Comment section loads comments. Submitting disables duplicate sends, calls the nested API, appends the returned safe comment, increments the count, clears the input, and shows a safe inline error on rejection. The client does not report success before the server responds.

## Security

- Server-side session determines the comment author.
- Explicit Prisma data ignores client-supplied `authorId`, `postId`, timestamps, and protected fields.
- Zod validation is mandatory on the server.
- Explicit select projections prevent sensitive-field exposure.
- Cascade deletion prevents orphan comments when a post or user is removed.

## Verification

Test authenticated creation, anonymous rejection, missing post, invalid content, mass assignment prevention, safe API response, pagination, server-backed post count, and UI submit/load behavior.

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

This workspace has pre-existing migration-history drift that makes `prisma migrate dev` request a destructive reset. The reviewed migration will instead be applied through `prisma migrate deploy`; no reset will be performed.
