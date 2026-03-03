#!/usr/bin/env bash
# start_stack.sh - El lanzador inteligente

set -e

# --- CONFIGURACIÓN DE PUERTOS DESEADOS ---
PG_PORT=5432
MONGO_PORT=27017
API_PORT=3000
WEB_PORT=8080

# Función para encontrar un puerto libre
find_free_port() {
    local port=$1
    while lsof -i :$port >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

echo "--- Verificando conflictos de puertos ---"
NEW_PG_PORT=$(find_free_port $PG_PORT)
NEW_MONGO_PORT=$(find_free_port $MONGO_PORT)
NEW_API_PORT=$(find_free_port $API_PORT)
NEW_WEB_PORT=$(find_free_port $WEB_PORT)

if [ "$NEW_PG_PORT" != "$PG_PORT" ]; then echo "[!] Puerto $PG_PORT ocupado, usando $NEW_PG_PORT"; fi

# --- GESTIÓN DE CONTENEDORES ---
manage_container() {
    local name=$1
    local image=$2
    
    if [ "$(docker ps -aq -f name=^/${name}$)" ]; then
        if [ "$(docker ps -q -f name=^/${name}$)" ]; then
            echo "[info] Contenedor $name ya está corriendo. Utilizándolo."
        else
            echo "[info] Contenedor $name existe pero está apagado. Prendiendo..."
            docker start $name
        fi
    else
        echo "[info] Contenedor $name no existe. Se creará con docker-compose."
    fi
}

# Verificamos los pilares
manage_container "logitech_postgres" "postgres:15"
manage_container "logitech_mongo" "mongo:latest"

# --- LANZAMIENTO CON DOCKER COMPOSE ---
# Exportamos las variables para que docker-compose las use
export PG_HOST_PORT=$NEW_PG_PORT
export MONGO_HOST_PORT=$NEW_MONGO_PORT
export API_HOST_PORT=$NEW_API_PORT
export WEB_HOST_PORT=$NEW_WEB_PORT

echo "--- Lanzando stack con Docker Compose ---"
docker compose up -d --build

echo "------------------------------------------------"
echo "Stack listo:"
echo "Frontend: http://localhost:$NEW_WEB_PORT"
echo "API:      http://localhost:$NEW_API_PORT"
echo "Postgres: Puerto $NEW_PG_PORT"
echo "------------------------------------------------"