# AcWing deployment for Grindify

Host: `app7592.acapp.acwing.com.cn`  
Server public IP: `39.102.99.126` (Ubuntu 24.04)

1. In the AcWing app settings, reset the AppSecret shown in the shared screenshot. Put `39.102.99.126` in the **服务器 IP** field. If the form requires CSS, JS, and main class, use these values and save:

   - CSS address: `https://app7592.acapp.acwing.com.cn/acapp.css`
   - JS address: `https://app7592.acapp.acwing.com.cn/acapp.js`
   - Main class: `GrindifyAcApp`

   These are static files in `frontend/public`, served by the deployed frontend. They are not reachable until DNS, HTTPS, and the frontend are working. The adapter embeds the standalone Grindify site in an iframe when AcWing instantiates the class; AcWing-side behavior remains to be tested after deployment. The AppSecret is not needed by Grindify unless AcWing login is implemented separately.
2. Ensure the cloud security group and host firewall permit inbound TCP 80 and 443. SSH may remain on 22. Keep 5432, 1337, 3000, and 3001 closed externally.
3. Place this project on the server. Create a server-local `.env` from `.env.example` with fresh database/JWT secrets. Set the following values:

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

4. Download the AcWing certificate and private key from the app settings. Install them on the server as `/etc/nginx/cert/acapp.pem` and `/etc/nginx/cert/acapp.key`, respectively. Restrict access to the private key. Do not commit either file or send its contents in chat.
5. Install the host Nginx and enable [`nginx.conf`](nginx.conf) as a site configuration. The `/v1/` and `/uploads/` paths go to the API; all other paths go to the frontend. The admin panel stays local-only on port 3001.
6. On the server, from the project root, run `docker compose -f docker-compose.prod.yml up -d --build`. Check `docker compose -f docker-compose.prod.yml ps`, then `sudo nginx -t` and reload Nginx.
7. Verify `https://app7592.acapp.acwing.com.cn/v1/auth/health` returns `{"ok":true,"at":"auth"}` and the site root loads the frontend. Test register/login and a photo upload before installing the PWA on a phone.

The production Compose file only publishes the API and frontend on loopback and keeps PostgreSQL inside the Docker network. The front-end API URL is baked into the production image, so rebuild after changing it.
