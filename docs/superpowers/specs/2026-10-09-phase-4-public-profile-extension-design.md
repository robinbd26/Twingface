# Phase 4 Public Profile Compatibility Extension

## Purpose

Extend the existing authenticated self-profile feature with a public username-based profile view and compatibility aliases, without replacing existing routes or adding a schema migration.

## Compatibility commitments

- Existing `/profile`, `/profile/edit`, and `PATCH /api/profile` stay unchanged and functional.
- `ProfileSchema` is exported as an alias of the existing `profileUpdateSchema`.
- The existing profile edit form is reused at `/settings/profile`.

## Public profile route

`/[username]` looks up a user using the existing unique `username` field and the safe profile projection. It displays name, username, optional bio/images, and joined date. A missing username calls `notFound()`. It does not require authentication and never selects/returns password or session fields.

## Update route

`PATCH /api/user/profile` uses `getCurrentUser()` to authorize the request. It accepts only `name`, `bio`, `profileImage`, and `coverImage`; no user ID, username, password, or session field is accepted. Shared Zod validation enforces name limits, bio limits, and HTTPS-only image URLs. Prisma updates by `currentUser.id` with an explicit data object and returns a safe profile projection.

## Data model and tests

No migration is needed because the current `User` fields already cover the data. Tests cover validator aliasing, public existing/missing profiles, unauthenticated update denial, allowed-field update, invalid input, and sensitive-data exclusion. Final checks run lint and production build.
