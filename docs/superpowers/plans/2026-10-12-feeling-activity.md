# Feeling and Activity Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users attach one server-validated Facebook-style feeling or activity to a post and display it consistently in the feed.

**Architecture:** A small shared catalog owns stable keys, labels, emojis, and Zod validation. The existing post collection route reads one optional `feelingActivity` field for JSON and multipart requests, persists only the validated key, and returns it through the existing safe post projection. A dedicated client picker is composed into the current post modal; the card maps only known server-supplied keys to display metadata.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, existing dashboard CSS design system.

**Spec:** `docs/superpowers/specs/2026-10-12-feeling-activity-design.md`

## Global Constraints

- Store at most one nullable, predefined key in `Post.feelingActivity`; no custom text, tags, multiple selections, or new models.
- Continue requiring post text or one valid image; a feeling/activity alone cannot create a post.
- Derive the author only from `getCurrentUser()` and ignore client `authorId`, image metadata, labels, and emoji.
- Validate the key server-side against the catalog for both JSON and multipart requests.
- Keep `imagePublicId`, passwords, email, phone, sessions, tokens, and Cloudinary credentials out of public projections.
- Preserve existing image upload, post ownership, pagination, delete cleanup, and content-only PATCH behavior.
- Do not reset the database or rewrite historical migrations. The repository has a known historical migration checksum mismatch that can block `prisma migrate dev`.

## Review Focus

- A request with only `feelingActivity` and no text/image returns `400` rather than creating an empty post (Task 2).
- An unknown key, arbitrary label, or arbitrary emoji is rejected/ignored before Prisma create or Cloudinary upload (Task 2).
- JSON text posts and multipart image posts without a selection remain backward compatible (Task 2).
- Safe responses expose the controlled key but never provider cleanup IDs or private user/session fields (Task 3).
- Clearing/replacing a picker selection changes only client state and cannot leave stale metadata in the submitted `FormData` (Task 4).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/feeling-activity.ts` | Defines catalog entries, lookup helpers, labels, and Zod key schema. |
| `src/lib/feeling-activity.test.ts` | Unit-tests catalog integrity and validation. |
| `prisma/schema.prisma` | Adds the nullable `Post.feelingActivity` field. |
| `prisma/migrations/<timestamp>_add_post_feeling_activity/migration.sql` | Adds only the nullable `feelingActivity` column to `posts`. |
| `src/lib/post-media.ts` | Extends create-post parsing with optional validated feeling/activity metadata. |
| `src/lib/post-media.test.ts` | Covers the updated parser contract. |
| `src/lib/post.ts` | Adds the public key to `safePostSelect`. |
| `src/lib/post.test.ts` | Locks down safe public projection behavior. |
| `src/app/api/posts/route.ts` | Reads, validates, and persists the optional key in JSON/multipart requests. |
| `src/app/api/posts/route.test.ts` | Covers API creation, validation, mass assignment, and regression behavior. |
| `src/components/posts/feeling-activity-picker.tsx` | Isolated accessible search/select dialog UI. |
| `src/components/posts/create-post-form.tsx` | Owns selected key state and sends it with `FormData`. |
| `src/components/posts/post-card.tsx` | Renders a recognized feeling/activity phrase. |
| `src/components/dashboard/dashboard-ui.test.ts` | Source-level UI contract tests for picker and card integration. |
| `src/app/dashboard.css` | Scoped picker, chip, and card metadata styles. |

## Task 1: Shared controlled catalog and validation

**Files:**
- Create: `src/lib/feeling-activity.ts`
- Create: `src/lib/feeling-activity.test.ts`

**Interfaces:**
- Produces `FEELING_ACTIVITY_OPTIONS`, a readonly catalog of `{ key, kind, label, emoji, phrase }` entries.
- Produces `FeelingActivityKeySchema`, accepting a catalog key or omission/empty input normalized to `null`.
- Produces `getFeelingActivity(key: string | null | undefined): FeelingActivityOption | null` for safe display lookup.

- [ ] **Step 1: Write failing catalog/validation tests**

Add cases asserting the catalog has the eight approved feelings and eight approved activities, that `feeling:happy` and `activity:watching` resolve to stable label/emoji/phrase metadata, empty input becomes `null`, and arbitrary values such as `feeling:admin` fail.

- [ ] **Step 2: Run the new unit test to verify it fails**

Run: `npm.cmd test -- src/lib/feeling-activity.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the catalog and typed helpers**

