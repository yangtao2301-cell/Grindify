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
5. Install the host Nginx and enable [`nginx.conf`](nginx.conf) as a site configuration. The `/v1/` and `/uploads/` paths go to the API; all other paths go to the frontend. The admin panel stays local-only on port 3001.
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

The production Compose file publishes the API, frontend, and admin panel on loopback only and keeps PostgreSQL inside the Docker network. The front-end API URL is baked into the production image, so rebuild after changing it. The admin panel is not publicly routed by Nginx.
