# Followgraph — Instagram follower/following tracker

A Vite + React frontend with Vercel serverless API routes and MongoDB
persistence, replacing the old desktop Java tool. Upload the "followers and
following" zip from your Instagram data export, see who doesn't follow you
back, who unfollowed you since your last check, pending requests, and more —
all from a browser, deployable straight to Vercel.

## How it works

- **Upload a zip** → the API extracts `followers_1.json`, `following.json`
  and `pending_follow_requests.json`, saves them as the "current" snapshot in
  MongoDB, and compares them against your allow/disable lists and the last
  **committed** snapshot ("previous").
- **Manage lists** → add/remove usernames from three lists, stored in Mongo,
  editable anytime:
  - **Allowed** — accounts you're OK not following you back.
  - **Disabled / deactivated** — accounts that are gone; excluded from the
    "not following back" report.
  - **Allowed pending requests** — outgoing follow requests you're fine
    leaving pending.
- **"Move current → previous"** — once you're done reviewing an upload,
  click this to make today's data the new baseline, so your *next* upload
  compares against it correctly.

## Project layout

```
api/            Vercel serverless functions (Node, ESM)
  upload.js       POST — parse zip, compute analysis, save "current" snapshot
  commit.js        POST — copy current → previous
  lists.js          GET/POST/DELETE — allowed / disabled / allowed_pending
  status.js         GET — last analysis + snapshot counts (for page load)
lib/            Shared server logic (imported by api/*, not routes themselves)
  db.js             MongoDB connection (cached across warm invocations)
  parseInstagramZip.js   Zip → {followers, following, pending} maps
  analyze.js        All the comparison logic
  readBody.js       Body-parsing helper for serverless functions
src/            React app (Vite)
```

## Local development

1. `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your Atlas
   connection string.
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
   `MONGODB_URI` (and optionally `MONGODB_DB`, defaults to
   `instagram_tracker`). Use a MongoDB Atlas cluster with network access
   allowing Vercel's IPs (or `0.0.0.0/0` for simplicity, if you're
   comfortable with that).
4. Deploy. That's it — no separate backend to host.

## Notes & limits

- The zip is sent to `/api/upload` as base64 JSON, which keeps the upload
  code simple but means it rides inside Vercel's default request body limit
  (~4.5 MB after base64 encoding, so the raw zip needs to be a few MB or
  less). Instagram's "followers and following" JSON export is normally well
  under that. If your zip is close to the limit, request just the
  "Followers and following" data category from Instagram (Accounts Center →
  Your information) rather than your entire export.
- There's no login — you chose to keep this open. Anyone with the URL can
  view and edit your lists and upload data. If you change your mind later,
  the simplest option is Vercel's built-in password protection (Project →
  Settings → Deployment Protection) or a small shared-secret check added to
  each `api/*.js` handler.
- Data model in MongoDB: two collections, `snapshots` (fixed docs
  `followers_current`, `followers_previous`, `following_current`,
  `following_previous`, `pending_current`) and `lists` (fixed docs
  `allowed`, `disabled`, `allowed_pending`), plus a `meta` collection caching
  the last analysis so the page has something to show on load without
  re-uploading.
