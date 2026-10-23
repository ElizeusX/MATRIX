# MATRIX operations and release checklist

## Quick start
Go 1.23+, Node.js 22+, Docker and Docker Compose are required.

```sh
cp .env.example .env
docker compose up -d db
docker compose exec -T db psql -U matrix -d matrix < database/migrations/001_init.sql
docker compose exec -T db psql -U matrix -d matrix < database/migrations/002_operations.sql
docker compose exec -T db psql -U matrix -d matrix < database/seeds/verified_catalog.sql
docker compose up -d --build api web
```
Use localhost ports 3000 (web) and 8080 (API). Default database is bound only to localhost.
For source-mode API run: `set -a; . ./.env; set +a; cd services/api; go mod tidy; go run ./cmd/server`.

## Administrator
With Go installed and DATABASE_URL loaded from repo-root `.env`:
```sh
export ADMIN_EMAIL=owner@example.com
cd services/api
go run ./cmd/bootstrap
```
The bootstrap refuses to create a second owner. Password entry is hidden; no default password exists.
In hosted deployment set `SITE_ORIGIN` to the exact HTTPS public origin and `COOKIE_SECURE=true`.

## LiqPay hosted checkout
Integration uses provider hosted payment forms, SHA3-256 request/callback signatures and status re-verification.
To opt into merchant/sandbox integration:
1. Create a LiqPay merchant account and obtain **test** public/private keys.
2. Set `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY` via secret management (never Git).
3. Set `LIQPAY_SERVER_URL` to a public HTTPS address ending with `/api/v1/payments/liqpay/webhook` and `LIQPAY_RESULT_URL` to a merchant-owned return page (not yet implemented).
4. Set `LIQPAY_SANDBOX=true` only for provider sandbox operations.
5. Set `SITE_ORIGIN`, `COOKIE_SECURE=true`, HTTPS and verify callbacks with test cards.

**Do not activate real merchant keys yet**: full independent integration and fraud-control testing, trusted public HTTPS and return flow are outstanding. Storefront currently supports manual-payment orders.

Official docs: https://www.liqpay.ua/en/doc/api/internet_acquiring/checkout; https://api.monobank.ua/docs/acquiring.html

## Backups and observability
Create encrypted daily logical PostgreSQL backups (`pg_dump`), retain off-site copies and regularly test restores.
Rotate merchant credentials and administrative passwords. Put the web application behind TLS reverse proxy, network filtering and request-rate limiting, with audit-log monitoring.

## Local test commands
```sh
cd services/api && go mod tidy && go test ./... && go vet ./...
cd apps/web && npm install && npm run lint && npm run build
```
CI workflow is in `.github/workflows/ci.yml`. No claim of passed CI or production build without a successful run.

## Release gate
- Verify source media usage license; import real product images and descriptions with provenance.
- Have the merchant verify all product prices, stock, delivery regions, warranties and legal policies.
- Review all accessibility criteria and localization, including document language semantics.
- Implement consistent media storage, policy pages, shipping provider, confirmation emails and deeper admin roles.
- Confirm tax, returns, fulfillment and currency rules; finish automated FX and product-specific promotion UI.
- Complete checkout idempotency, rate limiting, signed webhook replays, monitoring and recovery testing.
- Pass production builds and a real sandbox end-to-end payment/checkout scenario.
