# Followgraph — Instagram follower/following tracker

A Vite + React frontend with Vercel serverless API routes, MongoDB
persistence, and Google sign-in, replacing the old desktop Java tool. Upload
the "followers and following" zip from your Instagram data export, see who
doesn't follow you back, who unfollowed you since your last check, pending
requests, and more — all from a browser, deployable straight to Vercel.

Every signed-in Google account gets its own private data. There's no shared
or public view of anyone's follower data.

## How it works

- **Sign in with Google, or with email + password** → the app is gated
  behind authentication. Google sign-in works exactly as before; email +
  password is a fully independent path — its accounts live in the same
  `users` collection but are never linked to or confused with Google
  accounts, even if the email happens to match one. Nothing else works
  until you're signed in one way or the other.
- **Upload a zip** → the API extracts `followers_1.json`, `following.json`
  and `pending_follow_requests.json`, saves them as *your* "current"
  snapshot in MongoDB, and compares them against *your* allow/disable lists
  and *your* last **committed** snapshot ("previous").
- **Manage lists** → add/remove usernames from three lists (paste many at
  once, comma/space/newline separated), stored in Mongo, editable anytime:
  - **Allowed** — accounts you're OK not following you back.
  - **Disabled / deactivated** — accounts that are gone; excluded from the
    "not following back" report.
  - **Allowed pending requests** — outgoing follow requests you're fine
    leaving pending.
- **One-click actions on the analysis itself** — in "Not following back"
  you can move someone straight to Allowed or Disabled; in "Allowed, but not
  followed anymore" you can remove them from Allowed; in "Pending requests —
  can cancel" you can add them to Allowed pending. Every action recomputes
  the analysis live — no re-upload needed to see the effect.
- **"Move current → previous"** — once you're done reviewing an upload,
  click this to make today's data the new baseline, so your *next* upload
  compares against it correctly.

## Project layout

```
api/            Vercel serverless functions (Node, ESM)
  auth/
    login.js         GET  — redirect to Google's OAuth consent screen
    callback.js       GET  — exchange code, fetch profile, set session cookie
    signup.js          POST — create an email/password account
    login-password.js POST — sign in with email/password
    me.js               GET  — current signed-in user, or { user: null }
    logout.js           POST — clear the session cookie
  upload.js       POST — parse zip, compute analysis, save "current" snapshot
  commit.js        POST — copy current → previous
  lists.js          GET/POST/DELETE — allowed / disabled / allowed_pending
  status.js         GET — live analysis + snapshot counts (for page load)
lib/            Shared server logic (imported by api/*, not routes themselves)
  db.js             MongoDB connection (cached across warm invocations)
  session.js        Signed JWT session cookie helpers
  requireUser.js    Reads/enforces the session on protected routes
  origin.js         Derives the request's own https origin
  scopedId.js       Builds `<userId>::<key>` document ids for per-user data
  password.js       bcrypt hashing/verification for email+password accounts
  parseInstagramZip.js   Zip → {followers, following, pending} maps
  parseUsernames.js Bulk-paste username parsing
  analyze.js        All the comparison logic
  computeAnalysis.js  Runs analyze() live from the current DB state
  readBody.js       Body-parsing helper for serverless functions
src/            React app (Vite)
```

## Local development

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` (see
   "Configuring Google OAuth" below — you'll want a second OAuth client, or
   an extra redirect URI, for `http://localhost:3000`).
3. Install the Vercel CLI once (`npm i -g vercel`) and run `vercel dev` —
   this serves both the Vite frontend and the `/api` functions together on
   one port, which is how the app actually runs in production. (`npm run
   dev` alone only serves the frontend; the `/api` proxy in `vite.config.js`
   expects a separate API server on :3000, e.g. from `vercel dev`.)

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo. Vercel auto-detects Vite
   for the frontend and the `api/` folder for serverless functions — no
   extra config needed.
3. In the Vercel project's Settings → Environment Variables, add
   `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `SESSION_SECRET` (see below).
4. Deploy.

## Configuring Google OAuth

Your app is at **`https://instagram-tracker-follower-unfollower.vercel.app/`** —
these steps use that URL directly.

1. **Create (or open) a project in Google Cloud Console**
   → https://console.cloud.google.com/

2. **Configure the OAuth consent screen**
   (APIs & Services → OAuth consent screen)
   - User type: External is fine for personal use.
   - App name: `Followgraph` (or anything you like).
   - User support email / developer contact: your email.
   - Scopes: the defaults (`openid`, `email`, `profile`) are all this app
     needs — you don't need to add anything.
   - Leave the app in **Testing** mode and add your own Google account
     under "Test users." This skips Google's verification review entirely,
     which is the right choice for a personal tool only you (and people you
     explicitly add as test users) will sign into. Only switch to
     "Production" if you want it open to arbitrary Google accounts.

