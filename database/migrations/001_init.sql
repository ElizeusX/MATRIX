-- All prices are canonical UAH minor units, never floats.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS categories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 slug TEXT UNIQUE NOT NULL,
 title_uk TEXT NOT NULL, title_en TEXT,
 published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS products (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 category_id UUID REFERENCES categories(id),
 slug TEXT UNIQUE NOT NULL,
 source_url TEXT UNIQUE,
 title_uk TEXT NOT NULL, title_en TEXT,
 description_uk TEXT, description_en TEXT,
 width_mm INTEGER CHECK(width_mm > 0),
 depth_mm INTEGER CHECK(depth_mm > 0),
 height_mm INTEGER CHECK(height_mm > 0),
 sleeping_width_mm INTEGER CHECK(sleeping_width_mm > 0),
 sleeping_length_mm INTEGER CHECK(sleeping_length_mm > 0),
 base_price_minor BIGINT CHECK(base_price_minor >= 0),
 product_adjustment_bps INTEGER NOT NULL DEFAULT 0 CHECK(product_adjustment_bps > -10000),
 published BOOLEAN NOT NULL DEFAULT FALSE,
 available BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_media (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 object_key TEXT UNIQUE NOT NULL,
 alt_uk TEXT, alt_en TEXT,
 source_url TEXT, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS pricing_settings (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
 global_adjustment_bps INTEGER NOT NULL DEFAULT 0 CHECK(global_adjustment_bps > -10000),
 storefront_currency TEXT NOT NULL DEFAULT 'UAH' CHECK(storefront_currency IN ('UAH','EUR','USD')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO pricing_settings(singleton) VALUES(TRUE) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS promotions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID REFERENCES products(id) ON DELETE CASCADE,
 discount_bps INTEGER NOT NULL CHECK(discount_bps BETWEEN 0 AND 10000),
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 cancelled_at TIMESTAMPTZ,
 created_by UUID,
 CHECK (starts_at < ends_at)
);
CREATE TABLE IF NOT EXISTS exchange_rates (
 currency TEXT PRIMARY KEY CHECK(currency IN ('EUR','USD')),
 numerator BIGINT NOT NULL CHECK(numerator > 0),
 denominator BIGINT NOT NULL CHECK(denominator > 0),
 source TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('owner','manager','editor')),
 disabled BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash TEXT PRIMARY KEY,
 admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_number TEXT NOT NULL UNIQUE,
 customer_name TEXT NOT NULL, customer_email TEXT, customer_phone TEXT NOT NULL,
 delivery_details JSONB NOT NULL DEFAULT '{}',
 comments TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','awaiting_payment','paid','processing','shipped','delivered','canceled','refunded')),
 payment_method TEXT NOT NULL,
 currency TEXT NOT NULL DEFAULT 'UAH',
 total_minor BIGINT NOT NULL CHECK(total_minor >= 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id),
 product_id UUID REFERENCES products(id) ON DELETE SET NULL,
 title_snapshot TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 unit_price_minor BIGINT NOT NULL CHECK(unit_price_minor >= 0),
 currency TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_events (
 provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
 order_id UUID REFERENCES orders(id),
 verified BOOLEAN NOT NULL DEFAULT FALSE,
 payload JSONB NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY, admin_id UUID REFERENCES admin_users(id),
 action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
 old_value JSONB, new_value JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_promotions_live ON promotions(starts_at,ends_at) WHERE cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
