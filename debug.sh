#!/bin/bash
echo "=== Estado de contenedores ==="
docker compose ps

echo ""
echo "=== Logs del backend (últimas 40 líneas) ==="
docker compose logs backend --tail=40

echo ""
echo "=== Logs de la DB (últimas 20 líneas) ==="
docker compose logs db --tail=20

echo ""
echo "=== Test de conexión backend ==="
docker compose exec backend wget -qO- http://localhost:5000/health 2>&1 || echo "Backend no responde"

echo ""
echo "=== Variables de entorno del backend ==="
docker compose exec backend env | grep -E "DATABASE|FLASK|SECRET" | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'
