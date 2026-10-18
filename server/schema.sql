CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     username TEXT NOT NULL UNIQUE,
                                     password_hash TEXT NOT NULL,
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS sessions (
                                        token TEXT PRIMARY KEY,
                                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
    );

CREATE TABLE IF NOT EXISTS tags (
                                    id SERIAL PRIMARY KEY,
                                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE (user_id, name)
    );

CREATE TABLE IF NOT EXISTS todos (
                                     id SERIAL PRIMARY KEY,
                                     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'started', 'completed')),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS todo_tags (
                                         todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
    );

ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);