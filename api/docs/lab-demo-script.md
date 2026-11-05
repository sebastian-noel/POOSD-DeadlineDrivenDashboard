# API lab check-in: what to show and what to say

The lab rubric for the API role: show your source code on the server (SSH + an editor), then test the endpoints with Postman or ARC. **Register and login must work.** The GTA grades "everything works, the code looks good, explanations are clear".

Budget about 8 minutes. Practice it once the night before with a fresh email address.

## The night before

**Best case — it is on a server.** Follow `demo-and-deployment.md`: a small Ubuntu droplet, a free MongoDB Atlas cluster, an SMTP account (Brevo or SendGrid free tier), `npm ci && npm run build`, `.env`, the systemd unit. A domain is required for the final presentation; for the lab an IP works. Make sure `ssh <user>@<server>` works from the laptop you will bring.

**Fallback — not hosted yet.** Run it locally (`docker compose up -d` in `api/`, `npm run dev`) and use `http://localhost:4000` as `baseUrl` in Postman. Show the code in VS Code instead of `vi`. Say up front that hosting is in progress and show the deployment guide and the CI badge so the GTA sees the plan. Expect a question about it.

Either way:

- Import `api/postman/Deadline-Dashboard.postman_collection.json` into Postman. Set the collection variables `baseUrl` and `email` (use an address you can open on your phone, or a fresh `+lab` alias).
- Have a **second, already-verified account** ready in case email is slow.
- Run **Health** once before the lab starts.
- Close everything else on screen; zoom the terminal/editor font to 16–18 pt.

## Demo script

### 1. Show the code (2–3 min)

```sh
ssh <user>@<server>
cd POOSD-DeadlineDrivenDashboard/api && ls src src/routes src/models
```

Open these three files (`vi`, `less`, or your editor) and point at the lines named:

| File | Say |
| --- | --- |
| `src/routes/auth.ts` | "Register validates with zod, hashes the password with bcrypt (cost 12), stores a **hashed** verification token with a 24-hour expiry, and emails the link. Login compares the hash, refuses unverified accounts with 403, and signs a JWT that carries the user id and a `tokenVersion`." |
| `src/models/user.ts` | "The User schema: unique lowercase email, password hash, verification and reset token hashes with expiry dates, `tokenVersion`. Indexes on the token hashes." |
| `src/lib/auth.ts` | "Every protected route goes through this middleware: it verifies the JWT, loads the user, and rejects if the token version is stale — so a password reset logs out every device." |

If asked for more: `src/app.ts` (how routes are mounted; helmet, CORS, JSON limit, error handler), `src/routes/search.ts` (partial search), `src/routes/tasks.ts` (every query is scoped by `owner: req.userId`).

### 2. Test the endpoints in Postman (4 min)

Run them in this order and narrate the status codes:

1. **Health** → `200 {"status":"ok"}` — "The API is up and connected to MongoDB Atlas."
2. **Register** with the fresh email → `201` — "Account created, verification email sent. Passwords never leave the server unhashed."
3. **Login** right away → `403 EMAIL_NOT_VERIFIED` — "You cannot log in until you verify; that is the course's email-verification requirement."
4. Open the email on your phone and tap the link (or paste the token from the link into `verificationToken` and run **Verify email**) → redirect / `200`.
5. **Login** again → `200` with `accessToken`, `expiresIn`, and `user` — "This is a JWT, valid 12 hours; Postman stored it in a variable."
6. **My account** → `200`. Then remove the `Authorization` header and send again → `401` — "Protected routes reject requests without a valid token."
7. **Create milestone** → `201`, **Create task** → `201`.
8. **Partial search** with `q=api end` → the task matches — "Search runs on the server: a case-insensitive regex on titles, user input escaped, scoped to the logged-in user. That is the search API requirement."
9. If there is time: **Dashboard** → progress per milestone; **Forgot password** → `202` (same answer whether or not the account exists, so emails cannot be enumerated).

Also worth showing once: **Register** again with the same email → `409 EMAIL_IN_USE`, and a bad password (`"short"`) → `400` with a readable `message`.

### 3. Explain the decisions (1–2 min, or as answers)

- **Stack:** Node 22, Express 5, TypeScript, Mongoose on MongoDB Atlas. Validation with zod, so every request is checked before it touches the database.
- **Security:** bcrypt for passwords; verification/reset tokens are random, stored hashed, and expire; JWT bearer tokens with `tokenVersion` so a reset invalidates old tokens; rate limiting on auth and contact routes; `helmet` headers; MongoDB regex input is escaped.
- **Per-user data:** every milestone, task and focus session stores an `owner`; every query filters by it, so user A gets a 404 for user B's task, not a 403 that leaks that it exists.
- **Email:** nodemailer over SMTP; verification links go to the API, which activates the account and redirects into the React app; reset links open the app's reset form.
- **Testing and CI:** `npm test` spins up an in-memory MongoDB and runs register → verify → login → reset, ownership checks, search, dashboard and focus sessions. GitHub Actions runs build + tests on every push.
- **Docs:** `openapi.yaml` for SwaggerHub (final presentation), the Postman collection for this lab.

## Questions the GTA may ask

| Question | Answer |
| --- | --- |
| Why JWT instead of sessions? | Stateless: the web app and the Flutter app send the same bearer token; no session store; the mobile client has no cookies. `tokenVersion` gives us revocation on password reset. |
| Where is the database? | MongoDB Atlas (remote). Locally we run MongoDB in Docker for development. |
| How do you stop one user reading another's tasks? | The JWT gives us `req.userId`; every query includes `owner: req.userId`. The tests check that user B gets 404 on user A's data. |
| Why hash the verification token? | If the database leaks, nobody can activate or reset accounts with the stored values — same reasoning as password hashes. |
| What if the email fails to send? | The account is still created and the API returns `503 EMAIL_UNAVAILABLE`; the user can hit resend-verification. |
| How is search "partial"? | `GET /search?q=` builds a case-insensitive regex from the escaped query and matches any part of a title. `q=api end` finds "Write API endpoints". |
| How does the frontend call it? | `fetch` from React (AJAX) to `/api/v1/...`; Vite proxies in dev, nginx in production on the same domain, so no CORS. |
| How are errors returned? | Always JSON `{ error: CODE, message: "readable text" }`, validation errors add `details` per field. |

## One-line opener

"Our API is Express and TypeScript on top of MongoDB Atlas. I'll show the auth code on the server, then register, verify, and log in from Postman, and finish with a protected route and the partial-match search."
