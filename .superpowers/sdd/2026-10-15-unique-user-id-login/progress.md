# SDD ledger — plan: docs/superpowers/plans/2026-10-15-unique-user-id-login.md

Execution: Native inline implementation.
Ruling: This workspace has no Git repository — worktree isolation, commits, and the provided SDD helper scripts cannot run; implementation will stay in the current workspace with task-level test evidence — cost if wrong: changes cannot be separated into a Git branch.
Pre-flight: Task 1 produces `parseLoginIdentifier` and the parsed login shape consumed by Task 2; Task 2 preserves the API contract consumed by Task 3 — consistent with the approved spec.
Task 1: complete (no Git commit available; tests: `npm.cmd test -- src/lib/validations.test.ts` → 55/55 passed)
Task 2: Ruling: Keep `Invalid email or password.` as the generic failure copy — the approved spec requires unchanged generic error behavior and this avoids identifier/account enumeration — cost if wrong: the copy does not mention phone or User ID.
Task 2: Ruling: Narrow parsed JSON to `Record<string, unknown>` before mapping the legacy `email` key — TypeScript's `object` type cannot safely expose request properties — cost if wrong: invalid JSON shapes could be mishandled at compile time.
Task 2: complete (no Git commit available; tests: `npm.cmd test -- src/app/api/auth/login/route.test.ts` → 6/6 passed; `npx.cmd tsc --noEmit` → passed)
Task 3: complete (no Git commit available; tests: `npm.cmd test -- src/app/api/auth/register/route.test.ts 'src/app/(auth)/auth-form.test.ts'` → 4/4 passed; `npx.cmd tsc --noEmit` → passed)
Task 4: Ruling: Do not create live smoke-test accounts in the user's development database — automated route tests cover User ID, email, phone, legacy payload, duplicate User ID, malformed identifiers, and generic failures without adding persistent user data — cost if wrong: browser-only form interaction is not separately exercised.
Task 4: complete (verification: `npx.cmd prisma validate` → valid; `npx.cmd vitest run --reporter=dot` → 63 files/340 tests passed; `npm.cmd run lint` → zero warnings; `npm.cmd run build` → exit code 0)
Final review: external reviewer found one Important ambiguity: numeric User IDs that look like Bangladesh phone numbers could be accepted at signup but routed as phones at login.
Final: fixed ambiguous numeric User ID — `registerSchema rejects phone-shaped User ID` RED→GREEN, focused suite 68/68 and full suite 343/343.
Final verification: `npm.cmd run lint` → zero warnings; `npx.cmd prisma validate` → valid; `npm.cmd run build` → exit code 0.
Final: Ruling: Preserve this plan's SDD ledger because the workspace has no Git history to retain the implementation record — cost if wrong: temporary execution notes remain in the ignored workspace.
