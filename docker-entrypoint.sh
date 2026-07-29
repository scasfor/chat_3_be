#!/bin/sh
set -e

echo "Ensuring SQL Server database exists..."
npx tsx scripts/ensure-sqlserver-db.ts

echo "Applying Prisma migrations..."
npx prisma migrate deploy

exec "$@"