Create `src/lib/feeling-activity.ts`. Use a `const` catalog and a Zod refinement/enum derived from its stable keys. Give each option the exact approved display values; keep UI copy outside request payloads.

- [ ] **Step 4: Run the catalog test**

Run: `npm.cmd test -- src/lib/feeling-activity.test.ts`

Expected: PASS.

## Task 2: Persist and accept validated feeling/activity metadata

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_post_feeling_activity/migration.sql`
- Modify: `src/lib/post-media.ts`
- Modify: `src/lib/post-media.test.ts`
- Modify: `src/app/api/posts/route.ts`
- Modify: `src/app/api/posts/route.test.ts`

**Interfaces:**
- Consumes `FeelingActivityKeySchema` from Task 1.
- Changes `parseCreatePostInput(content, image, feelingActivity)` to return `{ content, image, feelingActivity: string | null }` after validation.
- Persists Prisma `Post.feelingActivity` only from validated parser output.

- [ ] **Step 1: Write failing parser and collection-route tests**

Extend `post-media.test.ts` so text-only/image-only/text-plus-image parses have `feelingActivity: null`, valid feeling/activity keys survive normalization, and feeling-only input fails the existing text-or-image rule.

Extend `route.test.ts` with JSON and FormData requests carrying `feelingActivity`. Assert a valid key becomes an explicit `prisma.post.create` data property; unknown keys return `400` before upload/create; client-supplied `authorId`, `label`, and `emoji` never enter Prisma data; omitted metadata retains existing create behavior.

- [ ] **Step 2: Run parser and route tests to verify failure**

Run: `npm.cmd test -- src/lib/post-media.test.ts src/app/api/posts/route.test.ts`

Expected: FAIL because the parser and route do not accept or persist the key.

- [ ] **Step 3: Add the nullable Prisma field and migration**

Add `feelingActivity String? @db.VarChar(64)` to `Post`. First run:

```powershell
npx.cmd prisma migrate dev --name add_post_feeling_activity
```

If the known historical checksum mismatch blocks that command, do not reset or alter old migrations. Create a timestamped migration containing only:

```sql
ALTER TABLE "posts" ADD COLUMN "feelingActivity" VARCHAR(64);
```

Apply it with `npx.cmd prisma db execute --schema prisma/schema.prisma --file <migration-file>` and mark only that new migration applied using `npx.cmd prisma migrate resolve --applied <migration-name>`. Inspect `migrate status` afterward.

- [ ] **Step 4: Extend parse and collection API code**

Update `parseCreatePostInput` to consume the third field and validate it through Task 1's schema while retaining all existing image/content checks. In `POST /api/posts`, read exactly `feelingActivity` from JSON/form data, then create with the explicit validated value alongside existing `content`, author, and image fields.

- [ ] **Step 5: Regenerate and run focused checks**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd test -- src/lib/post-media.test.ts src/app/api/posts/route.test.ts
```

Expected: all commands succeed and focused tests pass.

## Task 3: Extend the safe public post contract

**Files:**
- Modify: `src/lib/post.ts`
- Modify: `src/lib/post.test.ts`
- Modify: `src/app/api/posts/[id]/route.test.ts` only if its safe response fixtures require the new field

**Interfaces:**
- Consumes Prisma's generated nullable `Post.feelingActivity` field.
- Produces `SafePost.feelingActivity` from `safePostSelect` while retaining exclusion of `imagePublicId` and private author/session fields.

- [ ] **Step 1: Write failing projection tests**

Add a fixture with `feelingActivity: 'feeling:happy'`. Assert the safe projection contains `feelingActivity: true`, does not contain `imagePublicId`, and serialized public response fixtures contain no password, email, phone, token, or Cloudinary secret.

- [ ] **Step 2: Run projection tests to verify failure**

Run: `npm.cmd test -- src/lib/post.test.ts src/app/api/posts/route.test.ts src/app/api/posts/[id]/route.test.ts`

Expected: FAIL because the safe selection omits the new public field.

- [ ] **Step 3: Add only the public key to `safePostSelect`**

Modify `src/lib/post.ts` to select `feelingActivity: true`. Do not add `imagePublicId` or any user-sensitive field. Update fixtures/types only where TypeScript requires the nullable property.

