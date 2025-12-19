#!/bin/bash
set -euo pipefail

# Expects DEPLOY_ENV to be set
DEPLOY_ENV="${DEPLOY_ENV:-dev}"
COMPOSE_FILE="docker-compose.yml"
if [ "$DEPLOY_ENV" = "prod" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
fi

echo "Running health checks for environment: $DEPLOY_ENV"
echo "Using compose file: $COMPOSE_FILE"

cd ~

# Ensure .env exists
if [ ! -f .env ]; then
    echo "CRITICAL: .env file not found!" >&2
    exit 1
fi

# Load POSTGRES_PASSWORD from .env for the check
# We can source it or grep it. Sourcing is easier but might have side effects if not careful.
# Let's grep it to be safe and avoid overwriting current shell vars unexpectedly.
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2- | tr -d '"')

# Determine database name based on environment
DB_NAME="gamernexus"
if [ "$DEPLOY_ENV" = "prod" ]; then
  DB_NAME="gamernexus-prod"
fi

# Wait for db to be accepting connections and authenticated
echo "Waiting for db readiness (database: $DB_NAME)..."
for i in $(seq 1 30); do
  # Check connectivity AND authentication using psql
  if docker compose --env-file .env -f "$COMPOSE_FILE" exec -T \
      -e PGPASSWORD="$POSTGRES_PASSWORD" \
      db psql -U postgres -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
    echo "db is ready and authenticated"
    break
  fi
  
  if [ "$i" -eq 30 ]; then
    echo "CRITICAL: db did not become ready or authentication failed" >&2
    docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=200 db || true
    exit 1
  fi
  sleep 2
done
echo "DB check passed."

echo "Verifying services are running..."
RUNNING_SERVICES="$(docker compose --env-file .env -f "$COMPOSE_FILE" ps --services --filter status=running || true)"
for svc in backend frontend db; do
  if ! printf '%s\n' "$RUNNING_SERVICES" | grep -qx "$svc"; then
    echo "CRITICAL: $svc is not running" >&2
    docker compose --env-file .env -f "$COMPOSE_FILE" ps -a || true
    docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=200 "$svc" || true
    exit 1
  fi
done

echo "HTTP checks (from inside backend container)..."
docker compose --env-file .env -f "$COMPOSE_FILE" exec -T backend python - << 'PY'
import sys
import urllib.request


def check(url: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "healthcheck"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            code = getattr(resp, "status", resp.getcode())
            if code < 200 or code >= 400:
                raise RuntimeError(f"HTTP {code}")
    except Exception as e:
        raise RuntimeError(f"Healthcheck failed for {url}: {e}")


check("http://localhost:5000/api/minmax/games")
check("http://frontend/")
print("HTTP checks OK")
PY

echo "Waiting 30s for container stabilization..."
sleep 30

echo "Verifying services are still healthy..."
STABLE_SERVICES="$(docker compose --env-file .env -f "$COMPOSE_FILE" ps --services --filter status=running || true)"
for svc in backend frontend db; do
  if ! printf '%s\n' "$STABLE_SERVICES" | grep -qx "$svc"; then
    echo "CRITICAL: $svc crashed after startup" >&2
    docker compose --env-file .env -f "$COMPOSE_FILE" logs --tail=100 "$svc" || true
    exit 1
  fi
done

echo "Health checks successful."
