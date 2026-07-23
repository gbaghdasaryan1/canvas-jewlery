# Backend Prompt — Cairn Jewelry Studio

## Project Context

You are building the backend for **Cairn Jewelry Studio** — a bespoke jewelry ordering platform where customers design relief pieces from real-world mountains/cityscape data (mountains, streets, maps) or custom image silhouettes. The existing frontend is a Vite + React 18 + TypeScript SPA with no backend. You are adding the first backend.

**Goal**: Replace the `mailto:` checkout flow with a real order pipeline, add user accounts, saved designs, and an admin CRM.

---

## Tech Stack

- **Framework**: NestJS (latest) with modular architecture
- **ORM**: TypeORM with PostgreSQL
- **Cache / Queue**: Redis (via `ioredis` + `@nestjs/bull` / BullMQ for job queues)
- **Auth**: JWT (access + refresh tokens), bcrypt, `@nestjs/passport`
- **Validation**: `class-validator` + `class-transformer`, DTOs on every endpoint
- **Config**: `@nestjs/config` with `.env` and Joi schema validation
- **File storage**: Local `multer` + S3-compatible bucket (AWS S3 or MinIO) via `@aws-sdk/client-s3`
- **Email**: `nodemailer` (SMTP) wrapped in `@nestjs/mailer` + Handlebars templates
- **API**: REST + OpenAPI via `@nestjs/swagger`
- **Testing**: Jest unit tests + Supertest e2e, separate test DB

---

## Database Schema (PostgreSQL via TypeORM)

### `users`

| Column    | Type                         | Notes              |
| --------- | ---------------------------- | ------------------ |
| id        | UUID PK                      |                    |
| email     | varchar(255) UNIQUE NOT NULL |                    |
| password  | varchar(255) NOT NULL        | bcrypt hashed      |
| name      | varchar(255)                 |                    |
| phone     | varchar(50)                  |                    |
| role      | enum('customer','admin')     | DEFAULT 'customer' |
| createdAt | timestamptz                  |                    |
| updatedAt | timestamptz                  |                    |
| deletedAt | timestamptz                  | soft delete        |

### `designs`

| Column      | Type                                          | Notes                        |
| ----------- | --------------------------------------------- | ---------------------------- |
| id          | UUID PK                                       |                              |
| userId      | UUID FK → users                               | nullable — guest designs     |
| type        | enum('mountains','skyline','pendant')         |                              |
| name        | varchar(255)                                  | place name or custom label   |
| snapshot    | jsonb                                         | full design config object    |
| stlUrl      | varchar(500)                                  | S3 URL to STL file           |
| previewUrl  | varchar(500)                                  | S3 URL to preview PNG        |
| metalType   | enum('silver','gold','platinum')              |                              |
| shapeType   | enum('rectangle','heart','circle','freeform') |                              |
| pricedAmd   | integer                                       | price in AMD at time of save |
| weightGrams | numeric(8,3)                                  |                              |
| createdAt   | timestamptz                                   |                              |
| updatedAt   | timestamptz                                   |                              |

### `orders`

| Column          | Type                                                                          | Notes                        |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| id              | UUID PK                                                                       |                              |
| orderNumber     | varchar(20) UNIQUE                                                            | e.g. `CRN-2026-0001`         |
| userId          | UUID FK → users                                                               | nullable — guest orders      |
| status          | enum('pending','confirmed','in_production','shipped','delivered','cancelled') |                              |
| totalAmd        | integer                                                                       |                              |
| currency        | varchar(10)                                                                   | DEFAULT 'AMD'                |
| customerNote    | text                                                                          |                              |
| shippingAddress | jsonb                                                                         | {name, phone, city, address} |
| trackingNumber  | varchar(100)                                                                  |                              |
| confirmedAt     | timestamptz                                                                   |                              |
| shippedAt       | timestamptz                                                                   |                              |
| deliveredAt     | timestamptz                                                                   |                              |
| createdAt       | timestamptz                                                                   |                              |
| updatedAt       | timestamptz                                                                   |                              |

### `order_items`

| Column      | Type                             | Notes |
| ----------- | -------------------------------- | ----- |
| id          | UUID PK                          |       |
| orderId     | UUID FK → orders                 |       |
| designId    | UUID FK → designs                |       |
| quantity    | smallint                         |       |
| metalType   | enum('silver','gold','platinum') |       |
| pricedAmd   | integer                          |       |
| weightGrams | numeric(8,3)                     |       |

### `refresh_tokens`

| Column    | Type         | Notes         |
| --------- | ------------ | ------------- |
| id        | UUID PK      |               |
| userId    | UUID FK      |               |
| token     | varchar(512) | bcrypt hashed |
| expiresAt | timestamptz  |               |
| createdAt | timestamptz  |               |

