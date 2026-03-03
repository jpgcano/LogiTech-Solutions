#!/usr/bin/env bash
# start_docker.sh - quick way to launch Postgres, MongoDB and run the API container
# Usage: bash scripts/start_docker.sh

set -e

echo "Starting PostgreSQL container..."
docker run -d --name slogitech_v2 -e POSTGRES_PASSWORD=123456 -p 5439:5432 postgres:14

echo "Waiting for Postgres to initialize..."
sleep 10

echo "Starting MongoDB container..."
docker run -d --name mongo_logitech_v2 -p 27017:27017 mongo:latest

echo "Building application image..."
docker build -t logitech-api .

echo "Running migration inside a temporary app container..."
docker run --rm --name logitech_migrator \
  --network host \
  -e POSTGRES_URL=postgresql://postgres:123456@localhost:5439/postgres \
  -e MONGO_URL=mongodb://localhost:27017/logitech_v2 \
  -e FILE_DATA_CSV=data/AM-prueba-desempeno-data.csv \
  logitech-api node scripts/run_migration.js

echo "Starting API container (will stay running)..."
docker run --rm --name logitech_app \
  -p 3000:3000 \
  --network host \
  -e PORT=3000 \
  -e POSTGRES_URL=postgresql://postgres:123456@localhost:5439/postgres \
  -e MONGO_URL=mongodb://localhost:27017/logitech_v2 \
  logitech-api

# Note: using host networking simplifies access for demo; adjust for other environments
