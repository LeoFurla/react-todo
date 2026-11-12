#!/usr/bin/env bash
# Nightly dump of the react-todo Postgres database (run from cron).
# Backups land in /DATA/AppData/backups/react-todo, 14-day retention.
set -euo pipefail   # a mid-stream pg_dump failure must not yield a truncated .gz

BACKUP_DIR=/DATA/AppData/backups/react-todo
STAMP=$(date +%F)
mkdir -p "$BACKUP_DIR"

# Dump through the running container so credentials come from its env,
# never from this script.
docker exec react-todo-db pg_dump -U todos -d todos | gzip > "$BACKUP_DIR/todos-$STAMP.sql.gz"

find "$BACKUP_DIR" -name 'todos-*.sql.gz' -mtime +14 -delete
