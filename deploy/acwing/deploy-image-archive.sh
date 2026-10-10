#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 IMAGE_TAG IMAGE_ARCHIVE.tar" >&2
  exit 2
fi

tag=$1
archive=$(realpath "$2")
if [[ ! $tag =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "Image tag must be a 7–40 character commit SHA: $tag" >&2
  exit 2
fi
if [[ ! -f $archive || ! -f $archive.sha256 ]]; then
  echo "The image archive and its .sha256 file are required." >&2
  exit 2
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "$script_dir/../.." && pwd)
cd "$repo_dir"
if [[ ! -f .env || ! -f docker-compose.images.yml ]]; then
  echo "Run this script from a checkout with .env and docker-compose.images.yml." >&2
  exit 2
fi

(cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256")
docker load -i "$archive"

image_namespace=${GRINDIFY_IMAGE_NAMESPACE:-ghcr.io/yangtao2301-cell}
for image in grindify-api grindify-frontend grindify-adminpanel; do
  docker image inspect "$image_namespace/$image:$tag" >/dev/null
done

mkdir -p .deploy
chmod 700 .deploy
candidate=$(mktemp "$repo_dir/.deploy/release.env.XXXXXXXX")
trap 'rm -f -- "$candidate"' EXIT
printf 'GRINDIFY_IMAGE_NAMESPACE=%s\nGRINDIFY_IMAGE_TAG=%s\n' "$image_namespace" "$tag" > "$candidate"
chmod 600 "$candidate"

compose=(docker compose --env-file .env --env-file "$candidate" -f docker-compose.images.yml)
"${compose[@]}" config --quiet

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$HOME/grindify-backups"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
db_backup="$backup_dir/postgres-before-$tag-$stamp.dump"
uploads_backup="$backup_dir/uploads-before-$tag-$stamp.tar.gz"
docker exec grindify_postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$db_backup"
test -s "$db_backup"
docker cp grindify_backend:/app/uploads - | gzip > "$uploads_backup"
test -s "$uploads_backup"
chmod 600 "$db_backup" "$uploads_backup"
echo "Backups: $db_backup and $uploads_backup"

# Apply the database image declared by this release before starting an API that
# may run migrations requiring extensions provided by that image.
if ! "${compose[@]}" up -d --no-deps --no-build --pull missing --wait --wait-timeout 120 postgres; then
  echo "PostgreSQL did not become healthy. Backups and previous application images are retained." >&2
  exit 1
fi

rollback_images() {
  echo "Restoring the previous application images..." >&2
  if [[ -f .deploy/release.env ]]; then
    docker compose --env-file .env --env-file .deploy/release.env -f docker-compose.images.yml \
      up -d --no-deps --no-build --pull never backend frontend adminpanel || true
  else
    docker compose -f docker-compose.prod.yml \
      up -d --no-deps --no-build --pull never backend frontend adminpanel || true
  fi
}

for service in backend frontend adminpanel; do
  echo "Updating $service..."
  if ! "${compose[@]}" up -d --no-deps --no-build --pull never "$service"; then
    echo "Compose update failed for $service; the backups and previous images are retained." >&2
    rollback_images
    exit 1
  fi
  case "$service" in
    backend) check_url=http://127.0.0.1:1337/v1/auth/health ;;
    frontend) check_url=http://127.0.0.1:3000/version.json ;;
    adminpanel) check_url=http://127.0.0.1:3001/admin/ ;;
  esac
  ready=false
  for attempt in {1..30}; do
    if curl -fsS --max-time 3 "$check_url" >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done
  if [[ $ready != true ]]; then
    echo "$service did not become ready; restoring previous application images." >&2
    rollback_images
    exit 1
  fi
done

healthy=false
for attempt in {1..30}; do
  if curl -fsS --max-time 3 http://127.0.0.1:1337/v1/auth/health >/dev/null 2>&1 \
    && curl -fsS --max-time 3 http://127.0.0.1:3000/version.json 2>/dev/null | grep -q "$tag" \
    && curl -fsS --max-time 3 http://127.0.0.1:3001/admin/ >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done
if [[ $healthy != true ]]; then
  echo "The new containers did not pass health checks. Backups and previous images are retained." >&2
  if ! curl -fsS --max-time 3 http://127.0.0.1:1337/v1/auth/health >/dev/null 2>&1; then
    echo "Failed check: backend API health endpoint." >&2
  fi
  if ! curl -fsS --max-time 3 http://127.0.0.1:3000/version.json 2>/dev/null | grep -q "$tag"; then
    echo "Failed check: frontend version does not match $tag." >&2
  fi
  if ! curl -fsS --max-time 3 http://127.0.0.1:3001/admin/ >/dev/null 2>&1; then
    echo "Failed check: admin panel endpoint." >&2
  fi
  rollback_images
  exit 1
fi

mv -f -- "$candidate" .deploy/release.env
trap - EXIT
docker compose --env-file .env --env-file .deploy/release.env -f docker-compose.images.yml ps
echo "Deployed image tag: $tag"
