# Unique User ID and Multi-Identifier Login Design

## Goal

Give every Twingface account a unique public User ID and let users sign in
with their User ID, email address, or Bangladeshi phone number.

## Decision

The existing `User.username` field is the User ID. It is already unique,
used in public profile URLs, and follows the required account-identity role;
no duplicate field or data migration is needed.

## Signup

- The registration form labels `username` as **User ID**.
- A User ID is required, lowercased, and must be 3–30 characters.
- Allowed characters are lowercase letters, numbers, dots, underscores, and
  hyphens; it cannot begin or end with punctuation.
- Registration rejects an already-used User ID with a safe field error.
- Display name remains separate and is not unique: multiple users may have
  the same name.

## Login

- Replace the email-only credential label with **Email, phone, or User ID**.
- A login value containing `@` is normalized and resolved as email.
- A value matching the existing Bangladesh mobile format is normalized and
  resolved as phone.
- Any other valid User ID-shaped value is normalized and resolved as username.
- Password verification, sessions, rate/error behavior, and generic invalid
  credential error copy remain unchanged so the endpoint does not reveal
  which identifier exists.

## Server Contract

- `loginSchema` exposes a normalized `identifier` and password.
- `POST /api/auth/login` accepts `{ identifier, password }`; it temporarily
  accepts legacy `{ email, password }` as an alias to avoid breaking existing
  callers.
- The route selects only the password hash and safe session fields for one
  user matched by `email`, `phone`, or `username`; it never performs a broad
  search or exposes which branch matched.

## UI

- Register displays “User ID” with concise format help and inline availability
  conflict feedback.
- Login displays one identifier field. Browser autofill uses `username` so
  password managers can associate the credential safely.
- Existing username/profile links and APIs continue to use the same value.

## Security and Tests

- Database uniqueness remains the final authority; API pre-checks are not
  relied on for correctness.
- User IDs are normalized before lookup and persistence.
- Tests cover unique-ID validation, a duplicate database conflict, login by
  User ID/email/phone, normalization, invalid identifier rejection, and no
  account-enumeration details in failures.
- Existing authentication regression tests must remain green.
