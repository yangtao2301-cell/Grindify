#!/usr/bin/env bash
set -euo pipefail

access_file="${HOME}/.grindify-admin-access"
password_file='/etc/nginx/.htpasswd-grindify-admin'

if [[ -e "$access_file" ]] || sudo test -e "$password_file"; then
  echo 'Admin access credentials already exist; refusing to overwrite them.' >&2
  exit 1
fi

if ! command -v htpasswd >/dev/null 2>&1; then
  echo 'Install apache2-utils (htpasswd) before running this script.' >&2
  exit 1
fi

password="$(openssl rand -hex 24)"
printf '%s\n' "$password" | sudo htpasswd -iB -c "$password_file" admin >/dev/null
sudo chown root:www-data "$password_file"
sudo chmod 640 "$password_file"

umask 077
set -C
printf 'Username: admin\nPassword: %s\n' "$password" > "$access_file"
echo "Created Nginx admin credentials. Read ${access_file} privately via SSH, then remove it after saving the password."
