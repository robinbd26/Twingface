# SDD ledger — plan: docs/superpowers/plans/2026-10-14-friendships-private-messaging-public-wall.md

Workspace: no Git repository is present, so worktree isolation and commits are unavailable. Work proceeds in the existing workspace while preserving unrelated user files.

Pre-flight: Task 1 produces canonical pair helpers/safe projections used by Tasks 2–5; Task 2 produces accepted friendship state for Tasks 3–4; Task 3 produces conversation API contracts used by Task 5. Interfaces are consistent with the approved specification.

Task 1: Ruling: use an explicitly reviewed additive migration and `prisma migrate deploy` instead of `prisma migrate dev` — an earlier modified migration causes Prisma dev's reset prompt despite `migrate status` reporting the deployed schema up to date; cost if wrong: migration authoring has to be reviewed manually, but existing local data is preserved.
Task 1: complete — created the friendship/conversation/message schema, safe relationship primitives, and an additive migration. `npx.cmd prisma validate`, `npx.cmd prisma migrate deploy`, and `npx.cmd prisma generate` passed; the focused validation suite passed (3 files, 6 tests). The local production server was stopped before regenerating the Prisma client because it locked Prisma's Windows query-engine file.

Task 2: complete — added authenticated send/list/accept/reject/cancel/unfriend routes and a cursor-paginated public accepted-friends route. Focused API tests passed (3 files, 9 tests).
Task 3: complete — added authenticated conversation listing/opening and paginated message read/send routes. Every conversation and message operation re-checks accepted friendship state. Focused API tests passed (3 files, 5 tests).
Task 4: complete — replaced the minimal public profile with the profile-wall shell, owner redirect, relationship-aware friend/message controls, and safe real posts/photos/accepted friends. Focused public-wall contract tests passed (1 file, 3 tests).
Task 5: complete — added protected inbox and conversation-thread pages that consume only the messaging APIs, plus real accepted-friends data on the owner profile. Focused UI/profile tests passed (2 files, 11 tests), and lint passed.

Final: fixed inbox access and paging review findings — accepted friendship now scopes inbox previews, both history APIs retrieve newest-first then render chronologically, `/messages` clears/guards per-conversation state, and the navbar links to the protected inbox. RED→GREEN focused suite passed (18 tests), then full suite passed (46 files, 257 tests).
Final verification: `npx.cmd prisma validate`, `npx.cmd prisma generate`, `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` all passed.
Final: Ruling: retain the singular `/api/user/[username]/friends` public friend-list endpoint rather than add a duplicate plural alias — it matches the approved API specification and is already cursor-paginated; cost if wrong: an external consumer expecting the unapproved plural spelling would need a compatibility alias.
