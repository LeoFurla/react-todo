# Changelog

All notable changes to react-todo are documented here.

> Releases before 2.0.0 are not documented individually - the git history was squashed into an initial commit.

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
