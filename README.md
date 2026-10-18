# react-todo

A self-hosted, multi-user todo board with drag & drop, tags, due dates and per-user sessions. No frontend build step in production — the Fastify server serves the prebuilt Vite bundle from `dist/`.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, dnd-kit (drag & drop) |
| Backend | Node 20, Fastify 5, `@fastify/cookie` |
| ORM / DB | Drizzle ORM 0.36 + PostgreSQL 16 (`pg`) |
| Auth | bcrypt password hashes, cookie session tokens (no JWT) |
| Deploy | Docker (Compose), `node:20-alpine` + `postgres:16-alpine` |

## Features

- **Board view** — three status columns (Planned / Started / Completed), drag & drop within and across columns, manual reordering (`/api/reorder`)
- **Todos** — title, description, due date; create, edit (modal), delete
- **Tags** — per-user tag manager; assign multiple tags per todo
- **Accounts** — register / login / logout, bcrypt-hashed passwords, server-side session tokens with expiry and automatic cleanup
- **Multi-user** — every todo, tag and session is scoped to its user
- **Schema** — idempotent `server/schema.sql` applied on every boot (extend it to evolve the schema); Drizzle `schema.js` mirrors it for typed queries
- Mobile-responsive (used from a phone over Tailscale)

## Project layout

```
src/            React frontend (pages/, components/board/, lib/)
server/         Fastify backend (routes/auth|todos|tags, db.js, schema.js, schema.sql)
public build -> dist/   Vite output, served by the server (see server/static.js)
compose.yml     App + Postgres, on the external "ai" docker network
.env.example    Required env vars (copy to .env)
```

## Getting started

1. Copy the env template and set a real DB password:
   ```sh
   cp .env.example .env
   ```
   Both `POSTGRES_PASSWORD` and `DATABASE_URL` must match; `DATABASE_URL` points at the compose service name `react-todo-db`.
2. Build the frontend (in a container — the host has no npm toolchain):
   ```sh
   docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -c "npm install && npm run build"
   ```
3. Start the stack (requires the external `ai` docker network):
   ```sh
   docker compose up -d
   ```
4. Open <http://localhost:8092> and register an account.

The server reads `dist/` from disk per request — after a rebuild, refresh the browser, no container restart needed.

## Development

```sh
docker compose up -d react-todo-db   # database only
npm run dev                          # Vite dev server on :5173, proxies /api -> :8092
node server/index.js                 # API on :8092 (needs DATABASE_URL)
```

## API (all JSON, cookie auth)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | create account `{username, password}` |
| POST | `/api/login` | login, sets session cookie |
| POST | `/api/logout` | invalidate session |
| GET | `/api/me` | current user |
| GET | `/api/board` | todos + tags for the current user |
| POST | `/api/todos` | create `{title, description, status, tagIds, dueDate}` |
| PUT | `/api/todos/:id` | update (same fields) |
| DELETE | `/api/todos/:id` | delete |
| POST | `/api/reorder` | persist drag & drop order |
| POST | `/api/tags` | create tag `{name}` |
| DELETE | `/api/tags/:id` | delete tag |

## Notes

- `.env` is gitignored and contains a live DB password — never commit it.
- Data lives in the named volume `react-todo_pgdata`.
