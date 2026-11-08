# Unique User ID and Multi-Identifier Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every new account to choose a unique public User ID and allow sign-in using that ID, an email address, or a Bangladesh mobile number.

**Architecture:** Reuse the existing unique `User.username` column as the public User ID; no new database column or Prisma migration is needed. A shared validation helper will normalize and classify an entered identifier before the login route issues one targeted Prisma lookup by `username`, `email`, or `phone`. The registration and authentication form will expose a distinct User ID field while retaining the non-unique display name.

**Tech Stack:** Next.js route handlers, React 19, TypeScript, Zod, Prisma/PostgreSQL, Vitest, existing authentication helpers.

**Spec:** `docs/superpowers/specs/2026-10-15-unique-user-id-login-design.md`

## Global Constraints

- `User.username` is the public User ID and must remain unique in the database.
- User IDs are 3–30 normalized lowercase characters and may contain letters, numbers, `.`, `_`, and `-`; they must begin and end with a letter or number.
- Display names remain non-unique and are never used to resolve login credentials.
- Login accepts exactly one identifier: email, a valid Bangladesh mobile number, or User ID, plus a password.
- Identifier precedence is email, then valid Bangladesh phone, then User ID; all login failures return the existing generic credentials error.
- The server must continue accepting the legacy JSON login shape `{ email, password }` while browser clients move to `{ identifier, password }`.
- Do not add account-existence checks that reveal whether a User ID, email, or phone belongs to an account.
- Preserve session creation, cookie handling, password hashing, and existing registration demographics.

## Review Focus

- A mixed-case User ID with surrounding whitespace normalizes to the stored lowercase value and signs in successfully (Task 1 and Task 2).
- An email-looking value is resolved only through the email path, not treated as a User ID (Task 1 and Task 2).
- A normalized Bangladesh phone number can sign in, while an invalid phone-like value is rejected safely (Task 1 and Task 2).
- Duplicate User IDs at registration report a field-level User ID conflict without exposing unrelated account data (Task 3).
- A legacy `{ email, password }` login request continues to work during the client migration (Task 2).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/validations.ts` | Normalize and classify login identifiers; retain the established User ID format contract. |
| `src/lib/validations.test.ts` | Unit tests for User ID, email, and phone identifier parsing. |
| `src/app/api/auth/login/route.ts` | Read the new and legacy request shapes, perform the targeted credential lookup, and preserve generic failures. |
| `src/app/api/auth/login/route.test.ts` | Route coverage for all lookup paths, legacy compatibility, authentication, and response safety. |
| `src/app/api/auth/register/route.ts` | Keep the existing unique constraint handling but label username conflicts as User ID conflicts. |
| `src/app/api/auth/register/route.test.ts` | Registration API coverage for normalized User IDs and duplicate-user-ID errors. |
| `src/app/(auth)/auth-form.tsx` | Add User ID selection at signup and send a single login identifier to the API. |
| `src/app/(auth)/auth-form.test.ts` | Source/UI contract checks for visible User ID and multi-identifier login fields under the current test setup. |

## Task 1: Normalize and classify authentication identifiers

**Files:**
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/validations.test.ts`

**Interfaces:**
- Produces `parseLoginIdentifier(value: unknown): { kind: 'email' | 'phone' | 'username'; value: string } | null`.
- Updates `loginSchema` to parse `{ identifier: string; password: string }` and return the normalized identifier classification with the password.
- Keeps `registerSchema.username` as the canonical public User ID validation.

- [ ] **Step 1: Write failing validation tests**

Add tests that assert `Farah.Rahman` normalizes as `{ kind: 'username', value: 'farah.rahman' }`, ` FARAH@EXAMPLE.COM ` normalizes as email, and equivalent Bangladesh formats normalize as the same phone number. Assert invalid email-like values, malformed phone inputs, and invalid User IDs fail login validation; retain the overlong-password regression test using the new `identifier` property.

- [ ] **Step 2: Run the validation tests to confirm the new contract fails**

Run: `npm.cmd test -- src/lib/validations.test.ts`

Expected: FAIL because `parseLoginIdentifier` and the new `loginSchema` result shape do not exist.

- [ ] **Step 3: Implement the identifier parser and login schema**

In `src/lib/validations.ts`, implement `parseLoginIdentifier(value: unknown)` using the existing email and `normalizeContact` rules, then the existing `username` format. Return `null` for blank, oversized, malformed, or unsupported values. Define `loginSchema` around an `identifier` string and transform it into the parser result plus the validated password, with a safe validation error if parsing fails.

- [ ] **Step 4: Verify the validation module**

Run: `npm.cmd test -- src/lib/validations.test.ts`

Expected: PASS.

