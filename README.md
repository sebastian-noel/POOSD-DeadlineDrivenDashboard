# Erm Actually — Deadline Driven Dashboard

UCF COP4331 (POOSD) team project: a deadline-driven dashboard for students. MERN stack in TypeScript.

| Part    | Folder                     | Stack                                                                 |
| ------- | -------------------------- | --------------------------------------------------------------------- |
| Web app | `desktop_frontend/client`  | React 19, TypeScript, Vite, React-Bootstrap                           |
| API     | `api`                      | Node 22, Express 5, TypeScript, MongoDB (Mongoose), JWT, nodemailer   |
| Mobile  | `mobile`                   | Flutter 3.47 (Android) — see [`mobile/README.md`](mobile/README.md)   |

The web app talks to the API over AJAX (`fetch`) at `/api/v1/...`. Accounts need email verification before login; password reset, server-side partial search, tasks, milestones, a dashboard summary, and focus sessions are all backed by the API. See [`api/README.md`](api/README.md) for the routes.

## Run it locally

You need Node.js 22+ and either Docker (for a local MongoDB) or a MongoDB Atlas connection string.

**1. MongoDB**

```sh
cd api
docker compose up -d        # MongoDB 7 on localhost:27017 (data kept in a Docker volume)
```

**2. API**

```sh
cd api
cp .env.example .env
npm ci
npm run dev                 # http://localhost:<PORT>/api/v1/health
```

For local development set these in `api/.env`:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/erm_actually
JWT_SECRET=<output of: openssl rand -hex 32>
API_PUBLIC_URL=http://localhost:4000
WEB_APP_URL=http://localhost:5173
MAIL_TRANSPORT=console      # prints verification / reset emails to the API terminal
```

**3. Web app**

```sh
cd desktop_frontend/client
npm ci
npm run dev                 # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000` (change with `API_PROXY_TARGET` in `desktop_frontend/client/.env.local`).

**4. Try it:** Sign up in the web app. With `MAIL_TRANSPORT=console` the verification email is printed in the API terminal — open the link, then log in. Password reset works the same way.

## Deploying

The hosted app must use a domain name, HTTPS, a remote MongoDB (Atlas), and real email (`MAIL_TRANSPORT=smtp`). The live site is `https://ermactually.kirugames.com`: one domain, Apache serves the built web app and proxies `/api` to the Node API. **To finish or redeploy it, follow [`api/docs/friend-handoff.md`](api/docs/friend-handoff.md).** [`api/docs/demo-and-deployment.md`](api/docs/demo-and-deployment.md) describes the general setup from scratch (nginx templates in [`api/deploy/`](api/deploy/)).

## Tests and CI

- `cd api && npm test` — API tests against a temporary in-memory MongoDB (no `.env` needed).
- `cd desktop_frontend/client && npm run build` — type-checks and builds the web app.
- GitHub Actions runs both on every push and pull request (`.github/workflows/`).
