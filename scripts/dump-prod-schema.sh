#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL to your PRODUCTION Supabase Postgres connection string."
  echo ""
  echo "Supabase Dashboard → Project Settings → Database → Connection string (URI)"
  echo "Use the *direct* connection (port 5432), not the pooler, for pg_dump."
  echo ""
  echo "Example:"
  echo '  export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"'
  echo "  npm run db:dump-prod-schema"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools (brew install libpq)."
  exit 1
fi

OUT="supabase/legacy-base-schema.sql"
echo "Dumping production schema (no data) → $OUT"

pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --exclude-table-data='*' \
  > "$OUT"

echo "Done. For staging:"
echo "  1) Run $OUT in the NEW staging project's SQL Editor"
echo "  2) Then run only migrations newer than production (not the full bootstrap)"
echo ""
echo "Or regenerate bootstrap after reviewing: npm run db:combine-migrations"
