# Phase 4: User Profile Design

## Scope

Phase 4 adds a self-profile view and edit flow to Twingface. It uses the existing session authentication system and the existing `User` fields. It does not introduce public profiles, posts, media uploads, storage providers, or Phase 5 social features.

## Data model

No database migration is needed. `User` already provides the required fields: `name`, unique `username`, optional `bio`, optional `profileImage`, optional `coverImage`, and `createdAt`.

## Authorization and data flow

`/profile` and `/profile/edit` are server-rendered protected pages. Each calls `getCurrentUser()` and redirects unauthenticated visitors to `/login`.

`PATCH /api/profile` calls `getCurrentUser()` before parsing or persisting input. It derives the update target exclusively from `currentUser.id`; no client-provided ID is accepted or used. The endpoint returns a safe profile projection only, excluding `passwordHash`, sessions, token hashes, and authentication data.

## Validation

The shared Zod profile schema validates:

- `name`: trimmed, 2–100 characters
- `username`: existing lowercase safe username pattern, 3–30 characters
- `bio`: trimmed optional text up to 500 characters
- `profileImage` and `coverImage`: optional empty or HTTPS URL, at most 500 characters

Profile image fields are URL-only. Upload infrastructure is intentionally deferred to a later media phase.

## API behavior

- Unauthenticated profile update: `401` safe error.
- Invalid input: `400` with field-safe validation errors.
- Duplicate username: `409` with a username field error, based on Prisma's unique-constraint error.
- Valid update: `200` and a safe profile object.

## UI

The profile page displays the available profile and cover images, name, username, bio, and account creation date. It provides graceful fallback initials/color blocks for missing images or bio. The edit form retains the existing card, field, button, responsive, and theme classes; it provides loading, success, and validation/error states. The dashboard gets a profile navigation link.

## Verification

Tests cover profile validation, safe projections, protected page behavior, authenticated update, unauthenticated rejection, invalid input, duplicate usernames, and existing authentication regression tests. Final verification runs the suite, lint, and production build.
