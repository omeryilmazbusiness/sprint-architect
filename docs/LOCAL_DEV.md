# Local development (macOS + iOS Simulator)

Run the stack without Replit: PostgreSQL in Docker, Express API on port 5000, Expo app on the simulator.

## Prerequisites

- Node.js 22+
- Docker Desktop
- Xcode (iOS Simulator, e.g. iPhone 17)
- `npm install` in the project root

## Quick start

```bash
cp .env.local.example .env
npm install
npm run dev
```

`npm run dev` starts Postgres, migrates, seeds, the API server, then Expo. Press **i** in the Expo terminal to open the iOS Simulator.

## Manual (two terminals)

**Terminal 1 — database & API**

```bash
cp .env.local.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run server:dev
```

**Terminal 2 — Expo / iOS**

```bash
npm run expo:dev
# or build native dev client:
npm run expo:ios:sim
```

## Environment

| Variable | Local value |
|----------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:55432/healthtour` (Docker; default host port 55432) |
| `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:5000` (Simulator) |

**Physical iPhone:** set `EXPO_PUBLIC_API_URL` to your Mac’s LAN IP, e.g. `http://192.168.1.42:5000`, and ensure the phone and Mac are on the same Wi‑Fi.

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.com` | `Admin123!` |
| Manager | `manager@demo.com` | `Manager123!` |

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start Postgres container |
| `npm run db:down` | Stop Postgres container |
| `npm run dev:setup` | DB up + migrate + seed |
| `npm run test` | Vitest (uses test DB) |
| `npm run expo:ios:sim` | `expo run:ios` on iPhone 17 simulator |

## Troubleshooting

- **`EXPO_PUBLIC_API_URL is not set`** — copy `.env.local.example` to `.env` and restart Expo.
- **Network request failed** — API not running; check `curl http://127.0.0.1:5000/api/health`.
- **DB connection refused** — `docker compose ps` and `npm run db:up`.
- **Simulator name** — list devices: `xcrun simctl list devices available`; adjust `expo:ios:sim` in `package.json`.
- **Port 5432/5433 in use** — Docker uses host port **55432** by default (`POSTGRES_HOST_PORT=55432` in `.env` if you change it).
- **Port 5000 in use** — set `PORT=5001` in `.env` and `EXPO_PUBLIC_API_URL=http://127.0.0.1:5001`.
