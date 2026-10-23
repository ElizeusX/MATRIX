# Architecture and pricing contract

Frontend: Next.js App Router, locale routes /uk and /en. Go API is separate service.
PostgreSQL schema in database/migrations; canonical prices stored as INTEGER minor units (UAH kopeks).

Pricing computation in services/api/internal/pricing:
1. base price (minor units)
2. global adjustment in basis points, applied to base price
3. product adjustment in basis points
4. active product discount overrides active global discount
5. conversion by integer rational exchange rate, round half up
Promotions use UTC [starts_at,ends_at), evaluated on server time. Historical order price snapshots must never be recalculated.

Security boundaries:
- Product write, admin routes and price controls MUST use server-side authorization.
- Payment providers require signed callbacks and idempotent inserts before paid transitions.
- No demo administrator credentials are provided.
- Reject checkout if any product has null price or is unpublished/unavailable.

Implementation status: schema and tested pure pricing core exist, but persistent catalog API, admin authorization, checkout and payment adapters are not yet wired. Do not deploy as a live store.
