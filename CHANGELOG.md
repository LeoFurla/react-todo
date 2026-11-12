# Changelog

All notable changes to react-todo are documented here.

> Releases before 2.0.0 are not documented individually - the git history was squashed into an initial commit.

## [3.0.0] - 2026-11-12

Security and hardening release following the v2.2.0 project analysis. One breaking change: all existing sessions are invalidated — every user must log in once.

### Added
- Rate limiting: login max 10/min, register max 5/10 min (`@fastify/rate-limit`)
- Registration gate: sign-ups only while `ALLOW_REGISTRATION=true`; the very first account can always be created
- Shared account rules: username 2–30 chars `[A-Za-z0-9._]`, password 8–72 bytes — enforced identically by register, rename and password change
- Todo field limits: title ≤ 200 chars, description ≤ 10 000 chars
- Security headers via `@fastify/helmet` (CSP, nosniff, frame protection, referrer policy)
- Nightly database backup: `scripts/backup.sh` (pg_dump, 14-day retention), cron 03:30, dumps in `/DATA/AppData/backups/react-todo`
- API test suite: `npm test` (node --test, cross-user ownership rules; skips when `DATABASE_URL` is not set)

### Changed (breaking)
- Session tokens are stored as SHA-256 hashes; the raw token only lives in the cookie — pre-existing sessions stop working, log in once
- Multi-stage Dockerfile on Node 22, unprivileged `node` runtime user; the frontend is baked into the image, so frontend changes now require `docker compose build && docker compose up -d`

### Fixed
- `PATCH /api/todos/:id` is atomic: tags are validated before writing, row update and tag replacement run in one transaction
- Login timing no longer reveals whether a username exists (dummy-hash compare for unknown users)
- A failed `/api/me` (e.g. network error) no longer kicks a valid session to the login page; only a 401 does
- Unknown `/api/...` paths return a JSON 404 instead of the SPA index page
- README: corrected API table (PATCH not PUT, missing tags/profile/avatar endpoints), deployment steps and env vars

## [2.2.0] - 2026-11-11

### Added
- Board topbar: round avatar button (uploaded avatar or first-letter placeholder) that opens the profile page, plus a logout icon button. On mobile the avatar sits on the title line; search and active tags move to the lines below.
- Profile page: new **Tags** card listing the user's tags with a **Manage** button that opens the tag manager (add/rename/delete).
- `GET /api/tags` endpoint returning the user's tag list.

### Changed
- `"Manage tags"`, username, `"Profile"` and `"Log out"` text buttons removed from the board topbar.
- `avatar` field added to the `/api/me`, `/api/login` and `/api/register` responses so the board can render the avatar without an extra request.
- The board re-reads the user (avatar, username) when returning from the profile page, so profile changes show up immediately.

## [2.1.1] - 2026-11-11

### Fixed
- Mobile: touching a card and swiping started a drag instead of scrolling the page. Cards no longer use `touch-action: none`, so native touch scrolling works again.
- Mobile: dragging now activates by **holding a card for 250 ms** (finger within 8 px); quick swipes scroll instead of dragging, and taps still open the edit modal.
- Mobile: once a drag was active, moving the finger immediately cancelled it (the browser's native pan gesture took over via `pointercancel`). The `TouchSensor` now suppresses `touchmove` while dragging, so the gesture stays with the app.
- Desktop: mouse drag activates instantly on click-move (4 px), as before - no hold required.

### Changed
- Drag & drop sensors replaced with `MouseSensor` + `TouchSensor`; the dragged card fades to 40% opacity and the drag preview animates in (fade + scale).

## [2.1.0] - 2026-10-18

### Added
- Profile page (`/profile`): change username, change password (current password required, minimum 8 characters), and upload a profile avatar (JPEG/PNG/WebP/GIF, max 5 MB).
- Avatars are stored server-side under cryptographically random filenames in a dedicated `avatars` Docker volume (`/avatars`) and served by an authenticated, content-type-whitelisted endpoint.

### Security
- Password change invalidates all other sessions of the user (the current device stays logged in).
- Avatar uploads are validated by magic bytes (not just the client-sent mimetype) and are rejected when content does not match the declared image type.
- Avatar delivery requires a session and sends `cache-control: private`.
- Migrated all `bcryptjs` calls from blocking `*Sync` variants to the async API (login, register, password change).
- Old avatar files are deleted only after the database update succeeds, so a failed update can never leave a user with a missing avatar.

## [2.0.1] - 2026-10-18

### Added
- `CHANGELOG.md` with versioning discipline (semver in `package.json`, dated English entries).

### Changed
- Package name corrected from `react-app` to `react-todo` (metadata only).

## [2.0.0] - 2026-10-18

### Added
- Multi-user todo board: three status columns (Planned / Started / Completed) with drag & drop within and across columns and manual reordering.
- Todos with title, description and due date; create, edit (modal) and delete.
- Per-user tag manager; multiple tags assignable per todo.
- Accounts: register / login / logout with bcrypt-hashed passwords and server-side cookie session tokens (expiry + automatic cleanup).
- Multi-user scoping: every todo, tag and session belongs to its user.
- Idempotent schema applied on every boot (`server/schema.sql`), mirrored by the Drizzle schema for typed queries.
- Mobile-responsive UI (used from a phone over Tailscale).
- README: tech stack, features, API reference, usage.
