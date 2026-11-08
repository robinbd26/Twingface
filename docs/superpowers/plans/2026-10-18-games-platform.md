# Games Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated `/games` placeholder with an admin-managed, trusted-iframe games catalog inside the standard TwingFace app shell.

**Architecture:** A Prisma `Game` catalog holds only administrator-managed, active game records. Shared validation rejects untrusted play URLs before persistence and again before play. The server `/games` page keeps the dashboard navbar and passes a small authenticated user object to a client workspace that queries the catalog, filters it, and opens the server-validated game in an in-page modal.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Prisma/PostgreSQL, Zod, Vitest, CSS in `src/app/dashboard.css`.

**Spec:** `docs/superpowers/specs/2026-10-18-games-platform-design.md`

## Global Constraints

- Scope is `/games` and its dedicated backend/data files only; do not modify Marketplace, MediaWorld, OTT, or global navigation styling.
- Preserve the global `DashboardNavbar` and use the standard authenticated app shell; never make `/games` standalone or full-screen.
- Production game URLs permit only `https://games.twingface.com` and HTTPS subdomains; development also permits `http://localhost` and `http://127.0.0.1`.
- Reject malformed URLs, non-HTTP(S) protocols, credentials in URLs, and non-allowlisted origins.
- All administrator mutations require `getCurrentUser()` with `role === 'SUPER_ADMIN'`; fail closed with HTTP 403.
- Use test-first development: write and run a focused failing test before each production-code task.

## Review Focus

- Trusted URL edge cases: protocol-relative, credential-bearing, `games.twingface.com.evil.test`, and HTTP production URLs must all be rejected; Task 1 tests these.
- Inactive game IDs must never be returned by the catalog or opened by the play endpoint; Task 3 tests these.
- A non-admin authenticated member cannot create, edit, or delete games even if they send a valid body; Task 4 tests these.
- Search/genre query parameters must be bounded and invalid genre values must not cause a Prisma query error; Task 2 tests these.
- An iframe modal must never use a client-supplied URL; it opens only the server-returned `playUrl`; Task 5 tests this contract.

---

## File structure

- `prisma/schema.prisma` — `GameGenre` enum and `Game` persistence model.
- `src/lib/game.ts` — trusted-origin validation, Zod parsing, safe Prisma select, serializable types.
- `src/lib/game.test.ts` — validation/allowlist behavior.
- `src/app/api/games/route.ts` — authenticated public catalog `GET` and admin catalog `POST`.
- `src/app/api/games/[id]/play/route.ts` — validated active-game play lookup and counter increment.
- `src/app/api/games/[id]/route.ts` — admin `PATCH` and `DELETE`.
- `src/app/api/games/*.test.ts`, `src/app/api/games/[id]/*.test.ts` — route authorization, filtering, inactive behavior.
- `src/components/games/games-workspace.tsx` — sub-sidebar, hero, search/filter UI, game grid, request state and modal orchestration.
- `src/components/games/game-player-modal.tsx` — accessible in-page player receiving an already validated game record.
- `src/components/games/games-workspace.test.ts` — client/UI contract.
- `src/app/(main)/games/page.tsx` — authenticated server-page composition using `DashboardNavbar` and `GamesWorkspace`.
- `src/app/dashboard.css` — new `.games-*` only styling and responsive rules.

### Task 1: Add trusted game domain and input validation library

**Files:**
- Create: `src/lib/game.ts`
- Create: `src/lib/game.test.ts`
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces `GameGenre`, `GameInput`, `parseGameCreateInput(input: unknown)`, `parseGameBrowseInput(searchParams: URLSearchParams)`, `isTrustedGameUrl(value: string): boolean`, and `safeGameSelect`.
- Consumed by Tasks 2–5.

- [ ] **Step 1: Write failing validation tests**

```ts
it('allows only configured trusted game origins', () => {
  expect(isTrustedGameUrl('https://games.twingface.com/play/runner')).toBe(true);
  expect(isTrustedGameUrl('https://games.twingface.com.evil.test/play')).toBe(false);
  expect(isTrustedGameUrl('https://user:pass@games.twingface.com/play')).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module/export is absent**

Run: `npm.cmd test -- --run src/lib/game.test.ts`  
Expected: FAIL with missing module or `isTrustedGameUrl` export.

- [ ] **Step 3: Add `GameGenre` and `Game` to Prisma and implement `src/lib/game.ts`**

Use enum values `ACTION`, `HORROR`, `RACING`, `PUZZLE_STRATEGY`, `SPORTS_FIGHTING`, `ARCADE`, and `RPG`. `Game` includes unique `slug`, active/featured flags, rating, play count, creator relation, and the indexes defined in the spec. Parse title, slug, description, genre, thumbnail URL, and play URL with Zod; the game URL validator is the single source of trusted-origin policy.

- [ ] **Step 4: Generate Prisma migration/client and run focused validation tests**

Run: `npx prisma migrate dev --name add-games-catalog && npx prisma generate && npm.cmd test -- --run src/lib/game.test.ts`  
Expected: migration succeeds and all `game.test.ts` cases pass.

- [ ] **Step 5: Commit the task**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/game.ts src/lib/game.test.ts
git commit -m "feat: add trusted games catalog model"
```

