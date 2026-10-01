# AcWing deployment for Grindify

Host: `app7592.acapp.acwing.com.cn`  
Server public IP: `39.102.99.126` (Ubuntu 24.04)

1. In the AcWing app settings, reset the AppSecret shown in the shared screenshot. Put `39.102.99.126` in the **服务器 IP** field. If the form requires CSS, JS, and main class, use these values and save:

   - CSS address: `https://app7592.acapp.acwing.com.cn/acapp.css`
   - JS address: `https://app7592.acapp.acwing.com.cn/acapp.js`
   - Main class: `GrindifyAcApp`

   These are static files in `frontend/public`, served by the deployed frontend. They are not reachable until DNS, HTTPS, and the frontend are working. The adapter embeds the standalone Grindify site in an iframe when AcWing instantiates the class; AcWing-side behavior remains to be tested after deployment. The AppSecret is not needed by Grindify unless AcWing login is implemented separately.
2. Ensure the cloud security group and host firewall permit inbound TCP 80 and 443. SSH may remain on 22. Keep 5432, 1337, 3000, and 3001 closed externally.
3. Place this project on the server. For a new installation, run `bash deploy/acwing/provision-env.sh` once. It creates a private `.env` with random database/JWT secrets and the following public URL settings (it refuses to overwrite an existing `.env`):

   ```dotenv
   VITE_API_URL=https://app7592.acapp.acwing.com.cn/v1
   ALLOWED_ORIGINS=https://app7592.acapp.acwing.com.cn
   BACKEND_URL=https://app7592.acapp.acwing.com.cn
   FRONTEND_URL=https://app7592.acapp.acwing.com.cn
   AUTH_COOKIE_DOMAIN=
   AUTH_COOKIE_SECURE=true
   AUTH_COOKIE_SAMESITE=lax
   DATABASE_SYNCHRONIZE=false
   ```

4. Install Certbot and issue a Let's Encrypt certificate for the domain using the Nginx HTTP challenge. Keep port 80 reachable for automatic renewal. Never commit or share the private key.
5. Install the host Nginx and enable [`nginx.conf`](nginx.conf) as a site configuration. The `/v1/` and `/uploads/` paths go to the API, `/admin/` goes to the admin panel with HTTP Basic Auth, and all other paths go to the frontend. The admin panel container itself stays loopback-only on port 3001. Before enabling the `/admin/` route, install `apache2-utils` and run `bash deploy/acwing/provision-admin-basic-auth.sh` as the SSH deployment user with temporary sudo access. Read `~/.grindify-admin-access` privately over SSH and remove that plaintext file after saving the password. Do not place the password in a command line, repository, or chat.
6. This host has limited memory. Run frontend type-checking on a development machine (`cd frontend && npm run type-check`), then build the server images **one at a time**. Do not run all image builds concurrently:

   ```sh
   docker compose -f docker-compose.prod.yml build backend
   docker compose -f docker-compose.prod.yml build frontend
   docker compose -f docker-compose.prod.yml build adminpanel
   docker compose -f docker-compose.prod.yml up -d --no-build postgres
   ```

7. Only for a **brand-new, empty database**, bootstrap the current entity schema and mark the historical migrations as applied. The script refuses to touch a database with application tables or migration history. Do not run it on upgrades:

   ```sh
   docker compose -f docker-compose.prod.yml run --rm --no-deps \
     -v "$PWD/deploy/acwing/bootstrap-fresh-db.js:/app/bootstrap-fresh-db.js:ro" \
     backend node /app/bootstrap-fresh-db.js
   docker compose -f docker-compose.prod.yml up -d --no-build backend frontend adminpanel
   ```

8. Check `docker compose -f docker-compose.prod.yml ps`, then `sudo nginx -t` and reload Nginx. Verify `https://app7592.acapp.acwing.com.cn/v1/auth/health` returns `{"ok":true,"at":"auth"}` and the site root, `/acapp.css`, `/acapp.js`, `/manifest.webmanifest`, and `/sw.js` respond. Test register/login and a photo upload before installing the PWA on a phone.

The production Compose file publishes the API, frontend, and admin panel on loopback only and keeps PostgreSQL inside the Docker network. The front-end API URL is baked into the production image, so rebuild after changing it. The admin panel is reachable at `https://app7592.acapp.acwing.com.cn/admin/` only after the Nginx password prompt, and its API still requires an authenticated `superadmin` account. To promote an existing registered account, first inspect it with `ADMIN_CHECK_ONLY=true` using [`promote-admin.js`](promote-admin.js) in the backend container; then run it without `ADMIN_CHECK_ONLY` for that exact email. Never create or change a user's password during promotion.

