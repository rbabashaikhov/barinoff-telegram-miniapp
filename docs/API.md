# API

Base URL: same origin `/api` in production. Locally Vite proxies `/api` to `:3000`.

Authenticated customer endpoints read Telegram `initData` from `x-telegram-init-data`.
In demo mode (`ALLOW_DEMO_MODE=true` or missing bot token) a demo user is used.

Error shape:

```json
{ "error": "Human readable message", "code": "SLOT_UNAVAILABLE" }
```

Optional `details` is present for validation errors.

Dates are `YYYY-MM-DD`. Times are `HH:mm` in `TZ` (default `Europe/Moscow`).

## Public

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Liveness + DB ping. Returns `ok`, `demoMode`, `crmAdapter`. |
| GET | `/api/config` | — | White-label public config. No secrets. |
| GET | `/api/services` | — | Active services |
| GET | `/api/masters` | — | Active masters |
| GET | `/api/masters?serviceId=` | — | Masters offering a service |
| GET | `/api/availability?serviceId=&masterId=&days=` | — | Calendar of slots |
| GET | `/api/availability?serviceId=&masterId=&date=` | — | Slots for one date |

## Customer

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/appointments` | Telegram/demo | Create booking. `201` or `409 SLOT_UNAVAILABLE` |
| GET | `/api/appointments/me` | Telegram/demo | Upcoming bookings. `?includePast=true` for history |
| PATCH | `/api/appointments/:id/cancel` | Telegram/demo | Cancel own booking |
| DELETE | `/api/appointments/:id` | Telegram/demo | Cancel alias |

Create body:

```json
{
  "serviceId": 1,
  "masterId": 1,
  "date": "2026-08-17",
  "startTime": "10:00"
}
```

Identity is the Telegram user id from initData (or demo user `999000001`).

## Admin

If `ADMIN_TOKEN` is set, send `x-admin-token: <token>` or `Authorization: Bearer <token>`.

In production an empty `ADMIN_TOKEN` **locks** `/api/admin` (`401 ADMIN_UNAUTHORIZED`). Local/dev with an empty token still allows a public admin console. Customer booking APIs are unchanged.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/appointments` | All bookings. Filters: `status`, `masterId`, `dateFrom`, `dateTo` |
| GET | `/api/admin/masters` | All masters including inactive |
| GET | `/api/admin/services` | All services including inactive |
| GET | `/api/admin/working-hours` | Schedule. Optional `masterId` |
| GET | `/api/admin/blocked-slots` | Blocked intervals |
| POST | `/api/admin/blocked-slots` | Create a block |
| DELETE | `/api/admin/blocked-slots/:id` | Remove a block |

## Status codes

| Code | When |
|------|------|
| 200/201 | Success |
| 204 | Blocked slot deleted |
| 400 | Validation / already cancelled |
| 401 | Missing Telegram or admin auth |
| 403 | Cancel another customer's booking |
| 404 | Service / master / appointment missing |
| 409 | Slot taken (`SLOT_UNAVAILABLE`) |
| 429 | Booking rate limit |
| 503 | Database unavailable on `/health` |
