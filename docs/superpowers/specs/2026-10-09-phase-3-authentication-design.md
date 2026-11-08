# Phase 3: Authentication Design

## Purpose and scope

Phase 3 gives Twingface a production-oriented authentication foundation. It covers account registration, password login, database-backed sessions, logout, and one protected dashboard. It does not add social features, password recovery, email verification, multi-factor authentication, or future product models.

## Decisions

- Passwords are hashed with Argon2id through the `argon2` package. Plain-text passwords are never persisted or returned.
- Registration and login inputs are validated with shared Zod schemas. The server treats client validation as advisory and validates every request itself.
- Session identifiers are cryptographically random opaque tokens. The raw token exists only in the `HttpOnly` cookie; the database stores its SHA-256 digest, never the raw token.
- Sessions are Prisma-backed, expire after 30 days, and are revoked by deleting the matching record on logout. Expired sessions are rejected and cleaned up when observed.
- Cookie settings use `httpOnly`, `sameSite: 'lax'`, `path: '/'`, a finite expiry, and `secure: true` in production. The cookie is named with a `__Host-` prefix in production and a development-safe name locally.
- The dashboard checks the session from the server before rendering and redirects unauthenticated requests to `/login`. API routes validate server-side too.

## Data model

`User` remains the sole account model. Its registration identity is a required unique email and a required unique username. The prior optional-phone registration experiment remains in historical migration data but is removed from the Phase 3 sign-up flow and schema.

New `Session` fields:

- `id`: CUID primary key
- `tokenHash`: SHA-256 digest of the opaque session token, unique
- `userId`: foreign key to `User`
- `expiresAt`: required expiry timestamp
- `createdAt`: creation timestamp

`User.sessions` is the reverse relation. Deleting a user cascades to their sessions.

## Modules and request flow

### Validation

`src/lib/validations.ts` exports registration and login Zod schemas and normalized, user-safe validation results. Registration requires a trimmed name, lowercased valid email, username matching a constrained safe character set, an Argon2-safe password policy (at least 12 characters, upper/lowercase, digit), and matching confirmation.

### Authentication utilities

`src/lib/auth.ts` provides password hashing/verification, random session-token creation, SHA-256 hashing, session creation, current-user lookup, route protection, and session invalidation. Cookie mutation remains in server-only API actions/routes that can call Next's cookie API.

### API routes

- `POST /api/auth/register`: validates input, creates a user with an Argon2id hash, creates a session, and sets the opaque cookie. It returns only a safe user projection.
- `POST /api/auth/login`: validates credentials, compares the Argon2id hash, returns one generic invalid-credentials response for absent accounts and bad passwords, then creates a session and sets the cookie.
- `POST /api/auth/logout`: deletes the current session if present and expires the cookie. It is idempotent.

### Pages

The existing register and login forms retain their visual language but submit to the real APIs, show field/form errors, disable while loading, and redirect on success. The dashboard becomes a server-protected page that obtains the authenticated user and includes a logout control.

## Security properties

- No password hash, raw session token, or environment secret appears in a client response, URL, or local storage.
- Unique constraint errors are handled as safe registration messages; login never reveals whether an email exists.
- Session cookies are HTTP-only, same-site, scoped to the application root, time-limited, and secure in production.
- Tokens use `crypto.randomBytes`, and only their SHA-256 hashes are stored.
- All authorization decisions run on the server.

## Verification

Tests cover valid registration; duplicate email/username; malformed email; weak password; password mismatch; valid login; invalid credentials; logout; access denial while logged out; and protected access while logged in. Final checks run Prisma validate/generate/migration status, the auth test suite, `npm run lint`, and `npm run build`.
