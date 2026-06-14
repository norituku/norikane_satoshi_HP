# Testing

## Local

- Unit and coverage: `corepack pnpm test:coverage`
- E2E smoke: `corepack pnpm test:e2e`
- Real Resend send: `corepack pnpm e2e:resend:real-send`

`e2e:resend:real-send` is a manual external-send check. It is intentionally outside CI.

## Staging Baseline

Before restoring the 41238 staging branch from a known-good chatbot baseline, run:

`corepack pnpm verify:staging-baseline -- --base ccba8e32 --allow src/app/globals.css --allow src/app/layout.tsx`

This check must stay read-only. It verifies that the staging diff is limited to the approved font files plus the baseline guard files.

## CI Secrets

The unit job does not require production secrets. The E2E job uses an isolated SQLite/libSQL file by default and runs with test-only values for:

- `AUTH_SECRET`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `GOOGLE_CALENDAR_BUSY_SOURCE_ID`

For a dedicated remote Turso test database, add repository secrets with those names and adjust the workflow `env` block to read from secrets instead of the file-backed defaults.
