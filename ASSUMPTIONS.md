# Assumptions & Design Decisions

Running log of decisions made while building the Dock Scheduling System, for the submission form's "assumptions / design decisions" question.

## Stack
- **Next.js (TypeScript, App Router)** for both frontend and API routes — one deployable app, easy free hosting on Vercel for the required public live URL.
- **Prisma ORM**, SQLite for local development, switching the datasource to a hosted Postgres (e.g. Neon) for production, since Vercel's filesystem is not persistent/writable at runtime.
- **Tailwind CSS** for styling — fast to build a calendar/grid UI with.

## Deployment
- Local dev uses SQLite via `@prisma/adapter-better-sqlite3`. Production is meant to run on Vercel, whose filesystem isn't writable/persistent, so `src/lib/prisma.ts` switches to `@prisma/adapter-libsql` (Turso, a hosted SQLite-compatible DB) whenever `DATABASE_URL` starts with `libsql:` — same Prisma schema/provider either way, only the driver adapter and connection string differ, so no data-model migration is needed to go from dev to prod.
- Getting an actual public URL requires a Vercel + Turso account, which I don't have credentials for in this environment — see `DEPLOY.md` for the exact steps left for a human to do (account signup, connecting the repo, setting two env vars, then running `prisma migrate deploy` and the import script once against the production database).

## Data model
- The source spreadsheet has no explicit start/end dates or ranges — a multi-day booking is just the same vessel/event name typed into consecutive day-cells by hand. We normalize this into real `Booking(start_date, end_date)` rows on import by collapsing consecutive identical-name cells on the same berth row into one range.
- Berth length is embedded in the row label as free text (e.g. `North Pier East - 240'`). We parse this into a canonical `Berth(name, length_ft)` table once, rather than re-parsing the label on every read.
- Berth names/labels drift slightly across years (renames, reorganizations). We maintain one canonical berth list and treat historical name variants as aliases during import, rather than creating a new berth per spelling.
- A booking is either a `vessel` (with a length, for the fit-check) or a non-vessel `event` (e.g. "Community sail day") which has no length constraint.
- The `Tours` sheet in the sample workbook is explicitly marked "now tracked in a separate workbook" by the source data itself — treated as out of scope.
- The `Science`/`Yachts` contact-directory sheets are messy (multi-row records, no ID column). We treat vessel contact info as a nice-to-have reference field, not a required relation, so import doesn't block on cleaning it perfectly.

## Import script findings (worth calling out)
- Each year-sheet's grid leads with a recap of the tail end of the *previous* December before its own January–December — the month header text (not the sheet name) carries the real year, and we dedupe identical (berth, occupant, date) rows across sheets so that recap doesn't get double-counted as a fabricated overlap.
- A day-of-month "header" row in the sheet is mostly decorative (it just has a stray `1` in the first column) — column N of a berth row is reliably day N of that block's month regardless of layout, so we align on column position rather than trying to read day numbers from the sheet.
- Occupant text is classified as a vessel vs. a non-vessel event by a prefix heuristic (`F/V`, `M/V`, `S/V`, `R/V`, `M/Y`, `S/Y`, `OSV`, `Tug`, `Barge`); anything else (e.g. "Community sail day") is treated as an event with no length constraint.
- Vessel length (LOA) is only known when it happens to be embedded in the vessel's own name in the `Science`/`Yachts` roster sheets (e.g. `R/V High Drift 120'`); bookings for vessels without a matching roster entry are imported but skipped in the fit-check rather than assumed to fit.
- Running the import against the sample data found **29 vessel/berth size-mismatches already present in the historical bookings** (mostly `M/V Deep Reef`, a 100' vessel, repeatedly booked into 90'/75'/55' berths) and **zero overlapping-date conflicts** — i.e. this sample data's real problem is the "does it fit" check, not double-booking.

## Validation rules
- Two bookings on the same berth may not have overlapping date ranges.
- A vessel/event may not be booked on a berth shorter than its length (no safety margin assumed unless told otherwise).

_(This file will keep growing as we build — treat it as the live source for the submission form's assumptions question.)_
