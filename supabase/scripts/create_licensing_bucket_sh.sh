#!/usr/bin/env bash
# POSIX shell script to create a 'licensing' bucket in Supabase Storage
# Requires: supabase CLI v1+ or SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL environment variables
# Usage: ./create_licensing_bucket_sh.sh [public]

if command -v supabase >/dev/null 2>&1; then
  if [ "$1" = "public" ]; then
    supabase storage create licensing --public || true
  else
    supabase storage create licensing || true
  fi
  echo "Attempted creation via supabase CLI (may be no-op depending on CLI version)."
  exit 0
fi

# Fallback to REST API
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$SUPABASE_URL" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL must be set for REST fallback" >&2
  exit 1
fi

PUBLIC=false
if [ "$1" = "public" ]; then PUBLIC=true; fi

curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "apiKey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{ \"id\": \"licensing\", \"public\": $PUBLIC }" | jq || true

echo "Done."
