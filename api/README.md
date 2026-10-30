# Deadline Driven Dashboard API

Express + TypeScript + MongoDB backend for the Deadline Driven Dashboard. The React starter in `desktop_frontend/client` is separate; no frontend is required to exercise this API.

## Run locally for development and tests

Requires Node.js 22 or newer and a MongoDB connection string. The automated tests start their own temporary MongoDB.

```sh
cd api
npm ci
cp .env.example .env
# Fill in .env with your MongoDB, JWT, domain, and SMTP settings.
npm run build
npm test
npm start
```

`npm run dev` starts a watch process. The app binds to `PORT` (default `3001`) and serves `GET /api/v1/health`.

Never commit `.env`. Generate `JWT_SECRET` with `openssl rand -hex 32`. `MONGODB_URI` must point to the team's remote MongoDB for the hosted app. Set `API_PUBLIC_URL` to the public HTTPS API domain so verification emails contain a usable link. Set `CORS_ORIGINS` to the web app's HTTPS origin (comma-separated if needed). An SMTP account is needed to deliver verification and reset emails.

## Main routes

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create account and email verification link |
| GET | `/api/v1/auth/verify-email?token=...` | Verify account |
| POST | `/api/v1/auth/login` | Return one-hour JWT for verified account |
| POST | `/api/v1/auth/resend-verification` | Send another verification link |
| POST | `/api/v1/auth/forgot-password` | Email reset token |
| POST | `/api/v1/auth/reset-password` | Change password; invalidate old JWTs |
| GET, PATCH | `/api/v1/me` | Read account or update display name |
| GET, POST | `/api/v1/milestones` | List and create milestones |
| GET, PATCH, DELETE | `/api/v1/milestones/:id` | Read, update, or delete owned milestone |
| GET, POST | `/api/v1/tasks` | List and create tasks |
| GET, PATCH, DELETE | `/api/v1/tasks/:id` | Read, update, or delete owned task |
| GET | `/api/v1/search?q=...` | Server-side partial title search |
| GET | `/api/v1/dashboard` | Task counts, milestone progress, upcoming work, focus time |
| GET, POST | `/api/v1/focus-sessions` | List and start focus sessions |
| GET | `/api/v1/focus-sessions/active` | Read running or paused session |
| PATCH | `/api/v1/focus-sessions/:id` | Pause, resume, complete, or cancel session |

Protected routes require `Authorization: Bearer <accessToken>`. Each user can access only their own milestones, tasks, and sessions. Search matches any part of a title, without case sensitivity, in MongoDB. Milestone progress is derived from completed tasks.

## Registration and login example

```sh
curl -i -X POST https://api.example.com/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"StrongPassword123!"}'
```

Open the emailed verification link before logging in. Then:

```sh
curl -i -X POST https://api.example.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"StrongPassword123!"}'
```

Import `postman/Deadline-Dashboard.postman_collection.json` into Postman for the lab. Import `openapi.yaml` into SwaggerHub for the project presentation. See `docs/demo-and-deployment.md` for deployment and presentation steps.
