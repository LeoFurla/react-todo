# Changelog

All notable changes to react-todo are documented here.

> Releases before 2.0.0 are not documented individually - the git history was squashed into an initial commit.

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
