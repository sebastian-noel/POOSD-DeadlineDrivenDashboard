# What the Erm Actually API does

A plain-language guide to the backend, written so a teammate (or their AI assistant) can explain it confidently. Everything here is true of the code in `api/` as of November 2026. Live at `https://ermactually.kirugames.com/api/v1`.

## In one paragraph

The API is a Node.js server (Express 5, written in TypeScript) that sits between the React web app and a MongoDB Atlas database. It owns the accounts: people sign up, prove they own their email by clicking a link, and log in to get a JWT (a signed token) that they send with every later request. Everything else, milestones, tasks, the dashboard numbers, search, and focus-timer sessions, is stored per user and only ever returned to the user who owns it. Emails (verification, password reset, contact form) go out through Brevo's SMTP relay.

## The 60-second version to say out loud

> "Our backend is an Express API in TypeScript on top of MongoDB Atlas. Sign-up creates an account with a bcrypt-hashed password and emails a verification link; you can't log in until you click it. Login returns a JWT that lasts 12 hours, and every data route checks that token and only returns the caller's own records. Milestones have tasks, the dashboard endpoint aggregates them into the numbers you see on the home screen, and search is done server-side with a case-insensitive partial match on titles. Password reset works the same way as verification, with a one-hour emailed token, and resetting also logs out every existing session. The whole thing runs as a systemd service on a DigitalOcean droplet behind Apache with HTTPS from Let's Encrypt."

## How a request flows, from sign-up to dashboard

1. **Sign up.** `POST /auth/register` with email and password. The password is hashed with bcrypt and never stored in clear text. A random 32-byte token is generated; its SHA-256 hash is stored on the user with a 24-hour expiry, and the raw token is put in an emailed link. Response `201`.
2. **Verify.** The person clicks `GET /auth/verify-email?token=…`. The API hashes the token, finds the user, stamps `emailVerifiedAt`, and redirects the browser to the web app with `?verified=1` (or `?verified=0` if the token is wrong or expired). The link keeps working until it expires, so a second click or a mail client's link scanner doesn't break it.
3. **Log in.** `POST /auth/login`. Wrong password → `401 INVALID_CREDENTIALS`. Unverified email → `403 EMAIL_NOT_VERIFIED`. Success → `{ accessToken, tokenType: "Bearer", expiresIn: 43200, user }`.
4. **Use the token.** The web app stores the JWT and sends `Authorization: Bearer <token>` on every protected call. Middleware verifies the signature, checks the token hasn't expired, and checks the user's `tokenVersion` still matches (see password reset below). It then sets `req.userId`, and every query is filtered by that id.
5. **Work.** Create milestones (`POST /milestones`), tasks under them (`POST /tasks`), mark tasks done (`PATCH /tasks/:id` with `status: "done"`, which stamps `completedAt`), start a focus session, and so on.
6. **Dashboard.** `GET /dashboard` runs a few aggregations and returns task counts (total, done, done in the last 7 days and the 7 before that, overdue, due in the next 7 days), each milestone's progress percentage, the next upcoming tasks, and focus minutes for this week and last week. The web app turns that one response into the stat cards.
7. **Search.** `GET /search?q=api end` returns the caller's tasks and milestones whose titles contain the text, case-insensitive, matching anywhere in the title. The query is escaped before it becomes a regular expression, so special characters can't break or widen the search. This is the "server-side partial-match search" the course requires.

## What is stored

Five MongoDB collections. Every record except users and contact messages carries an `owner` field pointing at a user.

| Collection | Key fields | Notes |
| --- | --- | --- |
| users | email (unique, lowercased), displayName, passwordHash, emailVerifiedAt, verificationTokenHash + expiry, resetTokenHash + expiry, tokenVersion | Tokens are stored only as hashes |
| milestones | owner, title (≤120), description, dueAt | Deleting a milestone deletes its tasks |
| tasks | owner, milestone, title (≤120), notes, status (todo / in_progress / done), dueAt, completedAt | `completedAt` is set when status becomes done |
| focussessions | owner, task (optional), status (running / paused / completed / cancelled), targetSeconds (1 min to 4 h), accumulatedMs, lastStartedAt, completedAt | Only one active session per user at a time |
| contactmessages | email, subject (≤150), message (≤4000) | Also emailed to the team inbox |

