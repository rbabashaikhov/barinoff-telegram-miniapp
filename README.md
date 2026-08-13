# Telegram Booking Mini App

CRM-ready Telegram Mini App template for service booking.

Default demo vertical is a barbershop, but the same codebase is a **single-business white-label**: one deployment = one client. Branding, copy, and CRM connection are configuration, not a rewrite.

Live demo: https://telegram-booking-miniapp-production.up.railway.app

## What this is

A production template for:

- Barber Booking
- Beauty Booking
- Massage Booking
- other appointment-based service businesses

Flow:

**Service → Master → Date → Slot → Confirm → Appointment**

It can be shown as a live demo, adapted per vertical, and connected to a customer CRM/ERP without rewriting the frontend or core booking rules.

## Architecture

```
Telegram Mini App / Browser
        ↓
REST API (Express)
        ↓
Application / Domain (booking, availability)
        ↓
Repositories
        ↓
Demo / Local SQLite

+

Integration events
        ↓
CRM adapter (local | webhook | future vendor)
```

- Frontend: React 18, TypeScript, Vite, Telegram WebApp SDK
- Backend: Express, TypeScript, Zod
- Default storage: SQLite (`better-sqlite3`) on a persistent volume
- Business rules (double-booking, working hours, blocked slots, inactive catalog) live in the application layer
- SQLite is the demo/default adapter, not the only possible storage
- CRM is a side effect after a successful local commit

## Demo mode

If the app is opened in a normal browser without Telegram:

- client `demo_client` (`telegram_user_id = 999000001`) is used
- the full booking flow works without a bot
- UI shows a Demo mode banner

Local SQLite is the source of truth. Seed catalog data is inserted only when tables are empty, so production appointments are not overwritten on restart.

## CRM integration

Default: `CRM_ADAPTER=local` — no external calls.

Generic CRM contract:

- `createOrUpdateCustomer()`
- `createBooking()`
- `updateBooking()`
- `cancelBooking()`
- `syncServices()`
- `syncMasters()`

Application events (`booking.created`, `booking.cancelled`, `customer.created`, `booking.updated`) are emitted after the local transaction commits. Adapters subscribe to those events.

### Consistency

**Local-first.** Availability and appointments are committed to SQLite first. CRM/webhook delivery is best-effort: timeout, HTTP errors, and adapter exceptions are logged and never roll back the local booking.

### Webhook adapter

```bash
CRM_ADAPTER=webhook
CRM_WEBHOOK_URL=https://crm.example.com/hooks/booking
CRM_WEBHOOK_SECRET=replace-me
CRM_WEBHOOK_TIMEOUT_MS=5000
```

The app POSTs a JSON envelope:

```json
{
  "event": "booking.created",
  "occurredAt": "2026-08-13T14:22:01.000Z",
  "business": { "name": "Atelier Cut", "type": "barbershop" },
  "data": {
    "localAppointmentId": 12,
    "status": "confirmed",
    "date": "2026-08-17",
    "startTime": "10:00",
    "endTime": "11:00",
    "service": { "id": 1, "name": "Мужская стрижка", "price": 1500, "durationMinutes": 60 },
    "master": { "id": 1, "name": "Александр", "role": "Senior Barber" },
    "customer": { "telegramUserId": 111, "firstName": "Ivan", "localClientId": 4 }
  }
}
```

Headers:

- `X-Webhook-Signature: sha256=<hmac>`
- `Authorization: Bearer <CRM_WEBHOOK_SECRET>`
- `X-Webhook-Event: booking.created`

Verify HMAC-SHA256 of the raw body using `CRM_WEBHOOK_SECRET`. Secrets stay on the server; `/api/config` never exposes them.

Vendor adapters (Bitrix24, amoCRM, YCLIENTS, Altegio) should be added as extra files under `backend/src/integrations/crm/adapters/` and selected via `CRM_ADAPTER`.

Optional `CRM_SYNC_ON_STARTUP=true` pushes services/masters on boot. Keep it off unless the CRM endpoint is idempotent — Railway restarts would otherwise repeat the sync.

## White-label

One deployment = one business. Change env, not the React tree:

| Variable | Default |
|----------|---------|
| `BUSINESS_NAME` | `Atelier Cut` |
| `BUSINESS_TYPE` | `barbershop` |
| `APP_TITLE` | `Service Booking` |
| `APP_DESCRIPTION` | Онлайн-запись… |

Public values are served at `GET /api/config` and used on the home screen.

Catalog (services, masters, hours) is data. For a beauty salon, replace seed data or edit SQLite; do not fork the app.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Admin: http://localhost:5173/admin

Docker Compose:

