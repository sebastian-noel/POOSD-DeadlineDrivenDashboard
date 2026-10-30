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
