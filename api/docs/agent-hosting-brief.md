# Brief for an AI agent finishing the Erm Actually deployment

You are an AI coding agent (Claude Code, Codex, or similar) working on a teammate's computer. Your job: finish putting **Erm Actually** online at **https://ermactually.kirugames.com** and leave a verified demo account behind. The human guide with full detail is `api/docs/friend-handoff.md` in this repo; this brief is the ordered, checkable version for you. Do the steps in order. Every step ends with a check — do not continue while a check fails.

## Facts you need

| | |
| --- | --- |
| Repo | https://github.com/sebastian-noel/POOSD-DeadlineDrivenDashboard, branch `stevin/api-integration` (PR #3 to `main`) |
| Live domain | `ermactually.kirugames.com` — a subdomain of `kirugames.com`, which is registered at Namecheap by Stevin |
| Server | DigitalOcean droplet `157.230.225.246`, Ubuntu 24.04, 1 GB RAM. Log in as `root` with SSH keys. |
| Already on the server | Node 22, 2 GB swap, user `deploy`; Apache site `ermactually.kirugames.com` serving the web build from `/var/www/ermactually` and proxying `/api/` to `127.0.0.1:3001`; the API cloned and built at `/opt/ermactually` (branch `stevin/api-integration`); systemd unit `deadline-api` installed but **not started**; `/opt/ermactually/api/.env` with a `JWT_SECRET` already generated and five blank lines. |
| Also on that server | The COP 4331 **colors lab** (`colors.kirugames.com`, `/var/www/html`, Apache sites `colors.kirugames.com*.conf`, MySQL). **Never touch any of it.** |
| Done by Stevin (not you) | The DNS A record `ermactually → 157.230.225.246` at Namecheap; adding your SSH key to the server. You check both and wait if needed. |

## Rules

1. Secrets (Atlas password/URI, Gmail app password, `JWT_SECRET`) go only into `/opt/ermactually/api/.env` on the server. Never into Git, GitHub, Discord, issues, PR comments, your transcript summary, or the final report.
2. Do not modify the colors lab, its Apache sites, MySQL, or the `@`/`www`/`colors` DNS records of `kirugames.com`.
3. Do not change anyone's account security settings (passwords, 2-factor, recovery). The Gmail app password is created by the human — ask them.
4. Stop and ask the human on any payment prompt, CAPTCHA, or 2-factor code.
5. Never bypass or disable email verification to make something pass. Fix SMTP instead.
6. Do not rebuild the API on the server unless the code changed; do not run `npm install` in the repo root; do not push commits or change the branch.
7. Prefer the terminal. Use the browser only for Atlas, Gmail, and viewing the site.

## Step 0 — Get access (needs the human and Stevin)

```sh
ls ~/.ssh/id_ed25519.pub 2>/dev/null || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Give that one line to the human to send to Stevin, who adds it to the server. Then test (accept the host key on first connect):

```sh
ssh -o ConnectTimeout=10 root@157.230.225.246 'echo ok && hostname'
```

Check: prints `ok` and `marketplace-s-1vcpu-1gb-nyc1`. If "Permission denied", the key is not added yet — wait for Stevin; do not try other keys or passwords.

Also ask the human for: access to the team Gmail (logged in in the browser), a MongoDB Atlas login (their own account is fine), a **demo password** (8+ characters), and Stevin's email address.

## Step 1 — Check DNS

```sh
dig +short ermactually.kirugames.com
```

Check: prints `157.230.225.246`. If empty, Stevin has not added the record yet; continue with steps 2–4 and come back before step 5.

## Step 2 — MongoDB Atlas (browser, ~10 min)

1. https://cloud.mongodb.com → New Project **Erm Actually** → Build a Database → **M0 Free**, AWS, `us-east-1`, cluster name `ermactually`.
2. Security → Database Access → Add New Database User: username `ermactually_app`, **Autogenerate Secure Password** (copy it), role "Read and write to any database".
3. Security → Network Access → Add IP Address → `157.230.225.246/32`. Not `0.0.0.0/0`.
4. Database → Connect → Drivers → copy the connection string. Build:
   `mongodb+srv://ermactually_app:<PASSWORD>@<cluster-host>/erm_actually?retryWrites=true&w=majority`
5. Project → Access Manager → invite Stevin's email as Project Owner.

Check: the URI contains the real password and `/erm_actually?`.

## Step 3 — Gmail app password (human does it; you wait)

Ask the human: on the team Gmail, Google Account → Security → 2-Step Verification (on) → App passwords → create "Erm Actually" → give you the 16 characters without spaces. You need the Gmail address and that password.

## Step 4 — Fill `.env` and start the API (over SSH)

Edit `/opt/ermactually/api/.env` on the server and set exactly these five lines, leaving every other line (including `JWT_SECRET`) unchanged:

```
MONGODB_URI=<from step 2>
SMTP_USER=<gmail address>
SMTP_PASSWORD=<16-char app password>
MAIL_FROM=Erm Actually <<gmail address>>
CONTACT_TO=<gmail address>
```

You can do it non-interactively from your machine (replace the values; the single quotes protect special characters):

