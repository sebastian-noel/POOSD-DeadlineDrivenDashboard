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
