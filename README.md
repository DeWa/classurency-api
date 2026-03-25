# Classurency API

Backend API for [**Classurency**](https://github.com/DeWa/classurency): user accounts, balances, NFC-linked wallet accounts, transfers, item purchases, and an append-only block chain of transaction hashes. Built with [NestJS](https://nestjs.com/), [TypeORM](https://typeorm.io/), and PostgreSQL.

## Requirements

- **Node.js** 20+ (the project targets modern TypeScript / ES2023)
- **PostgreSQL** 16+ (or use the bundled Docker service)

## Quick start

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Generate two 32-byte keys (required):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Run it twice and set `CLASSURENCY_MASTER_KEY` and `CLASSURENCY_CARD_EXPORT_KEY` in `.env`.

3. **Database**

   Start Postgres (matches `.env.example` defaults):

   ```bash
   npm run db:up
   ```

   Apply migrations:

   ```bash
   npm run migration:run
   ```

4. **Run the API**

   ```bash
   npm run start:dev
   ```

   The server listens on `PORT` (default `3000`). Health-style probe: `GET /api/v1`.

## Configuration

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `CLASSURENCY_MASTER_KEY` | 32-byte key, base64 — encryption/signing material |
| `CLASSURENCY_CARD_EXPORT_KEY` | 32-byte key, base64 — card-related crypto |
| `SWAGGER_ENABLED` | Set to `false` to disable Swagger when not in production |
| `SWAGGER_PATH` | Path segment for Swagger UI (default `docs`) |
| `SWAGGER_WRITE_ON_BOOT` | `false` to skip writing `docs/openapi.json` on boot |
| `SWAGGER_OUTPUT_PATH` | OpenAPI JSON output path (default `docs/openapi.json`) |

Swagger UI is **not** served when `NODE_ENV=production` (regardless of `SWAGGER_ENABLED`).

## API overview

- **Base URL**: `/api/v1` (global prefix `api`, URI version `v1`).
- **Authentication**: Send an API token either as `Authorization: Bearer <token>` or `x-api-token: <token>`. Tokens are issued per user and carry a privilege level (`user`, `provider`, `admin`).

Rough map of routes (see OpenAPI for request bodies and schemas):

| Method | Path | Privilege |
|--------|------|-----------|
| `GET` | `/api/v1` | None |
| `POST` | `/api/v1/users` | `admin` |
| `POST` | `/api/v1/accounts` | `admin` |
| `POST` | `/api/v1/transactions/transfer` | at least `user` |
| `POST` | `/api/v1/transactions/purchase-item` | at least `user` |
| `POST` | `/api/v1/admin/mint` | `admin` |
| `POST` | `/api/v1/tokens` | `user` (issues a token for the authenticated user) |

Creating the first admin user and API token is not exposed as a public endpoint; use your operational process (e.g. direct database seed or one-off script) for bootstrap.

## OpenAPI / Swagger

- **Swagger UI** (development): `http://localhost:<PORT>/<SWAGGER_PATH>` (default `http://localhost:3000/docs`).
- **Spec file**: `docs/openapi.json` (checked in; regenerated on build and optionally on boot).

**Automatic updates**

- On app boot: enabled by default (`SWAGGER_WRITE_ON_BOOT=true`; set `false` to disable).
- On build: `npm run build` runs `postbuild`, which regenerates `docs/openapi.json`.

**Manual generation**

```bash
npm run swagger:generate
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start once |
| `npm run start:dev` | Watch mode |
| `npm run start:prod` | Run compiled `dist/src/main.js` |
| `npm run build` | Compile + OpenAPI export |
| `npm run db:up` / `npm run db:down` | Start/stop Postgres via Docker Compose |
| `npm run migration:run` | Run TypeORM migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:generate --name=MyMigration` | Generate a new migration from entity drift |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` / `npm run test:e2e` | Unit / e2e tests |

## License

GPLv3 — see `LICENCE`.
