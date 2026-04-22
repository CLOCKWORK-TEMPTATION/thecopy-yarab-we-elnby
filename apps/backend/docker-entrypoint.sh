#!/bin/sh
set -e

should_run_db_push=$(printf '%s' "${RUN_DB_PUSH_ON_START:-false}" | tr '[:upper:]' '[:lower:]')

if [ "$should_run_db_push" = "1" ] || [ "$should_run_db_push" = "true" ] || [ "$should_run_db_push" = "yes" ] || [ "$should_run_db_push" = "on" ]; then
  echo "Running database migrations..."
  if ! pnpm run db:push; then
    echo "Database migration failed!"
    exit 1
  fi
  echo "Migrations complete!"
else
  echo "Skipping automatic database migrations on startup"
fi

echo "Starting server..."
if [ $# -eq 0 ]; then
  echo "ERROR: No command specified to entrypoint."
  exit 1
fi
exec "$@"
