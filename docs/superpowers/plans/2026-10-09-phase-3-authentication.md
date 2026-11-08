# Phase 3 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure password authentication and Prisma-backed opaque sessions for Twingface.

**Architecture:** A Zod validation boundary feeds server-only Argon2id password utilities and Prisma session persistence. A random session token is sent only in an HTTP-only cookie while its SHA-256 digest identifies the database session. Server pages and API routes obtain the current user from that session before authorizing access.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, argon2, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-phase-3-authentication-design.md`

## Global Constraints

- Use Prisma-backed sessions, opaque random session tokens, and store only each token's SHA-256 hash in PostgreSQL.
- Use Argon2id; do not store or return plain passwords or password hashes.
- Validate registration and login on the server with Zod; client validation is supplemental.
- Session tokens and secrets never enter local storage, URLs, or JSON responses.
- Use HTTP-only, same-site, expiring cookies; require `secure` in production.
- Enforce dashboard authorization server-side and do not add Phase 4 social features.
- Preserve the existing authentication-page visual language.

## Review Focus

- Reused, expired, or deleted session token: access must be denied and the obsolete cookie cleared; covered by Task 3 session-lookup tests.
- Case/whitespace variants of registration email: normalization must still trigger a duplicate-email result; covered by Task 2 API tests.
- Race-created duplicate user: Prisma unique violations must return safe conflict messages rather than a server error; covered by Task 4 mocked-route test.
- Production cookie attributes: only `__Host-` cookie naming plus `secure: true` may be emitted; covered by Task 3 cookie-option tests.
- Redirect query value on denied dashboard request: it must be encoded and never contain a session token; covered by Task 5 protected-page test.

---

### Task 1: Authentication dependencies, Prisma session model, and validation

**Files:**
- Modify: `package.json`, `prisma/schema.prisma`, `src/lib/validations.ts`
- Create: `prisma/migrations/<timestamp>_add_auth_sessions/migration.sql`, `src/lib/validations.test.ts`, `vitest.config.ts`

**Interfaces:**
- Produces: `registerSchema`, `loginSchema`, `RegisterInput`, and `LoginInput` for routes/forms; `Session` Prisma model with `tokenHash`, `userId`, `expiresAt`, and `createdAt`.

- [ ] **Step 1: Write failing Zod tests**

Test `registerSchema` accepts a valid 12+ character mixed-case/digit password and normalizes email, while rejecting invalid email, weak password, mismatched confirmation, invalid username, and invalid name. Test `loginSchema` accepts normalized valid credentials.

- [ ] **Step 2: Run validation tests to verify they fail**

Run: `npm test -- validations`

Expected: FAIL because the schemas/test runner do not exist.

- [ ] **Step 3: Add `zod`, `argon2`, `vitest`, and test scripts; implement validation interfaces**

Define `registerSchema` with `name`, `username`, `email`, `password`, and `confirmPassword`; use a `.superRefine` password-match error targeted at `confirmPassword`. Define `loginSchema` with email and password. Add `Session` and the required `User.sessions` relation, make email required, and remove `phone` from the Prisma model via migration.

- [ ] **Step 4: Run tests and Prisma schema checks**

Run: `npm test -- validations && npx prisma validate && npx prisma generate`

Expected: all validation assertions pass; Prisma schema validates and client generation succeeds.

### Task 2: Server-only password and session primitives

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `Session` generated Prisma type and database singleton from `src/lib/db.ts`.
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, hash: string): Promise<boolean>`, `createSessionToken(): string`, `hashSessionToken(token: string): string`, `SESSION_DURATION_MS`, `sessionCookie`, and safe `AuthUser` selection.

- [ ] **Step 1: Write failing security-primitive tests**

Test Argon2id hashes verify only their matching password; test generated tokens differ across calls; test a known token hashes to its SHA-256 hex digest; test development and production cookie options have HTTP-only, same-site, path, expiry, production `secure`, and the correct name.

- [ ] **Step 2: Run primitive tests to verify they fail**

Run: `npm test -- auth.test`

Expected: FAIL because promised exports do not exist.

- [ ] **Step 3: Implement server-only crypto/password helpers**

Use `argon2.hash` with `type: argon2.argon2id`; use `randomBytes(32)` encoded as base64url and `createHash('sha256')`. Ensure `AuthUser` excludes `passwordHash` and helpers do not serialize secrets.

- [ ] **Step 4: Run primitive tests**

Run: `npm test -- auth.test`

Expected: PASS.

