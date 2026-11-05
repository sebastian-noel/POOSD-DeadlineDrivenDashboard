# Hosted app, lab demo, and presentation checklist

> The team's actual deployment lives at `https://ermactually.kirugames.com` on the colors-lab droplet with Apache; the exact remaining steps and redeploy commands are in [`friend-handoff.md`](friend-handoff.md). This page is the general from-scratch guide (nginx) plus the demo/presentation checklists.

The project requirements call for a remote Express API, remote MongoDB, a domain name (no IP addresses, no local demos), JWTs, email verification/reset, and a SwaggerHub demo. The code and tests are ready; hosting needs the team's domain, server, MongoDB Atlas, and an SMTP account.

## Recommended layout: one domain

Serve the built React app and the API from the same domain. nginx serves `desktop_frontend/client/dist` and proxies `/api/` to the Node process. This avoids CORS entirely and gives one URL to put in the signup spreadsheet.

```
https://<domain>/            → static React app (nginx, try_files → index.html)
https://<domain>/api/v1/...  → Express API on 127.0.0.1:3001 (nginx proxy)
```

## Deploy on the team's server

1. Provision a server (Digital Ocean droplet is fine) with Node.js 22+, Git, and nginx. Point the domain's A record at it.
2. Create a MongoDB Atlas cluster, a database user scoped to this app, and allow the server's IP in Network Access. Copy the connection string.
3. Get an SMTP account (SendGrid, Brevo, Mailgun, or a Gmail app password) and a sender address that can deliver to outside addresses.
4. Clone the repo on the server. Build both parts:
   ```sh
   cd api && npm ci && npm run build
   cd ../desktop_frontend/client && npm ci && npm run build   # → dist/
   ```
5. Create `api/.env` from `api/.env.example`:
   - `MONGODB_URI` = the Atlas string, `JWT_SECRET` = `openssl rand -hex 32`
   - `API_PUBLIC_URL=https://<domain>` and `WEB_APP_URL=https://<domain>` (same domain; emailed links hit `/api/v1/auth/verify-email` and `/?reset=…`)
   - `MAIL_TRANSPORT=smtp` plus the `SMTP_*` and `MAIL_FROM` settings; optionally `CONTACT_TO`
   - leave `CORS_ORIGINS` empty (same domain), keep `HOST=127.0.0.1`, `PORT=3001`
   Make `.env` readable only by the deploy user. Never commit it.
6. Install the systemd unit from `deploy/deadline-api.service.example` (replace the `__PLACEHOLDER__` values) so the API restarts on reboot: `sudo systemctl enable --now deadline-api`.
7. Install the nginx site from `deploy/nginx-site.example` (replace placeholders), `sudo nginx -t && sudo systemctl reload nginx`, then `sudo certbot --nginx -d <domain>` for HTTPS.
8. From another machine: open `https://<domain>/api/v1/health`, then sign up in the web app with a fresh email, open the verification email, log in, and add a task. Repeat the register/login calls from Postman using the public domain.

If registration returns `503 EMAIL_UNAVAILABLE`, the account was created but SMTP failed: fix the SMTP settings and use **Resend verification** (or `POST /api/v1/auth/resend-verification`). Never bypass verification for the demo.

Check the domain from the UCF campus network two days and one day before presenting; UCF IT sometimes blocks new domains.

## Lab demonstration (API role) with Postman or ARC

1. SSH into the server (PuTTY or any client). Show `api/src/routes/auth.ts`, `api/src/models/user.ts`, and `api/src/index.ts` with `vi`/`less`.
2. In Postman, import `postman/Deadline-Dashboard.postman_collection.json`. Set `baseUrl` to `https://<domain>` and `email` to a fresh address.
3. Run **Register** → `201`. Show the new document in Atlas (Users collection) if asked.
4. Open the verification email and click the link (or paste its token into `verificationToken` and run **Verify email**).
5. Run **Login** → `200` with a JWT (the collection stores it). **My account**, **Create milestone/task**, **Partial search**, and **Dashboard** then work with that token. Keep an already-verified account ready in case email is slow.

