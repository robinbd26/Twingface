# SDD ledger — plan: docs/superpowers/plans/2026-10-14-persistent-post-comments.md

Ruling: Existing Prisma migration-history drift makes `prisma migrate dev` request a destructive reset. Applied the reviewed comment migration with `prisma migrate deploy` instead; cost if wrong: historical drift remains a separate maintenance issue.

Pre-flight: Task 1 produces `Comment` and `CreateCommentSchema`, consumed by Tasks 2 and 3. Task 2 produces `SafeComment` and `SafePost._count.comments`, consumed by Tasks 3 and 4. Interfaces match the specification.

Task 1: complete — `CreateCommentSchema` RED→GREEN (28 validation tests passed); `20261014010000_add_comments` applied, Prisma validate/generate passed.

Task 2: complete — safe comment projection, bounded pagination helper, and post count selection RED→GREEN (3 focused tests passed).

Task 3: complete — nested comment GET/POST authorization, validation, safety, and mass-assignment tests RED→GREEN (5/5 passed).

Task 4: complete — post card changed from browser-only counter to server-backed comments UI RED→GREEN (8 dashboard UI contract tests passed; lint passed).

Final: fixed stable cursor ordering — changed comment listing to order by `createdAt`, then `id`; route test RED→GREEN and full suite 139/139 passed.

Final review: self-review (no subagent tool permitted in this session). Checked safe response selection, explicit server-derived author/post data, anonymous rejection, missing-post handling, duplicate submit guard, and stable cursor ordering. No deferred minors.

Smoke test: updated production server started locally. GET comments for an absent post returned 404; logged-out POST comment returned 401. Authenticated browser persistence is covered by API/UI automated tests but not manually submitted with a real browser session.
