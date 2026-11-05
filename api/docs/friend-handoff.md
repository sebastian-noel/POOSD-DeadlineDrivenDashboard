# Hosting handoff: finish putting Erm Actually online

This is for the teammate taking over hosting. The code is done and the server is mostly set up; what is left is about an hour of account setup and checks. Work top to bottom and do not skip a check.

> Using an AI agent (Claude Code, Codex, …) to do it? Point it at [`agent-hosting-brief.md`](agent-hosting-brief.md) — the same steps written as checkable tasks with guardrails.

**Target:** `https://ermactually.kirugames.com` — web app + API on one domain, MongoDB Atlas, real email.

## Where things stand

Done:

- API (Express 5 + TypeScript + MongoDB) and the React app are wired together on branch `stevin/api-integration`, PR [#3](https://github.com/sebastian-noel/POOSD-DeadlineDrivenDashboard/pull/3) to `main`. Tests and CI pass.
- Server: the COP 4331 colors-lab DigitalOcean droplet **157.230.225.246** (Ubuntu 24.04, 1 GB) now also has Node 22, 2 GB swap, a `deploy` user, and an Apache site for `ermactually.kirugames.com` that serves the web build from `/var/www/ermactually` and proxies `/api/` to the Node API on port 3001.
- API code is cloned and built at `/opt/ermactually` (branch `stevin/api-integration`); a systemd service `deadline-api` is installed but **not running yet**.
- `/opt/ermactually/api/.env` exists with a generated `JWT_SECRET` and the URLs; five lines are blank and need values (below).

Not done (your part):

1. DNS record `ermactually` → `157.230.225.246` (Stevin, 1 minute).
2. MongoDB Atlas cluster → connection string.
3. Gmail app password for sending email.
4. Fill `.env`, start the API, HTTPS with certbot.
5. Verify sign-up → email → login, create a demo account with sample data.

The same droplet hosts `colors.kirugames.com` (`/var/www/html`, MySQL, the `colors.kirugames.com*` Apache sites). **Do not touch any of that**, and never change the `@`, `www` or `colors` DNS records of `kirugames.com`.

## Stevin's part (2 minutes)

1. **DNS:** Namecheap → Domain List → `kirugames.com` → Manage → Advanced DNS → Add New Record → Type **A Record**, Host `ermactually`, Value `157.230.225.246`, TTL Automatic → save.
2. **SSH access for the teammate:** ask them for their public key (`cat ~/.ssh/id_ed25519.pub`, or `ssh-keygen -t ed25519` first), then run on your Mac:
   ```sh
   ssh -i ~/.ssh/colors_lamp_ed25519 root@157.230.225.246 "echo '<PASTE THEIR PUBLIC KEY>' >> /root/.ssh/authorized_keys"
   ```
   Do not share your private key.
3. Later: add the project title, GitHub URL and `https://ermactually.kirugames.com` to the course signup spreadsheet.

## Teammate: step by step

You need: SSH access (above), a MongoDB Atlas account (your own is fine), the team Gmail account, and a terminal with `ssh`, `curl` and `node`.

### 1. Check DNS

```sh
dig +short ermactually.kirugames.com      # must print 157.230.225.246
```

If empty, Stevin has not added the record yet or it is still propagating (a few minutes). You can do steps 2–4 meanwhile; step 5 needs DNS.

### 2. MongoDB Atlas (free)

1. atlas.mongodb.com → New Project **Erm Actually** → Build a Database → **M0 Free**, AWS, `us-east-1` (N. Virginia), cluster name `ermactually`.
2. Security → Database Access → Add New Database User → username `ermactually_app` → **Autogenerate Secure Password** (copy it) → role "Read and write to any database".
3. Security → Network Access → Add IP Address → `157.230.225.246/32`. Not `0.0.0.0/0`.
4. Database → Connect → Drivers → copy the connection string and make it look like this (database name `erm_actually`, real password):
   ```
   mongodb+srv://ermactually_app:<PASSWORD>@<cluster-host>/erm_actually?retryWrites=true&w=majority
   ```
5. Invite Stevin to the Atlas project (Project → Access Manager) so the team can see the data.

### 3. Email: Gmail app password

On the team Gmail account: Google Account → Security → turn on **2-Step Verification** if it is off → search "App passwords" → create one named `Erm Actually` → copy the 16 characters (remove the spaces). This is the SMTP password; the SMTP user is the Gmail address.

(Alternative: a Brevo account with SMTP enabled — `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_USER` = your Brevo login email, `SMTP_PASSWORD` = the SMTP key, `MAIL_FROM` = a sender verified in Brevo.)

### 4. Fill the config and start the API

```sh
ssh root@157.230.225.246
nano /opt/ermactually/api/.env
```

Set these five lines (leave everything else, including `JWT_SECRET`, exactly as it is):

```
MONGODB_URI=<the string from step 2>
SMTP_USER=<the gmail address>
SMTP_PASSWORD=<the 16-character app password>
MAIL_FROM=Erm Actually <<the gmail address>>
CONTACT_TO=<the gmail address>
```

Save (Ctrl+O, Enter, Ctrl+X), then:

```sh
chown deploy:deploy /opt/ermactually/api/.env && chmod 600 /opt/ermactually/api/.env
systemctl restart deadline-api && sleep 3 && systemctl --no-pager status deadline-api | head -5
curl -s http://127.0.0.1:3001/api/v1/health
```

Check: `active (running)` and `{"status":"ok"}`.
- `{"status":"unavailable"}` → Atlas Network Access is missing the droplet IP, or the password in the URI is wrong. `journalctl -u deadline-api -n 30` shows the Mongo error.
- "Invalid environment configuration" → the log names the `.env` line to fix.

### 5. HTTPS

Only after step 1 passes:

```sh
certbot --apache -d ermactually.kirugames.com --non-interactive --agree-tos -m <the gmail address> --redirect
curl -s https://ermactually.kirugames.com/api/v1/health            # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' https://colors.kirugames.com/   # 200 — the colors lab still works
```

Open `https://ermactually.kirugames.com` in a browser: the Erm Actually log-in page loads. Certbot renews the certificate by itself.

### 6. Verify the whole flow and create the demo account

Use the team Gmail with a plus-alias so you can open the verification email yourself. Pick a demo password (8+ characters) and write it in the team's private notes.

```sh
D=https://ermactually.kirugames.com
curl -s -X POST $D/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"<gmail>+demo@gmail.com","password":"<DEMO_PASSWORD>"}'         # HTTP 201
```

1. Gmail → "Verify your Erm Actually account" → click the link → the site opens and says "Email verified".
2. Log in there with the demo account → the dashboard loads (empty).
3. Add sample data so the dashboard looks alive (run in the same terminal):

```sh
TOKEN=$(curl -s -X POST $D/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"<gmail>+demo@gmail.com","password":"<DEMO_PASSWORD>"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
AUTH="Authorization: Bearer $TOKEN"
M1=$(curl -s -X POST $D/api/v1/milestones -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"MERN lab demo","dueAt":"2026-11-07T04:59:00Z"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
M2=$(curl -s -X POST $D/api/v1/milestones -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"Final presentation","dueAt":"2026-12-05T04:59:00Z"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
for t in '{"milestoneId":"'$M1'","title":"Deploy API to server","status":"done"}' \
         '{"milestoneId":"'$M1'","title":"Write API endpoints","status":"done"}' \
         '{"milestoneId":"'$M1'","title":"Rehearse Postman demo","dueAt":"2026-11-06T04:59:00Z"}' \
         '{"milestoneId":"'$M2'","title":"Draw ERD and use-case diagram","dueAt":"2026-11-20T04:59:00Z"}' \
         '{"milestoneId":"'$M2'","title":"Build slide deck","dueAt":"2026-11-28T04:59:00Z"}'; do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST $D/api/v1/tasks -H "$AUTH" -H 'Content-Type: application/json' -d "$t"   # 201 each
done
curl -s "$D/api/v1/search?q=api%20end" -H "$AUTH"     # finds "Write API endpoints"
```

4. Reload the dashboard: stats, deadlines, milestone progress and tasks show; type `api end` in the search box; log out and log in again.
5. Test the password reset once: "Forgot Password?" → email → set a new password → log in → then set it back to the demo password.
6. Register a second account with Stevin's own email and the demo password; he clicks the verification link on his phone.
7. Open the site from a phone on cellular data to confirm it is reachable from outside.

### 7. Postman for the lab

Import `api/postman/Deadline-Dashboard.postman_collection.json`, set the collection variables `baseUrl = https://ermactually.kirugames.com` and `email = <gmail>+lab@gmail.com` (a fresh alias for the live registration). Run Health → Register → (click the email) → Login → My account → Partial search. `api/docs/lab-demo-script.md` has the full demo script and the likely questions.

### 8. Tell the team

Post in the group chat (no secrets):

```
Live:        https://ermactually.kirugames.com   (API base for mobile: https://ermactually.kirugames.com/api/v1)
Server:      ssh root@157.230.225.246  — code in /opt/ermactually, web build in /var/www/ermactually
Service:     systemctl status|restart deadline-api ; logs: journalctl -u deadline-api -f
Secrets:     only in /opt/ermactually/api/.env on the server
Database:    Atlas project "Erm Actually", cluster ermactually, db erm_actually
Demo login:  <gmail>+demo@gmail.com / (password in the private notes) — has 2 milestones, 5 tasks
Postman:     collection in api/postman, baseUrl set to the live domain
```

## Rules

- Secrets (Atlas password/URI, app password, `JWT_SECRET`) live only in `/opt/ermactually/api/.env`. Never commit them, never paste them in GitHub issues, PR comments, Discord or slides.
- Do not modify the colors lab (files, Apache sites, MySQL) or the `@`/`www`/`colors` DNS records.
- Never bypass or disable email verification to make a demo work; fix SMTP instead.
- Stop and ask Stevin before anything that costs money.

## Redeploying after code changes

Web app (build on your laptop — the droplet is too small to build it):

```sh
cd desktop_frontend/client && npm ci && npm run build
rsync -az --delete dist/ root@157.230.225.246:/var/www/ermactually/
ssh root@157.230.225.246 chown -R www-data:www-data /var/www/ermactually
```

API (on the server):

```sh
ssh root@157.230.225.246
sudo -u deploy -H git -C /opt/ermactually pull
sudo -u deploy -H bash -c 'cd /opt/ermactually/api && MONGOMS_DISABLE_POSTINSTALL=1 npm ci && npm run build'
systemctl restart deadline-api && curl -s http://127.0.0.1:3001/api/v1/health
```

Once PR #3 is merged, switch the server to `main` first: `sudo -u deploy -H git -C /opt/ermactually switch main`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| health `unavailable` | Atlas Network Access lacks `157.230.225.246/32`, or wrong password in `MONGODB_URI`. |
| Register → `503 EMAIL_UNAVAILABLE` | App password wrong / has spaces / 2-Step off, or `MAIL_FROM` is not the Gmail address. Fix `.env`, `systemctl restart deadline-api`, then "Resend verification" in the app (`POST /api/v1/auth/resend-verification`). |
| Verification link shows JSON instead of the app | `WEB_APP_URL` missing in `.env`. |
| `/api/...` returns 503 from Apache | Node is down: `systemctl status deadline-api`, `journalctl -u deadline-api -n 50`. |
| Site loads but blank / old version | Re-upload the build (`rsync` above) and hard-refresh. |
| certbot fails | DNS not propagated yet (`dig +short ermactually.kirugames.com`). |
| colors lab broke | Nothing here touches it; `apache2ctl configtest`, `systemctl status apache2`. |
# API deployment handoff

This is the starting point for a teammate taking over the Deadline Driven Dashboard API deployment. The backend code is ready for a hosted demo; the remote services are not connected yet. You can help without a frontend. The project owner still needs to attend and demonstrate their own work during the lab and presentation.

## What is already in GitHub

- Working branch: `stevin/api-backend-demo`; draft PR: <https://github.com/sebastian-noel/POOSD-DeadlineDrivenDashboard/pull/1>.
- Express + TypeScript + MongoDB API in `api/src/` with registration, email verification, login, password reset, JWT-protected user data, milestones, tasks, partial search, dashboard progress, and focus sessions.
- Automated API tests in `api/tests/`; GitHub Actions runs build and tests.
- Postman collection: `api/postman/Deadline-Dashboard.postman_collection.json`.
- OpenAPI definition for SwaggerHub: `api/openapi.yaml`.
- Deployment templates: `api/deploy/deadline-api.service.example` and `api/deploy/nginx-site.example`.
- Detailed demo checklist: `api/docs/demo-and-deployment.md`.

The current frontend is only a React starter. The API demo can proceed without it. Do not present the web/mobile app as complete.

## Access and decisions to obtain from the project owner

The repository is public, so the teammate can clone and read it immediately. To push code or open a PR against the team repository, the repository owner must grant them the appropriate GitHub access. Deployment also requires separate access to the server and service accounts; GitHub access alone does not provide that.

1. **Server:** the dedicated server's provider, public IP or hostname, SSH username, and an approved way to access it. Verify its SSH host key through the provider's console before connecting. Do not assume a saved SSH alias or another project's server belongs to this app.
2. **Domain:** the owned domain and access to its DNS settings. Plan an `api.` subdomain pointing to the dedicated server. The final public URL must use the domain and HTTPS.
3. **MongoDB Atlas:** access to the separate dashboard project. Choose a free cluster if available. Create a database user with access scoped to this app and allow the API server's outbound IP. Store the connection string securely.
4. **Email:** access to an SMTP service and a sender address that can deliver verification and password-reset messages. Complete any required sender or domain verification.
5. **SwaggerHub:** access to a workspace that permits importing `api/openapi.yaml` and sending requests to the deployed API.

Use individual or scoped access where possible. Do not put SSH keys, database URLs, JWT secrets, SMTP credentials, or verification tokens in GitHub, issues, PR comments, or slides. **Stop if any service prompts for payment or a paid upgrade; the owner has not authorized a purchase.**

## First hour: reproduce the API locally

```sh
git clone https://github.com/sebastian-noel/POOSD-DeadlineDrivenDashboard.git
cd POOSD-DeadlineDrivenDashboard
git fetch origin
git switch --track origin/stevin/api-backend-demo
cd api
npm ci
npm run build
npm test
```

Use Node.js 22 or newer. The tests start a temporary MongoDB, so a production database is not required for this check. If Git reports the branch already exists locally, use `git switch stevin/api-backend-demo` instead.

For source changes, branch from `stevin/api-backend-demo`, make small commits for distinct changes, and open a PR targeting that branch. Coordinate before editing files another teammate owns. Do not reset or overwrite their work.

## Deploy the existing API

1. Confirm the server identity and SSH access through the provider. Install Node.js 22+, Git, and Nginx if needed.
2. Create the Atlas cluster and app database user. Permit connections from the API server. Keep the `MONGODB_URI` private.
3. Configure SMTP and verify that the sender can deliver to an address outside the SMTP provider.
4. Add the DNS A record for the chosen `api.` subdomain. Configure Nginx to proxy to the API on `127.0.0.1:3001`, then obtain a valid HTTPS certificate.
5. Clone or update the branch on the server. In `api/`, run `npm ci` and `npm run build`.
6. Copy `api/.env.example` to `api/.env` on the server. Set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, `API_PUBLIC_URL=https://api.<domain>`, `CORS_ORIGINS`, and the SMTP settings. Keep `.env` readable only by the deploy account. Generate a JWT secret with `openssl rand -hex 32`.
7. Use the systemd template so the API restarts after reboot. Keep `HOST=127.0.0.1`; expose it through Nginx and HTTPS. Replace all template placeholders with real paths, usernames, and domain values.
8. From a different machine, request `https://api.<domain>/api/v1/health`. Then use the Postman collection to register a fresh email, receive and open its verification link, log in, and call `/api/v1/me` with the returned JWT.

If registration reports `503 EMAIL_UNAVAILABLE`, inspect SMTP settings and logs; the user may already have been created. After fixing email, use `POST /api/v1/auth/resend-verification` for that account. Never bypass verification for the demo.

## Demo acceptance checklist

- [ ] Public HTTPS domain resolves and `GET /api/v1/health` returns `200`.
- [ ] Registration creates an account and sends a verification email.
- [ ] The verification link activates the account.
- [ ] Login returns `200` and a JWT for a verified account.
- [ ] `GET /api/v1/me` accepts that JWT and rejects a request without it.
- [ ] Partial task or milestone search queries the server and matches part of a title.
- [ ] Password reset email and token flow work.
- [ ] Postman collection uses the public domain; a previously verified demo account is ready as backup.
- [ ] SwaggerHub imports the OpenAPI file and points to the public domain. Show only one or two endpoints in the final presentation; registration and login are the recommended pair.

For the lab, the project owner should SSH into the hosted server, show `api/src/routes/auth.ts` and `api/src/models/user.ts` with `vi`, `less`, or another editor, and run the register/login requests in Postman or ARC. The friend can prepare and rehearse this with them; the owner's required attendance and participation remain theirs.

## Report back to the team

Share the public API domain, deployment commit SHA, test results, and any remaining blockers. Share credentials only through a private channel agreed with the owner. A payment prompt, unverified SSH identity, or inability to send real email is a blocker, not a reason to silently change the requirements.
