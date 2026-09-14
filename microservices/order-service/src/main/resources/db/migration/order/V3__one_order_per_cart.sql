-- One order per cart: checkout transitions a cart OPEN -> CHECKED_OUT exactly
-- once, so a cart can never legitimately produce two orders. This index is the
-- database-level backstop against duplicate-order concurrency.
-- cart_id is nullable; a UNIQUE index still allows multiple NULL rows.
CREATE UNIQUE INDEX uk_orders_cart_id ON orders (cart_id);