# MATRIX — Premium Furniture Commerce

A **work-in-progress** monorepo for the Ukrainian furniture manufacturer MATRIX.

> **Not ready for live orders.** Catalog content is unpriced and unpublished pending verified merchant data. Secure checkout, production payments, administrative CRUD and full-stack integration remain incomplete.

## Technology

- **Storefront:** Next.js App Router, React 19, TypeScript, Ukrainian + English routes.
- **Backend:** Go 1.23+, HTTP REST scaffold and unit-tested exact-money pricing library.
- **Database:** PostgreSQL 16 schema, SQL migrations and fact-checked draft product seed.
- **Infrastructure:** Docker Compose development database, GitHub Actions CI.
- **Research:** source audit, payment provider integration assessment and metadata-only auditing tool.

## Prerequisites
Node.js 22+, npm, Go 1.23+, Docker and Docker Compose.

## Start from a clean checkout

```bash
git clone https://github.com/ElizeusX/MATRIX.git
cd MATRIX
cp .env.example .env
docker compose up -d db
docker compose exec -T db psql -U matrix -d matrix < database/migrations/001_init.sql
docker compose exec -T db psql -U matrix -d matrix < database/seeds/verified_catalog.sql
```

Start the API in terminal 1:

```bash
cd services/api
go test ./...
go run ./cmd/server
```

Start the frontend in terminal 2:

```bash
cd apps/web
npm install
npm run dev
```

- Ukrainian storefront: http://localhost:3000/uk
- English storefront: http://localhost:3000/en
- Go API health: http://localhost:8080/health
- Initial product endpoint: http://localhost:8080/api/v1/products

The product API currently returns an empty list; frontend verified entries are a read-only preview, not database-connected products. Checkout and admin purchase functions are intentionally not enabled.

## Repository structure

```
apps/web/                 Frontend and localized storefront
services/api/             Go service and money calculations
database/migrations/      PostgreSQL schema
database/seeds/           Verified draft catalog seed
scripts/import/           Metadata-only source auditing
docs/                     Source research, architecture and operations
.github/workflows/        CI configuration
```

## Pricing rules

All canonical base prices use **UAH minor units**, never floating-point money. A global adjustment is recomputed from each base price; product-specific adjustments apply next. Active product-specific discounts override active global discounts. Promotions have UTC start/end timestamps with a half-open validity interval. See `services/api/internal/pricing` and `docs/ARCHITECTURE.md`.

## Content and payments

Original photos and descriptions from https://matrix-mebli.com may only be copied with documented rights. No photos have been imported. Source prices and stock status were not verified, so no fictional products are purchasable.

Payment provider research: LiqPay and monobank official docs. The live integrations are **not implemented or activated**. Merchant credentials, webhook validation and idempotent payment processing are required before taking transactions.

## Documentation

- [Source audit](docs/SOURCE_AUDIT.md)
- [Architecture and pricing contract](docs/ARCHITECTURE.md)
- [Operations and deployment readiness](docs/RUNBOOK.md)

## Security notes

Do not commit secrets. Do not expose the unfinished API as an Internet-facing commerce production service. Public admin credentials are never seeded.

## Remaining release blockers

Database-connected API, protected admin dashboard, complete multilingual content, media rights, inventory, prices, persisted cart, checkout, provider sandbox, shipping workflow, transactional email, tests beyond the Go pricing core, and verified production builds.
