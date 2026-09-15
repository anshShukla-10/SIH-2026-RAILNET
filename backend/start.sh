#!/bin/sh
set -e

echo "Ensuring Prisma Client Python is generated..."
python -m prisma generate --schema=./prisma/schema.prisma || prisma generate --schema=./prisma/schema.prisma

echo "Starting Uvicorn application server on port ${PORT:-8000}..."
exec python -m uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