```sh
ssh root@157.230.225.246 bash -s <<'EOF'
set -e
F=/opt/ermactually/api/.env
set_kv() { grep -v "^$1=" "$F" > "$F.tmp" && printf '%s=%s\n' "$1" "$2" >> "$F.tmp" && mv "$F.tmp" "$F"; }   # not sed: '&' in the URI would break it
set_kv MONGODB_URI  'mongodb+srv://ermactually_app:PASSWORD@HOST/erm_actually?retryWrites=true&w=majority'
set_kv SMTP_USER    'teamgmail@gmail.com'
set_kv SMTP_PASSWORD 'abcdabcdabcdabcd'
set_kv MAIL_FROM    'Erm Actually <teamgmail@gmail.com>'
set_kv CONTACT_TO   'teamgmail@gmail.com'
chown deploy:deploy "$F" && chmod 600 "$F"
grep -cE '^[A-Z_]+=$' "$F" | xargs -I{} echo "blank values left: {}"
systemctl restart deadline-api && sleep 3
systemctl --no-pager status deadline-api | head -3
curl -s http://127.0.0.1:3001/api/v1/health; echo
EOF
```

Check: "blank values left: 0" (CORS_ORIGINS is allowed to be blank — it will show 1 if so; that is fine), status `active (running)`, health `{"status":"ok"}`.
- `{"status":"unavailable"}` → Atlas Network Access is missing the droplet IP or the URI password is wrong: `ssh root@157.230.225.246 journalctl -u deadline-api -n 30`.
- Service failed with "Invalid environment configuration" → the log names the `.env` line to fix.

## Step 5 — HTTPS (only after step 1 passes)

```sh
ssh root@157.230.225.246 "certbot --apache -d ermactually.kirugames.com --non-interactive --agree-tos -m <gmail address> --redirect"
curl -s https://ermactually.kirugames.com/api/v1/health; echo
curl -s -o /dev/null -w '%{http_code}\n' https://colors.kirugames.com/
curl -s https://ermactually.kirugames.com/ | grep -o '<title>[^<]*'
```

Check: health `ok` over HTTPS, colors `200`, title `Erm Actually · Dashboard`.

## Step 6 — End-to-end verification and demo data

Use the team Gmail with a plus-alias so you can open the email yourself.

```sh
D=https://ermactually.kirugames.com
curl -s -w '\n%{http_code}\n' -X POST $D/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"<gmail>+demo@gmail.com","password":"<DEMO_PASSWORD>"}'
```

Check: `201`. Then in the browser: Gmail → "Verify your Erm Actually account" → click the link → the site shows "Email verified". Log in with the demo account → the dashboard loads (empty). Then:

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
  curl -s -o /dev/null -w '%{http_code}\n' -X POST $D/api/v1/tasks -H "$AUTH" -H 'Content-Type: application/json' -d "$t"
done
curl -s "$D/api/v1/search?q=api%20end" -H "$AUTH"; echo
curl -s -o /dev/null -w '%{http_code}\n' "$D/api/v1/me"
```

Check: five `201`s, the search result contains "Write API endpoints", and the last call (no token) is `401`. Reload the dashboard in the browser: stats, deadlines, milestones and tasks are visible; typing `api end` in the search box filters to that task; log out and log back in works.

Then:
- Password reset once: "Forgot Password?" → reset email in Gmail → set a new password → log in → set it back to the demo password the same way.
- Register a second account with Stevin's email and the demo password (`POST /auth/register` as above). Stevin clicks that verification link himself.
- `ssh root@157.230.225.246 journalctl -u deadline-api -n 50 --no-pager` shows no stack traces.

## Step 7 — Postman and reboot test

- In the repo, set the collection variables in `api/postman/Deadline-Dashboard.postman_collection.json`: `baseUrl = https://ermactually.kirugames.com`, `email = <gmail>+lab@gmail.com`. Import into Postman if installed. Do not commit this change.
- `ssh root@157.230.225.246 reboot`, wait 60 s, then `curl -s https://ermactually.kirugames.com/api/v1/health` and `curl -sI https://colors.kirugames.com | head -1` — both must come back on their own.

## Step 8 — Report (no secrets)

Give the human this to post in the team chat:

```
Live:        https://ermactually.kirugames.com   (mobile API base: https://ermactually.kirugames.com/api/v1)
Server:      ssh root@157.230.225.246 — API code /opt/ermactually, web build /var/www/ermactually
Service:     systemctl status|restart deadline-api ; logs: journalctl -u deadline-api -f
Secrets:     only in /opt/ermactually/api/.env on the server
Database:    Atlas project "Erm Actually", cluster ermactually, db erm_actually (Stevin invited)
Demo login:  <gmail>+demo@gmail.com — password in the private notes — 2 milestones, 5 tasks
Also:        Stevin: click the verification email on your account; add the live URL to the signup spreadsheet
Problems:    <anything that failed or was skipped>
```

## If something is wrong

| Symptom | Do |
| --- | --- |
| `Permission denied (publickey)` | Your key is not on the server yet. Wait for Stevin. |
| health `unavailable` | Atlas Network Access / URI password. Check the journal. |
| Register → `503 EMAIL_UNAVAILABLE` | App password wrong or has spaces, or `MAIL_FROM` ≠ the Gmail address. Fix `.env`, restart, then `POST /api/v1/auth/resend-verification` with the same email. |
| Verification link opens JSON, not the app | `WEB_APP_URL` in `.env` is missing. |
| Apache answers 503 on `/api` | The Node service is down: `systemctl status deadline-api`. |
| certbot error | DNS not propagated (step 1) — wait, then retry. |
| Anything about the colors lab | Stop. You should not be near it. Report to the human. |
