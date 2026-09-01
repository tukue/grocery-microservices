CREATE TABLE IF NOT EXISTS order_event_store (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL,
    last_error VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_order_event_store_status_created ON order_event_store (status, created_at);
