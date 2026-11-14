# Erm Actually API

Express 5 + TypeScript + MongoDB backend for the Erm Actually dashboard. Accounts (with email verification and password reset), JWT-protected per-user milestones, tasks, partial-match search, a dashboard summary, focus sessions, and the public contact form.

New to it? [`docs/api-overview.md`](docs/api-overview.md) explains what the API does and why, in plain language, with the questions a TA is likely to ask.

## Run locally

Requires Node.js 22+ and a MongoDB. `docker compose up -d` in this folder starts MongoDB 7 on `localhost:27017`; otherwise use an Atlas connection string.

```sh
cd api
cp .env.example .env        # then edit it — see "Configuration"
npm ci
npm run dev                 # tsx watch; restarts on changes
```

`GET /api/v1/health` returns `{ "status": "ok" }` once MongoDB is connected. The tests start their own temporary MongoDB and need no `.env`:

```sh
npm test
npm run build               # type-check + compile to dist/
npm start                   # run dist/ (production)
```

## Configuration

All settings come from environment variables (`.env` is loaded automatically; never commit it).

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | Listen address. Default `3001` on `127.0.0.1` (put nginx in front). |
| `MONGODB_URI` | MongoDB connection string (Atlas in production). |
| `JWT_SECRET` | ≥32 random characters: `openssl rand -hex 32`. |
| `JWT_TTL_SECONDS` | Login token lifetime. Default 43200 (12 h). |
| `API_PUBLIC_URL` | Public origin of this API. Verification emails link to `API_PUBLIC_URL/api/v1/auth/verify-email?token=…`. |
| `WEB_APP_URL` | Public origin of the React app. Verification links redirect there (`?verified=1` or `?verified=0`) and reset emails link to `WEB_APP_URL/?reset=<token>`. Without it the API answers with JSON and emails the raw reset token. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API directly. Not needed when the web app is served from the same domain and proxies `/api` (the recommended setup), nor in development (Vite proxies). |
| `MAIL_TRANSPORT` | `smtp` (default; real email, required for the hosted app) or `console` (prints emails to the log — local development only). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | SMTP account for verification and reset emails. Any provider works (SendGrid, Brevo, Mailgun, Gmail app password, …). |
| `CONTACT_TO` | Optional. Contact-form messages are emailed here; they are always stored in MongoDB. |

## Routes

All routes are under `/api/v1`. Request and response bodies are JSON.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness + MongoDB connection check |
| POST | `/auth/register` | – | Create account, email a verification link → `201` |
| GET | `/auth/verify-email?token=` | – | Activate the account; redirects to `WEB_APP_URL` |
| POST | `/auth/resend-verification` | – | Send another verification link → `202` |
| POST | `/auth/login` | – | `{ accessToken, tokenType, expiresIn, user }` for a verified account |
| POST | `/auth/forgot-password` | – | Email a reset link → `202` (same response whether or not the account exists) |
| POST | `/auth/reset-password` | – | `{ token, password }` → new password; existing JWTs are invalidated |
| POST | `/contact` | – | Contact form `{ email, subject, message }` → `202` |
| GET, PATCH | `/me` | JWT | Read account / update `displayName` |
| GET, POST | `/milestones` | JWT | List (paginated) / create |
| GET, PATCH, DELETE | `/milestones/:id` | JWT | Read, update, delete (deletes its tasks) |
| GET, POST | `/tasks` | JWT | List (filter by `milestoneId`, `status`) / create |
| GET, PATCH, DELETE | `/tasks/:id` | JWT | Read, update (`status: done` sets `completedAt`), delete |
| GET | `/search?q=` | JWT | Case-insensitive **partial** title match across the caller's tasks and milestones (2–100 chars) |
| GET | `/dashboard` | JWT | Task counts (incl. last/previous 7 days), per-milestone progress, upcoming tasks, focus minutes |
| GET, POST | `/focus-sessions` | JWT | List / start a session (`targetSeconds`, optional `taskId`) |
| GET | `/focus-sessions/active` | JWT | The running or paused session, or `null` |
| PATCH | `/focus-sessions/:id` | JWT | `{ action: pause \| resume \| complete \| cancel }` |

Protected routes need `Authorization: Bearer <accessToken>`. Every user sees only their own data. Full schemas and examples: [`openapi.yaml`](openapi.yaml) (import into SwaggerHub) and the Postman collection in [`postman/`](postman/).

**Errors** always look like `{ "error": "CODE", "message": "Human-readable text" }` (validation errors also include `details`). Codes you will see: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `UNAUTHORIZED` (401), `EMAIL_NOT_VERIFIED` (403), `NOT_FOUND` (404), `EMAIL_IN_USE` (409), `ACTIVE_SESSION_EXISTS` (409), `EMAIL_UNAVAILABLE` (503).

**Security notes:** passwords are bcrypt-hashed (min 8 characters); verification and reset tokens are random, stored hashed, and expire (24 h / 1 h); a password reset bumps the user's `tokenVersion` so old JWTs stop working; auth and contact routes are rate-limited; `helmet` sets security headers.

## Registration and login example

```sh
curl -i -X POST https://<domain>/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"StrongPassword123"}'
```

Open the emailed verification link, then:

```sh
curl -i -X POST https://<domain>/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"StrongPassword123"}'
```

## How the web app uses it

`desktop_frontend/client/src/lib/api.ts` is the client. It calls relative `/api/v1/...` URLs, so in development Vite proxies them to this API and in production nginx does (see `deploy/nginx-site.example`). The JWT is kept in `localStorage` and sent as a Bearer header; a `401` logs the user out.

## Deploying

The live site is `https://ermactually.kirugames.com` on the team's DigitalOcean droplet. [`docs/friend-handoff.md`](docs/friend-handoff.md) is the step-by-step to finish or redeploy it. [`docs/demo-and-deployment.md`](docs/demo-and-deployment.md) covers a from-scratch setup, the lab demo with Postman/ARC, and the SwaggerHub presentation; templates for systemd and nginx are in [`deploy/`](deploy/). [`docs/lab-demo-script.md`](docs/lab-demo-script.md) is the lab check-in script.
