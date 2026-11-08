# SDD ledger — plan: docs/superpowers/plans/2026-10-15-facebook-style-groups.md

Execution: native, in the shared workspace because this project has no `.git` repository and no worktree can be created.

Baseline: `npm.cmd test` ran on 2026-10-15. 49 files / 279 tests passed; `src/lib/notification.test.ts` has 6 pre-existing failures because its `@/lib/realtime` mock omits `__resetRealtime`. This is outside the Groups feature and is tracked for final verification.

Pre-flight: Task 1 produces Prisma group enums/models, safe selectors, validation schemas, and visibility helpers. Tasks 2–7 consume these through the exact names declared in Task 1; Task 5 consumes the existing media validation contract without modifying normal posts. No type conflict found.

Task 1: Ruling: `prisma migrate dev` requested a destructive reset because historical migrations drift from the local database. Created and applied additive migration `20261015050000_add_groups` with `prisma migrate deploy` instead — preserves current data; cost if wrong: a migration SQL/schema mismatch caught by Prisma validation and deployment.
Task 1: complete (no git repository available for commits; focused tests `src/lib/group.test.ts src/lib/validations.test.ts` 54/54, full suite 51 files / 300 tests passed).
Task 2: complete (no git repository available for commits; focused tests 59/59, full suite 53 files / 308 tests passed).
Task 3: complete (no git repository available for commits; membership route tests 4/4, full suite 56 files / 312 tests passed; lint passed).