### Task 2: Implement authenticated public games catalog API

**Files:**
- Create: `src/app/api/games/route.ts`
- Create: `src/app/api/games/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser`, `prisma`, `parseGameBrowseInput`, and `safeGameSelect`.
- Produces `GET /api/games?query=&genre=&featured=` returning `{ games: SafeGame[] }` for authenticated members.

- [ ] **Step 1: Write failing route tests for authenticated active catalog filtering**

```ts
it('returns active games filtered by query and genre', async () => {
  // mock authenticated user and Prisma response
  const response = await GET(new Request('http://localhost/api/games?genre=RACING&query=drift'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ games: expect.any(Array) });
});
```

Add tests for unauthenticated 401, inactive exclusion, invalid genre ignored/rejected according to the parser, and a query longer than the specified parser limit.

- [ ] **Step 2: Run the focused route test and confirm it fails because the route is absent**

Run: `npm.cmd test -- --run src/app/api/games/route.test.ts`  
Expected: FAIL with missing route/module.

- [ ] **Step 3: Implement `GET` in `src/app/api/games/route.ts`**

Require authentication. Query only `{ isActive: true }`, apply parsed text/genre/featured conditions, order featured then newest, select only `safeGameSelect`, and return no more than the parser’s bounded limit.

- [ ] **Step 4: Run focused catalog API tests**

Run: `npm.cmd test -- --run src/app/api/games/route.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/app/api/games/route.ts src/app/api/games/route.test.ts
git commit -m "feat: add games catalog API"
```

### Task 3: Add server-authoritative play endpoint

**Files:**
- Create: `src/app/api/games/[id]/play/route.ts`
- Create: `src/app/api/games/[id]/play/route.test.ts`

**Interfaces:**
- Consumes `getCurrentUser`, `prisma`, and `safeGameSelect`.
- Produces `POST /api/games/:id/play` returning `{ game: SafeGame }` after atomically incrementing `playCount`.
- Consumed by Task 5.

- [ ] **Step 1: Write failing play-route tests**

```ts
it('increments and returns only an active game for an authenticated player', async () => {
  const response = await POST(new Request('http://localhost/api/games/game_1/play'), { params: Promise.resolve({ id: 'game_1' }) });
  expect(response.status).toBe(200);
  expect(prisma.game.update).toHaveBeenCalledWith(expect.objectContaining({ data: { playCount: { increment: 1 } } }));
});
```

Add expected 401 and 404 tests for missing/inactive game IDs.

- [ ] **Step 2: Run focused play-route tests and confirm they fail**

Run: `npm.cmd test -- --run src/app/api/games/[id]/play/route.test.ts`  
Expected: FAIL because the play route is absent.

- [ ] **Step 3: Implement authenticated `POST` play route**

Look up by `id` and `isActive: true`, return 404 if absent, then update play count and select the safe returned game. Do not receive or echo a client play URL.

- [ ] **Step 4: Run focused play-route tests**

Run: `npm.cmd test -- --run src/app/api/games/[id]/play/route.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/app/api/games/[id]/play/route.ts src/app/api/games/[id]/play/route.test.ts
git commit -m "feat: add secure game play endpoint"
```

### Task 4: Add Super Admin game management routes

**Files:**
- Modify: `src/app/api/games/route.ts`
- Create: `src/app/api/games/[id]/route.ts`
- Modify: `src/app/api/games/route.test.ts`
- Create: `src/app/api/games/[id]/route.test.ts`

**Interfaces:**
- Consumes `GameInput` parsing and `getCurrentUser().role`.
- Produces `POST /api/games`, `PATCH /api/games/:id`, and `DELETE /api/games/:id`, all limited to `SUPER_ADMIN`.

- [ ] **Step 1: Write failing admin authorization and mutation tests**

```ts
it('rejects a regular user creating a game', async () => {
  mockedUser.mockResolvedValue({ ...member, role: 'USER' });
  const response = await POST(jsonRequest('/api/games', validGame));
  expect(response.status).toBe(403);
});
```

Test successful super-admin create, rejected untrusted `playUrl`, super-admin edit, and delete of a missing record.

