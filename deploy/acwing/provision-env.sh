#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
if [[ -e .env ]]; then
  echo 'Existing .env found; refusing to overwrite it.' >&2
  exit 1
fi

umask 077
cp .env.example .env
db_password="$(openssl rand -hex 32)"
jwt_secret="$(openssl rand -hex 48)"
origin='https://app7592.acapp.acwing.com.cn'

sed -i \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${db_password}|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" \
  -e "s|^VITE_API_URL=.*|VITE_API_URL=${origin}/v1|" \
  -e "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=${origin}|" \
  -e "s|^BACKEND_URL=.*|BACKEND_URL=${origin}|" \
  -e "s|^FRONTEND_URL=.*|FRONTEND_URL=${origin}|" \
  -e 's|^AUTH_COOKIE_DOMAIN=.*|AUTH_COOKIE_DOMAIN=|' \
  -e 's|^AUTH_COOKIE_SECURE=.*|AUTH_COOKIE_SECURE=true|' \
  -e 's|^VITE_CONTACT_EMAIL=.*|VITE_CONTACT_EMAIL=3405351711@qq.com|' \
  -e 's|^VITE_OPERATOR_NAME=.*|VITE_OPERATOR_NAME=Yang|' \
  -e 's|^VITE_OPERATOR_ADDRESS=.*|VITE_OPERATOR_ADDRESS=天津科技大学|' \
  -e 's|^VITE_OPERATOR_CITY=.*|VITE_OPERATOR_CITY=天津|' \
  -e 's|^VITE_OPERATOR_COUNTRY=.*|VITE_OPERATOR_COUNTRY=中国|' \
  -e 's|^VITE_OPERATOR_PHONE=.*|VITE_OPERATOR_PHONE=+86 18340012138|' \
  -e 's|^RESEND_API_KEY=.*|RESEND_API_KEY=|' \
  -e 's|^EMAIL_FROM=.*|EMAIL_FROM=|' \
  .env

echo 'Created private .env with random database and JWT secrets.'