### `uploads`

| Column    | Type                                  | Notes    |
| --------- | ------------------------------------- | -------- |
| id        | UUID PK                               |          |
| userId    | UUID FK                               | nullable |
| key       | varchar(500)                          | S3 key   |
| url       | varchar(500)                          |          |
| mimeType  | varchar(100)                          |          |
| sizeBytes | integer                               |          |
| purpose   | enum('pendant-image','stl','preview') |          |
| createdAt | timestamptz                           |          |

---

## NestJS Module Structure

```
src/
  auth/           — register, login, refresh, logout, JWT guards
  users/          — CRUD, profile, address book
  designs/        — save/list/get/delete designs, attach STL/preview
  orders/         — create order, status transitions, admin updates
  uploads/        — presigned S3 upload, confirm, metadata
  pricing/        — POST /pricing/estimate (volume → AMD)
  notifications/  — email templates (order confirmed, shipped, etc.)
  admin/          — admin-only routes (order list, status change, stats)
  common/         — guards, decorators, interceptors, pipes, filters
  config/         — AppConfigModule with Joi schema
  database/       — TypeORM module, migrations
  redis/          — RedisModule wrapping ioredis
  queue/          — BullMQ queues (email-queue, stl-processing-queue)
```

---

## API Endpoints

### Auth

```
POST   /auth/register          body: { email, password, name } → { accessToken, refreshToken }
POST   /auth/login             body: { email, password }       → { accessToken, refreshToken }
POST   /auth/refresh           body: { refreshToken }          → { accessToken, refreshToken }
POST   /auth/logout            body: { refreshToken }          → 204
GET    /auth/me                                                 → UserDto
```

### Users

```
GET    /users/me               → UserDto
PATCH  /users/me               body: { name?, phone? }         → UserDto
PATCH  /users/me/password      body: { oldPassword, newPassword }
GET    /users/me/orders        query: { page, limit }          → PaginatedOrderDto
```

### Designs

```
POST   /designs                body: DesignCreateDto           → DesignDto
GET    /designs                query: { page, limit, type?, metal?, shape? } → Paginated
GET    /designs/:id            → DesignDto
PATCH  /designs/:id            body: DesignUpdateDto           → DesignDto
DELETE /designs/:id            → 204
POST   /designs/:id/duplicate  → DesignDto
```

### Orders

```
POST   /orders                 body: { items: [{designId, quantity, metalType}], shippingAddress, customerNote? }
GET    /orders/:id             → OrderDto
POST   /orders/:id/cancel      → OrderDto (only status=pending)
```

### Admin

```
GET    /admin/orders           query: { page, limit, status?, from?, to? } → Paginated
GET    /admin/orders/:id       → OrderDto (full detail)
PATCH  /admin/orders/:id/status body: { status, trackingNumber? }
GET    /admin/stats            → { byStatus: Record<Status,number>, revenueAmd: number }
```

### Uploads

```
POST   /uploads/presign        body: { filename, mimeType, purpose } → { uploadUrl, key, publicUrl }
POST   /uploads/confirm        body: { key }                         → UploadDto
```

### Pricing

```
POST   /pricing/estimate       body: { volumeMm3: number, metal: 'silver'|'gold'|'platinum' }
                               → { grams: number, amd: number }
```

---

## Business Logic

### Pricing Service

Mirror the frontend formula exactly — same constants, same calculation:

```typescript
const SILVER_DENSITY = 10.49; // g/cm³
const AMD_PER_GRAM_SILVER = 4000;
const METAL_PRICE_FACTOR = { silver: 1, gold: 3.2, platinum: 4.0 };

function estimate(volumeMm3: number, metal: Metal) {
  const volumeCm3 = volumeMm3 / 1000;
  const grams = volumeCm3 * SILVER_DENSITY;
  const amd = Math.round(grams * AMD_PER_GRAM_SILVER * METAL_PRICE_FACTOR[metal]);
  return { grams, amd };
}
```

Accept either `volumeMm3` directly or an array of mesh triangles and compute volume server-side using the divergence theorem (same as frontend `meshVolumeMm3()`).

### Order Number Generation

Sequential per year using a Redis counter with yearly reset:

```
INCR cairn:order-seq:2026  →  CRN-2026-0001
```

Zero-pad to 4 digits. Store in the `orders.orderNumber` column.

### Order Status Machine

Enforce transitions in a guard. Only these transitions are valid:

```
pending → confirmed → in_production → shipped → delivered
pending → cancelled  (customer or admin)
confirmed → cancelled  (admin only)
```

All transitions beyond `pending → cancelled` are admin-only.

### File Uploads (S3 Presigned Flow)