- [ ] **Step 2: Run focused admin route tests and confirm they fail**

Run: `npm.cmd test -- --run src/app/api/games/route.test.ts src/app/api/games/[id]/route.test.ts`  
Expected: FAIL because mutations are not implemented.

- [ ] **Step 3: Implement guarded create/update/delete handlers**

Use the existing `SUPER_ADMIN` role convention from MediaWorld approval. Call the shared Zod parser for create and partial update data. Return 401 when anonymous and 403 for non-admins before any database mutation.

- [ ] **Step 4: Run focused management tests**

Run: `npm.cmd test -- --run src/app/api/games/route.test.ts src/app/api/games/[id]/route.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/app/api/games src/lib/game.ts
git commit -m "feat: add admin games management"
```

### Task 5: Build Games workspace and embedded player modal

**Files:**
- Create: `src/components/games/games-workspace.tsx`
- Create: `src/components/games/game-player-modal.tsx`
- Create: `src/components/games/games-workspace.test.ts`
- Modify: `src/app/(main)/games/page.tsx`
- Modify: `src/app/dashboard.css`

**Interfaces:**
- Consumes `/api/games`, `/api/games/:id/play`, and `SafeGame` from `src/lib/game.ts`.
- Produces authenticated `/games` page with the standard navbar, left dashboard/sidebar structure, Games sub-sidebar, catalog grid, and modal.

- [ ] **Step 1: Write failing UI contract tests**

```ts
it('exposes games navigation, genre search, and server-authoritative play modal', () => {
  const source = sourceFile('src/components/games/games-workspace.tsx');
  expect(source).toContain('All Games');
  expect(source).toContain('Weekly Tournaments');
  expect(source).toContain('Search games');
  expect(source).toContain('/api/games/${gameId}/play');
});
```

Add a modal contract assertion that `GamePlayerModal` receives a game record rather than a raw URL string, and a page assertion that `DashboardNavbar` remains present.

- [ ] **Step 2: Run focused workspace test and confirm it fails**

Run: `npm.cmd test -- --run src/components/games/games-workspace.test.ts`  
Expected: FAIL because the workspace and modal are absent.

- [ ] **Step 3: Implement `GamesWorkspace` and `GamePlayerModal`**

`GamesWorkspace` has the specified navigation, genre chips, search input, featured hero, loading/empty/error states, responsive 3–4 column cards, and `Play Game` actions. It requests the server play endpoint before setting the selected safe game. `GamePlayerModal` receives `{ game: SafeGame; onClose: () => void }`, renders a titled iframe using `game.playUrl`, and uses `allow="fullscreen"` plus a sandbox policy limited to required game capabilities.

- [ ] **Step 4: Compose the workspace in the authenticated `/games` page and add scoped `.games-*` CSS**

Keep the current `DashboardNavbar` and app-shell. Match OTT’s dark cinema palette without changing existing OTT selectors. At mobile widths, collapse the games sub-sidebar above the content and keep cards usable at one/two columns.

- [ ] **Step 5: Run focused UI test**

Run: `npm.cmd test -- --run src/components/games/games-workspace.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit the task**

```bash
git add src/components/games src/app/(main)/games/page.tsx src/app/dashboard.css
git commit -m "feat: build games workspace"
```

### Task 6: End-to-end verification

**Files:**
- Modify only if verification exposes a task-local defect.

**Interfaces:**
- Verifies all outputs from Tasks 1–5.

- [ ] **Step 1: Validate generated Prisma artifacts**

Run: `npx prisma validate && npx prisma generate`  
Expected: schema is valid and client generation exits 0.

- [ ] **Step 2: Run lint and full test suite**

Run: `npm.cmd run lint && npm.cmd test`  
Expected: ESLint exits 0 and all test files pass.

- [ ] **Step 3: Inspect authenticated `/games` in a browser**

Verify the standard top navbar, games sub-sidebar, hero, filter bar, responsive game grid, and modal close behavior. Confirm no game modal opens with a URL not returned by `POST /api/games/:id/play`.

- [ ] **Step 4: Commit any verification-only corrections**

```bash
git add -A
git commit -m "test: verify games platform"
```

## Self-review

- **Spec coverage:** Tasks 1–4 cover persistent admin-managed secure catalog and play flow; Task 5 covers all requested UI pieces; Task 6 covers validation and live behavior.
- **Step scan:** Each task has one feature boundary and an explicit red/green test sequence.
- **Type consistency:** `SafeGame`, `GameInput`, `safeGameSelect`, and `GamePlayerModal` are defined once and carried through the task interfaces.
- **Review focus:** Every listed risk is assigned to a concrete task test.
- **Proportion:** The plan specifies interfaces and expected behavior without duplicating implementation bodies.
