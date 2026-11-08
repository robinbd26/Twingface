# Facebook-Style Groups Design

## Goal

Allow authenticated Twingface users to create, discover, join, manage, and
post in Facebook-style groups. A creator chooses group visibility and posting
permissions when creating the group. Private-group membership requires an
administrator's approval.

## Scope

- Create a group with a name, handle, description, privacy, posting policy,
  and optional cover image URL.
- Support public and private groups.
- Support group roles: administrator, moderator, and member.
- Support membership states: pending, approved, and rejected.
- Make the creator an approved administrator atomically at creation time.
- Let users discover public groups and see their approved memberships.
- Let a user join public groups immediately and request access to private
  groups.
- Let administrators approve/reject private-group requests, remove members,
  and update group settings.
- Let approved members create group posts when policy permits; group
  administrators/moderators can always post.
- Render group posts using the existing safe post media contract: text,
  optional single Cloudinary image, YouTube URL, and feeling/activity.
- Add `/groups`, `/groups/create`, and `/groups/[handle]` pages using the
  existing Facebook-inspired responsive design system.

## Out of Scope

- Invite links, scheduled posts, polls, files, events, group chat, live video,
  albums, post moderation queues, reactions unique to groups, or notifications.
- Deleting groups, transferring ownership, or changing creator identity.
- Separate group-only image storage: existing trusted media rules remain the
  source of truth.

## Data Model

### Enums

```
GroupPrivacy: PUBLIC | PRIVATE
GroupPostingPolicy: MEMBERS | ADMINS_ONLY
GroupRole: ADMIN | MODERATOR | MEMBER
GroupMembershipStatus: PENDING | APPROVED | REJECTED
```

### Group

| Field | Purpose |
| --- | --- |
| `id` | CUID primary key |
| `name` | Display name, 3–80 characters |
| `handle` | Unique normalized URL handle, 3–60 characters |
| `description` | Optional 500-character description |
| `privacy` | `PUBLIC` or `PRIVATE` |
| `postingPolicy` | `MEMBERS` or `ADMINS_ONLY` |
| `coverImage` | Optional validated HTTPS URL |
| `creatorId` | Creator/User foreign key |
| timestamps | Creation and update audit timestamps |

### GroupMembership

One row exists per user/group pair, enforced by `@@unique([groupId, userId])`.

| Field | Purpose |
| --- | --- |
| `groupId`, `userId` | Membership identity |
| `role` | Admin/moderator/member authority |
| `status` | Pending/approved/rejected access state |
| timestamps | Request and transition ordering |

### GroupPost

Group posts intentionally reuse the post media fields rather than creating a
separate media implementation. Each row has a group and author foreign key,
content, nullable image metadata, nullable YouTube URL, nullable feeling key,
and timestamps. Existing application Post rows are not migrated or repurposed.

## Authorization Rules

All ownership and membership checks derive from `getCurrentUser()` server-side.
The browser never supplies a creator ID, role, status, or author ID.

| Operation | Authorized actor |
| --- | --- |
| View public group metadata | Anyone |
| View public group feed | Anyone |
| View private group metadata | Anyone sees only limited header data |
| View private group feed/members | Approved members only |
| Create group | Authenticated user |
| Join public group | Authenticated user; becomes approved member |
| Request private membership | Authenticated user; becomes pending |
| Approve/reject requests | Approved admin only |
| Remove member | Approved admin only; never self-removal through admin route |
| Update group settings | Approved admin only |
| Create post under `MEMBERS` | Approved member/admin/moderator |
| Create post under `ADMINS_ONLY` | Approved admin/moderator only |

Any removal or rejection revokes private-feed and posting access immediately.
Role values in requests are never trusted.

## API Contract

All API responses use explicit safe Prisma projections. They never serialize
email, passwords, session data, Cloudinary secrets, rejected-member data to
ordinary visitors, or private post content to non-members.

### Group collection

- `GET /api/groups?scope=discover|mine&query=&cursor=&limit=`
  - `scope=discover` (the default) returns cursor-paginated public-group
    discovery results with safe creator data and approved member count.
  - `scope=mine` requires authentication and returns only groups in which the
    viewer has an approved membership; it never reveals another user's private
    memberships.
- `POST /api/groups`
  - Authenticated. Accepts `name`, `handle`, optional `description`,
    `privacy`, `postingPolicy`, optional `coverImage`.
  - Atomically creates the group and the creator's approved admin membership.

### Group profile and membership

- `GET /api/groups/:handle`
  - Returns safe group data, viewer relationship state, approved member count,
    and a feed only when visibility permits.
- `PATCH /api/groups/:handle`
  - Admin-only settings update.
- `POST /api/groups/:handle/membership`
  - Authenticated join/request. Public groups approve immediately; private
    groups create pending requests. Existing memberships are idempotently
    reported rather than duplicated.
- `GET /api/groups/:handle/members?cursor=&limit=`
  - Approved member directory; private groups require approved membership.
- `PATCH /api/groups/:handle/members/:userId`
  - Admin-only; body action is `approve`, `reject`, or `remove`. Each action
    validates the target's current state.

### Group posts

- `GET /api/groups/:handle/posts?cursor=&limit=`
  - Safe, cursor-paginated group post feed subject to group visibility.
- `POST /api/groups/:handle/posts`
  - Authenticated; enforces approved membership and posting policy before
    accepting the existing multipart media payload.

## UI and Data Flow

### `/groups`

The page provides a Facebook-style group landing layout: a left navigation
section for *Your groups* and *Create group*, a discoverable public group list,
search, and membership status badges. It loads only safe discovery data.

### `/groups/create`

The creation form requires name, handle, privacy, and posting policy. It uses
inline validation for handle availability and safe server errors. On success it
redirects to `/groups/[handle]`.

### `/groups/[handle]`

The group page has cover/header, privacy badge, member count, join/request
button, group feed, and a member/admin panel. For a private group before
approval, the page shows limited metadata and request state rather than posts,
members, or composer. The composer is shown only to users allowed to post.

The current post card media renderer is reused for group posts. Group post
creation reuses the existing image/YouTube/feeling controls and sends the
payload to the group-post endpoint; it cannot create a regular wall post.

## Validation and Safety

- Handles are lowercased, checked against a strict safe pattern, and unique.
- Name, description, URLs, pagination limits, and actions use Zod schemas.
- Image types, maximum image size, and server-only Cloudinary upload handling
  follow the existing post-image policy.
- All admin actions re-read membership from the database immediately before a
  write; client state is never authority.
- Private group posts are never returned in public search or discovery output.
- Cursor ordering has deterministic timestamp + ID tie breaks.

## Testing and Verification

Tests will cover:

- schema constraints and safe group/member/post projections;
- public/private visibility and membership state transitions;
- duplicate join requests, self-actions, unauthorized admin operations, and
  revoked access after removal;
- posting-policy enforcement for members, moderators, and admins;
- valid/invalid group creation and group-post media payloads;
- safe response shapes without private account data;
- source/UI contracts for the group landing, create form, request state,
  privacy gating, and group composer;
- regression coverage for existing dashboard, normal posts, profile, and auth.

Final commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd test
npm.cmd run lint
npm.cmd run build
```