1. Frontend calls `POST /uploads/presign` → receives presigned S3 PUT URL + key
2. Frontend uploads file directly to S3 (bypasses backend bandwidth)
3. Frontend calls `POST /uploads/confirm` with key → backend records metadata
4. Validate mimeType and size constraints server-side when confirming:
   - Pendant images: max 20 MB, `image/png | image/jpeg | image/webp`
   - STL: max 50 MB, `model/stl | application/octet-stream`

### Email Notifications (BullMQ)

Enqueue jobs on status transitions, process in a dedicated worker:

| Trigger           | Template          | Data                              |
| ----------------- | ----------------- | --------------------------------- |
| `order.confirmed` | `order-confirmed` | orderNumber, items, totalAmd, ETA |
| `order.shipped`   | `order-shipped`   | orderNumber, trackingNumber       |
| `order.cancelled` | `order-cancelled` | orderNumber, reason               |

Templates live in `src/notifications/templates/*.hbs`.

### Redis Usage

| Purpose              | Key pattern            | TTL    |
| -------------------- | ---------------------- | ------ |
| Admin stats cache    | `cairn:stats`          | 60 s   |
| Order number counter | `cairn:order-seq:YYYY` | —      |
| Rate limit (auth)    | `rl:auth:{ip}`         | 15 min |
| BullMQ backing store | BullMQ default keys    | —      |

---

## Auth & Security

- **JWT access token**: 15 min expiry, signed with `JWT_ACCESS_SECRET`
- **JWT refresh token**: 30 day expiry, stored hashed (bcrypt) in `refresh_tokens` table
- **Refresh token rotation**: each `/auth/refresh` issues a new pair and invalidates the old refresh token
- **Guards**: `JwtAuthGuard` as global default; `@Public()` decorator to opt out; `RolesGuard` + `@Roles('admin')` for admin routes
- **Guest support**: `userId` nullable on orders/designs — guests can order by providing an email in `shippingAddress`
- **Rate limiting**: `nestjs-throttler` with Redis store, 10 requests / 15 min on all auth endpoints
- **Helmet** middleware on all routes
- **CORS**: whitelist frontend origin(s) from config

---

## Environment Variables

```env
# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cairn
DB_USER=cairn
DB_PASS=secret

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<random-32-bytes>
JWT_REFRESH_SECRET=<random-32-bytes>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# S3 / MinIO
S3_REGION=us-east-1
S3_BUCKET=cairn-assets
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=          # set for MinIO, leave blank for AWS

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hello@cairn.studio
SMTP_PASS=...
MAIL_FROM="Cairn Studio <hello@cairn.studio>"

# Admin
ADMIN_EMAIL=hello@cairn.studio
```

Validate all vars at startup with a Joi schema inside `AppConfigModule`. Fail fast if any required var is missing.

---

## Migrations & Seeding

- Use TypeORM CLI: `typeorm migration:generate`, `typeorm migration:run`
- Naming convention: `YYYYMMDDHHMMSS-DescriptiveName`
- Seed script (`npm run seed`):
  - Create one admin user (`ADMIN_EMAIL` from env, password from `ADMIN_SEED_PASS`)
  - Insert 5 sample designs using real PRESETS coordinates (Matterhorn, Yosemite, etc.)

---

## Docker Compose (Dev)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: cairn
      POSTGRES_USER: cairn
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

volumes:
  pgdata:
  miniodata:
```

NestJS app runs on host with `npm run start:dev`, pointing at containerized services.

---

## Testing Strategy

### Unit Tests

- `PricingService` — verify AMD output matches frontend for known volumes
- `OrderService` — all valid/invalid status transitions
- `AuthService` — token generation, refresh rotation, logout invalidation

### E2E Tests (Supertest)

1. Register → login → save design → create order → get order
2. Admin login → list orders → change status → verify BullMQ job enqueued
3. Upload presign → confirm → attach to design
4. Rate limit: 11th login attempt within window returns 429

Use a dedicated `cairn_test` database. Spin up via Docker Compose in CI.

---

## Deliverables Checklist

- [ ] All modules scaffolded with `nest generate`
- [ ] TypeORM entities matching schema above with proper relations
- [ ] All migrations generated and runnable
- [ ] All REST endpoints with full Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- [ ] Auth flow complete (register / login / refresh / logout)
- [ ] Order lifecycle (create → transitions → email notifications)
- [ ] S3 presigned upload flow with server-side validation
- [ ] Pricing service matching frontend constants exactly
- [ ] Redis caching on admin stats + rate limiting on auth
- [ ] BullMQ email queue wired to nodemailer + Handlebars templates
- [ ] Unit tests for pricing, order state machine, auth
- [ ] E2E tests for critical flows
- [ ] Docker Compose for local dev (postgres, redis, minio)
- [ ] README with: setup steps, env vars table, API overview, seeding instructions
