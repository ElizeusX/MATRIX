ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_payments_order ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
