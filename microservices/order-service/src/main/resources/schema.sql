CREATE TABLE IF NOT EXISTS order_event_store (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lease_until TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL,
    last_error VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_order_event_store_status_created ON order_event_store (status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_event_store_status_retry ON order_event_store (status, next_attempt_at);

ALTER TABLE order_event_store ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE order_event_store ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP WITH TIME ZONE;
UPDATE order_event_store SET next_attempt_at = created_at WHERE next_attempt_at IS NULL;
ALTER TABLE order_event_store ALTER COLUMN next_attempt_at SET NOT NULL;
