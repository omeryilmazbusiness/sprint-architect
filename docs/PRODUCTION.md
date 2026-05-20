# Production deployment

## Prerequisites

- PostgreSQL 16+ (managed or self-hosted)
- S3-compatible object storage
- SMTP relay (transactional email)
- HTTPS reverse proxy in front of the API

## Environment

Copy [`.env.production.example`](../.env.production.example) to your secrets store. The server **refuses to start** in `NODE_ENV=production` when:

| Variable | Requirement |
|----------|-------------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Not dev defaults |
| `SESSION_SECRET` | ≥ 32 chars, not a placeholder |
| `STORAGE_PROVIDER` | Must be `s3` |
| `S3_*` | Bucket, region, credentials |
| `SMTP_*` | Host, port, user, pass, from |

## Deploy API

```bash
npm ci
npm run db:migrate
npm run server:build
NODE_ENV=production node server_dist/index.js
```

CI/CD: push to `main` runs [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) (rsync + pm2).

## Health check

```bash
curl -s https://api.example.com/api/health | jq .
```

- `200` + `status: "ok"` — DB reachable
- `503` + `status: "down"` — DB unreachable (load balancer should drain)

## Migrations

- **Dev:** `npm run db:push` (schema sync)
- **Prod:** prefer versioned SQL: `npm run db:generate` then review `migrations/` before apply

## Test database (CI / local)

```bash
npm run db:up
npm run db:test:ensure
npm run test:db:reset
npm test
```
