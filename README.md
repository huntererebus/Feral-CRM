# Reel

A multi-tenant, white-label client media CRM and review portal for
content-production agencies. Agencies manage clients, projects, and the
full production pipeline — upload, editor assignment, draft review,
revisions, final approval, and delivery — all under their own branded
subdomain.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL via Prisma
- Auth.js (credentials login, database sessions)
- Cloudflare R2 for media storage
- Resend for transactional email
- Vitest for unit tests

## Status

Six stages in: schema and multi-tenant auth, organization/client CRUD,
projects with a full status-transition pipeline, media upload, review and
approval, and messaging/notifications. All backend — a real dashboard UI
is in progress. See [SETUP.md](./SETUP.md) for the full stage-by-stage
build log, environment setup, and architectural notes.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET at minimum
npx prisma generate
npx prisma migrate dev
npm test
```

See [SETUP.md](./SETUP.md) for details on every environment variable and
what each build stage delivered.
