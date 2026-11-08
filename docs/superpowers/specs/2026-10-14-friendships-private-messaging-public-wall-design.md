# Friendships, Private Messaging, and Public Wall Design

## Goal

Replace the minimal public profile card with a Facebook-style public wall and
add secure friend-request and direct-message workflows. A viewer can send,
cancel, accept, reject, or remove a friendship based only on server-side
relationship state. Private messages are available only after a friendship is
accepted.

## Scope

- Public user wall at `/<username>` with the existing profile visual system:
  cover, avatar, profile details, recent photos, friend count, and posts.
- Real directional friend requests and accepted friendship state.
- Direct, private one-to-one conversations between accepted friends.
- Inbox and message thread UI reachable from public-profile actions and the
  existing navbar Messages button.
- Safe, cursor-paginated public friend lists and private message lists.

Out of scope: group chats, message attachments, typing indicators, read
receipts, push notifications, blocking/reporting, friend suggestions, and
real-time websocket delivery. Refreshing the inbox/thread fetches current
database state.

## Data Model

### Friendship

`Friendship` represents the pair of users and the request direction:

- `id String @id @default(cuid())`
- `pairKey String @unique @db.VarChar(64)`: generated on the server from the
  two sorted user IDs; it prevents A→B and B→A duplicate rows.
- `requesterId String`, `recipientId String`, both foreign keys to `User` with
  cascade deletion.
- `status FriendshipStatus @default(PENDING)`, where values are `PENDING`,
  `ACCEPTED`, `REJECTED`.
- `createdAt`, `updatedAt`.

Indexes cover requester/status and recipient/status. The database never trusts
an ID or status supplied by the browser when making authorization decisions.

### DirectConversation and DirectMessage

`DirectConversation` stores one canonical participant pair:

- `id String @id @default(cuid())`
- `pairKey String @unique @db.VarChar(64)` generated from sorted user IDs.
- `participantOneId`, `participantTwoId`, each foreign key to `User` with
  cascade deletion.
- `lastMessageAt DateTime @default(now())`, `createdAt`, `updatedAt`.

`DirectMessage` belongs to a conversation:

- `id String @id @default(cuid())`
- `conversationId` foreign key with cascade deletion.
- `senderId` foreign key with cascade deletion.
- `content String @db.VarChar(1000)`, `createdAt`, `updatedAt`.

Indexes support conversation/time pagination, sender lookup, and inbox order.
The schema does not store email, phone, password hashes, sessions, or
Cloudinary internals in either model.

## Authorization and State Rules

- The acting identity always comes from `getCurrentUser()`.
- A user cannot request themself, alter another person's request, create a
  duplicate relationship pair, or send messages as another account.
- A request may be accepted/rejected only by its recipient; it may be
  cancelled only by its requester.
- Removing an accepted friend deletes the friendship. A later request starts a
  new relationship cycle.
- A conversation can be found/created and a message can be read/sent only when
  the current user is one of its participants **and** the pair has an accepted
  friendship at the time of access.
- All Prisma queries use explicit safe `select` blocks. Public responses expose
  only id/name/username/profile image and other approved public profile fields.

## API Contract

### Friend requests

- `POST /api/friends/requests`
  - body: `{ username: string }`.
  - Creates a pending request for the requested user. The server resolves the
    username, computes `pairKey`, and rejects self, missing, duplicate, and
    rejected/invalid state transitions safely.
- `GET /api/friends/requests`
  - Authenticated viewer's incoming/outgoing pending requests using safe user
    projections.
- `PATCH /api/friends/requests/[id]`
  - body: `{ action: "accept" | "reject" }`; recipient only.
- `DELETE /api/friends/requests/[id]`
  - Cancels the current user's own pending request or removes an accepted
    friendship involving the current user. It never deletes an unrelated row.
- `GET /api/users/[username]/friends?cursor=&limit=`
  - Public safe friend list with `limit` default 24, maximum 50, and a
    stable cursor ordered by acceptance/update time and id.

### Conversations and messages

- `POST /api/conversations/[username]`
  - Finds or creates the canonical direct conversation only for accepted
    friends; otherwise returns `403` without leaking private state.
- `GET /api/conversations?cursor=&limit=`
  - Returns the authenticated participant's safe inbox, latest message preview,
    other participant safe profile, and next cursor.
- `GET /api/conversations/[id]/messages?cursor=&limit=`
  - Returns messages only to a conversation participant with a currently
    accepted friendship.
- `POST /api/conversations/[id]/messages`
  - body: `{ content: string }`, trimmed non-empty and maximum 1000 chars;
    participant and accepted-friendship checks run before persistence.

Failures return generic safe messages: `401` unauthenticated, `403` forbidden,
`404` absent public resource, `400` validation/state error. Provider/database
details and private user fields are never relayed.

## Public Wall UI

`/<username>` first resolves the session user. If it represents the owner, it
redirects to `/profile`; otherwise it renders a public-wall variant sharing the
existing Facebook-style profile design. It shows only the target profile's
public fields, actual image posts, and actual relationship data.

It must not show edit controls, upload controls, owner-only post composer, or
mock friends. The action area changes by relationship state:

| State | Primary action | Secondary action |
| --- | --- | --- |
| no relationship | Add friend | Message disabled with explanation |
| outgoing pending | Cancel request | Message disabled |
| incoming pending | Confirm and Delete | Message disabled |
| accepted | Friends menu / Unfriend | Message opens/creates conversation |

The UI gets status from a safe profile relationship projection and uses client
components only for state-changing controls. Server components remain
responsible for session/profile/post queries. Mutations show accessible pending
and error states and refresh server data on completion.

`/messages` is the responsive inbox; `/messages/[conversationId]` is the
private thread with accessible send form, newest-message order, load-more
history, and empty states.

## Tests and Verification

Tests cover:

- schema constraints and safe selectors;
- friend request authentication, self/duplicate protection, transition
  ownership, cancellation/removal ownership, and no private-field leakage;
- message creation/read/send authorization for participants and accepted
  friends only, including invalid content and cursor bounds;
- public-wall self redirect, missing-user 404, relationship action states,
  absence of owner controls, and safe post/photo rendering;
- conversation inbox/thread client-state behavior where the current Vitest
  configuration can exercise it;
- regression coverage for existing profile, post, comment, and authentication
  behavior.

Verification commands:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev --name add_friendships_and_messages
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

No migration is run until the implementation plan is reviewed and approved.
