# SDD ledger — plan: docs/superpowers/plans/2026-10-14-profile-intro-details-photos.md

Workspace: no Git repository is present, so Git worktree isolation and commits are unavailable. Work proceeds in the existing workspace while preserving all unrelated user files.

Baseline: `npm.cmd test` → 21 test files passed, 143 tests passed.

Pre-flight: Task 1 produces `Profile`, strict profile schemas, and Prisma fields; Task 2 consumes the schemas/profile projection — consistent.
Pre-flight: Task 3 produces safe photo projection/query helpers; Task 4 and Task 5 consume photo records — consistent.
Pre-flight: Task 4 creates the profile photo card and Task 5 creates the public gallery — distinct UI responsibilities, consistent with the spec.

Ruling: Request bodies for the new mutation routes will use Zod `.strict()` and reject unknown fields with `400`, rather than ignoring them — this resolves the specification's “rejected or ignored” ambiguity in favor of mass-assignment safety; cost if wrong: older clients sending unexpected fields must remove them.

Task 1: complete (no Git commits available; focused `npx.cmd prisma validate`, `npx.cmd prisma generate`, and `npm.cmd test -- src/lib/validations.test.ts src/lib/profile.test.ts` passed; regression `npm.cmd test` → 22 files, 153 tests passed). Ruling: the running local `next start` process locked Prisma's Windows query engine; it was stopped before client generation and will be restarted after final build — cost if wrong: the local preview is temporarily unavailable during implementation.

Task 2: complete (no Git commits available; `npm.cmd test -- src/app/api/user/bio/route.test.ts src/app/api/user/details/route.test.ts` → 10 passed; regression `npm.cmd test` → 24 files, 163 tests passed).

Task 3: complete (no Git commits available; `npm.cmd test -- src/lib/profile-photos.test.ts src/app/api/user/[username]/photos/route.test.ts` → 12 passed; regression `npm.cmd test` → 26 files, 175 tests passed). Ruling: `limit=999` caps to 50 and therefore two returned rows do not create a next cursor; the test now separately verifies the cap and a `limit=1` lookahead page — cost if wrong: pagination tests would assert an impossible next cursor.

Task 4: complete (no Git commits available; focused profile/dashboard UI tests → 17 passed; `npm.cmd run lint` passed; regression `npm.cmd test` → 26 files, 178 tests passed). Ruling: retain `profile-intro.tsx` and add `profile-photos.tsx` beside the existing profile page rather than moving them under `src/components/profile` — this preserves the established route-local component boundary; cost if wrong: profile-only components are less globally discoverable.

Task 5: complete (no Git commits available; gallery RED→GREEN `npm.cmd test -- "src/app/(main)/[username]/photos/page.test.ts"` → 3 passed; `npx.cmd prisma validate`, `npx.cmd prisma generate`, and `npx.cmd prisma migrate deploy` passed; migration `20261014020000_add_profile_intro_details` applied successfully; final regression `npm.cmd test` → 27 files, 181 tests passed; `npm.cmd run lint` passed; `npm.cmd run build` passed). Local HTTP smoke: `/api/health` → 200; unauthenticated `PUT /api/user/bio` → 401; missing-user recent-photo endpoint → 404. Authenticated UI smoke was not run because the previously available browser tab switched to an unrelated user Gmail page before it could be safely inspected.

Final review: no critical findings. Fixed important findings with a RED→GREEN cycle: the public gallery now retrieves an initial lookahead row and exposes a client-side “Load more photos” control backed by the cursor API; profile edit dialogs now contain Tab/Shift+Tab focus and restore focus to their trigger after closing. A Windows lock from the local `next start` server initially blocked Prisma client generation; that explicitly identified local server was stopped, then `npx.cmd prisma generate` succeeded. Final verification: `npx.cmd prisma validate`, `npx.cmd prisma generate`, and `npx.cmd prisma migrate deploy` passed; `npm.cmd test` → 27 files / 181 tests passed; `npm.cmd run lint` passed; `npm.cmd run build` passed. Minor findings deferred: replace the legacy “Never give up.” empty-bio fallback with an explicit empty state, and reset unsaved editor drafts when reopening a dialog. No Phase B–D functionality was added.
