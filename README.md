# MATRIX — Premium Furniture Commerce

A full-stack **work-in-progress** commerce application for MATRIX, a furniture manufacturer based in Cherkasy, Ukraine.

**Security and readiness:** This is not yet an audited production release. The merchant must confirm catalog prices and availability, rights to photographs, legal policies, delivery methods and payment-provider credentials before the store takes real orders.

## Stack
- Next.js 16 App Router, React 19, TypeScript; Ukrainian and English customer-facing routes
- Go REST API, PostgreSQL 16, exact integer-minor-unit price engine
- Admin sessions with bcrypt password hashes and HttpOnly cookies
- Docker Compose (web, API, database), GitHub Actions, Go unit tests

## Quick start — Docker
```bash
git clone https://github.com/ElizeusX/MATRIX.git
cd MATRIX
cp .env.example .env
docker compose up -d db
docker compose exec -T db psql -U matrix -d matrix < database/migrations/001_init.sql
docker compose exec -T db psql -U matrix -d matrix < database/migrations/002_operations.sql
docker compose exec -T db psql -U matrix -d matrix < database/seeds/verified_catalog.sql
docker compose up -d --build api web
```
Visit http://localhost:3000/uk, http://localhost:3000/en and http://localhost:3000/admin.

> Important: Seed data contains **76 draft, unpublished MATRIX product records with no prices**. Nothing is offered for purchase until an authenticated admin fills the price, publishes the product and sets availability.

## Create first administrator (one time)
Do not seed a public default password. From the project root:
The API runtime container is minimal and does not include the bootstrap utility. Run this one-time bootstrap from a Go development terminal with the database connection:
```bash
set -a; . ./.env; set +a
export ADMIN_EMAIL=you@example.com
cd services/api
go run ./cmd/bootstrap
```
Type a **14–72-byte** password; it will not echo in the terminal. Then log in at http://localhost:3000/admin.

If you only use Docker, run `go run ./cmd/bootstrap` on a machine with Go 1.23+ and the database port available; a packaged bootstrap container is a future improvement.

## Start without Docker for application processes
Start PostgreSQL and run migrations as above. Load environment variables from the repo root:
```bash
set -a; . ./.env; set +a
(cd services/api && go mod tidy && go test ./... && go run ./cmd/server)
```
In another terminal:
```bash
cd apps/web && npm install && npm run dev
```

## Routes and implementation
- `/uk`, `/en`: storefront; `/uk/catalog`, `/en/catalog`: localized catalog and search
- `/uk/product/[slug]`: item detail; `/uk/cart`: persistent cart and manual checkout
- `/admin`: bcrypt-backed session login, price adjustment with preview, products, promotions, exchange rates, order history and audit log
- `/api/v1/products`: server-authoritative published catalog with discount/currency quotes
- `/api/v1/orders`: validates purchasability and snapshots server-calculated unit prices
- `/api/v1/payments/liqpay/webhook`: requires a signed callback and rechecks merchant status before marking an order paid

Payment collection is off by default. The LiqPay hosted checkout option is enabled only with configuration; **live transactions are not verified**. For EU/USD storefront display, an admin must configure a manual rate; settlement remains UAH. Apple Pay and Google Pay depend on merchant and provider activation.

## Pricing contract
Canonical product prices: UAH kopecks. Pricing uses integer arithmetic and basis points:
base → global price adjustment → product adjustment → product-specific discount (overrides global) or global discount → currency conversion.
A change from +10% to +15% recomputes from base, never compounds. Promotions are evaluated with server UTC time and are not browser-authoritative. Existing orders retain their price snapshot.

## Documentation
- [Source audit](docs/SOURCE_AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [REST API](docs/OPENAPI.yaml)
- [Operations, deployment and release blockers](docs/RUNBOOK.md)

## Gaps
Imported catalog: **76 products**, **76 local primary photos** and **387 source gallery references**. See [source audit](docs/SOURCE_AUDIT.md) for coverage and source-quality flags. The SQL seed has not been applied to a hosted database. No verified commercial prices. The UI is not fully accessible/SEO audited; there is no fully managed shipping integration, policy pages, transactional email, automatic FX rate provider or completed E2E testing. A secure production deployment and provider test credentials are still needed.

## Mobile UI preview on GitHub Pages

A self-contained, static phone-friendly preview is located in [preview/](preview/README.md). It has responsive navigation, bilingual text, catalog filtering, product dialogs and locally saved favorites, using imported product photographs alongside original decorative artwork. It does **not** accept payments or orders, display unverified prices. Product cards include source photographs.

The deployment workflow is [pages-preview.yml](.github/workflows/pages-preview.yml). After successful GitHub Pages activation, the preview URL is expected to be **https://elizeusx.github.io/MATRIX/**. Activate GitHub Actions as the Pages source in [repository Pages settings](https://github.com/ElizeusX/MATRIX/settings/pages). GitHub Pro/Team/Enterprise is required for a private repository and the published site is generally public. Do not change the repository's private visibility merely to use the preview.

