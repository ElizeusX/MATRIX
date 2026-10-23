# Local development, release, and safety

## Prerequisites
Node.js 22, Go 1.23+, Docker Compose.

## Start
```sh
cp .env.example .env
docker compose up -d db
cd services/api && go test ./... && go run ./cmd/server
# separate terminal:
cd apps/web && npm install && npm run dev
```
`/uk` and `/en` are the locale storefront routes; API health is on port 8080.
Example catalog metadata in the current storefront is read-only and the backend products endpoint is not yet database-backed.

## Database schema
```sh
docker compose exec -T db psql -U matrix -d matrix < database/migrations/001_init.sql
docker compose exec -T db psql -U matrix -d matrix < database/seeds/verified_catalog.sql
```
The seed is meant for private editorial review; no product is published or available and all prices are NULL.

## Production gate (NOT YET CLEARED)
- Implement DB-backed catalog / authorization / order API and durable shopping cart.
- Configure TLS, host, safe cookies, backup scheduler, monitoring, email and image storage.
- Confirm content rights and import licensed product media.
- Obtain merchant agreement and payment provider test/production credentials.
- Verify transaction currency, legal documents, delivery and return policies.
- Run complete CI, end-to-end payment simulation and penetration testing.
- Verify accessibility and responsive layout manually.

## Deployment
Do not deploy as a live transaction-accepting store yet. CI checks compilation and Go unit tests; a production stack with reverse proxy, backups and DB migrations is still required.
