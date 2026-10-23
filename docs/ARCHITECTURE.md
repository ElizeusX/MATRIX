# MATRIX architecture and implementation boundaries

Frontend: Next.js App Router with locale-specific Ukrainian/English storefront routes. Admin interface at /admin.
Backend: Go net/http REST service using database/sql + PostgreSQL and bcrypt-based administrator login.
Database: PostgreSQL 16; schema in migrations 001 and 002. Canonical money = UAH minor units.

## Price calculation
Go module `internal/pricing` uses integer rational arithmetic, rounded half-up, no binary floating-point.
1. canonical product base_minor (never modified by global adjustment)
2. global adjustment bps (from base, not compounded)
3. product adjustment bps
4. active product promotion overrides active global promotion
5. convert to storefront currency using rational exchange rate
6. orders always settle in UAH; amount/currency snapshotted on order items.

Promotions active when `starts_at <= server_utc < ends_at` and not cancelled.
Catalog listings compute quotes in Go from canonical base; checkout independently computes UAH prices inside a serializable DB transaction. Status `paid` is restricted to verified payment logic.

## Authentication, orders and payment
- `cmd/bootstrap` creates one owner with bcrypt-hashed password, no default credentials.
- Admin sessions are 256-bit random tokens; only SHA-256 token digests stored in DB. Cookies HttpOnly, SameSite Strict and Secure when configured.
- Admin mutation routes require authenticated session and matching Origin; editor is read-only.
- Guest orders are manual or configured LiqPay hosted checkout; never accept raw card data.
- LiqPay callback signature SHA3-256 is constant-time verified; webhook re-queries provider status via TLS; payment events deduplicate by signed-payload hash; paid state updated only after amount/currency/status revalidation.
- Manual-payment orders are pending; a manual admin action cannot mark them paid.

## Present gaps / hardening
No production readiness approval: app lacks comprehensive request throttling, notification email, delivery integration, full admin role UI, media library, automatic FX source, checkout idempotency, detailed audit coverage for every mutation, full e2e and WCAG testing. Tests and builds must be executed in a networked CI environment.