## Deploy prebuilt Docker images

### One-click deployment from GitHub Actions

The `Deploy AcWing` workflow deploys the latest `main` commit selected when the run starts. Open **Actions → Deploy AcWing → Run workflow**, leave the branch as `main`, and click **Run workflow**. It builds the three `linux/amd64` images on the GitHub runner, transfers one image archive and its checksum over SSH, then runs `deploy-image-archive.sh` on the existing server. It does not publish images to GHCR or read the server's private `.env` on GitHub.

Before the first run, add these repository **Actions secrets**:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Existing server's SSH hostname or IP address. |
| `DEPLOY_USER` | SSH user that owns `~/Grindify` and can run Docker without `sudo`. |
| `DEPLOY_SSH_KEY` | Private key for that SSH user. Install the matching public key on the server. |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line for `DEPLOY_HOST` and its port. Verify the fingerprint through an independent channel before saving it. |

Optionally set the repository **Actions variable** `DEPLOY_PORT` if SSH does not use port 22. The known-hosts entry for a non-default port must use `[host]:port`. The server must already have `~/Grindify/.env`, Docker Compose, and the running Grindify containers. The workflow always uses `~/Grindify` and does not provision a new server or initialize its database.

The workflow uses repository Actions variables `VITE_API_URL`, `VITE_CONTACT_EMAIL`, `VITE_OPERATOR_NAME`, `VITE_OPERATOR_ADDRESS`, `VITE_OPERATOR_CITY`, `VITE_OPERATOR_COUNTRY`, and `VITE_OPERATOR_PHONE` when present. Otherwise it uses the production defaults in the workflow. Check that these public build-time values match the server before deploying; Vite embeds them in the images. Server secrets stay in `~/Grindify/.env`.

The deployment script backs up PostgreSQL and uploads, checks the new containers, and restores the previous application images if deployment fails. It does not automatically reverse database migrations. A successful run removes the transferred archive after loading it; the loaded Docker images and backups remain on the server.

The server can run prebuilt images without compiling the source. `docker-compose.images.yml` uses the same Compose project name, container names, ports, database volume, and uploads volume as the existing deployment. It does not replace the PostgreSQL data or uploaded files. The first switch from `docker-compose.prod.yml` can therefore keep the existing database and uploads.

On a development machine with Docker and PowerShell, build from a **clean Git checkout** of the desired commit. For the currently deployed version, use a temporary worktree at `bc6aabc`; the archive builder itself can stay in the main checkout:

```powershell
git worktree add --detach .worktrees/release-bc6aabc bc6aabc
& .\deploy\acwing\build-image-archive.ps1 -SourceRoot .worktrees/release-bc6aabc -EnvironmentFile .env -ApiUrl 'https://app7592.acapp.acwing.com.cn/v1'
```

The script builds the API, frontend, and admin images sequentially for `linux/amd64`, tags all three with the commit's short SHA, writes `.deploy/images/grindify-images-<sha>.tar`, and writes its SHA-256 checksum. Only the public `VITE_*` values from `-EnvironmentFile` are used as build arguments. `-ApiUrl` must be the production API URL because Vite embeds it in the built frontend and admin panel. The admin panel is built with the `/admin/` base path.

The `ghcr.io/yangtao2301-cell/...` names in the archive are image identifiers. This archive workflow does not require a GHCR login or a registry pull.

Copy the archive, checksum, `docker-compose.images.yml`, and `deploy/acwing/deploy-image-archive.sh` to the existing `~/Grindify` checkout on the server. Then deploy the matching SHA:

```sh
cd ~/Grindify
bash deploy/acwing/deploy-image-archive.sh bc6aabc ~/grindify-images-bc6aabc.tar
```

The deployment script checks the archive checksum, loads and verifies all three images, takes a PostgreSQL dump and uploads archive under `~/grindify-backups`, then updates the three application containers. It checks the API, frontend version file, and admin panel before recording the active image tag in `.deploy/release.env`. It attempts to restore the previous application images if the update or checks fail. Keep the database dump when a release includes migrations; an image rollback alone may not undo database changes.

The archive and its checksum can be removed from the server after the release has been verified and a rollback copy is available elsewhere. The loaded images and data volumes remain in Docker.

For later releases, build from the new clean commit and deploy its matching archive and tag. Do not run `bootstrap-fresh-db.js` on an existing database. The older `grindify-release-*.tar` files are source archives; `grindify-images-*.tar` files produced by this process are Docker image archives.