## Routes cheat sheet

All under `/api/v1`. JSON in, JSON out. "JWT" means the Bearer header is required.

| Method | Path | Auth | What it does |
| --- | --- | --- | --- |
| GET | `/health` | – | `{ "status": "ok" }` when MongoDB is connected |
| POST | `/auth/register` | – | Create account, send verification email |
| GET | `/auth/verify-email?token=` | – | Mark email verified, redirect to the app |
| POST | `/auth/resend-verification` | – | New link for an unverified account |
| POST | `/auth/login` | – | Returns the JWT |
| POST | `/auth/forgot-password` | – | Emails a reset link (same `202` whether or not the account exists) |
| POST | `/auth/reset-password` | – | `{ token, password }`; invalidates all existing JWTs |
| POST | `/contact` | – | Contact form; stored and emailed |
| GET, PATCH | `/me` | JWT | Read account, change displayName |
| GET, POST | `/milestones` | JWT | List (paginated) / create |
| GET, PATCH, DELETE | `/milestones/:id` | JWT | Read, update, delete with its tasks |
| GET, POST | `/tasks` | JWT | List (filter by milestoneId, status) / create |
| GET, PATCH, DELETE | `/tasks/:id` | JWT | Read, update, delete |
| GET | `/search?q=` | JWT | Partial title match across tasks and milestones (2–100 chars) |
| GET | `/dashboard` | JWT | Counts, milestone progress, upcoming tasks, focus minutes |
| GET, POST | `/focus-sessions` | JWT | List / start one |
| GET | `/focus-sessions/active` | JWT | The running or paused session, or null |
| PATCH | `/focus-sessions/:id` | JWT | `{ action: pause \| resume \| complete \| cancel }` |

Every error has the same shape: `{ "error": "CODE", "message": "readable text" }`, with a `details` array on validation errors. Codes: `VALIDATION_ERROR` 400, `INVALID_CREDENTIALS` 401, `UNAUTHORIZED` 401, `EMAIL_NOT_VERIFIED` 403, `NOT_FOUND` 404, `EMAIL_IN_USE` 409, `ACTIVE_SESSION_EXISTS` 409, `EMAIL_UNAVAILABLE` 503.

## Security choices, and the reason for each

- **bcrypt for passwords.** A slow, salted hash. A database leak doesn't reveal passwords. Minimum length 8.
- **Email verification before login.** Proves the address is real and belongs to the person, and stops someone signing up with another person's email.
- **Tokens stored as SHA-256 hashes with expiry.** Verification links last 24 hours, reset links 1 hour. Even with database access you can't reconstruct a usable link.
- **JWT with a 12-hour lifetime.** Stateless: the server doesn't keep sessions, it just checks the signature with `JWT_SECRET`.
- **`tokenVersion` on the user.** A password reset bumps it, and the JWT carries the version it was issued with, so every token issued before the reset stops working immediately. That's how "reset logs you out everywhere" works without a session store.
- **Ownership on every query.** Routes never look a record up by id alone; it's always `{ _id, owner: req.userId }`. Guessing someone else's id returns 404.
- **Input validation with zod.** Every body and query string is checked against a schema before it touches the database; unknown fields are rejected.
- **Escaped search input.** User text is escaped before it becomes a regex.
- **Rate limiting.** Auth routes 100 requests per 15 minutes per IP, contact form 10 per 15 minutes. Blunts password guessing and spam.
- **helmet** sets the usual security headers. The API binds to localhost only; Apache is the only thing exposed to the internet.
- **Same-origin deployment.** Web app and API share one domain, so there's no CORS exposure and the JWT is only ever sent to our own host.
- **Secrets live only in `.env` on the server.** Never in Git.

