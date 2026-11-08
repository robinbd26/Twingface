# SDD ledger — plan: docs/superpowers/plans/2026-10-14-youtube-video-posts.md

Ruling: This workspace has no git repository. Git-dependent worktree, commit, and review-package steps cannot run; manual ledger/test evidence will be retained instead. Cost if wrong: no commit-range audit trail.

Pre-flight: Task 1 produces URL helpers consumed by Task 3 and Task 4. Task 2 produces `SafePost.youtubeUrl`, consumed by Task 3 persistence and Task 4 card rendering. Interfaces agree.

Task 2: Ruling: `prisma migrate dev` cannot run because pre-existing migration-history drift would demand a destructive reset. Use a manually authored one-column migration followed by `prisma migrate deploy`, which migration status reports can safely apply without reset. Cost if wrong: the drift itself remains a separate repository maintenance issue.

Task 1: complete. Added strict server-safe YouTube parsing/canonicalization and embed generation; `src/lib/youtube.test.ts` passed 9/9 tests.

Task 2: complete. Added nullable `Post.youtubeUrl`, applied `20261014000000_add_youtube_url_to_post` with `prisma migrate deploy`, and confirmed `prisma migrate status` reports the schema up to date.

Task 3: complete. JSON and multipart post creation now validate and persist only canonical URLs, while `safePostSelect` exposes only the URL; focused API/unit suite passed 37/37.

Task 4: complete. Composer accepts an optional URL and post cards render a parsed privacy-enhanced, responsive iframe; dashboard contract test passed 7/7. Full automated suite passed 129/129, lint passed, Prisma validation/generation passed, and production build exited 0.

Smoke test: production server started locally; logged-out `POST /api/posts` returned 401 and public `GET /api/posts?limit=1` returned 200. No authenticated browser post was created during smoke verification, so the complete authenticated visual playback was not exercised against a live YouTube response.
