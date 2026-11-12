# react-todo

A self-hosted, multi-user todo board with drag & drop, tags, due dates and per-user sessions. The Fastify server serves the prebuilt Vite bundle from `dist/`, which is baked into the Docker image at build time.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, dnd-kit (drag & drop) |
| Backend | Node 22, Fastify 5, `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit` |
| ORM / DB | Drizzle ORM 0.36 + PostgreSQL 16 (`pg`) |
| Auth | bcryptjs password hashes, cookie session tokens stored hashed (no JWT) |
| Deploy | Docker (Compose), multi-stage `node:22-alpine` + `postgres:16-alpine` |

## Features

- **Board view** — three status columns (Planned / Started / Completed), drag & drop within and across columns, manual reordering (`/api/reorder`)
- **Todos** — title, description, due date; create, edit (modal), delete
- **Tags** — per-user tag manager; assign multiple tags per todo
- **Accounts** — register / login / logout, bcrypt-hashed passwords, server-side session tokens (stored as SHA-256 hashes) with expiry and cleanup
- **Profile** — rename, password change, avatar upload (JPEG/PNG/WebP/GIF, magic-byte verified)
- **Multi-user** — every todo, tag and session is scoped to its user
- **Schema** — idempotent `server/schema.sql` applied on every boot (extend it to evolve the schema); Drizzle `schema.js` mirrors it for typed queries
- Mobile-responsive (used from a phone over Tailscale)

## Project layout

```
src/            React frontend (pages/, components/board/, lib/)
server/         Fastify backend (routes/auth|todos|tags|profile, db.js, schema.js, schema.sql)
test/           API tests (node --test, run against a scratch database)
scripts/        backup.sh — nightly pg_dump (installed in cron)
public build -> dist/   Vite output, baked into the image, served by the server
Dockerfile      Multi-stage build (frontend build + unprivileged runtime)
compose.yml     App + Postgres, on the external "ai" docker network
.env.example    Required env vars (copy to .env)
```

## Getting started

1. Copy the env template and set a real DB password:
   ```sh
   cp .env.example .env
   ```
   Both `POSTGRES_PASSWORD` and `DATABASE_URL` must match; `DATABASE_URL` points at the compose service name `react-todo-db`.
2. Start the stack (requires the external `ai` docker network):
   ```sh
   docker compose build && docker compose up -d
   ```
3. Open <http://localhost:8092> and register an account.

The frontend is compiled into the image — after frontend changes, rebuild with
`docker compose build && docker compose up -d`.

## Development

```sh
docker compose up -d react-todo-db   # database only
npm run dev                          # Vite dev server on :5173, proxies /api -> :8092
node server/index.js                 # API on :8092 (needs DATABASE_URL)
```

## API (all JSON, cookie auth)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | create account `{username, password}` — only while `ALLOW_REGISTRATION=true`, or for the very first account |
| POST | `/api/login` | login, sets session cookie (rate-limited) |
| POST | `/api/logout` | invalidate session |
| GET | `/api/me` | current user |
| GET | `/api/board` | todos + tags for the current user |
| POST | `/api/todos` | create `{title, description, status, tagIds, dueDate}` |
| PATCH | `/api/todos/:id` | update (same fields) |
| DELETE | `/api/todos/:id` | delete |
| POST | `/api/reorder` | persist drag & drop order |
| GET | `/api/tags` | list the current user's tags |
| POST | `/api/tags` | create tag `{name}` |
| PATCH | `/api/tags/:id` | rename tag `{name}` |
| DELETE | `/api/tags/:id` | delete tag |
| GET | `/api/profile` | current username + avatar |
| PATCH | `/api/profile/username` | change username `{username}` |
| POST | `/api/profile/password` | change password `{current, next}` |
| POST | `/api/profile/avatar` | upload avatar (multipart field `file`) |
| GET | `/avatars/:file` | serve an avatar image (login required) |

Limits: title ≤ 200 chars, description ≤ 10 000 chars, username 2–30 chars `[A-Za-z0-9._]`, password 8–72 bytes.

## Notes

- `.env` is gitignored and contains a live DB password — never commit it.
- Data lives in the named volume `react-todo_pgdata`; nightly dumps go to `/DATA/AppData/backups/react-todo` (`scripts/backup.sh`, 14-day retention).
- Upgrading from 2.x: the pre-existing `react-todo_avatars` volume is root-owned, and the app now runs unprivileged — chown it once so avatar uploads keep working:
  ```sh
  docker run --rm -v react-todo_avatars:/av alpine chown -R 1000:1000 /av
  ```
- API tests: point `DATABASE_URL` at a scratch Postgres, then `npm test`.