## Task 2: Authenticate by User ID, email, or phone without account enumeration

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes `loginSchema` and its `{ identifier: { kind, value }, password }` output from Task 1.
- Produces the unchanged successful session response and one generic `401` credentials error for invalid request data, unknown accounts, and wrong passwords.

- [ ] **Step 1: Write failing login route tests**

Create tests with mocked `prisma.user.findUnique`, password verification, session creation, and cookie setting. Cover successful lookup by `username`, `email`, and `phone`; an unknown identifier; wrong password; malformed identifier; and the legacy `{ email, password }` body. Assert each path performs exactly one lookup using the expected unique field and unsuccessful responses expose no account-specific detail.

- [ ] **Step 2: Run the route test to confirm it fails**

Run: `npm.cmd test -- src/app/api/auth/login/route.test.ts`

Expected: FAIL because the route accepts only `email` and only queries by email.

- [ ] **Step 3: Implement backward-compatible request parsing and targeted lookup**

In `src/app/api/auth/login/route.ts`, parse the JSON object once, map legacy `email` to `identifier` only when `identifier` is absent, and validate with `loginSchema`. Select the Prisma unique `where` clause solely from `identifier.kind`: `email`, `phone`, or `username`. Preserve the existing safe select fields, password verification, session issuance, and identical generic `401` response for every failed credential path.

- [ ] **Step 4: Verify multi-identifier login**

Run: `npm.cmd test -- src/app/api/auth/login/route.test.ts`

Expected: PASS.

## Task 3: Require a selected User ID during registration and update the auth form

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/register/route.test.ts`
- Modify: `src/app/(auth)/auth-form.tsx`
- Create: `src/app/(auth)/auth-form.test.ts`

**Interfaces:**
- Consumes `registerSchema.username` as the User ID and `POST /api/auth/login` identifier contract from Task 2.
- Produces a registration UI that sends an explicit User ID and a login UI that sends `{ identifier, password }`.

- [ ] **Step 1: Write failing registration and form-contract tests**

Create route tests for successful lowercase User ID persistence and Prisma `P2002` username conflict handling. Add auth-form source/UI contract assertions for a labelled required User ID field bound to its own state, registration payload `username: rUsername`, login identifier state, and `body: JSON.stringify({ identifier, password })`.

- [ ] **Step 2: Run the focused tests to confirm failure**

Run: `npm.cmd test -- src/app/api/auth/register/route.test.ts src/app/(auth)/auth-form.test.ts`

Expected: FAIL because the form still generates a random username and submits login input as `email`.

- [ ] **Step 3: Implement explicit User ID registration and updated copy**

Replace the generated username logic in `AuthForm` with controlled `rUsername` state and a required, accessible User ID input whose helper copy states the permitted characters. Rename login state and labels to “Email, phone, or User ID” (with the existing Bengali translation equivalent) and submit it as `identifier`. In the registration route, preserve the current `P2002` field detection but return a clear `username` field error such as “That User ID is already in use.”

- [ ] **Step 4: Verify registration and form contracts**

Run: `npm.cmd test -- src/app/api/auth/register/route.test.ts src/app/(auth)/auth-form.test.ts`

Expected: PASS.

## Task 4: Regression verification

**Files:**
- Modify only if a verification failure requires a focused correction to Tasks 1–3.

**Interfaces:**
- Verifies registration and login behavior remains compatible with the existing session and dashboard flows.

- [ ] **Step 1: Run focused authentication checks**

Run: `npm.cmd test -- src/lib/validations.test.ts src/app/api/auth/login/route.test.ts src/app/api/auth/register/route.test.ts src/app/(auth)/auth-form.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the full automated suite and production checks**

Run:

```powershell
npx.cmd prisma validate
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Perform a local smoke test without exposing credentials**

Register an account with a unique User ID, then sign out and sign in separately by User ID, email, and the stored Bangladesh phone number. Verify duplicate User ID registration and bad credentials show safe generic feedback. Do not log passwords, cookies, session identifiers, or database connection strings.

## Plan Self-Review

- **Spec coverage:** Task 1 implements format, normalization, and identifier precedence; Task 2 implements safe server lookup and legacy compatibility; Task 3 supplies the signup/login experience and duplicate ID feedback; Task 4 verifies the complete flow.
- **Step scan:** Each task begins with a test that specifies the behavior, then has an isolated implementation and verification step. No database migration is included because `User.username` is already a unique persisted field.
- **Type consistency:** `parseLoginIdentifier` produces the exact `{ kind, value }` object consumed by `loginSchema` and Task 2; `rUsername` is the UI field sent as the existing registration `username` API property.
- **Review focus:** Each listed concern is pinned to tests in Task 1, 2, or 3.
- **Proportion:** This plan changes only authentication validation, routes, form state/copy, and targeted tests; it does not alter profiles, sessions, posts, or the existing database schema.
