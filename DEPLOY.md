# Deploying to a public URL

The app is deploy-ready, but the last mile needs an account only you can create
(I have no deployment credentials in this environment). This should take about
10 minutes.

## 1. Create a free production database (Turso)

Vercel's filesystem isn't writable/persistent, so local SQLite won't work in
production. [Turso](https://turso.tech) hosts a SQLite-compatible database for
free and needs no schema changes — the app already supports it.

1. Sign up at turso.tech (or `turso auth signup` via their CLI).
2. Create a database: `turso db create dock-schedule`.
3. Get the connection URL: `turso db show dock-schedule --url` (starts with `libsql://`).
4. Get an auth token: `turso db tokens create dock-schedule`.

## 2. Deploy to Vercel

1. Sign up at vercel.com and click "Add New Project".
2. Import the `ashley-hong/css-project` GitHub repo (branch `claude/project-selection-discussion-ldde31`, or whatever branch/PR you merge to).
3. In the project's Environment Variables settings, add:
   - `DATABASE_URL` = the `libsql://...` URL from step 1
   - `TURSO_AUTH_TOKEN` = the token from step 1
4. Deploy. Vercel runs `npm install` (which runs `prisma generate`) then `npm run build`.

## 3. Apply the schema and import the historical data to production

Migrations aren't applied automatically on deploy, so run these once from your
own machine, pointed at the production database:

```bash
export DATABASE_URL="libsql://...your-turso-url..."
export TURSO_AUTH_TOKEN="...your-token..."
npx prisma migrate deploy
npm run import:dock -- data/dock-schedule-sample.xlsx
```

After that, reload the deployed URL — the calendar should show the same
imported berths and bookings you saw locally.