## Final presentation with SwaggerHub

1. Import `api/openapi.yaml` into SwaggerHub and change the `servers` URL to `https://<domain>/api/v1`.
2. Demonstrate **no more than two endpoints**: `POST /auth/register` with a fresh email and `POST /auth/login` with a verified account are the recommended pair.
3. Explain briefly: passwords are bcrypt-hashed, login issues a JWT, every data route checks it, and search runs on the server with partial matching.

The web app and API can be exercised independently. Still open for the full project: the Flutter mobile app, the live domain, and the team's slides and diagrams.
# Hosted API and demo checklist

The project requirements call for a remote Express API, remote MongoDB, a domain name, JWTs, email verification/reset, and SwaggerHub. The source and automated tests are ready; hosting requires the team's domain, server, MongoDB, and SMTP accounts.

## Deploy on the team's server

1. Provision a server with Node.js 22+, Git, and a reverse proxy such as Nginx. Create a MongoDB Atlas database or another remote MongoDB deployment. Allow the server to connect to it.
2. Point an API subdomain such as `api.yourdomain.com` at the server. Configure HTTPS and a reverse proxy from that domain to `127.0.0.1:3001`. Test the domain from outside the server; an IP-only URL does not satisfy the project requirement.
3. Clone the branch containing the API, or pull it into the server's project directory. In `api/`, run `npm ci` and `npm run build`.
4. Copy `.env.example` to `.env` and fill in real values. Use a strong random `JWT_SECRET`; set `API_PUBLIC_URL=https://api.yourdomain.com`, remote `MONGODB_URI`, `CORS_ORIGINS`, and SMTP credentials. Keep `.env` off GitHub.
5. Run `npm start` under a process manager or system service so it restarts after a server reboot. Keep the Node process bound behind the HTTPS reverse proxy.
6. Verify `https://api.yourdomain.com/api/v1/health`, then register a fresh account, open the emailed link, log in, and call `/api/v1/me` with the JWT. Repeat from Postman or ARC using the public domain.

The server must be reachable over HTTPS. If registration returns `503 EMAIL_UNAVAILABLE`, the account was created but SMTP failed; fix SMTP and call `/api/v1/auth/resend-verification`.

Example systemd and Nginx files are in `api/deploy/`. Replace their `__PLACEHOLDER__` values with the actual server username, project directory, Node path (`command -v node`), and API domain. Enable the service only after `.env` is set. Configure HTTPS with the server's certificate manager; for Ubuntu/Nginx, Certbot can obtain and install a certificate and test renewal.

## Lab demonstration with Postman or ARC

1. Log in to the server with PuTTY or your preferred SSH client. Show `api/src/routes/auth.ts`, `api/src/models/user.ts`, and `api/src/index.ts` using `vi`, `less`, or your preferred editor.
2. In Postman, import `postman/Deadline-Dashboard.postman_collection.json`. Set `baseUrl` to the public HTTPS domain and use a fresh email address.
3. Run **Register**. Show the `201` response and the account record in the database or the source that saves it.
4. Open the verification email. Use its link, or put its token in the collection's `verificationToken` variable and run **Verify email**.
5. Run **Login**. Show the `200` response with a JWT. **My account** then shows the JWT works. Have an already verified demo account ready in case the lab email is delayed.

## Final presentation with SwaggerHub

1. Import `api/openapi.yaml` into SwaggerHub. Replace `https://api.example.com/api/v1` in the `servers` section with the deployed domain before the presentation.
2. Demonstrate **no more than two endpoints**. Recommended: `POST /auth/register` and `POST /auth/login`. Use a fresh email for register and a previously verified account for login so the email verification step does not slow down the live demo.
3. Show the successful response and briefly explain that passwords are hashed, login issues a JWT, and data routes check that JWT. Keep the live API and database available throughout the presentation.

The API can be tested without the React or Flutter clients. The full project still needs a TypeScript web login/register UI, a Flutter mobile app, a live domain, and the team's slides and diagrams.