3. **Create an OAuth Client ID**
   (APIs & Services → Credentials → Create Credentials → OAuth client ID)
   - Application type: **Web application**
   - Name: `Followgraph`
   - Authorized JavaScript origins:
     ```
     https://instagram-tracker-follower-unfollower.vercel.app
     ```
   - Authorized redirect URIs:
     ```
     https://instagram-tracker-follower-unfollower.vercel.app/api/auth/callback
     ```
   - If you'll also test locally with `vercel dev` (default port 3000), add
     these too:
     ```
     http://localhost:3000
     http://localhost:3000/api/auth/callback
     ```
   - Save, then copy the generated **Client ID** and **Client secret**.

4. **Set environment variables**
   In Vercel (Project → Settings → Environment Variables) and/or your local
   `.env`:
   ```
   GOOGLE_CLIENT_ID=<your client id>
   GOOGLE_CLIENT_SECRET=<your client secret>
   SESSION_SECRET=<any long random string — e.g. `openssl rand -hex 32`>
   ```
   You don't need to set `GOOGLE_REDIRECT_URI` — the app derives it from
   the request's own host automatically, so it works whether you're on
   `localhost`, a Vercel preview URL, or your production domain, as long as
   that exact host is listed as a redirect URI in step 3.

5. **Redeploy** (env var changes on Vercel require a redeploy to take
   effect), then visit the app and click "Continue with Google."

If you ever move to a different domain, add the new domain's origin and
`/api/auth/callback` URL to the same OAuth client in step 3 — you don't need
a new client.

## Email + password accounts

This works out of the box with no extra configuration — just `MONGODB_URI`
and `SESSION_SECRET` (already required for Google sign-in). A few notes on
how it's kept separate and safe:

- **Independent from Google, by design.** Password accounts get ids like
  `local:<uuid>`, completely separate from Google's `sub`-based ids. If the
  same person signs up with email/password using the same email address as
  their Google account, they'll end up with two separate Followgraph
  accounts (and separate data) — there's no automatic linking. That's a
  deliberate simplification; let me know if you'd rather have account
  linking by email.
- **Passwords are hashed with bcrypt** (via `bcryptjs`, a pure-JS
  implementation with no native build step, which matters for Vercel's
  serverless functions) — never stored or logged in plaintext.
- **Minimum password length is 8 characters**, enforced on both the client
  and server.
- **Login errors are intentionally generic** ("Invalid email or password")
  whether the email doesn't exist or the password is wrong, so failed
  attempts can't be used to discover which emails have accounts.
- **Not included:** email verification, "forgot password" / reset flow, and
  rate limiting on login attempts. For a small personal tool these are
  usually fine to skip, but if you're expecting other people to use this
  regularly, rate limiting on `/api/auth/login-password` would be the first
  thing worth adding.

## Notes & limits

- The zip is sent to `/api/upload` as base64 JSON, which keeps the upload
  code simple but means it rides inside Vercel's default request body limit
  (~4.5 MB after base64 encoding, so the raw zip needs to be a few MB or
  less). Instagram's "followers and following" JSON export is normally well
  under that. If your zip is close to the limit, request just the
  "Followers and following" data category from Instagram (Accounts Center →
  Your information) rather than your entire export.
- **Who can sign in:** anyone with a Google account can reach the login
  screen, but while the OAuth consent screen is in "Testing" mode (step 2
  above), only accounts you've explicitly added as test users can actually
  complete sign-in — everyone else gets blocked by Google before reaching
  your app. That's the recommended setup for a personal tool.
- **Per-user identity:** each account is keyed internally by Google's
  `sub` claim — a stable, unique identifier for that Google account that
  never changes, unlike email (which can technically be changed). Email is
  stored alongside it only for display in the sidebar. This is why you
  won't see raw email addresses embedded in every database document.
- **Breaking schema change from earlier versions:** if you previously ran
  this app without login, its data lived in unscoped documents like
  `followers_current`. This version scopes everything under
  `<googleUserId>::followers_current` etc., so old data won't automatically
  show up for your account after adding auth — you'll effectively start
  fresh (just re-upload your latest export and rebuild your lists). If you
  need that old data carried over, it's a one-time manual rename of those
  document `_id`s in MongoDB once you know your Google `sub` (visible via
  `/api/auth/me` after signing in once).
- Data model in MongoDB: `snapshots` and `lists` collections, both keyed as
  `<userId>::<key>` (e.g. `abc123::followers_current`,
  `abc123::allowed`), plus a `users` collection with one document per
  Google account (email, name, picture, timestamps) used for the sidebar
  and future account-level features.