## How it is hosted

One DigitalOcean droplet (Ubuntu 24.04) at `ermactually.kirugames.com`. Apache serves the built React app from `/var/www/ermactually` and proxies `/api/` to the Node process on `127.0.0.1:3001`, which runs as the systemd service `deadline-api` from `/opt/ermactually/api/dist`. HTTPS comes from Let's Encrypt via certbot. The database is a MongoDB Atlas free cluster, reachable only from the droplet's IP. Email goes through Brevo's SMTP relay on port 2525, because DigitalOcean blocks the usual mail ports. Config is a `.env` file: `MONGODB_URI`, `JWT_SECRET`, `API_PUBLIC_URL`, `WEB_APP_URL`, and the SMTP settings.

## Questions a TA might ask

- **Where are passwords stored?** Only as bcrypt hashes in the users collection. We never store or log the plain password.
- **What happens if someone steals a JWT?** It works until it expires (12 h) or until the user resets their password, which bumps `tokenVersion` and kills every outstanding token.
- **How do you stop user A from reading user B's tasks?** Every query includes `owner: req.userId`, taken from the verified JWT, not from the request body or URL.
- **Why does forgot-password always return 202?** So the endpoint can't be used to find out which emails have accounts.
- **Is search done in the database or in the browser?** In MongoDB, with a case-insensitive regex on `title`, limited to the caller's documents. The web app only sends the query and shows the ids that come back.
- **What if the email provider is down during sign-up?** The account is still created and the API answers `503 EMAIL_UNAVAILABLE`; the user can hit "Resend verification" later.
- **How does the focus timer survive a page reload?** Sessions are stored server-side with `accumulatedMs` and `lastStartedAt`; `GET /focus-sessions/active` lets the app pick up where it left off.
- **How is milestone progress calculated?** An aggregation groups tasks by milestone and counts done versus total; `progressPercent` is `round(done / total × 100)`.
- **How do you test it?** `npm test` in `api/` starts a temporary in-memory MongoDB and runs the auth, data, and links suites end to end. GitHub Actions runs them on every push.

## Where to look in the code

| File | What's there |
| --- | --- |
| `api/src/index.ts` | Connects to MongoDB, starts the server |
| `api/src/app.ts` | Builds the Express app: middleware, routes, error handler |
| `api/src/config.ts` | Reads and validates `.env` (zod schema) |
| `api/src/routes/auth.ts` | Register, verify, login, forgot/reset password |
| `api/src/lib/auth.ts` | JWT creation and the `requireAuth` middleware |
| `api/src/lib/tokens.ts` | Random tokens and their hashing |
| `api/src/lib/mailer.ts` | Sends email via SMTP (or prints it in console mode) |
| `api/src/routes/milestones.ts`, `tasks.ts` | CRUD with ownership checks |
| `api/src/routes/search.ts` | Partial-match search |
| `api/src/routes/dashboard.ts` | Aggregations for the dashboard |
| `api/src/routes/focus-sessions.ts` | Timer sessions |
| `api/src/models/*.ts` | Mongoose schemas |
| `api/tests/*.test.ts` | End-to-end tests |
| `api/openapi.yaml`, `api/postman/` | SwaggerHub definition and Postman collection |

## Demo in two minutes

1. Open `https://ermactually.kirugames.com/api/v1/health` in a browser: `{"status":"ok"}`.
2. In Postman (collection in `api/postman/`, `baseUrl` set to the live domain), run **Register** with a fresh email: `201`.
3. Open the verification email and click the link; the site says "Email verified".
4. Run **Login**: `200` with `accessToken`. The collection stores it.
5. Run **Create milestone**, **Create task**, then **Partial search** with part of the task's title, and **Dashboard** to show the aggregated numbers.
6. Run **My account** without the token (or with a wrong one) to show `401`.
