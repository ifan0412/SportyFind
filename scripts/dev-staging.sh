#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.staging.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Copy .env.staging.local.example → .env.staging.local and fill in your staging Supabase keys."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

export NEXT_PUBLIC_APP_ENV="${NEXT_PUBLIC_APP_ENV:-staging}"

echo "Starting Next.js with staging env (NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV)"
exec npm run dev -- "$@"
