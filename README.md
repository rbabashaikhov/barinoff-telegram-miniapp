# Telegram Booking Mini App

MVP Telegram Mini App для онлайн-записи к барберу.

Локальный прототип: выбор услуги → дата → слот → подтверждение → сохранение в SQLite → просмотр/отмена записей и простая `/admin` страница.

## Архитектура

```
Browser / Telegram WebView
        │
        ▼
   Single service (Express)
   ├── /           React static
   └── /api/*      REST API
        │
        ▼
   SQLite (persistent volume)
```

- Frontend и backend — отдельные пакеты в npm workspaces.
- В production (Railway / root Dockerfile) один сервис отдаёт UI и API.
- Локально: `npm run dev` (Vite + API) или `docker compose` (nginx + API).
- Auth: Telegram `initData` (HMAC-SHA256). В demo mode без Telegram используется тестовый клиент.

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React 18, TypeScript, Vite, React Router, `@twa-dev/sdk` |
| Backend | Node.js, Express, TypeScript, Zod |
| DB | SQLite (`better-sqlite3`), WAL |
| Infra | Docker, Docker Compose |

## Локальный запуск

### Вариант A — Docker Compose (рекомендуется для демо)

```bash
cp .env.example .env
docker compose up --build
```

Если `docker compose` ругается на Docker Desktop socket, используйте системный Docker:

```bash
DOCKER_HOST=unix:///var/run/docker.sock docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Admin: http://localhost:5173/admin

SQLite хранится в Docker volume `sqlite_data` (`/app/data/booking.db`).

### Вариант B — npm workspaces (разработка)

```bash
cp .env.example .env
npm install
npm run dev
```

Отдельно:

```bash
npm run dev -w backend   # :3000
npm run dev -w frontend  # :5173
```

## Environment variables

См. `.env.example`.

| Variable | Описание |
|----------|----------|
| `NODE_ENV` | `development` / `production` |
| `APP_URL` | URL фронтенда (CORS) |
| `API_PORT` | Порт API (default `3000`) |
| `TELEGRAM_BOT_TOKEN` | Токен бота для проверки `initData` |
| `ALLOW_DEMO_MODE` | Разрешить demo user без Telegram (`true`/`false`) |
| `DATABASE_PATH` | Путь к SQLite файлу |
| `TZ` | Таймзона слотов (default `Europe/Moscow`) |
| `VITE_API_URL` | Base URL API для фронта (пусто = same-origin `/api`) |

Секреты не коммитить. Файл `.env` в `.gitignore`.

## Telegram Mini App configuration

1. Создать бота в [@BotFather](https://t.me/BotFather).
2. Получить `TELEGRAM_BOT_TOKEN`, положить в `.env`.
3. Задеплоить HTTPS URL приложения.
4. В BotFather: Bot Settings → Menu Button / Web App URL → указать `APP_URL`.
5. Для production: `ALLOW_DEMO_MODE=false`.

Backend читает заголовок `x-telegram-init-data` и валидирует подпись по [документации Telegram](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

## Demo mode

Если приложение открыто в обычном браузере без Telegram:

- используется клиент `demo_client` (`telegram_user_id = 999000001`);
- весь booking flow доступен без бота;
- в UI показывается баннер Demo mode.

Это сделано специально для локального QA и показа заказчику по ссылке.

## Структура проекта

```
telegram-booking-miniapp/
├── backend/
│   ├── src/
│   │   ├── db/           # schema, seed
│   │   ├── middleware/   # Telegram auth
│   │   ├── routes/       # REST handlers
│   │   ├── services/     # booking + tests
│   │   └── index.ts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── styles.css
│   ├── nginx.conf
│   └── Dockerfile
├── Dockerfile          # single-service production image
├── railway.toml
├── docker-compose.yml
├── .env.example
└── README.md
```

## API

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| GET | `/api/health` | — | Healthcheck |
| GET | `/api/services` | — | Активные услуги |
| GET | `/api/availability?serviceId=&days=` | — | Календарь слотов |
| GET | `/api/availability?serviceId=&date=` | — | Слоты на дату |
| POST | `/api/appointments` | Telegram/demo | Создать запись |
| GET | `/api/appointments/me` | Telegram/demo | Мои будущие записи |
| PATCH | `/api/appointments/:id/cancel` | Telegram/demo | Отменить |
| DELETE | `/api/appointments/:id` | Telegram/demo | Отменить (alias) |
| GET | `/api/admin/appointments` | — | Все записи (MVP без auth) |

Создание записи защищено от double booking на backend (транзакция + overlap check).

## Database

Таблицы:

- `services` — услуги
- `clients` — клиенты по `telegram_user_id`
- `appointments` — записи (`confirmed` / `cancelled`)
- `working_hours` — расписание по weekday (0=вс … 6=сб)
- `blocked_slots` — опциональные блокировки

Seed при первом запуске:

- 4 услуги (стрижки/борода)
- Пн–Сб 10:00–20:00, вс — выходной

## Scripts

```bash
npm run build       # backend + frontend
npm run lint        # eslint
npm run typecheck   # tsc
npm run test        # vitest (booking logic)
```

## Deployment notes

### Railway (рекомендуется для demo)

Один сервис из корневого `Dockerfile` + `railway.toml`:

1. Подключить GitHub repo `telegram-booking-miniapp`.
2. Build: Dockerfile (root).
3. Volume: mount path `/data`, переменная `DATABASE_PATH=/data/booking.db`.
4. Env:
   - `NODE_ENV=production`
   - `DATABASE_PATH=/data/booking.db`
   - `ALLOW_DEMO_MODE=true` (для browser demo)
   - `APP_URL=https://<your-railway-domain>`
   - `TZ=Europe/Moscow`
   - `TELEGRAM_BOT_TOKEN=` (опционально до подключения бота)
5. Healthcheck: `GET /api/health`.
6. После выдачи публичного HTTPS URL обновить `APP_URL`.

Redeploy не должен удалять записи, пока volume смонтирован на `/data`.

### Локальный single-service Docker

```bash
DOCKER_HOST=unix:///var/run/docker.sock docker build -t booking-demo .
DOCKER_HOST=unix:///var/run/docker.sock docker run --rm -p 3000:3000 \
  -e ALLOW_DEMO_MODE=true \
  -e APP_URL=http://localhost:3000 \
  -v booking_data:/data \
  booking-demo
```

HTTPS обязателен для Telegram Mini App.
