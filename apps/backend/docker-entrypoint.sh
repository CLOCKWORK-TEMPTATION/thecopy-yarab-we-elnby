#!/bin/sh
set -e

if [ -n "${RUN_DB_MIGRATE_ON_START:-}" ]; then
  should_run_db_migrate=$(printf '%s' "$RUN_DB_MIGRATE_ON_START" | tr '[:upper:]' '[:lower:]')
elif [ -n "${RUN_DB_PUSH_ON_START:-}" ]; then
  should_run_db_migrate=$(printf '%s' "$RUN_DB_PUSH_ON_START" | tr '[:upper:]' '[:lower:]')
elif [ "${NODE_ENV:-}" = "production" ]; then
  should_run_db_migrate=true
else
  should_run_db_migrate=false
fi

if [ "$should_run_db_migrate" = "1" ] || [ "$should_run_db_migrate" = "true" ] || [ "$should_run_db_migrate" = "yes" ] || [ "$should_run_db_migrate" = "on" ]; then
  echo "Waiting for database readiness..."
  node scripts/wait-for-database.mjs
  echo "Running database migrations..."
  if ! pnpm run db:migrate; then
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