- [ ] **Step 4: Run projection and API regression tests**

Run: `npm.cmd test -- src/lib/post.test.ts src/app/api/posts/route.test.ts src/app/api/posts/[id]/route.test.ts`

Expected: PASS.

## Task 4: Build the accessible picker and feed rendering

**Files:**
- Create: `src/components/posts/feeling-activity-picker.tsx`
- Modify: `src/components/posts/create-post-form.tsx`
- Modify: `src/components/posts/post-card.tsx`
- Modify: `src/components/dashboard/dashboard-ui.test.ts`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes `FEELING_ACTIVITY_OPTIONS`, `FeelingActivityOption`, and `getFeelingActivity` from Task 1.
- `FeelingActivityPicker` accepts `{ value: string | null; onSelect: (key: string) => void; onClear: () => void; onClose: () => void }`.
- `CreatePostForm` owns `selectedFeelingActivity: string | null` and adds it to FormData only when selected.

- [ ] **Step 1: Write failing UI contract tests**

Extend `dashboard-ui.test.ts` to assert both Feeling/activity buttons open the picker, picker dialog/search/option controls and clear action have stable test IDs, selection is represented with `aria-pressed`, submitted `FormData` contains `feelingActivity`, and `PostCard` conditionally uses `getFeelingActivity(post.feelingActivity)`.

- [ ] **Step 2: Run the UI contract test to verify failure**

Run: `npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts`

Expected: FAIL because no picker module or metadata UI exists.

- [ ] **Step 3: Implement `FeelingActivityPicker`**

Build a dialog with a labelled search input, separate Feelings and Activities groups, case-insensitive search filtering over label/phrase, keyboard escape close, active `aria-pressed` option buttons, and a visible remove selection control. Use catalog values only; do not accept custom input as a selection.

- [ ] **Step 4: Integrate picker state into the existing composer**

Make both action buttons open the normal composer and picker. Render the selected removable chip in the composer. Include the key in `FormData` only while selected; replacement and removal must update only local state. Clear the selection after successful publish and close, without changing existing image preview cleanup or submission pending behavior.

- [ ] **Step 5: Render metadata in post cards and style it**

In `PostCard`, resolve the key with `getFeelingActivity`; render a compact phrase only when recognized. Add scoped dashboard CSS for picker backdrop/panel/options/search, selected/removable chip, and responsive post metadata in both themes.

- [ ] **Step 6: Run UI tests and lint**

Run:

```powershell
npm.cmd test -- src/components/dashboard/dashboard-ui.test.ts
npm.cmd run lint
```

Expected: both commands pass with no lint warnings.

## Task 5: Full verification and authenticated smoke test

**Files:**
- Modify only if an observed verification failure requires a narrow correction to Tasks 1-4.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate status
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits `0`. If normal generation is locked by an active Next process, stop only the app process, rerun generation, then restart it; do not delete user data.

- [ ] **Step 2: Perform local authenticated verification**

Use the normal login flow without exposing credentials. Create (a) a text post with Happy, (b) a text-plus-image post with Watching, and (c) a post after clearing a selected feeling. Refresh the feed and single-post page to confirm rendering. Submit an unknown `feelingActivity` through a local authenticated request and verify `400`; submit the same request logged out and verify `401`.

- [ ] **Step 3: Record actual results**

Report each command's exit/result, migration path used, successful UI flows, rejected cases, and any unexecuted external/live checks honestly.

## Plan Self-Review

- **Spec coverage:** Task 1 provides the controlled catalog; Task 2 supplies schema, migration, parsing, server validation, persistence, and compatibility; Task 3 preserves safe response boundaries; Task 4 delivers accessible picker UI and feed rendering; Task 5 verifies every required path.
- **Type consistency:** `feelingActivity` is the sole persisted nullable key across Prisma, parser, API, `SafePost`, composer, and card. `FeelingActivityPicker` callbacks use keys, not display labels.
- **Review focus:** Task 2 tests feeling-only, unknown/mass-assigned values, and backward-compatible request types; Task 3 tests public projection safety; Task 4 tests clear/replace FormData behavior.
- **Migration safety:** The plan starts with Prisma's normal migration command but defines a non-destructive, narrow fallback for the known historical checksum issue. It never calls `migrate reset`.
- **Scope:** No free-text activities, post editing UI, tagging, reactions, video, or unrelated dashboard/auth work is included.
