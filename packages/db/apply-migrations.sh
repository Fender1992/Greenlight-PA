#!/bin/bash
# Script to apply database migrations to Supabase
# Usage: ./apply-migrations.sh

echo "📦 Greenlight PA - Database Migration Tool"
echo "=========================================="
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL environment variable not set"
  echo ""
  echo "Set it with:"
  echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
  exit 1
fi

echo "🔍 Found migrations:"
ls -1 migrations/*.sql | sort

echo ""
read -p "Apply these migrations? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 0
fi

echo ""
echo "🚀 Applying migrations..."
echo ""

for migration in $(ls migrations/*.sql | sort); do
  echo "  📄 Applying: $migration"
  psql "$SUPABASE_DB_URL" -f "$migration"

  if [ $? -eq 0 ]; then
    echo "  ✅ Success"
  else
    echo "  ❌ Failed"
    exit 1
  fi
  echo ""
done

echo "✅ All migrations applied successfully!"