### Task 3: Persisted session lifecycle and current-user lookup

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/session.test.ts`

**Interfaces:**
- Consumes: Task 2 token helpers and `prisma`.
- Produces: `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>`, `getCurrentUser(): Promise<AuthUser | null>`, `deleteSession(token: string): Promise<void>`, `setSessionCookie(token, expiresAt)`, and `clearSessionCookie()`.

- [ ] **Step 1: Write failing database-mocked session tests**

Mock Prisma and Next cookies to assert `createSession` stores a token digest, never the token; valid sessions return a safe user; expired/missing sessions return null and clean up; deletion receives the digest, and cookie clearing uses matching safe attributes.

- [ ] **Step 2: Run session tests to verify they fail**

Run: `npm test -- session.test`

Expected: FAIL because lifecycle functions do not exist.

- [ ] **Step 3: Implement persisted session lifecycle**

Persist a 30-day expiry timestamp. Query the session by `tokenHash`, include only the safe user projection, reject/cleanup expired sessions, and use `cookies()` only from server-side code.

- [ ] **Step 4: Run session tests**

Run: `npm test -- session.test`

Expected: PASS.

### Task 4: Registration, login, and logout routes

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/routes.test.ts`

**Interfaces:**
- Consumes: Task 1 Zod schemas and Task 3 session functions.
- Produces: three POST endpoints with safe JSON contracts: registration `{ user }`, login `{ user }`, logout `{ ok: true }`.

- [ ] **Step 1: Write failing route tests**

Mock Prisma/session helpers and verify successful registration; duplicate email; duplicate username; malformed email; weak password; mismatch; success login; absent user and bad password both return the exact same generic 401 message; logout deletes a token and clears the cookie.

- [ ] **Step 2: Run route tests to verify they fail**

Run: `npm test -- routes.test`

Expected: FAIL because login/logout routes do not exist and registration uses the old contact contract.

- [ ] **Step 3: Implement API routes**

Parse JSON safely, validate with Zod, normalize duplicate-constraint handling, hash only after validation, select safe user fields, call session creation/cookie functions, and use generic login failures. Logout must be safe when there is no valid session.

- [ ] **Step 4: Run route tests**

Run: `npm test -- routes.test`

Expected: PASS.

### Task 5: Real forms and protected dashboard

**Files:**
- Modify: `src/app/(auth)/register/register-form.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/app/(main)/dashboard/page.tsx`, `src/app/globals.css`
- Create: `src/app/(main)/dashboard/logout-button.tsx`, `src/app/(main)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: Task 4 API contracts and Task 3 `getCurrentUser`.
- Produces: live registration/login form submissions, dashboard server redirect for unauthenticated visitors, and logout user control.

- [ ] **Step 1: Write failing protected-page tests**

Mock `getCurrentUser` and Next redirect: logged-out dashboard requests redirect to `/login`, logged-in requests render the selected user name without auth secrets. Include a return-path encoding assertion.

- [ ] **Step 2: Run protected-page tests to verify they fail**

Run: `npm test -- dashboard`

Expected: FAIL because dashboard is not protected.

- [ ] **Step 3: Implement UI integration**

Replace the old phone/contact registration field with username and email. Render client-side validation/API errors beside relevant fields, disable submits during requests, redirect successful authentication to `/dashboard`, and retain language/theme/design behavior. Make dashboard an async server component that redirects if no safe user exists. Implement a client logout button that posts then redirects to `/login`.

- [ ] **Step 4: Run UI/protected-page tests**

Run: `npm test -- dashboard`

Expected: PASS.

### Task 6: Migrate and verify Phase 3 end-to-end

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-phase-3-authentication-design.md` only if implementation decisions require an approved correction.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: generated Prisma client and verified Phase 3 behavior.

- [ ] **Step 1: Apply/validate the Prisma migration in the configured development database**

Run: `npx prisma migrate dev --name add_auth_sessions && npx prisma generate && npx prisma validate`

Expected: migration applies, generated client matches the schema, and schema validation passes.

- [ ] **Step 2: Run the complete authentication test suite**

Run: `npm test -- --run`

Expected: all validation, password, session, route, and dashboard tests pass.

- [ ] **Step 3: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: exit code 0 for both commands.

- [ ] **Step 4: Manually verify browser flows against the development server**

Run: `npm run dev`

Expected: a new account can register and reach the dashboard; logout returns to login; a fresh logged-out request to `/dashboard` redirects to login; valid email/password can log in; an invalid password receives the generic error.

## Self-review

- Spec coverage: Tasks 1–5 cover every specified data, cryptography, route, UI, and authorization decision; Task 6 covers migration and final verification.
- Type consistency: validation schemas feed the routes; session lifecycle consumes safe `AuthUser`; the dashboard uses `getCurrentUser`.
- Review focus: each identified risk is assigned a concrete test step in its owning task.
- Scope: all tasks stay within Phase 3; no social-feature model or route is proposed.
