# SDD ledger — plan: docs/superpowers/plans/2026-10-12-cloudinary-post-images.md

Pre-flight: Task 1 `parseCreatePostInput` is consumed by Task 3; Task 1 `uploadPostImage` and `destroyPostImage` are consumed by Tasks 3 and 4; Task 2 `SafePost.imageUrl` is consumed by Task 5. Names and responsibilities agree with the approved spec.

Ruling: The workspace is not a Git repository, so the required Git-worktree and commit/task-done scripts cannot run. Implementation will proceed in place with the existing user files preserved; task evidence is recorded in this ledger. Cost if wrong: no commit-range audit trail.

Task 1: Ruling: `CreatePostSchema` remains strict for existing JSON callers; `postCreateContent` is the optional media-parser field. This preserves the existing empty-text rejection until Task 3 owns multipart parsing. Cost if wrong: an untested external caller expecting empty JSON content would be rejected, which matches the pre-change API behavior.

Task 1: complete (no Git commit range available; focused tests: 36/36 passed; full suite: 61/61 passed).

Task 2: Ruling: The current schema contains an unrelated `Page` model without a migration. The post-image migration is hand-authored to add only the two approved nullable Post columns, preserving that user-owned model and avoiding out-of-scope database changes. Cost if wrong: the separate Page schema drift still needs its own migration before it can be used against this database.

Task 2: Ruling: `prisma migrate dev` is blocked by a pre-existing checksum mismatch in `20261010000000_add_profile_contact_location`. Apply the approved non-destructive SQL with `prisma db execute`, then mark only the new migration applied with `prisma migrate resolve`; do not reset data. Cost if wrong: future `migrate dev` remains blocked until the historical checksum drift is reconciled.

Task 2: Ruling: A running Node process locked Prisma's native engine during normal `prisma generate`. `prisma generate --no-engine` regenerated the client successfully, and a read-only Prisma runtime query succeeded. Cost if wrong: a deployment that requires the native engine must run normal generation with its Node server stopped.

Task 2: complete (Prisma validate/status passed; projection test passed; full suite: 62/62 passed).

Task 3: complete (collection API focused tests: 9/9 passed; full suite: 67/67 passed).

Task 4: complete (single-post API focused tests: 7/7 passed; full suite: 70/70 passed).

Task 5: complete (dashboard UI contract tests: 4/4 passed; lint passed).

Task 6: Ruling: Live authenticated Cloudinary upload was not run because `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are absent from `.env.local`. The logged-out local HTTP request to `POST /api/posts` returned 401. Cost if wrong: credentials could expose account-specific upload permissions or account limits that mocks cannot exercise.

Task 6: complete with live-upload limitation (Prisma validate passed; normal Prisma generation is blocked by a Windows engine file lock, while `prisma generate --no-engine` passed; full suite: 82/82 passed; lint passed; production build exit code 0; logged-out HTTP 401 passed).

Final review: self-review (no subagent tool allowed). Important security finding fixed: MIME type alone allowed spoofed image bytes; `isValidPostImageBytes` now validates JPEG/PNG/GIF/WebP signatures before upload, with RED→GREEN tests in `post-media.test.ts` and `api/posts/route.test.ts`. Minor (deferred): multipart parsing may buffer a malformed oversized request before the server can inspect `File.size`; deployment-level request-body limits should remain enabled. Cost if wrong: resource pressure from intentionally oversized streaming requests.
