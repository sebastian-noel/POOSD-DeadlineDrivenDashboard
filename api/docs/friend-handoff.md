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
