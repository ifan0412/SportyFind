#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== SportyFind staging setup ==="
echo ""
echo "This script prepares files. You still need to:"
echo "  1) Create a second Supabase project (Dashboard → New project → name it e.g. sportyfind-staging)"
echo "  2) Paste supabase/staging-bootstrap.sql into that project's SQL Editor and Run"
echo "     (includes 000_legacy_base_schema.sql after profiles — fixes missing notifications etc.)"
echo "  3) Copy API keys into .env.staging.local"
echo "  4) Set Vercel Preview environment variables (see .env.staging.local.example)"
echo ""
echo "If bootstrap still fails, dump prod schema instead:"
echo "  export DATABASE_URL='postgresql://...' && npm run db:dump-prod-schema"
echo ""

if [ ! -f ".env.staging.local" ]; then
  cp .env.staging.local.example .env.staging.local
  echo "Created .env.staging.local from example — edit it with staging keys."
else
  echo ".env.staging.local already exists."
fi

echo ""
echo "Combining migrations..."
node scripts/combine-migrations.mjs

echo ""
echo "Next steps:"
echo "  • Open supabase/staging-bootstrap.sql in Supabase SQL Editor (staging project) and Run"
echo "  • Edit .env.staging.local with staging URL + anon key (+ service role if needed)"
echo "  • Local: npm run dev:staging"
echo "  • Vercel: Project → Settings → Environment Variables → add vars for Preview only"
echo "  • Supabase Auth → URL config: add https://*.vercel.app/auth/callback"
echo "  • Google OAuth: add STAGING Supabase callback in Google Cloud Console:"
echo "      https://<staging-project-ref>.supabase.co/auth/v1/callback"
echo "    Enable Google provider on STAGING Supabase (Authentication → Providers)"
echo ""
