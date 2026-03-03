#!/usr/bin/env bash
# start_stack.sh - Levanta o reutiliza todo el stack con un solo comando.

set -euo pipefail

NETWORK_NAME="logitech_network"
POSTGRES_CONTAINER="logitech_postgres"
MONGO_CONTAINER="logitech_mongo"
API_CONTAINER="logitech_api"
WEB_CONTAINER="logitech_web"

POSTGRES_IMAGE="postgres:15"
MONGO_IMAGE="mongo:latest"
API_IMAGE="logitech_api:local"
WEB_IMAGE="logitech_web:local"

POSTGRES_PORT="${PG_HOST_PORT:-5432}"
MONGO_PORT="${MONGO_HOST_PORT:-27017}"
API_PORT="${API_HOST_PORT:-3000}"
WEB_PORT="${WEB_HOST_PORT:-8080}"
DB_PASSWORD="${DB_PASSWORD:-123456}"

command -v docker >/dev/null 2>&1 || {
  echo "[error] Docker no está instalado o no está en PATH."
  exit 1
}

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "[info] Creando red Docker: $NETWORK_NAME"
    docker network create "$NETWORK_NAME" >/dev/null
  fi
}

ensure_network_connection() {
  local container="$1"

  if ! docker inspect -f '{{json .NetworkSettings.Networks}}' "$container" | grep -q "\"$NETWORK_NAME\""; then
    echo "[info] Conectando $container a la red $NETWORK_NAME"
    docker network connect "$NETWORK_NAME" "$container" >/dev/null
  fi
}

ensure_container_started() {
  local container="$1"

  if [ "$(docker inspect -f '{{.State.Running}}' "$container")" != "true" ]; then
    echo "[info] Prendiendo contenedor existente: $container"
    docker start "$container" >/dev/null
  else
    echo "[info] Contenedor ya encendido: $container"
  fi

  ensure_network_connection "$container"
}

run_or_start_postgres() {
  if docker ps -aq --filter "name=^/${POSTGRES_CONTAINER}$" | grep -q .; then
    ensure_container_started "$POSTGRES_CONTAINER"
    return
  fi

  echo "[info] Creando contenedor PostgreSQL"
  docker run -d \
    --name "$POSTGRES_CONTAINER" \
    --network "$NETWORK_NAME" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -p "$POSTGRES_PORT:5432" \
    "$POSTGRES_IMAGE" >/dev/null
}

run_or_start_mongo() {
  if docker ps -aq --filter "name=^/${MONGO_CONTAINER}$" | grep -q .; then
    ensure_container_started "$MONGO_CONTAINER"
    return
  fi

  echo "[info] Creando contenedor MongoDB"
  docker run -d \
    --name "$MONGO_CONTAINER" \
    --network "$NETWORK_NAME" \
    -p "$MONGO_PORT:27017" \
    "$MONGO_IMAGE" >/dev/null
}

run_or_start_api() {
  if docker ps -aq --filter "name=^/${API_CONTAINER}$" | grep -q .; then
    ensure_container_started "$API_CONTAINER"
    return
  fi

  echo "[info] Construyendo imagen API"
  docker build -t "$API_IMAGE" ./api >/dev/null

  echo "[info] Creando contenedor API"
  docker run -d \
    --name "$API_CONTAINER" \
    --network "$NETWORK_NAME" \
    -e POSTGRES_URL="postgresql://postgres:${DB_PASSWORD}@${POSTGRES_CONTAINER}:5432/postgres" \
    -e MONGO_URL="mongodb://${MONGO_CONTAINER}:27017/megastore" \
    -p "$API_PORT:3000" \
    "$API_IMAGE" >/dev/null
}

run_or_start_web() {
  if docker ps -aq --filter "name=^/${WEB_CONTAINER}$" | grep -q .; then
    ensure_container_started "$WEB_CONTAINER"
    return
  fi

  echo "[info] Construyendo imagen Frontend"
  docker build -t "$WEB_IMAGE" ./client >/dev/null

  echo "[info] Creando contenedor Frontend"
  docker run -d \
    --name "$WEB_CONTAINER" \
    --network "$NETWORK_NAME" \
    -p "$WEB_PORT:80" \
    "$WEB_IMAGE" >/dev/null
}

echo "[info] Iniciando stack LogiTech..."
ensure_network
run_or_start_postgres
run_or_start_mongo
run_or_start_api
run_or_start_web

echo ""
echo "✅ Stack listo"
echo "- Frontend: http://localhost:${WEB_PORT}"
echo "- API:      http://localhost:${API_PORT}/api/health"
echo "- Postgres: localhost:${POSTGRES_PORT}"
echo "- MongoDB:  localhost:${MONGO_PORT}"
echo ""
echo "Sugerencia: para ver logs de la API -> docker logs -f ${API_CONTAINER}"