```bash
DOCKER_HOST=unix:///var/run/docker.sock docker compose up --build
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | yes in prod | `development` / `production` |
| `APP_URL` | yes in prod | Public origin for CORS |
| `API_PORT` / `PORT` | no | Default `3000` |
| `DATABASE_PATH` | yes in prod | `/data/booking.db` on Railway |
| `TELEGRAM_BOT_TOKEN` | for real Telegram | HMAC validation of initData |
| `ALLOW_DEMO_MODE` | demo | `true` for browser QA |
| `TZ` | no | Default `Europe/Moscow` |
| `PUBLIC_DIR` | prod image | Static frontend directory |
| `VITE_API_URL` | no | Empty = same-origin `/api` |
| `BUSINESS_NAME` | no | White-label name |
| `BUSINESS_TYPE` | no | Eyebrow / vertical label |
| `APP_TITLE` | no | Document title |
| `APP_DESCRIPTION` | no | Home lead text |
| `ADMIN_TOKEN` | client prod | Protects `/admin` and `/api/admin/*` |
| `CRM_ADAPTER` | no | `local` (default), `webhook`, `mock` |
| `CRM_WEBHOOK_URL` | if webhook | Destination URL |
| `CRM_WEBHOOK_SECRET` | recommended | HMAC + Bearer |
| `CRM_WEBHOOK_TIMEOUT_MS` | no | Default `5000` |
| `CRM_SYNC_ON_STARTUP` | no | Default `false` |
| `RATE_LIMIT_WINDOW_MS` | no | Default `60000` |
| `RATE_LIMIT_MAX` | no | Default `20` booking POSTs / IP / window |

Never commit `.env`. Secrets are not sent to the frontend.

## Admin

`/admin` is an operational console: appointments with filters, masters, services, working hours, blocked slots.

- Demo: `ADMIN_TOKEN` empty → public (acceptable for the public demo).
- Client-ready: set `ADMIN_TOKEN` and open `/admin`, paste the token. Requests send `x-admin-token`.

## Telegram Mini App

1. Create a bot in [@BotFather](https://t.me/BotFather).
2. Put `TELEGRAM_BOT_TOKEN` in env.
3. Deploy HTTPS.
4. BotFather → Menu Button / Web App URL → `APP_URL`.
5. For a real bot, `ALLOW_DEMO_MODE=false` and a non-empty `ADMIN_TOKEN`.

Backend validates `x-telegram-init-data` per [Telegram docs](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

## API

See [docs/API.md](docs/API.md).

Double-booking is prevented per master inside a SQLite transaction (overlap check + busy intervals from appointments and blocked slots). Two masters may share the same clock time.

## Database

SQLite tables:

- `services`, `masters`, `master_services`
- `clients` (keyed by `telegram_user_id`)
- `appointments` (`confirmed` / `cancelled`, required `master_id`)
- `working_hours`, `blocked_slots`
- `schema_migrations`

`applySchema()` is idempotent and backward-safe. Existing Railway files are not wiped. Seed runs only when a catalog table is empty.

First-run seed: 4 services, 5 masters, per-master hours, all masters offer all services.

## Scripts

```bash
npm run build
npm run lint
npm run typecheck
npm run test
```

## Deployment (Railway)

Root `Dockerfile` + `railway.toml`, one service:

1. Connect GitHub repo `telegram-booking-miniapp`.
2. Volume mount `/data`, `DATABASE_PATH=/data/booking.db`.
3. Env: `NODE_ENV=production`, `APP_URL`, `TZ`, `ALLOW_DEMO_MODE` as needed, optional `TELEGRAM_BOT_TOKEN`, `ADMIN_TOKEN`, CRM vars.
4. Healthcheck: `GET /api/health`.

Redeploy does not delete appointments while the volume stays mounted.

## Extension points

| Add | Where |
|-----|--------|
| Bitrix24 / amoCRM / YCLIENTS / Altegio | `backend/src/integrations/crm/adapters/<vendor>.ts`, then `CRM_ADAPTER=` |
| PostgreSQL | new repository implementation of `backend/src/repositories/types.ts` |
| Analytics | `eventBus.on('booking.created', …)` in `backend/src/integrations/` |
| Payments | after confirm, before or after `createAppointment` — keep slot lock in the booking transaction |
| Telegram notifications | same event handlers; do not put HTTP in `services/booking.ts` |

## Project layout

```
backend/src/
  db/                 schema, seed, migrations
  repositories/       SQLite adapters behind interfaces
  services/           booking + availability
  events/             in-process application events
  integrations/crm/   local / webhook / mock adapters
  routes/             HTTP
  middleware/         Telegram auth, admin token, rate limit
frontend/src/         Mini App UI
docs/API.md
```
