# Games Platform Design

**Date:** 2026-10-18  
**Status:** Approved architecture; awaiting written-spec review  
**Scope:** `/games` only. Existing dashboard shell, Marketplace, MediaWorld, and OTT behavior remain unchanged.

## Goal

Replace the authenticated `/games` placeholder with a TwingFace-native games catalog. Members can discover games by search and genre, then play an approved game in an on-page responsive iframe modal. Administrators manage the catalog through protected API endpoints.

## Security and game sources

Only trusted game origins may be saved or rendered. Production accepts `https://games.twingface.com` and its HTTPS subdomains. Development additionally permits `http://localhost` and `http://127.0.0.1` so locally hosted games can be tested.

The shared URL validator will reject malformed URLs, non-HTTP(S) protocols, credentials in URLs, and origins outside the allowlist. The API validates both thumbnail and play URLs before persistence. The modal receives only the validated `playUrl`; it uses a restrictive iframe policy and an accessible close control.

## Data model

Add a Prisma `Game` model and `GameGenre` enum.

- `id`, `title`, `slug` (unique), `description`
- `genre`, `thumbnailUrl`, `playUrl`
- `isFeatured`, `isActive`
- `rating` (default 0), `playCount` (default 0)
- `createdAt`, `updatedAt`, `createdById`

Indexes support active catalog retrieval by genre/featured status and newest entries. `createdById` relates to the existing `User` model. A seed is not required; the catalog shows a deliberate empty state until an administrator adds games.

## API

### Public authenticated catalog

`GET /api/games?query=&genre=&featured=` returns active games only. It supports a bounded search term and genre filter and returns safe game fields.

`POST /api/games/:id/play` verifies the game is active, increments `playCount`, and returns its safe playable record. This prevents a stale client from playing an inactive game.

### Administrator management

`POST /api/admin/games` creates a game.

`PATCH /api/admin/games/:id` edits a game, including active/featured state.

`DELETE /api/admin/games/:id` removes a game.

All administrator routes require the existing authenticated user plus the project’s administrator authorization guard. If no administrator role/guard exists yet, this is an explicit prerequisite: the endpoints must fail closed (403) rather than infer admin access from client input.

## `/games` UI

The page keeps `DashboardNavbar` and uses the dashboard layout rather than a standalone full-screen page.

Within the right-side application content it provides:

1. A Games sub-sidebar: All Games, Recently Played, Favorites, Leaderboard, genre toggles, and a weekly tournament promotion.
2. A featured game hero card with a Play Now action.
3. Search and horizontal genre chips that filter the loaded catalog without navigation.
4. A responsive 3–4 column game card grid. Each card shows the thumbnail, genre, title, rating/play count, and Play Game.
5. A same-page game modal that starts the verified game in an iframe. Inactive, missing, or blocked games show an inline error rather than an unsafe navigation.

The module uses dark gaming/cinema styling scoped with `.games-*` selectors and responsive breakpoints. The main app sidebar and top navbar are not changed.

## Client data flow

`GamesWorkspace` loads `GET /api/games` on entry and re-fetches when query or selected genre changes (with request cancellation for stale results). Choosing Play calls `POST /api/games/:id/play`; on success it opens the modal with the server-returned record. API failures, empty results, and modal failures each have visible recovery states.

Favorites, recently played, and leaderboard are navigation-ready UI states in this iteration. Persisting per-user favorite/history records is out of scope until the product defines retention and privacy requirements. The leaderboard card is promotional rather than a fabricated ranking.

## Testing and verification

- Unit-test trusted URL validation, including rejected protocols/origins.
- Route-test catalog filtering, inactive-game exclusion, play increment, and unauthorized admin mutations.
- Add a UI contract test for app-shell composition, navigation, filters, cards, and modal.
- Run Prisma validation/migration generation, ESLint, the focused tests, the full test suite, and a live `/games` browser inspection.

## Explicit exclusions

- No changes to Marketplace, MediaWorld, OTT, or global navigation styles.
- No external provider catalog or third-party authentication.
- No payment, tournament scoring, multiplayer state, favorites persistence, or synthetic rankings in this iteration.
